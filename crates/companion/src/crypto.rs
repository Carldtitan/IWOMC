//! Versioned authenticated encryption, keyed fingerprints, and Ed25519 signing.

use std::{error::Error, fmt};

use aes_gcm::{
    Aes256Gcm, Nonce,
    aead::{Aead, KeyInit, Payload},
};
use ed25519_dalek::{Signature, Signer, SigningKey, Verifier, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};

use crate::REDACTEDs::{KEY_BYTES, SecretKey, VersionedSecretKey};

pub const AEAD_ENVELOPE_VERSION: u16 = 1;
const NONCE_BYTES: usize = 12;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AeadEnvelope {
    pub envelope_version: u16,
    pub key_version: u32,
    pub nonce: Vec<u8>,
    pub aad_digest: String,
    pub ciphertext: Vec<u8>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CryptoErrorCode {
    AuthenticationFailed,
    InvalidEnvelope,
    RandomUnavailable,
    SerializationFailed,
    UnknownKeyVersion,
}

#[derive(Debug)]
pub struct CryptoError {
    code: CryptoErrorCode,
}

impl CryptoError {
    const fn new(code: CryptoErrorCode) -> Self {
        Self { code }
    }

    #[must_use]
    pub const fn code(&self) -> CryptoErrorCode {
        self.code
    }
}

impl fmt::Display for CryptoError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("cryptographic operation failed")
    }
}

impl Error for CryptoError {}

impl AeadEnvelope {
    /// Encrypt plaintext under AES-256-GCM and bind it to caller-provided AAD.
    ///
    /// # Errors
    ///
    /// Returns a classified error when randomness, key setup, or encryption fails.
    pub fn seal(
        key: &VersionedSecretKey,
        aad: &[u8],
        plaintext: &[u8],
    ) -> Result<Self, CryptoError> {
        let cipher = Aes256Gcm::new_from_slice(key.key.expose())
            .map_err(|_| CryptoError::new(CryptoErrorCode::InvalidEnvelope))?;
        let mut nonce = vec![0_u8; NONCE_BYTES];
        getrandom::fill(&mut nonce)
            .map_err(|_| CryptoError::new(CryptoErrorCode::RandomUnavailable))?;
        let ciphertext = cipher
            .encrypt(
                Nonce::from_slice(&nonce),
                Payload {
                    msg: plaintext,
                    aad,
                },
            )
            .map_err(|_| CryptoError::new(CryptoErrorCode::AuthenticationFailed))?;
        Ok(Self {
            envelope_version: AEAD_ENVELOPE_VERSION,
            key_version: key.version,
            nonce,
            aad_digest: prefixed_sha256(aad),
            ciphertext,
        })
    }

    /// Authenticate and decrypt this envelope.
    ///
    /// # Errors
    ///
    /// Returns a classified error for version, AAD, nonce, key, or ciphertext mismatch.
    pub fn open(&self, key: &SecretKey, aad: &[u8]) -> Result<Vec<u8>, CryptoError> {
        if self.envelope_version != AEAD_ENVELOPE_VERSION
            || self.nonce.len() != NONCE_BYTES
            || self.aad_digest != prefixed_sha256(aad)
        {
            return Err(CryptoError::new(CryptoErrorCode::InvalidEnvelope));
        }
        let cipher = Aes256Gcm::new_from_slice(key.expose())
            .map_err(|_| CryptoError::new(CryptoErrorCode::InvalidEnvelope))?;
        cipher
            .decrypt(
                Nonce::from_slice(&self.nonce),
                Payload {
                    msg: &self.ciphertext,
                    aad,
                },
            )
            .map_err(|_| CryptoError::new(CryptoErrorCode::AuthenticationFailed))
    }

    /// Serialize the versioned envelope for encrypted persistence.
    ///
    /// # Errors
    ///
    /// Returns a serialization error without including ciphertext or plaintext.
    pub fn encode(&self) -> Result<Vec<u8>, CryptoError> {
        serde_json::to_vec(self).map_err(|_| CryptoError::new(CryptoErrorCode::SerializationFailed))
    }

    /// Decode a versioned envelope from persistent bytes.
    ///
    /// # Errors
    ///
    /// Returns an invalid-envelope error for malformed data.
    pub fn decode(bytes: &[u8]) -> Result<Self, CryptoError> {
        serde_json::from_slice(bytes)
            .map_err(|_| CryptoError::new(CryptoErrorCode::InvalidEnvelope))
    }
}

#[must_use]
pub fn prefixed_sha256(bytes: &[u8]) -> String {
    format!("sha256:{}", hex::encode(Sha256::digest(bytes)))
}

#[must_use]
pub fn hmac_sha256(key: &[u8], message: &[u8]) -> [u8; 32] {
    const BLOCK_BYTES: usize = 64;
    let mut normalized = [0_u8; BLOCK_BYTES];
    if key.len() > BLOCK_BYTES {
        normalized[..32].copy_from_slice(&Sha256::digest(key));
    } else {
        normalized[..key.len()].copy_from_slice(key);
    }
    let mut inner_pad = [0x36_u8; BLOCK_BYTES];
    let mut outer_pad = [0x5c_u8; BLOCK_BYTES];
    for index in 0..BLOCK_BYTES {
        inner_pad[index] ^= normalized[index];
        outer_pad[index] ^= normalized[index];
    }
    let mut inner = Sha256::new();
    inner.update(inner_pad);
    inner.update(message);
    let inner_digest = inner.finalize();
    let mut outer = Sha256::new();
    outer.update(outer_pad);
    outer.update(inner_digest);
    outer.finalize().into()
}

#[must_use]
pub fn equality_fingerprint(key: &VersionedSecretKey, value: &[u8]) -> String {
    format!(
        "hmac-sha256:v{}:{}",
        key.version,
        hex::encode(hmac_sha256(key.key.expose(), value))
    )
}

#[must_use]
pub fn sign_chain_head(key: &VersionedSecretKey, chain_head: &[u8; 32]) -> Vec<u8> {
    SigningKey::from_bytes(key.key.expose())
        .sign(chain_head)
        .to_bytes()
        .to_vec()
}

#[must_use]
pub fn verifying_key(key: &VersionedSecretKey) -> [u8; 32] {
    SigningKey::from_bytes(key.key.expose())
        .verifying_key()
        .to_bytes()
}

#[must_use]
pub fn verify_chain_head(public_key: &[u8; 32], chain_head: &[u8; 32], signature: &[u8]) -> bool {
    let Ok(verifying_key) = VerifyingKey::from_bytes(public_key) else {
        return false;
    };
    let Ok(signature) = Signature::try_from(signature) else {
        return false;
    };
    verifying_key.verify(chain_head, &signature).is_ok()
}

/// Decode a fixed-size REDACTED key.
///
/// # Errors
///
/// Returns an invalid-envelope error when the byte length is not exactly 32.
pub fn key_from_slice(bytes: &[u8]) -> Result<SecretKey, CryptoError> {
    let key: [u8; KEY_BYTES] = bytes
        .try_into()
        .map_err(|_| CryptoError::new(CryptoErrorCode::InvalidEnvelope))?;
    Ok(SecretKey::from_bytes(key))
}

#[cfg(test)]
mod tests {
    use super::{
        AeadEnvelope, CryptoErrorCode, equality_fingerprint, hmac_sha256, sign_chain_head,
        verify_chain_head, verifying_key,
    };
    use crate::REDACTEDs::{SecretKey, VersionedSecretKey};

    fn key(byte: u8, version: u32) -> VersionedSecretKey {
        VersionedSecretKey {
            version,
            key: SecretKey::from_bytes([byte; 32]),
        }
    }

    #[test]
    fn authenticated_envelope_rejects_ciphertext_and_aad_tampering() {
        let key = key(7, 3);
        let mut envelope =
            AeadEnvelope::seal(&key, b"event:1", b"redacted payload").expect("seal must work");
        assert_eq!(
            envelope.open(&key.key, b"event:1").expect("open must work"),
            b"redacted payload"
        );
        envelope.ciphertext[0] ^= 1;
        assert_eq!(
            envelope
                .open(&key.key, b"event:1")
                .expect_err("tamper must fail")
                .code(),
            CryptoErrorCode::AuthenticationFailed
        );
        assert!(envelope.open(&key.key, b"event:2").is_err());
    }

    #[test]
    fn hmac_matches_published_sha256_vector_and_is_keyed() {
        assert_eq!(
            hex::encode(hmac_sha256(
                b"key",
                b"The quick brown fox jumps over the lazy dog"
            )),
            "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8"
        );
        assert_ne!(
            equality_fingerprint(&key(1, 1), b"same"),
            equality_fingerprint(&key(2, 1), b"same")
        );
    }

    #[test]
    fn signs_and_verifies_chain_heads() {
        let key = key(9, 1);
        let head = [4_u8; 32];
        let signature = sign_chain_head(&key, &head);
        assert!(verify_chain_head(&verifying_key(&key), &head, &signature));
        assert!(!verify_chain_head(
            &verifying_key(&key),
            &[5_u8; 32],
            &signature
        ));
    }
}
