//! Encrypted `SQLite` WAL event spool with ordered, acknowledged delivery.

use std::{
    collections::BTreeMap,
    error::Error,
    fmt, fs,
    path::{Path, PathBuf},
    sync::{Mutex, RwLock},
};

use base64::{Engine as _, engine::general_purpose::STANDARD as BASE64};
use rusqlite::{
    Connection, ErrorCode, OptionalExtension, TransactionBehavior, params, types::Type,
};
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::{
    chain::event_hash,
    REDACTEDs::{SecretKey, VersionedSecretKey},
    crypto::{
        AeadEnvelope, equality_fingerprint, prefixed_sha256, sign_chain_head, verify_chain_head,
        verifying_key,
    },
    redaction::{DEFAULT_REDACTION_POLICY_VERSION, Redactor},
};

const SCHEMA_VERSION: u16 = 1;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SpoolLimits {
    pub maximum_encrypted_payload_bytes: u64,
    pub maximum_pending_events: u64,
    pub maximum_batch_events: usize,
}

impl Default for SpoolLimits {
    fn default() -> Self {
        Self {
            maximum_encrypted_payload_bytes: 256 * 1024 * 1024,
            maximum_pending_events: 100_000,
            maximum_batch_events: 250,
        }
    }
}

#[derive(Clone, Debug, PartialEq)]
pub struct RawEvent {
    pub event_id: String,
    pub source: String,
    pub action_type: String,
    pub source_sequence: Option<String>,
    pub payload: Value,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct DurableCapture {
    pub local_sequence: u64,
    pub event_hash: String,
    pub replayed: bool,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadEvent {
    pub event_id: String,
    pub local_sequence: u64,
    pub source_sequence: Option<String>,
    pub previous_event_hash: String,
    pub event_hash: String,
    pub payload: Value,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UploadBatch {
    pub schema_version: u16,
    pub batch_id: String,
    pub first_sequence: u64,
    pub last_sequence: u64,
    pub event_count: usize,
    pub chain_head: String,
    pub signing_key_version: u32,
    pub public_key: String,
    pub chain_head_signature: String,
    pub attempt_count: u32,
    pub events: Vec<UploadEvent>,
}

impl UploadBatch {
    /// Serialize the already-redacted upload document.
    ///
    /// # Errors
    ///
    /// Returns a classified serialization error without exposing payload content.
    pub fn serialized(&self) -> Result<Vec<u8>, SpoolError> {
        serde_json_canonicalizer::to_vec(self)
            .map_err(|_| SpoolError::new(SpoolErrorCode::SerializationFailed))
    }
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum Acknowledgement {
    Applied,
    Duplicate,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct RetryCursor {
    pub attempt_count: u32,
    pub next_attempt_unix_ms: i64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct SpoolStats {
    pub next_local_sequence: u64,
    pub pending_events: u64,
    pub pending_batches: u64,
    pub encrypted_payload_bytes: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum SpoolErrorCode {
    Corrupt,
    Crypto,
    DiskPressure,
    InvalidAcknowledgement,
    InvalidEvent,
    MissingKey,
    NotFound,
    SerializationFailed,
    Sql,
    Tampered,
}

#[derive(Debug)]
pub struct SpoolError {
    code: SpoolErrorCode,
}

impl SpoolError {
    const fn new(code: SpoolErrorCode) -> Self {
        Self { code }
    }

    #[must_use]
    pub const fn code(&self) -> SpoolErrorCode {
        self.code
    }
}

impl fmt::Display for SpoolError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("encrypted spool operation failed")
    }
}

impl Error for SpoolError {}

struct CryptoState {
    active_encryption_version: u32,
    encryption_keys: BTreeMap<u32, SecretKey>,
    signing_key: VersionedSecretKey,
}

pub struct EncryptedSpool {
    path: PathBuf,
    connection: Mutex<Connection>,
    crypto: RwLock<CryptoState>,
    redactor: Redactor,
    limits: SpoolLimits,
}

#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StoredEventPayload {
    schema_version: u16,
    event_id: String,
    source: String,
    action_type: String,
    source_sequence: Option<String>,
    payload: Value,
    redaction_policy_version: String,
}

struct EventRow {
    event_id: String,
    local_sequence: u64,
    previous_hash: [u8; 32],
    event_hash: [u8; 32],
    payload_digest: [u8; 32],
    envelope: Vec<u8>,
    encryption_key_version: u32,
}

type BatchMetadataRow = (i64, i64, i64, Vec<u8>, i64, Vec<u8>, Vec<u8>, i64);

impl EncryptedSpool {
    /// Open or create the encrypted spool and enforce WAL/full-durability pragmas.
    ///
    /// # Errors
    ///
    /// Returns a classified error for invalid limits, filesystem failures, or `SQLite` corruption.
    pub fn open(
        path: impl AsRef<Path>,
        limits: SpoolLimits,
        encryption_key: VersionedSecretKey,
        signing_key: VersionedSecretKey,
        redactor: Redactor,
    ) -> Result<Self, SpoolError> {
        validate_limits(limits)?;
        let path = path.as_ref().to_path_buf();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|_| SpoolError::new(SpoolErrorCode::Sql))?;
        }
        let connection = Connection::open(&path).map_err(map_sql_error)?;
        initialize_schema(&connection)?;
        let mut encryption_keys = BTreeMap::new();
        let active_encryption_version = encryption_key.version;
        encryption_keys.insert(encryption_key.version, encryption_key.key);
        Ok(Self {
            path,
            connection: Mutex::new(connection),
            crypto: RwLock::new(CryptoState {
                active_encryption_version,
                encryption_keys,
                signing_key,
            }),
            redactor,
            limits,
        })
    }

    #[must_use]
    pub fn path(&self) -> &Path {
        &self.path
    }

    #[must_use]
    pub const fn redactor(&self) -> &Redactor {
        &self.redactor
    }

    /// Retain an old encryption key for restart recovery or activate a rotated key.
    ///
    /// # Errors
    ///
    /// Returns an error when synchronization state is poisoned.
    pub fn add_encryption_key(
        &self,
        key: VersionedSecretKey,
        make_active: bool,
    ) -> Result<(), SpoolError> {
        let mut crypto = self
            .crypto
            .write()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Crypto))?;
        if make_active {
            crypto.active_encryption_version = key.version;
        }
        crypto.encryption_keys.insert(key.version, key.key);
        Ok(())
    }

    /// Activate a rotated Ed25519 key for newly created batches.
    ///
    /// # Errors
    ///
    /// Returns an error when synchronization state is poisoned.
    pub fn rotate_signing_key(&self, key: VersionedSecretKey) -> Result<(), SpoolError> {
        self.crypto
            .write()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Crypto))?
            .signing_key = key;
        Ok(())
    }

    /// Redact, encrypt, chain, and durably append an event in one immediate transaction.
    ///
    /// # Errors
    ///
    /// Returns a classified error for invalid input, disk pressure, encryption failure, or
    /// `SQLite` failure. No sequence is consumed when the transaction fails.
    #[allow(
        clippy::too_many_lines,
        reason = "the immediate transaction keeps sequence allocation, encryption, and chain advancement visibly atomic"
    )]
    pub fn append(&self, raw: &RawEvent) -> Result<DurableCapture, SpoolError> {
        validate_identifier(&raw.event_id, 200)?;
        validate_identifier(&raw.source, 100)?;
        validate_identifier(&raw.action_type, 100)?;
        if let Some(sequence) = &raw.source_sequence {
            validate_identifier(sequence, 200)?;
        }

        let stored = StoredEventPayload {
            schema_version: SCHEMA_VERSION,
            event_id: raw.event_id.clone(),
            source: self.redactor.redact_text(&raw.source, 100).value,
            action_type: self.redactor.redact_text(&raw.action_type, 100).value,
            source_sequence: raw
                .source_sequence
                .as_ref()
                .map(|sequence| self.redactor.redact_text(sequence, 200).value),
            payload: self.redactor.redact_provider_payload(&raw.payload),
            redaction_policy_version: DEFAULT_REDACTION_POLICY_VERSION.to_owned(),
        };
        let plaintext = serde_json_canonicalizer::to_vec(&stored)
            .map_err(|_| SpoolError::new(SpoolErrorCode::SerializationFailed))?;
        let payload_digest: [u8; 32] = Sha256::digest(&plaintext).into();

        let crypto = self
            .crypto
            .read()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Crypto))?;
        let encryption_key = crypto
            .encryption_keys
            .get(&crypto.active_encryption_version)
            .ok_or_else(|| SpoolError::new(SpoolErrorCode::MissingKey))?;
        let connection = self
            .connection
            .lock()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Sql))?;
        if let Some(capture) = lookup_receipt(&connection, &raw.event_id)? {
            return Ok(DurableCapture {
                replayed: true,
                ..capture
            });
        }
        drop(connection);

        let mut connection = self
            .connection
            .lock()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Sql))?;
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(map_sql_error)?;
        if let Some(capture) = lookup_receipt(&transaction, &raw.event_id)? {
            transaction.commit().map_err(map_sql_error)?;
            return Ok(DurableCapture {
                replayed: true,
                ..capture
            });
        }
        enforce_capacity(&transaction, self.limits, plaintext.len())?;
        let (next_sequence, previous_hash) = read_chain_state(&transaction)?;
        let hash = event_hash(
            next_sequence,
            &previous_hash,
            &raw.event_id,
            stored.source_sequence.as_deref(),
            &payload_digest,
        );
        let aad = event_aad(&raw.event_id, next_sequence, &hash);
        let versioned_key = VersionedSecretKey {
            version: crypto.active_encryption_version,
            key: SecretKey::from_bytes(*encryption_key.expose()),
        };
        let envelope = AeadEnvelope::seal(&versioned_key, &aad, &plaintext)
            .and_then(|sealed| sealed.encode())
            .map_err(|_| SpoolError::new(SpoolErrorCode::Crypto))?;
        let envelope_length = u64::try_from(envelope.len())
            .map_err(|_| SpoolError::new(SpoolErrorCode::DiskPressure))?;
        let current_bytes: u64 = transaction
            .query_row(
                "SELECT COALESCE(SUM(LENGTH(payload_envelope)), 0) FROM event_spool",
                [],
                |row| row.get(0),
            )
            .map_err(map_sql_error)?;
        if current_bytes.saturating_add(envelope_length)
            > self.limits.maximum_encrypted_payload_bytes
        {
            return Err(SpoolError::new(SpoolErrorCode::DiskPressure));
        }
        let sequence_i64 = to_i64(next_sequence)?;
        transaction
            .execute(
                "INSERT INTO event_spool (
                    event_id, local_sequence, previous_hash, event_hash, payload_digest,
                    payload_envelope, encryption_key_version, state, created_unix_ms
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, 'queued', unixepoch('subsec') * 1000)",
                params![
                    raw.event_id,
                    sequence_i64,
                    previous_hash.as_slice(),
                    hash.as_slice(),
                    payload_digest.as_slice(),
                    envelope,
                    i64::from(crypto.active_encryption_version)
                ],
            )
            .map_err(map_sql_error)?;
        transaction
            .execute(
                "INSERT INTO event_receipts (event_id, local_sequence, event_hash, acknowledged)
                 VALUES (?1, ?2, ?3, 0)",
                params![raw.event_id, sequence_i64, hash.as_slice()],
            )
            .map_err(map_sql_error)?;
        let following = next_sequence
            .checked_add(1)
            .ok_or_else(|| SpoolError::new(SpoolErrorCode::DiskPressure))?;
        transaction
            .execute(
                "UPDATE device_state SET next_local_sequence = ?1, chain_head = ?2 WHERE singleton = 1",
                params![to_i64(following)?, hash.as_slice()],
            )
            .map_err(map_sql_error)?;
        transaction.commit().map_err(map_sql_error)?;
        Ok(DurableCapture {
            local_sequence: next_sequence,
            event_hash: prefixed_hash(&hash),
            replayed: false,
        })
    }

    /// Return the oldest due immutable batch, creating one from queued events if necessary.
    ///
    /// # Errors
    ///
    /// Returns a classified error for missing keys, tampering, serialization, or `SQLite` failure.
    pub fn next_batch(&self, now_unix_ms: i64) -> Result<Option<UploadBatch>, SpoolError> {
        let crypto = self
            .crypto
            .read()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Crypto))?;
        let mut connection = self
            .connection
            .lock()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Sql))?;
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(map_sql_error)?;

        let existing: Option<(String, i64)> = transaction
            .query_row(
                "SELECT batch_id, next_attempt_unix_ms
                 FROM upload_batches
                 WHERE state = 'pending'
                 ORDER BY first_sequence
                 LIMIT 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .optional()
            .map_err(map_sql_error)?;
        if let Some((batch_id, next_attempt)) = existing {
            if next_attempt > now_unix_ms {
                transaction.commit().map_err(map_sql_error)?;
                return Ok(None);
            }
            let batch = load_batch(&transaction, &crypto, &batch_id)?;
            transaction.commit().map_err(map_sql_error)?;
            return Ok(Some(batch));
        }

        let rows = select_queued_rows(&transaction, self.limits.maximum_batch_events)?;
        if rows.is_empty() {
            transaction.commit().map_err(map_sql_error)?;
            return Ok(None);
        }
        let first_sequence = rows[0].local_sequence;
        let last = rows
            .last()
            .ok_or_else(|| SpoolError::new(SpoolErrorCode::Corrupt))?;
        let last_sequence = last.local_sequence;
        let chain_head = last.event_hash;
        let batch_id = format!(
            "batch-{first_sequence}-{last_sequence}-{}",
            &hex::encode(chain_head)[..16]
        );
        let signature = sign_chain_head(&crypto.signing_key, &chain_head);
        let public_key = verifying_key(&crypto.signing_key);
        transaction
            .execute(
                "INSERT INTO upload_batches (
                    batch_id, first_sequence, last_sequence, event_count, chain_head,
                    signing_key_version, public_key, chain_head_signature, state,
                    attempt_count, next_attempt_unix_ms, created_unix_ms
                 ) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'pending', 0, ?9, ?9)",
                params![
                    batch_id,
                    to_i64(first_sequence)?,
                    to_i64(last_sequence)?,
                    to_i64(
                        u64::try_from(rows.len())
                            .map_err(|_| { SpoolError::new(SpoolErrorCode::DiskPressure) })?
                    )?,
                    chain_head.as_slice(),
                    i64::from(crypto.signing_key.version),
                    public_key.as_slice(),
                    signature,
                    now_unix_ms
                ],
            )
            .map_err(map_sql_error)?;
        for row in &rows {
            transaction
                .execute(
                    "INSERT INTO batch_events (batch_id, event_id, local_sequence)
                     VALUES (?1, ?2, ?3)",
                    params![batch_id, row.event_id, to_i64(row.local_sequence)?],
                )
                .map_err(map_sql_error)?;
            transaction
                .execute(
                    "UPDATE event_spool SET state = 'batched', batch_id = ?1 WHERE event_id = ?2",
                    params![batch_id, row.event_id],
                )
                .map_err(map_sql_error)?;
        }
        let batch = load_batch(&transaction, &crypto, &batch_id)?;
        transaction.commit().map_err(map_sql_error)?;
        Ok(Some(batch))
    }

    /// Record a failed network attempt and advance the bounded retry cursor.
    ///
    /// # Errors
    ///
    /// Returns an error for unknown batches, invalid failure codes, overflow, or `SQLite` failure.
    pub fn record_retry(
        &self,
        batch_id: &str,
        now_unix_ms: i64,
        delay_ms: u64,
        failure_code: &str,
    ) -> Result<RetryCursor, SpoolError> {
        validate_identifier(failure_code, 100)?;
        let delay =
            i64::try_from(delay_ms).map_err(|_| SpoolError::new(SpoolErrorCode::InvalidEvent))?;
        let next_attempt = now_unix_ms
            .checked_add(delay)
            .ok_or_else(|| SpoolError::new(SpoolErrorCode::InvalidEvent))?;
        let connection = self
            .connection
            .lock()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Sql))?;
        let changed = connection
            .execute(
                "UPDATE upload_batches
                 SET attempt_count = attempt_count + 1,
                     next_attempt_unix_ms = ?2,
                     last_failure_code = ?3
                 WHERE batch_id = ?1 AND state = 'pending'",
                params![batch_id, next_attempt, failure_code],
            )
            .map_err(map_sql_error)?;
        if changed == 0 {
            return Err(SpoolError::new(SpoolErrorCode::NotFound));
        }
        let attempts: i64 = connection
            .query_row(
                "SELECT attempt_count FROM upload_batches WHERE batch_id = ?1",
                [batch_id],
                |row| row.get(0),
            )
            .map_err(map_sql_error)?;
        Ok(RetryCursor {
            attempt_count: u32::try_from(attempts)
                .map_err(|_| SpoolError::new(SpoolErrorCode::Corrupt))?,
            next_attempt_unix_ms: next_attempt,
        })
    }

    /// Apply an exact server acknowledgement and delete only its acknowledged event payloads.
    ///
    /// # Errors
    ///
    /// Returns an error for an unknown batch, mismatched chain head, unsafe out-of-order
    /// acknowledgement, invalid receipt identifier, or `SQLite` failure.
    pub fn acknowledge(
        &self,
        batch_id: &str,
        acknowledged_chain_head: &str,
        receipt_id: &str,
        acknowledged_unix_ms: i64,
    ) -> Result<Acknowledgement, SpoolError> {
        validate_identifier(receipt_id, 200)?;
        let mut connection = self
            .connection
            .lock()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Sql))?;
        let transaction = connection
            .transaction_with_behavior(TransactionBehavior::Immediate)
            .map_err(map_sql_error)?;
        let row: Option<(String, i64, Vec<u8>, String)> = transaction
            .query_row(
                "SELECT state, last_sequence, chain_head, batch_id
                 FROM upload_batches WHERE batch_id = ?1",
                [batch_id],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .optional()
            .map_err(map_sql_error)?;
        let Some((state, last_sequence, chain_head, stored_batch_id)) = row else {
            return Err(SpoolError::new(SpoolErrorCode::NotFound));
        };
        let chain_head = decode_hash(&chain_head)?;
        if acknowledged_chain_head != prefixed_hash(&chain_head) {
            return Err(SpoolError::new(SpoolErrorCode::InvalidAcknowledgement));
        }
        if state == "acknowledged" {
            transaction.commit().map_err(map_sql_error)?;
            return Ok(Acknowledgement::Duplicate);
        }
        let oldest: String = transaction
            .query_row(
                "SELECT batch_id FROM upload_batches
                 WHERE state = 'pending' ORDER BY first_sequence LIMIT 1",
                [],
                |row| row.get(0),
            )
            .map_err(map_sql_error)?;
        if oldest != stored_batch_id {
            return Err(SpoolError::new(SpoolErrorCode::InvalidAcknowledgement));
        }
        transaction
            .execute(
                "UPDATE upload_batches
                 SET state = 'acknowledged', acknowledged_unix_ms = ?2
                 WHERE batch_id = ?1",
                params![batch_id, acknowledged_unix_ms],
            )
            .map_err(map_sql_error)?;
        transaction
            .execute(
                "INSERT INTO anchor_receipts (
                    receipt_id, batch_id, acknowledged_chain_head, acknowledged_unix_ms
                 ) VALUES (?1, ?2, ?3, ?4)",
                params![
                    receipt_id,
                    batch_id,
                    chain_head.as_slice(),
                    acknowledged_unix_ms
                ],
            )
            .map_err(map_sql_error)?;
        transaction
            .execute(
                "UPDATE event_receipts SET acknowledged = 1
                 WHERE event_id IN (SELECT event_id FROM batch_events WHERE batch_id = ?1)",
                [batch_id],
            )
            .map_err(map_sql_error)?;
        transaction
            .execute("DELETE FROM batch_events WHERE batch_id = ?1", [batch_id])
            .map_err(map_sql_error)?;
        transaction
            .execute("DELETE FROM event_spool WHERE batch_id = ?1", [batch_id])
            .map_err(map_sql_error)?;
        transaction
            .execute(
                "UPDATE device_state
                 SET pruned_local_sequence = ?1, pruned_chain_head = ?2
                 WHERE singleton = 1",
                params![last_sequence, chain_head.as_slice()],
            )
            .map_err(map_sql_error)?;
        transaction.commit().map_err(map_sql_error)?;
        Ok(Acknowledgement::Applied)
    }

    /// Return non-sensitive queue and capacity metrics.
    ///
    /// # Errors
    ///
    /// Returns a classified `SQLite` error when metrics cannot be read.
    pub fn stats(&self) -> Result<SpoolStats, SpoolError> {
        let connection = self
            .connection
            .lock()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Sql))?;
        let next: i64 = connection
            .query_row(
                "SELECT next_local_sequence FROM device_state WHERE singleton = 1",
                [],
                |row| row.get(0),
            )
            .map_err(map_sql_error)?;
        let (pending_events, encrypted_payload_bytes): (i64, i64) = connection
            .query_row(
                "SELECT COUNT(*), COALESCE(SUM(LENGTH(payload_envelope)), 0) FROM event_spool",
                [],
                |row| Ok((row.get(0)?, row.get(1)?)),
            )
            .map_err(map_sql_error)?;
        let pending_batches: i64 = connection
            .query_row(
                "SELECT COUNT(*) FROM upload_batches WHERE state = 'pending'",
                [],
                |row| row.get(0),
            )
            .map_err(map_sql_error)?;
        Ok(SpoolStats {
            next_local_sequence: to_u64(next)?,
            pending_events: to_u64(pending_events)?,
            pending_batches: to_u64(pending_batches)?,
            encrypted_payload_bytes: to_u64(encrypted_payload_bytes)?,
        })
    }

    /// Run `SQLite` integrity checks, decrypt every pending payload, verify the active hash chain,
    /// and verify every retained batch signature.
    ///
    /// # Errors
    ///
    /// Returns `Corrupt`, `Tampered`, or `MissingKey` without leaking stored content.
    pub fn verify_integrity(&self) -> Result<(), SpoolError> {
        let crypto = self
            .crypto
            .read()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Crypto))?;
        let connection = self
            .connection
            .lock()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Sql))?;
        let quick_check: String = connection
            .query_row("PRAGMA quick_check", [], |row| row.get(0))
            .map_err(map_sql_error)?;
        if quick_check != "ok" {
            return Err(SpoolError::new(SpoolErrorCode::Corrupt));
        }
        let (pruned_sequence, pruned_hash, chain_head): (i64, Vec<u8>, Vec<u8>) = connection
            .query_row(
                "SELECT pruned_local_sequence, pruned_chain_head, chain_head
                 FROM device_state WHERE singleton = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?)),
            )
            .map_err(map_sql_error)?;
        let mut expected_sequence = to_u64(pruned_sequence)?
            .checked_add(1)
            .ok_or_else(|| SpoolError::new(SpoolErrorCode::Corrupt))?;
        let mut expected_previous = decode_hash(&pruned_hash)?;
        let rows = select_all_rows(&connection)?;
        for row in rows {
            if row.local_sequence != expected_sequence || row.previous_hash != expected_previous {
                return Err(SpoolError::new(SpoolErrorCode::Tampered));
            }
            let stored = decrypt_row(&crypto, &row)?;
            let plaintext = serde_json_canonicalizer::to_vec(&stored)
                .map_err(|_| SpoolError::new(SpoolErrorCode::SerializationFailed))?;
            let digest: [u8; 32] = Sha256::digest(plaintext).into();
            if digest != row.payload_digest || stored.event_id != row.event_id {
                return Err(SpoolError::new(SpoolErrorCode::Tampered));
            }
            let computed = event_hash(
                row.local_sequence,
                &row.previous_hash,
                &row.event_id,
                stored.source_sequence.as_deref(),
                &row.payload_digest,
            );
            if computed != row.event_hash {
                return Err(SpoolError::new(SpoolErrorCode::Tampered));
            }
            expected_previous = row.event_hash;
            expected_sequence = expected_sequence
                .checked_add(1)
                .ok_or_else(|| SpoolError::new(SpoolErrorCode::Corrupt))?;
        }
        if decode_hash(&chain_head)? != expected_previous {
            return Err(SpoolError::new(SpoolErrorCode::Tampered));
        }
        verify_batch_signatures(&connection)?;
        Ok(())
    }

    #[cfg(test)]
    fn connection_for_test(&self) -> std::sync::MutexGuard<'_, Connection> {
        self.connection
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }
}

fn validate_limits(limits: SpoolLimits) -> Result<(), SpoolError> {
    if limits.maximum_encrypted_payload_bytes == 0
        || limits.maximum_pending_events == 0
        || limits.maximum_batch_events == 0
        || limits.maximum_batch_events > 10_000
    {
        return Err(SpoolError::new(SpoolErrorCode::InvalidEvent));
    }
    Ok(())
}

fn validate_identifier(value: &str, maximum_length: usize) -> Result<(), SpoolError> {
    if value.is_empty()
        || value.len() > maximum_length
        || !value
            .chars()
            .all(|character| character.is_ascii_alphanumeric() || "._:-/".contains(character))
    {
        return Err(SpoolError::new(SpoolErrorCode::InvalidEvent));
    }
    Ok(())
}

fn initialize_schema(connection: &Connection) -> Result<(), SpoolError> {
    connection
        .busy_timeout(std::time::Duration::from_secs(5))
        .map_err(map_sql_error)?;
    let journal_mode: String = connection
        .query_row("PRAGMA journal_mode = WAL", [], |row| row.get(0))
        .map_err(map_sql_error)?;
    if !journal_mode.eq_ignore_ascii_case("wal") {
        return Err(SpoolError::new(SpoolErrorCode::Sql));
    }
    connection
        .execute_batch(
            "PRAGMA synchronous = FULL;
             PRAGMA foreign_keys = ON;
             PRAGMA wal_autocheckpoint = 1000;
             CREATE TABLE IF NOT EXISTS device_state (
                singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
                schema_version INTEGER NOT NULL,
                next_local_sequence INTEGER NOT NULL,
                chain_head BLOB NOT NULL,
                pruned_local_sequence INTEGER NOT NULL,
                pruned_chain_head BLOB NOT NULL
             );
             INSERT OR IGNORE INTO device_state (
                singleton, schema_version, next_local_sequence, chain_head,
                pruned_local_sequence, pruned_chain_head
             ) VALUES (1, 1, 1, zeroblob(32), 0, zeroblob(32));
             CREATE TABLE IF NOT EXISTS workspace_enrollments (
                enrollment_id TEXT PRIMARY KEY, metadata_envelope BLOB NOT NULL
             );
             CREATE TABLE IF NOT EXISTS project_bindings (
                project_id TEXT PRIMARY KEY, metadata_envelope BLOB NOT NULL
             );
             CREATE TABLE IF NOT EXISTS observation_leases (
                lease_id TEXT PRIMARY KEY, metadata_envelope BLOB NOT NULL
             );
             CREATE TABLE IF NOT EXISTS event_streams (
                stream_id TEXT PRIMARY KEY, last_source_sequence_digest TEXT
             );
             CREATE TABLE IF NOT EXISTS event_spool (
                event_id TEXT PRIMARY KEY,
                local_sequence INTEGER NOT NULL UNIQUE,
                previous_hash BLOB NOT NULL CHECK (length(previous_hash) = 32),
                event_hash BLOB NOT NULL CHECK (length(event_hash) = 32),
                payload_digest BLOB NOT NULL CHECK (length(payload_digest) = 32),
                payload_envelope BLOB NOT NULL,
                encryption_key_version INTEGER NOT NULL,
                state TEXT NOT NULL CHECK (state IN ('queued', 'batched')),
                batch_id TEXT,
                created_unix_ms INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS event_receipts (
                event_id TEXT PRIMARY KEY,
                local_sequence INTEGER NOT NULL UNIQUE,
                event_hash BLOB NOT NULL,
                acknowledged INTEGER NOT NULL CHECK (acknowledged IN (0, 1))
             );
             CREATE TABLE IF NOT EXISTS snapshot_index (
                snapshot_id TEXT PRIMARY KEY, metadata_envelope BLOB NOT NULL
             );
             CREATE TABLE IF NOT EXISTS inventory_chunks (
                chunk_id TEXT PRIMARY KEY, payload_envelope BLOB NOT NULL
             );
             CREATE TABLE IF NOT EXISTS upload_batches (
                batch_id TEXT PRIMARY KEY,
                first_sequence INTEGER NOT NULL,
                last_sequence INTEGER NOT NULL,
                event_count INTEGER NOT NULL,
                chain_head BLOB NOT NULL CHECK (length(chain_head) = 32),
                signing_key_version INTEGER NOT NULL,
                public_key BLOB NOT NULL CHECK (length(public_key) = 32),
                chain_head_signature BLOB NOT NULL,
                state TEXT NOT NULL CHECK (state IN ('pending', 'acknowledged')),
                attempt_count INTEGER NOT NULL,
                next_attempt_unix_ms INTEGER NOT NULL,
                last_failure_code TEXT,
                created_unix_ms INTEGER NOT NULL,
                acknowledged_unix_ms INTEGER
             );
             CREATE TABLE IF NOT EXISTS batch_events (
                batch_id TEXT NOT NULL REFERENCES upload_batches(batch_id),
                event_id TEXT NOT NULL REFERENCES event_spool(event_id),
                local_sequence INTEGER NOT NULL,
                PRIMARY KEY (batch_id, event_id)
             );
             CREATE TABLE IF NOT EXISTS anchor_receipts (
                receipt_id TEXT PRIMARY KEY,
                batch_id TEXT NOT NULL UNIQUE REFERENCES upload_batches(batch_id),
                acknowledged_chain_head BLOB NOT NULL,
                acknowledged_unix_ms INTEGER NOT NULL
             );
             CREATE TABLE IF NOT EXISTS capture_gaps (
                gap_id TEXT PRIMARY KEY, metadata_envelope BLOB NOT NULL
             );
             CREATE INDEX IF NOT EXISTS event_spool_delivery
                ON event_spool(state, local_sequence);
             CREATE INDEX IF NOT EXISTS upload_batches_delivery
                ON upload_batches(state, first_sequence);",
        )
        .map_err(map_sql_error)
}

fn lookup_receipt(
    connection: &Connection,
    event_id: &str,
) -> Result<Option<DurableCapture>, SpoolError> {
    connection
        .query_row(
            "SELECT local_sequence, event_hash FROM event_receipts WHERE event_id = ?1",
            [event_id],
            |row| {
                let sequence: i64 = row.get(0)?;
                let hash: Vec<u8> = row.get(1)?;
                Ok((sequence, hash))
            },
        )
        .optional()
        .map_err(map_sql_error)?
        .map_or(Ok(None), |(sequence, hash)| {
            Ok(Some(DurableCapture {
                local_sequence: to_u64(sequence)?,
                event_hash: prefixed_hash(&decode_hash(&hash)?),
                replayed: false,
            }))
        })
}

fn enforce_capacity(
    transaction: &rusqlite::Transaction<'_>,
    limits: SpoolLimits,
    plaintext_bytes: usize,
) -> Result<(), SpoolError> {
    let pending: i64 = transaction
        .query_row("SELECT COUNT(*) FROM event_spool", [], |row| row.get(0))
        .map_err(map_sql_error)?;
    if to_u64(pending)? >= limits.maximum_pending_events {
        return Err(SpoolError::new(SpoolErrorCode::DiskPressure));
    }
    let estimate = u64::try_from(plaintext_bytes)
        .map_err(|_| SpoolError::new(SpoolErrorCode::DiskPressure))?
        .saturating_add(512);
    if estimate > limits.maximum_encrypted_payload_bytes {
        return Err(SpoolError::new(SpoolErrorCode::DiskPressure));
    }
    Ok(())
}

fn read_chain_state(
    transaction: &rusqlite::Transaction<'_>,
) -> Result<(u64, [u8; 32]), SpoolError> {
    let (sequence, hash): (i64, Vec<u8>) = transaction
        .query_row(
            "SELECT next_local_sequence, chain_head FROM device_state WHERE singleton = 1",
            [],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(map_sql_error)?;
    Ok((to_u64(sequence)?, decode_hash(&hash)?))
}

fn select_queued_rows(connection: &Connection, limit: usize) -> Result<Vec<EventRow>, SpoolError> {
    let mut statement = connection
        .prepare(
            "SELECT event_id, local_sequence, previous_hash, event_hash, payload_digest,
                    payload_envelope, encryption_key_version
             FROM event_spool WHERE state = 'queued'
             ORDER BY local_sequence LIMIT ?1",
        )
        .map_err(map_sql_error)?;
    collect_rows(
        statement
            .query_map(
                [i64::try_from(limit)
                    .map_err(|_| SpoolError::new(SpoolErrorCode::InvalidEvent))?],
                map_event_row,
            )
            .map_err(map_sql_error)?,
    )
}

fn select_all_rows(connection: &Connection) -> Result<Vec<EventRow>, SpoolError> {
    let mut statement = connection
        .prepare(
            "SELECT event_id, local_sequence, previous_hash, event_hash, payload_digest,
                    payload_envelope, encryption_key_version
             FROM event_spool ORDER BY local_sequence",
        )
        .map_err(map_sql_error)?;
    collect_rows(
        statement
            .query_map([], map_event_row)
            .map_err(map_sql_error)?,
    )
}

fn map_event_row(row: &rusqlite::Row<'_>) -> rusqlite::Result<EventRow> {
    let sequence: i64 = row.get(1)?;
    let key_version: i64 = row.get(6)?;
    Ok(EventRow {
        event_id: row.get(0)?,
        local_sequence: u64::try_from(sequence).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(1, Type::Integer, Box::new(error))
        })?,
        previous_hash: row_hash(row, 2)?,
        event_hash: row_hash(row, 3)?,
        payload_digest: row_hash(row, 4)?,
        envelope: row.get(5)?,
        encryption_key_version: u32::try_from(key_version).map_err(|error| {
            rusqlite::Error::FromSqlConversionFailure(6, Type::Integer, Box::new(error))
        })?,
    })
}

fn row_hash(row: &rusqlite::Row<'_>, index: usize) -> rusqlite::Result<[u8; 32]> {
    let bytes: Vec<u8> = row.get(index)?;
    bytes.try_into().map_err(|bytes: Vec<u8>| {
        rusqlite::Error::FromSqlConversionFailure(
            index,
            Type::Blob,
            format!("invalid digest length {}", bytes.len()).into(),
        )
    })
}

fn collect_rows(
    rows: rusqlite::MappedRows<'_, impl FnMut(&rusqlite::Row<'_>) -> rusqlite::Result<EventRow>>,
) -> Result<Vec<EventRow>, SpoolError> {
    rows.collect::<rusqlite::Result<Vec<_>>>()
        .map_err(map_sql_error)
}

fn load_batch(
    connection: &Connection,
    crypto: &CryptoState,
    batch_id: &str,
) -> Result<UploadBatch, SpoolError> {
    let metadata: BatchMetadataRow = connection
        .query_row(
            "SELECT first_sequence, last_sequence, event_count, chain_head,
                    signing_key_version, public_key, chain_head_signature, attempt_count
             FROM upload_batches WHERE batch_id = ?1",
            [batch_id],
            |row| {
                Ok((
                    row.get(0)?,
                    row.get(1)?,
                    row.get(2)?,
                    row.get(3)?,
                    row.get(4)?,
                    row.get(5)?,
                    row.get(6)?,
                    row.get(7)?,
                ))
            },
        )
        .map_err(map_sql_error)?;
    let rows = {
        let mut statement = connection
            .prepare(
                "SELECT e.event_id, e.local_sequence, e.previous_hash, e.event_hash,
                        e.payload_digest, e.payload_envelope, e.encryption_key_version
                 FROM event_spool e
                 JOIN batch_events b ON b.event_id = e.event_id
                 WHERE b.batch_id = ?1 ORDER BY e.local_sequence",
            )
            .map_err(map_sql_error)?;
        collect_rows(
            statement
                .query_map([batch_id], map_event_row)
                .map_err(map_sql_error)?,
        )?
    };
    let mut events = Vec::with_capacity(rows.len());
    for row in rows {
        let payload = decrypt_row(crypto, &row)?;
        let source_sequence = payload.source_sequence.clone();
        let payload = serde_json::to_value(payload)
            .map_err(|_| SpoolError::new(SpoolErrorCode::SerializationFailed))?;
        events.push(UploadEvent {
            event_id: row.event_id,
            local_sequence: row.local_sequence,
            source_sequence,
            previous_event_hash: prefixed_hash(&row.previous_hash),
            event_hash: prefixed_hash(&row.event_hash),
            payload,
        });
    }
    let chain_head = decode_hash(&metadata.3)?;
    let public_key: [u8; 32] = metadata
        .5
        .as_slice()
        .try_into()
        .map_err(|_| SpoolError::new(SpoolErrorCode::Corrupt))?;
    if !verify_chain_head(&public_key, &chain_head, &metadata.6) {
        return Err(SpoolError::new(SpoolErrorCode::Tampered));
    }
    Ok(UploadBatch {
        schema_version: SCHEMA_VERSION,
        batch_id: batch_id.to_owned(),
        first_sequence: to_u64(metadata.0)?,
        last_sequence: to_u64(metadata.1)?,
        event_count: usize::try_from(metadata.2)
            .map_err(|_| SpoolError::new(SpoolErrorCode::Corrupt))?,
        chain_head: prefixed_hash(&chain_head),
        signing_key_version: u32::try_from(metadata.4)
            .map_err(|_| SpoolError::new(SpoolErrorCode::Corrupt))?,
        public_key: BASE64.encode(public_key),
        chain_head_signature: BASE64.encode(metadata.6),
        attempt_count: u32::try_from(metadata.7)
            .map_err(|_| SpoolError::new(SpoolErrorCode::Corrupt))?,
        events,
    })
}

fn decrypt_row(crypto: &CryptoState, row: &EventRow) -> Result<StoredEventPayload, SpoolError> {
    let key = crypto
        .encryption_keys
        .get(&row.encryption_key_version)
        .ok_or_else(|| SpoolError::new(SpoolErrorCode::MissingKey))?;
    let envelope =
        AeadEnvelope::decode(&row.envelope).map_err(|_| SpoolError::new(SpoolErrorCode::Crypto))?;
    if envelope.key_version != row.encryption_key_version {
        return Err(SpoolError::new(SpoolErrorCode::Tampered));
    }
    let aad = event_aad(&row.event_id, row.local_sequence, &row.event_hash);
    let plaintext = envelope
        .open(key, &aad)
        .map_err(|_| SpoolError::new(SpoolErrorCode::Tampered))?;
    serde_json::from_slice(&plaintext).map_err(|_| SpoolError::new(SpoolErrorCode::Corrupt))
}

fn verify_batch_signatures(connection: &Connection) -> Result<(), SpoolError> {
    let mut statement = connection
        .prepare("SELECT chain_head, public_key, chain_head_signature FROM upload_batches")
        .map_err(map_sql_error)?;
    let rows = statement
        .query_map([], |row| {
            Ok((
                row.get::<_, Vec<u8>>(0)?,
                row.get::<_, Vec<u8>>(1)?,
                row.get::<_, Vec<u8>>(2)?,
            ))
        })
        .map_err(map_sql_error)?;
    for row in rows {
        let (head, public, signature) = row.map_err(map_sql_error)?;
        let head = decode_hash(&head)?;
        let public: [u8; 32] = public
            .try_into()
            .map_err(|_| SpoolError::new(SpoolErrorCode::Corrupt))?;
        if !verify_chain_head(&public, &head, &signature) {
            return Err(SpoolError::new(SpoolErrorCode::Tampered));
        }
    }
    Ok(())
}

fn event_aad(event_id: &str, sequence: u64, hash: &[u8; 32]) -> Vec<u8> {
    let mut aad = Vec::with_capacity(event_id.len() + 40);
    aad.extend_from_slice(b"event-envelope-v1\0");
    aad.extend_from_slice(&sequence.to_be_bytes());
    aad.extend_from_slice(hash);
    aad.extend_from_slice(event_id.as_bytes());
    aad
}

fn prefixed_hash(hash: &[u8; 32]) -> String {
    format!("sha256:{}", hex::encode(hash))
}

fn decode_hash(bytes: &[u8]) -> Result<[u8; 32], SpoolError> {
    bytes
        .try_into()
        .map_err(|_| SpoolError::new(SpoolErrorCode::Corrupt))
}

fn to_i64(value: u64) -> Result<i64, SpoolError> {
    i64::try_from(value).map_err(|_| SpoolError::new(SpoolErrorCode::DiskPressure))
}

fn to_u64(value: i64) -> Result<u64, SpoolError> {
    u64::try_from(value).map_err(|_| SpoolError::new(SpoolErrorCode::Corrupt))
}

#[allow(
    clippy::needless_REDACTED_by_value,
    reason = "rusqlite Result::map_err supplies owned errors to this classifier"
)]
fn map_sql_error(error: rusqlite::Error) -> SpoolError {
    if let rusqlite::Error::SqliteFailure(sqlite, _) = &error {
        return match sqlite.code {
            ErrorCode::DatabaseCorrupt | ErrorCode::NotADatabase => {
                SpoolError::new(SpoolErrorCode::Corrupt)
            }
            ErrorCode::DiskFull => SpoolError::new(SpoolErrorCode::DiskPressure),
            _ => SpoolError::new(SpoolErrorCode::Sql),
        };
    }
    SpoolError::new(SpoolErrorCode::Sql)
}

#[must_use]
pub fn opaque_environment_fingerprint(key: &VersionedSecretKey, value: &str) -> String {
    equality_fingerprint(key, value.as_bytes())
}

#[must_use]
pub fn encrypted_payload_digest(envelope: &[u8]) -> String {
    prefixed_sha256(envelope)
}

#[cfg(test)]
mod tests {
    use std::{
        collections::BTreeMap,
        fs,
        path::{Path, PathBuf},
    };

    use serde_json::json;
    use tempfile::TempDir;

    use super::{
        Acknowledgement, EncryptedSpool, RawEvent, SpoolError, SpoolErrorCode, SpoolLimits,
        opaque_environment_fingerprint,
    };
    use crate::{
        REDACTEDs::{SecretKey, VersionedSecretKey},
        logging::{LogLevel, write_safe_log},
        redaction::Redactor,
    };

    const SECRET_CORPUS: &str =
        include_str!("../../../../fixtures/failure-corpora/v1/security-REDACTEDs.json");

    fn key(byte: u8, version: u32) -> VersionedSecretKey {
        VersionedSecretKey {
            version,
            key: SecretKey::from_bytes([byte; 32]),
        }
    }

    fn open(path: &Path, limits: SpoolLimits) -> EncryptedSpool {
        EncryptedSpool::open(
            path,
            limits,
            key(1, 1),
            key(2, 1),
            Redactor::new(key(3, 1), &[]).expect("redactor"),
        )
        .expect("spool")
    }

    fn event(id: &str, REDACTED: &str) -> RawEvent {
        RawEvent {
            event_id: id.to_owned(),
            source: "provider.codex".to_owned(),
            action_type: "command.completed".to_owned(),
            source_sequence: Some(format!("source-{id}")),
            payload: json!({
                "authorization": REDACTED,
                "summary": format!("failed using {REDACTED}")
            }),
        }
    }

    #[test]
    fn survives_restart_and_replays_event_ids_without_consuming_sequence() {
        let directory = TempDir::new().expect("temp");
        let path = directory.path().join("spool.sqlite3");
        let first = open(&path, SpoolLimits::default());
        let capture = first.append(&event("event-1", "fixture")).expect("append");
        assert_eq!(capture.local_sequence, 1);
        drop(first);

        let reopened = open(&path, SpoolLimits::default());
        let replay = reopened
            .append(&event("event-1", "different"))
            .expect("replay");
        assert!(replay.replayed);
        assert_eq!(replay.local_sequence, 1);
        let second = reopened
            .append(&event("event-2", "fixture"))
            .expect("append");
        assert_eq!(second.local_sequence, 2);
        reopened.verify_integrity().expect("integrity");
    }

    #[test]
    fn network_retry_reuses_batch_and_ack_is_idempotent_and_deletes_safely() {
        let directory = TempDir::new().expect("temp");
        let spool = open(
            &directory.path().join("spool.sqlite3"),
            SpoolLimits {
                maximum_batch_events: 1,
                ..SpoolLimits::default()
            },
        );
        spool.append(&event("event-1", "fixture")).expect("append");
        let batch = spool.next_batch(100).expect("batch").expect("present");
        let cursor = spool
            .record_retry(&batch.batch_id, 100, 50, "network-unavailable")
            .expect("retry");
        assert_eq!(cursor.next_attempt_unix_ms, 150);
        assert!(spool.next_batch(149).expect("not due").is_none());
        let retry = spool.next_batch(150).expect("due").expect("batch");
        assert_eq!(retry.batch_id, batch.batch_id);
        assert_eq!(retry.attempt_count, 1);
        assert_eq!(spool.stats().expect("stats").pending_events, 1);

        assert_eq!(
            spool
                .acknowledge(&batch.batch_id, &batch.chain_head, "receipt-1", 200)
                .expect("ack"),
            Acknowledgement::Applied
        );
        assert_eq!(spool.stats().expect("stats").pending_events, 0);
        assert_eq!(
            spool
                .acknowledge(&batch.batch_id, &batch.chain_head, "receipt-duplicate", 201)
                .expect("duplicate"),
            Acknowledgement::Duplicate
        );
    }

    #[test]
    fn key_rotation_decrypts_old_and_new_events_and_rotates_signatures() {
        let directory = TempDir::new().expect("temp");
        let spool = open(
            &directory.path().join("spool.sqlite3"),
            SpoolLimits::default(),
        );
        spool.append(&event("event-1", "fixture")).expect("append");
        spool.add_encryption_key(key(4, 2), true).expect("rotate");
        spool.rotate_signing_key(key(5, 2)).expect("sign rotate");
        spool.append(&event("event-2", "fixture")).expect("append");
        let batch = spool.next_batch(1).expect("batch").expect("present");
        assert_eq!(batch.signing_key_version, 2);
        assert_eq!(batch.events.len(), 2);
        spool.verify_integrity().expect("integrity");
    }

    #[test]
    fn detects_chain_ciphertext_and_signature_tampering() {
        let directory = TempDir::new().expect("temp");
        let spool = open(
            &directory.path().join("spool.sqlite3"),
            SpoolLimits::default(),
        );
        spool.append(&event("event-1", "fixture")).expect("append");
        let batch = spool.next_batch(1).expect("batch").expect("present");
        {
            let connection = spool.connection_for_test();
            connection
                .execute(
                    "UPDATE event_spool SET event_hash = zeroblob(32) WHERE event_id = 'event-1'",
                    [],
                )
                .expect("tamper");
        }
        assert_eq!(
            spool.verify_integrity().expect_err("tamper").code(),
            SpoolErrorCode::Tampered
        );
        {
            let connection = spool.connection_for_test();
            connection
                .execute(
                    "UPDATE event_spool SET event_hash = payload_digest WHERE event_id = 'event-1'",
                    [],
                )
                .expect("second tamper");
            connection
                .execute(
                    "UPDATE upload_batches SET chain_head_signature = zeroblob(64)
                     WHERE batch_id = ?1",
                    [batch.batch_id],
                )
                .expect("signature tamper");
        }
        assert!(spool.verify_integrity().is_err());
    }

    #[test]
    fn rejects_bad_ack_and_enforces_disk_pressure_without_sequence_gap() {
        let directory = TempDir::new().expect("temp");
        let spool = open(
            &directory.path().join("spool.sqlite3"),
            SpoolLimits {
                maximum_pending_events: 1,
                ..SpoolLimits::default()
            },
        );
        spool.append(&event("event-1", "fixture")).expect("append");
        let batch = spool.next_batch(1).expect("batch").expect("present");
        assert_eq!(
            spool
                .acknowledge(
                    &batch.batch_id,
                    "sha256:ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
                    "receipt-bad",
                    2
                )
                .expect_err("bad ack")
                .code(),
            SpoolErrorCode::InvalidAcknowledgement
        );
        assert_eq!(
            spool
                .append(&event("event-2", "fixture"))
                .expect_err("pressure")
                .code(),
            SpoolErrorCode::DiskPressure
        );
        assert_eq!(spool.stats().expect("stats").next_local_sequence, 2);
    }

    #[test]
    fn seeded_REDACTED_plaintext_is_absent_from_database_and_batch() {
        let directory = TempDir::new().expect("temp");
        let path = directory.path().join("spool.sqlite3");
        let spool = open(&path, SpoolLimits::default());
        let REDACTED = "sk-test_FAKE_51HACKATHON_NOT_A_REAL_KEY_000000";
        spool.append(&event("event-1", REDACTED)).expect("append");
        let batch = spool.next_batch(1).expect("batch").expect("present");
        let batch_bytes = batch.serialized().expect("serialize");
        assert!(!String::from_utf8_lossy(&batch_bytes).contains(REDACTED));
        drop(spool);
        let database = fs::read(path).expect("read database");
        assert!(
            !database
                .windows(REDACTED.len())
                .any(|window| window == REDACTED.as_bytes())
        );
    }

    #[test]
    fn complete_seeded_REDACTED_corpus_is_absent_from_every_local_boundary() {
        let corpus: serde_json::Value =
            serde_json::from_str(SECRET_CORPUS).expect("REDACTED corpus must parse");
        let REDACTEDs = corpus["fixtures"]
            .as_array()
            .expect("fixtures")
            .iter()
            .filter(|fixture| fixture["expected"]["REDACTEDDetected"] == true)
            .map(|fixture| {
                fixture["input"]["syntheticValue"]
                    .as_str()
                    .expect("synthetic value")
                    .to_owned()
            })
            .collect::<Vec<_>>();
        assert_eq!(REDACTEDs.len(), 7);

        let directory = TempDir::new().expect("temp");
        let path = directory.path().join("spool.sqlite3");
        let spool = open(&path, SpoolLimits::default());
        let mut logs = Vec::new();
        for (index, REDACTED) in REDACTEDs.iter().enumerate() {
            let event_id = format!("REDACTED-event-{index}");
            spool.append(&event(&event_id, REDACTED)).expect("append");
            write_safe_log(
                &mut logs,
                spool.redactor(),
                LogLevel::Error,
                "fixture.REDACTED",
                REDACTED,
                &BTreeMap::from([("authorization".to_owned(), json!(REDACTED))]),
            )
            .expect("safe log");
            let fingerprint = opaque_environment_fingerprint(&key(9, 1), REDACTED);
            assert!(!fingerprint.contains(REDACTED));
            assert!(
                !SpoolError::new(SpoolErrorCode::Crypto)
                    .to_string()
                    .contains(REDACTED)
            );
        }
        let batch = spool.next_batch(1).expect("batch").expect("present");
        let serialized = batch.serialized().expect("serialize");
        for REDACTED in &REDACTEDs {
            assert!(!String::from_utf8_lossy(&logs).contains(REDACTED));
            assert!(
                !String::from_utf8_lossy(&serialized).contains(REDACTED),
                "serialized batch leaked corpus fixture beginning {:?}",
                REDACTED.chars().take(24).collect::<String>()
            );
        }
        drop(spool);

        for suffix in ["", "-wal", "-shm"] {
            let file = PathBuf::from(format!("{}{suffix}", path.display()));
            if let Ok(bytes) = fs::read(file) {
                for REDACTED in &REDACTEDs {
                    assert!(
                        !bytes
                            .windows(REDACTED.len())
                            .any(|window| window == REDACTED.as_bytes()),
                        "REDACTED reached SQLite boundary"
                    );
                }
            }
        }
    }

    #[test]
    fn classifies_on_disk_sqlite_corruption_without_exposing_bytes() {
        let directory = TempDir::new().expect("temp");
        let path = directory.path().join("spool.sqlite3");
        let spool = open(&path, SpoolLimits::default());
        spool.append(&event("event-1", "fixture")).expect("append");
        drop(spool);
        fs::write(&path, b"not a sqlite database").expect("corrupt fixture");

        let result = EncryptedSpool::open(
            &path,
            SpoolLimits::default(),
            key(1, 1),
            key(2, 1),
            Redactor::new(key(3, 1), &[]).expect("redactor"),
        );
        let Err(error) = result else {
            panic!("corrupt database must fail");
        };
        assert_eq!(error.code(), SpoolErrorCode::Corrupt);
        assert!(!error.to_string().contains("not a sqlite"));
    }
}
