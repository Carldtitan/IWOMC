//! Cursor local extension bridge v1 adapter.
//!
//! Cursor does not expose approval or subagent lifecycle parity on this surface,
//! so those capabilities remain partial instead of being inferred.

use super::{
    codex::{AdapterOutput, CapabilityState, CodexCapabilities, ProviderCapabilityProfile},
    mapped::{LocalProviderConfig, LocalProviderError, MappedLocalAdapter},
};
use crate::redaction::Redactor;

pub const CURSOR_ADAPTER_VERSION: &str = "cursor-extension-bridge-adapter-v1";
pub const CURSOR_LOCAL_SURFACE: &str = "cursor-extension-bridge-v1";

pub type CursorAdapterConfig = LocalProviderConfig;
pub type CursorAdapterError = LocalProviderError;

pub struct CursorAdapter {
    inner: MappedLocalAdapter,
}

impl CursorAdapter {
    #[must_use]
    pub fn new(config: CursorAdapterConfig, redactor: Redactor) -> Self {
        Self {
            inner: MappedLocalAdapter::new(
                "cursor",
                CURSOR_ADAPTER_VERSION,
                CURSOR_LOCAL_SURFACE,
                config,
                CodexCapabilities {
                    session_lifecycle: CapabilityState::Supported,
                    tool_lifecycle: CapabilityState::Partial,
                    shell_commands: CapabilityState::Supported,
                    command_results: CapabilityState::Supported,
                    file_operations: CapabilityState::Supported,
                    permission_decisions: CapabilityState::Partial,
                    subagents: CapabilityState::Partial,
                    source_sequence: CapabilityState::Supported,
                    raw_reasoning: CapabilityState::Unavailable,
                },
                redactor,
            ),
        }
    }

    #[must_use]
    pub fn inspect(&self) -> ProviderCapabilityProfile {
        self.inner.inspect()
    }

    /// Normalizes one versioned local extension-bridge document.
    ///
    /// # Errors
    ///
    /// Returns an error for malformed, unsupported, or mismatched documents.
    pub fn normalize(&mut self, bytes: &[u8]) -> Result<AdapterOutput, CursorAdapterError> {
        self.inner.normalize(bytes)
    }
}

#[cfg(test)]
mod tests {
    use serde_json::Value;

    use super::{CURSOR_LOCAL_SURFACE, CursorAdapter, CursorAdapterConfig};
    use crate::{
        credentials::{SecretKey, VersionedSecretKey},
        observation::CaptureGapCode,
        providers::codex::CapabilityState,
        redaction::Redactor,
    };

    const FIXTURE: &str =
        include_str!("../../../../fixtures/providers/cursor/extension-bridge-v1.json");

    fn adapter(enabled: bool) -> CursorAdapter {
        CursorAdapter::new(
            CursorAdapterConfig {
                provider_version: "0.50.0-fixture".to_owned(),
                hooks_enabled: enabled,
                hosted_execution: false,
            },
            Redactor::new(
                VersionedSecretKey {
                    version: 1,
                    key: SecretKey::from_bytes([3; 32]),
                },
                &[],
            )
            .expect("redactor"),
        )
    }

    #[test]
    fn fixture_supports_duplicate_detection_and_human_edits() {
        let fixture: Value = serde_json::from_str(FIXTURE).expect("fixture");
        let document = &fixture["documents"][0];
        let bytes = serde_json::to_vec(document).expect("document");
        let mut adapter = adapter(true);
        let first = adapter.normalize(&bytes).expect("first");
        let event = first.event.expect("event");
        assert!(
            !serde_json::to_string(&event)
                .expect("serialize")
                .contains("private prompt")
        );
        let action = event.action.expect("action");
        assert_eq!(action.provider, "cursor");
        assert!(action.attribution.approval.is_some());
        assert!(
            adapter
                .normalize(&bytes)
                .expect("duplicate")
                .duplicate_dropped
        );
    }

    #[test]
    fn disabled_bridge_is_an_explicit_capability_gap() {
        let profile = adapter(false).inspect();
        assert_eq!(profile.surface, CURSOR_LOCAL_SURFACE);
        assert_eq!(
            profile.capabilities.file_operations,
            CapabilityState::Unavailable
        );
        assert!(profile.known_gaps.contains(&CaptureGapCode::DisabledHook));
    }
}
