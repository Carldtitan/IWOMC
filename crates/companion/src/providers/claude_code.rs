//! Claude Code local hook v1 adapter.
//!
//! The supported MVP surface is the local Claude Code hook bridge. Remote Claude
//! execution is deliberately reported unavailable because it has no in-realm observer.

use super::{
    codex::{AdapterOutput, CapabilityState, CodexCapabilities, ProviderCapabilityProfile},
    mapped::{LocalProviderConfig, LocalProviderError, MappedLocalAdapter},
};
use crate::redaction::Redactor;

pub const CLAUDE_CODE_ADAPTER_VERSION: &str = "claude-code-local-hook-adapter-v1";
pub const CLAUDE_CODE_LOCAL_SURFACE: &str = "claude-code-local-hook-v1";

pub type ClaudeCodeAdapterConfig = LocalProviderConfig;
pub type ClaudeCodeAdapterError = LocalProviderError;

pub struct ClaudeCodeAdapter {
    inner: MappedLocalAdapter,
}

impl ClaudeCodeAdapter {
    #[must_use]
    pub fn new(config: ClaudeCodeAdapterConfig, redactor: Redactor) -> Self {
        Self {
            inner: MappedLocalAdapter::new(
                "claude_code",
                CLAUDE_CODE_ADAPTER_VERSION,
                CLAUDE_CODE_LOCAL_SURFACE,
                config,
                CodexCapabilities {
                    session_lifecycle: CapabilityState::Supported,
                    tool_lifecycle: CapabilityState::Supported,
                    shell_commands: CapabilityState::Supported,
                    command_results: CapabilityState::Supported,
                    file_operations: CapabilityState::Supported,
                    permission_decisions: CapabilityState::Supported,
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

    /// Normalizes one versioned local hook document.
    ///
    /// # Errors
    ///
    /// Returns an error for malformed, unsupported, or mismatched documents.
    pub fn normalize(&mut self, bytes: &[u8]) -> Result<AdapterOutput, ClaudeCodeAdapterError> {
        self.inner.normalize(bytes)
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use super::{CLAUDE_CODE_LOCAL_SURFACE, ClaudeCodeAdapter, ClaudeCodeAdapterConfig};
    use crate::{
        REDACTEDs::{SecretKey, VersionedSecretKey},
        observation::{AttributionClass, CaptureGapCode},
        providers::codex::CapabilityState,
        redaction::Redactor,
    };

    const FIXTURE: &str =
        include_str!("../../../../fixtures/providers/claude-code/local-hook-v1.json");

    fn adapter(enabled: bool, hosted: bool) -> ClaudeCodeAdapter {
        ClaudeCodeAdapter::new(
            ClaudeCodeAdapterConfig {
                provider_version: "1.0.0-fixture".to_owned(),
                hooks_enabled: enabled,
                hosted_execution: hosted,
            },
            Redactor::new(
                VersionedSecretKey {
                    version: 1,
                    key: SecretKey::from_bytes([2; 32]),
                },
                &[],
            )
            .expect("redactor"),
        )
    }

    #[test]
    fn fixture_normalizes_to_shared_action_envelope_and_removes_private_fields() {
        let fixture: Value = serde_json::from_str(FIXTURE).expect("fixture");
        let mut adapter = adapter(true, false);
        let documents = fixture["documents"].as_array().expect("documents");
        let mut serialized = String::new();
        for document in documents {
            let output = adapter
                .normalize(&serde_json::to_vec(document).expect("document"))
                .expect("normalize");
            if let Some(event) = output.event {
                assert_eq!(event.provider, "claude_code");
                if let Some(ref action) = event.action {
                    assert_eq!(action.provider, "claude_code");
                    assert_ne!(action.attribution.classification, AttributionClass::Unknown);
                }
                serialized.push_str(&serde_json::to_string(&event).expect("serialize"));
            }
        }
        assert!(!serialized.contains("private reasoning"));
    }

    #[test]
    fn capability_negotiation_is_honest() {
        let profile = adapter(true, false).inspect();
        assert_eq!(profile.surface, CLAUDE_CODE_LOCAL_SURFACE);
        assert_eq!(profile.capabilities.subagents, CapabilityState::Partial);
        let hosted = adapter(true, true).inspect();
        assert!(
            hosted
                .known_gaps
                .contains(&CaptureGapCode::UnsupportedHostedExecution)
        );
        assert_eq!(
            hosted.capabilities.shell_commands,
            CapabilityState::Unavailable
        );
    }

    #[test]
    fn provider_version_changes_and_missing_terminal_events_are_not_silently_accepted() {
        let fixture: Value = serde_json::from_str(FIXTURE).expect("fixture");
        let mut changed = fixture["documents"][0].clone();
        changed["providerVersion"] = json!("new-unnegotiated-version");
        assert!(
            adapter(true, false)
                .normalize(&serde_json::to_vec(&changed).expect("document"))
                .is_err()
        );

        let mut open = fixture["documents"][1].clone();
        open["event"]["eventId"] = json!("open-command");
        open["event"]["sequence"] = json!(1);
        open["event"]["kind"] = json!("command_started");
        let mut ended = fixture["documents"][2].clone();
        ended["event"]["sequence"] = json!(2);
        let mut adapter = adapter(true, false);
        adapter
            .normalize(&serde_json::to_vec(&open).expect("document"))
            .expect("open");
        let output = adapter
            .normalize(&serde_json::to_vec(&ended).expect("document"))
            .expect("end");
        assert!(output.gaps.contains(&CaptureGapCode::MissingTerminalEvent));
    }
}
