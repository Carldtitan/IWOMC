//! Deterministic append-only event hash chaining.

use sha2::{Digest, Sha256};

pub const GENESIS_HASH: [u8; 32] = [0_u8; 32];

#[must_use]
pub fn event_hash(
    local_sequence: u64,
    previous_hash: &[u8; 32],
    event_id: &str,
    source_sequence: Option<&str>,
    payload_digest: &[u8; 32],
) -> [u8; 32] {
    let mut hasher = Sha256::new();
    hasher.update(b"environment-reconciler:event-chain:v1\0");
    hasher.update(local_sequence.to_be_bytes());
    hasher.update(previous_hash);
    update_length_prefixed(&mut hasher, event_id.as_bytes());
    match source_sequence {
        Some(sequence) => {
            hasher.update([1]);
            update_length_prefixed(&mut hasher, sequence.as_bytes());
        }
        None => hasher.update([0]),
    }
    hasher.update(payload_digest);
    hasher.finalize().into()
}

fn update_length_prefixed(hasher: &mut Sha256, value: &[u8]) {
    hasher.update(u64::try_from(value.len()).unwrap_or(u64::MAX).to_be_bytes());
    hasher.update(value);
}

#[cfg(test)]
mod tests {
    use super::{GENESIS_HASH, event_hash};

    #[test]
    fn binds_sequence_parent_identity_source_sequence_and_payload() {
        let payload = [7_u8; 32];
        let first = event_hash(1, &GENESIS_HASH, "event-1", Some("provider-9"), &payload);
        assert_eq!(
            first,
            event_hash(1, &GENESIS_HASH, "event-1", Some("provider-9"), &payload)
        );
        assert_ne!(
            first,
            event_hash(2, &GENESIS_HASH, "event-1", Some("provider-9"), &payload)
        );
        assert_ne!(
            first,
            event_hash(1, &GENESIS_HASH, "event-1", None, &payload)
        );
        assert_ne!(
            first,
            event_hash(1, &GENESIS_HASH, "event-1", Some("provider-9"), &[8; 32])
        );
    }
}
