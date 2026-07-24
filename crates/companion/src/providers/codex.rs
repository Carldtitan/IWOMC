//! Codex local-hook v1 normalization.

use std::{
    collections::{BTreeSet, HashMap, HashSet},
    error::Error,
    fmt,
};

use serde::{Deserialize, Serialize};
use serde_json::Value;

use crate::{
    observation::{
        ActionEnvelope, ActionOutcome, ActorClass, ActorReference, ApprovalDecision,
        ApprovalEvidence, CaptureGapCode, CorrelationEvidence, InstalledState,
        correlate_attribution, correlate_effect,
    },
    redaction::{DEFAULT_REDACTION_POLICY_VERSION, Redactor},
};

pub const CODEX_HOOK_SCHEMA_VERSION: u16 = 1;
pub const CODEX_ADAPTER_VERSION: &str = "codex-local-hook-adapter-v1";
pub const CODEX_LOCAL_SURFACE: &str = "cli-local-hook-v1";

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CapabilityState {
    Supported,
    Partial,
    Unavailable,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CodexCapabilities {
    pub session_lifecycle: CapabilityState,
    pub tool_lifecycle: CapabilityState,
    pub shell_commands: CapabilityState,
    pub command_results: CapabilityState,
    pub file_operations: CapabilityState,
    pub permission_decisions: CapabilityState,
    pub subagents: CapabilityState,
    pub source_sequence: CapabilityState,
    pub raw_reasoning: CapabilityState,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderCapabilityProfile {
    pub provider: String,
    pub surface: String,
    pub provider_version: String,
    pub adapter_version: String,
    pub hooks_enabled: bool,
    pub capabilities: CodexCapabilities,
    pub known_gaps: BTreeSet<CaptureGapCode>,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CodexAdapterConfig {
    pub provider_version: String,
    pub surface: String,
    pub hooks_enabled: bool,
    pub hosted_execution: bool,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CodexEventKind {
    SessionStarted,
    SessionEnded,
    TurnStarted,
    TurnEnded,
    ToolStarted,
    ToolCompleted,
    ToolFailed,
    CommandStarted,
    CommandCompleted,
    CommandFailed,
    FileChanged,
    ApprovalRequested,
    ApprovalDecided,
    SubagentStarted,
    SubagentEnded,
    TerminalState,
}

#[derive(Clone, Debug, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct NormalizedCodexEvent {
    pub schema_version: u16,
    pub provider: String,
    pub provider_event_id: String,
    pub kind: CodexEventKind,
    pub session_id: String,
    pub turn_id: Option<String>,
    pub tool_call_id: Option<String>,
    pub subagent_id: Option<String>,
    pub source_sequence: Option<u64>,
    pub local_monotonic_nanos: u64,
    pub terminal_id: Option<String>,
    pub redacted_summary: Option<String>,
    pub action: Option<ActionEnvelope>,
    pub gaps: BTreeSet<CaptureGapCode>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CodexObservationBoundaryKind {
    Started,
    DrainRequested,
}

/// A provider lifecycle boundary for the Companion's process-observer-owned lease coordinator.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CodexObservationBoundary {
    pub kind: CodexObservationBoundaryKind,
    pub session_id: String,
    pub local_monotonic_nanos: u64,
    pub provider_process_id: Option<u32>,
}

#[derive(Clone, Debug, Default, PartialEq)]
pub struct AdapterOutput {
    pub event: Option<NormalizedCodexEvent>,
    pub observation_boundary: Option<CodexObservationBoundary>,
    pub gaps: BTreeSet<CaptureGapCode>,
    pub duplicate_dropped: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum CodexAdapterErrorCode {
    InvalidPayload,
    UnsupportedSchemaVersion,
    WrongProvider,
}

#[derive(Debug)]
pub struct CodexAdapterError {
    code: CodexAdapterErrorCode,
}

impl CodexAdapterError {
    const fn new(code: CodexAdapterErrorCode) -> Self {
        Self { code }
    }

    #[must_use]
    pub const fn code(&self) -> CodexAdapterErrorCode {
        self.code
    }
}

impl fmt::Display for CodexAdapterError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Codex hook payload normalization failed")
    }
}

impl Error for CodexAdapterError {}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct HookDocument {
    schema_version: u16,
    provider: String,
    surface: String,
    provider_version: String,
    event: RawCodexEvent,
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawCodexEvent {
    event_id: String,
    sequence: Option<u64>,
    kind: CodexEventKind,
    session_id: String,
    turn_id: Option<String>,
    tool_call_id: Option<String>,
    subagent_id: Option<String>,
    monotonic_nanos: u64,
    started_monotonic_nanos: Option<u64>,
    ended_monotonic_nanos: Option<u64>,
    realm_id: String,
    layer_id: Option<String>,
    actor: Option<ActorClass>,
    executor_actor: Option<ActorClass>,
    terminal_id: Option<String>,
    terminal_matches: Option<bool>,
    process_id: Option<u32>,
    parent_process_ids: Option<Vec<u32>>,
    provider_process_id: Option<u32>,
    working_directory: Option<String>,
    working_directory_matches: Option<bool>,
    realm_matches: Option<bool>,
    executable: Option<String>,
    arguments: Option<Vec<String>>,
    command_output: Option<String>,
    exit_code: Option<i32>,
    affected_paths: Option<Vec<String>>,
    human_modified: Option<bool>,
    approval: Option<RawApproval>,
    inventory_before: Option<InstalledState>,
    inventory_after: Option<InstalledState>,
    prompt: Option<Value>,
    reasoning: Option<Value>,
    raw_response: Option<Value>,
}

impl RawCodexEvent {
    fn discard_private_fields(&mut self) {
        self.prompt = None;
        self.reasoning = None;
        self.raw_response = None;
    }
}

#[derive(Clone, Debug, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct RawApproval {
    decision: ApprovalDecision,
    actor: Option<ActorClass>,
    modified_before_execution: bool,
}

#[derive(Default)]
struct SessionState {
    last_sequence: Option<u64>,
    open_terminal_actions: HashSet<String>,
    pending_before: HashMap<String, InstalledState>,
}

pub struct CodexAdapter {
    config: CodexAdapterConfig,
    redactor: Redactor,
    sessions: HashMap<String, SessionState>,
    seen_event_ids: HashSet<String>,
}

impl CodexAdapter {
    #[must_use]
    pub fn new(config: CodexAdapterConfig, redactor: Redactor) -> Self {
        Self {
            config,
            redactor,
            sessions: HashMap::new(),
            seen_event_ids: HashSet::new(),
        }
    }

    #[must_use]
    pub fn inspect(&self) -> ProviderCapabilityProfile {
        let unavailable = !self.config.hooks_enabled || self.config.hosted_execution;
        let state = if unavailable {
            CapabilityState::Unavailable
        } else {
            CapabilityState::Supported
        };
        let mut known_gaps = BTreeSet::new();
        if !self.config.hooks_enabled {
            known_gaps.insert(CaptureGapCode::DisabledHook);
        }
        if self.config.hosted_execution {
            known_gaps.insert(CaptureGapCode::UnsupportedHostedExecution);
        }
        ProviderCapabilityProfile {
            provider: "codex".to_owned(),
            surface: self.config.surface.clone(),
            provider_version: self.config.provider_version.clone(),
            adapter_version: CODEX_ADAPTER_VERSION.to_owned(),
            hooks_enabled: self.config.hooks_enabled,
            capabilities: CodexCapabilities {
                session_lifecycle: state,
                tool_lifecycle: state,
                shell_commands: state,
                command_results: state,
                file_operations: state,
                permission_decisions: state,
                subagents: state,
                source_sequence: state,
                raw_reasoning: CapabilityState::Unavailable,
            },
            known_gaps,
        }
    }

    /// Normalize one recorded local-hook document and advance per-session sequence state.
    ///
    /// Raw prompt, private reasoning, and raw response fields are accepted only so they can be
    /// discarded. They never enter the normalized event.
    ///
    /// # Errors
    ///
    /// Returns a non-secret-bearing error for malformed, wrong-provider, or unsupported-version
    /// payloads.
    pub fn normalize(&mut self, bytes: &[u8]) -> Result<AdapterOutput, CodexAdapterError> {
        let mut document: HookDocument = serde_json::from_slice(bytes)
            .map_err(|_| CodexAdapterError::new(CodexAdapterErrorCode::InvalidPayload))?;
        if document.schema_version != CODEX_HOOK_SCHEMA_VERSION {
            return Err(CodexAdapterError::new(
                CodexAdapterErrorCode::UnsupportedSchemaVersion,
            ));
        }
        if document.provider != "codex"
            || document.surface != self.config.surface
            || document.provider_version != self.config.provider_version
        {
            return Err(CodexAdapterError::new(CodexAdapterErrorCode::WrongProvider));
        }
        if !self.config.hooks_enabled {
            return Ok(AdapterOutput {
                gaps: BTreeSet::from([CaptureGapCode::DisabledHook]),
                ..AdapterOutput::default()
            });
        }
        if self.config.hosted_execution {
            return Ok(AdapterOutput {
                gaps: BTreeSet::from([CaptureGapCode::UnsupportedHostedExecution]),
                ..AdapterOutput::default()
            });
        }
        document.event.discard_private_fields();
        if !self.seen_event_ids.insert(document.event.event_id.clone()) {
            return Ok(AdapterOutput {
                duplicate_dropped: true,
                ..AdapterOutput::default()
            });
        }
        self.normalize_event(document.event)
    }

    fn normalize_event(&mut self, raw: RawCodexEvent) -> Result<AdapterOutput, CodexAdapterError> {
        validate_raw_event(&raw)?;
        let session = self.sessions.entry(raw.session_id.clone()).or_default();
        let mut gaps = BTreeSet::new();
        match raw.sequence {
            Some(sequence)
                if session
                    .last_sequence
                    .is_some_and(|previous| sequence <= previous) =>
            {
                gaps.insert(CaptureGapCode::OutOfOrderSequence);
                return Ok(AdapterOutput {
                    gaps,
                    ..AdapterOutput::default()
                });
            }
            Some(sequence) => session.last_sequence = Some(sequence),
            None => {
                gaps.insert(CaptureGapCode::MissingSequence);
            }
        }

        let action_key = raw
            .tool_call_id
            .clone()
            .unwrap_or_else(|| raw.event_id.clone());
        match raw.kind {
            CodexEventKind::SessionEnded => {
                if !session.open_terminal_actions.is_empty() {
                    gaps.insert(CaptureGapCode::MissingTerminalEvent);
                }
            }
            CodexEventKind::ToolStarted
            | CodexEventKind::CommandStarted
            | CodexEventKind::SubagentStarted => {
                session.open_terminal_actions.insert(action_key.clone());
            }
            CodexEventKind::ToolCompleted
            | CodexEventKind::ToolFailed
            | CodexEventKind::CommandCompleted
            | CodexEventKind::CommandFailed
            | CodexEventKind::SubagentEnded => {
                if !session.open_terminal_actions.remove(&action_key) {
                    gaps.insert(CaptureGapCode::MissingTerminalEvent);
                }
            }
            _ => {}
        }
        if raw.kind == CodexEventKind::CommandStarted
            && let Some(before) = &raw.inventory_before
        {
            session
                .pending_before
                .insert(action_key.clone(), before.clone());
        }
        let pending_before = session.pending_before.get(&action_key).cloned();
        if matches!(
            raw.kind,
            CodexEventKind::CommandCompleted | CodexEventKind::CommandFailed
        ) {
            session.pending_before.remove(&action_key);
        }

        let action = self.build_action(&raw, pending_before.as_ref(), &mut gaps);
        let observation_boundary = observation_boundary(&raw);
        let redacted_summary = raw
            .command_output
            .as_deref()
            .map(|output| self.redactor.redact_text(output, 4096).value);
        let event = NormalizedCodexEvent {
            schema_version: CODEX_HOOK_SCHEMA_VERSION,
            provider: "codex".to_owned(),
            provider_event_id: raw.event_id,
            kind: raw.kind,
            session_id: raw.session_id,
            turn_id: raw.turn_id,
            tool_call_id: raw.tool_call_id,
            subagent_id: raw.subagent_id,
            source_sequence: raw.sequence,
            local_monotonic_nanos: raw.monotonic_nanos,
            terminal_id: raw.terminal_id,
            redacted_summary,
            action,
            gaps: gaps.clone(),
        };
        Ok(AdapterOutput {
            event: Some(event),
            observation_boundary,
            gaps,
            duplicate_dropped: false,
        })
    }

    fn build_action(
        &self,
        raw: &RawCodexEvent,
        pending_before: Option<&InstalledState>,
        gaps: &mut BTreeSet<CaptureGapCode>,
    ) -> Option<ActionEnvelope> {
        if !matches!(
            raw.kind,
            CodexEventKind::CommandStarted
                | CodexEventKind::CommandCompleted
                | CodexEventKind::CommandFailed
                | CodexEventKind::FileChanged
        ) {
            return None;
        }
        let outcome = match raw.kind {
            CodexEventKind::CommandStarted => ActionOutcome::Attempted,
            CodexEventKind::CommandCompleted | CodexEventKind::FileChanged => {
                if raw.exit_code.is_some_and(|code| code != 0) {
                    ActionOutcome::Failed
                } else {
                    ActionOutcome::Succeeded
                }
            }
            CodexEventKind::CommandFailed => ActionOutcome::Failed,
            _ => ActionOutcome::Unknown,
        };
        let before = raw.inventory_before.as_ref().or(pending_before);
        let (effect, delta, effect_gaps) =
            correlate_effect(outcome, before, raw.inventory_after.as_ref());
        gaps.extend(effect_gaps);
        let approval = raw.approval.as_ref().map(|approval| ApprovalEvidence {
            decision: approval.decision,
            actor: approval.actor.map(|class| ActorReference {
                class,
                pseudonymous_id: None,
            }),
            modified_before_execution: approval.modified_before_execution,
        });
        let attribution = correlate_attribution(&CorrelationEvidence {
            explicit_provider_actor: raw.actor,
            executor_actor: raw.executor_actor.or(raw.actor),
            provider_process_id: raw.provider_process_id,
            process_id: raw.process_id,
            parent_process_ids: raw.parent_process_ids.clone().unwrap_or_default(),
            terminal_matches: raw.terminal_matches.unwrap_or(false),
            working_directory_matches: raw.working_directory_matches.unwrap_or(false),
            realm_matches: raw.realm_matches.unwrap_or(false),
            human_modified: raw.human_modified.unwrap_or(false),
            approval,
        });
        Some(ActionEnvelope {
            schema_version: 1,
            event_id: raw.event_id.clone(),
            provider: "codex".to_owned(),
            provider_event_id: raw.event_id.clone(),
            session_id: raw.session_id.clone(),
            turn_id: raw.turn_id.clone(),
            tool_call_id: raw.tool_call_id.clone(),
            subagent_id: raw.subagent_id.clone(),
            source_sequence: raw.sequence,
            local_monotonic_nanos: raw.monotonic_nanos,
            action_type: event_action_type(raw.kind).to_owned(),
            executable: raw
                .executable
                .as_deref()
                .map(|value| self.redactor.redact_text(value, 512).value),
            arguments: raw
                .arguments
                .as_deref()
                .unwrap_or_default()
                .iter()
                .map(|argument| self.redactor.redact_text(argument, 1024).value)
                .collect(),
            working_directory_pseudonym: raw
                .working_directory
                .as_deref()
                .map(|path| self.redactor.pseudonymize_path("repository", path)),
            terminal_id: raw.terminal_id.clone(),
            process_id: raw.process_id,
            parent_process_ids: raw.parent_process_ids.clone().unwrap_or_default(),
            provider_process_id: raw.provider_process_id,
            realm_id: raw.realm_id.clone(),
            layer_id: raw.layer_id.clone(),
            started_monotonic_nanos: raw.started_monotonic_nanos,
            ended_monotonic_nanos: raw.ended_monotonic_nanos,
            attribution,
            outcome,
            effect,
            installed_state_delta: delta,
            affected_path_pseudonyms: raw
                .affected_paths
                .as_deref()
                .unwrap_or_default()
                .iter()
                .map(|path| self.redactor.pseudonymize_path("repository-path", path))
                .collect(),
            gaps: gaps.clone(),
            redaction_policy_version: DEFAULT_REDACTION_POLICY_VERSION.to_owned(),
        })
    }
}

fn observation_boundary(raw: &RawCodexEvent) -> Option<CodexObservationBoundary> {
    let kind = match raw.kind {
        CodexEventKind::SessionStarted => CodexObservationBoundaryKind::Started,
        CodexEventKind::SessionEnded => CodexObservationBoundaryKind::DrainRequested,
        _ => return None,
    };
    Some(CodexObservationBoundary {
        kind,
        session_id: raw.session_id.clone(),
        local_monotonic_nanos: raw.monotonic_nanos,
        provider_process_id: raw.provider_process_id,
    })
}

fn validate_raw_event(raw: &RawCodexEvent) -> Result<(), CodexAdapterError> {
    let valid = !raw.event_id.is_empty()
        && !raw.session_id.is_empty()
        && !raw.realm_id.is_empty()
        && raw.event_id.len() <= 200
        && raw.session_id.len() <= 200;
    if valid {
        Ok(())
    } else {
        Err(CodexAdapterError::new(
            CodexAdapterErrorCode::InvalidPayload,
        ))
    }
}

const fn event_action_type(kind: CodexEventKind) -> &'static str {
    match kind {
        CodexEventKind::CommandStarted => "command.started",
        CodexEventKind::CommandCompleted => "command.completed",
        CodexEventKind::CommandFailed => "command.failed",
        CodexEventKind::FileChanged => "file.changed",
        _ => "provider.event",
    }
}

#[cfg(test)]
mod tests {
    use serde_json::{Value, json};

    use super::{
        CODEX_LOCAL_SURFACE, CapabilityState, CodexAdapter, CodexAdapterConfig,
        CodexAdapterErrorCode, CodexEventKind, CodexObservationBoundaryKind,
    };
    use crate::{
        credentials::{SecretKey, VersionedSecretKey},
        observation::{
            ActionOutcome, ActorClass, ApprovalDecision, AttributionClass, CaptureGapCode,
            EffectState,
        },
        redaction::Redactor,
    };

    const NORMAL_FIXTURE: &str =
        include_str!("../../../../fixtures/providers/codex/local-hook-v1.json");

    fn adapter() -> CodexAdapter {
        CodexAdapter::new(
            CodexAdapterConfig {
                provider_version: "0.1.0-fixture".to_owned(),
                surface: CODEX_LOCAL_SURFACE.to_owned(),
                hooks_enabled: true,
                hosted_execution: false,
            },
            Redactor::new(
                VersionedSecretKey {
                    version: 1,
                    key: SecretKey::from_bytes([7; 32]),
                },
                &[],
            )
            .expect("redactor"),
        )
    }

    fn document(sequence: u64, kind: &str, overrides: Value) -> Vec<u8> {
        let mut event = json!({
            "eventId": format!("event-{sequence}"),
            "sequence": sequence,
            "kind": kind,
            "sessionId": "session-1",
            "monotonicNanos": sequence * 100,
            "realmId": "host-1",
            "actor": "agent",
            "executorActor": "agent"
        });
        let Value::Object(overrides) = overrides else {
            panic!("override object");
        };
        event
            .as_object_mut()
            .expect("event object")
            .extend(overrides);
        serde_json::to_vec(&json!({
            "schemaVersion": 1,
            "provider": "codex",
            "surface": CODEX_LOCAL_SURFACE,
            "providerVersion": "0.1.0-fixture",
            "event": event
        }))
        .expect("document")
    }

    #[test]
    fn normal_fixture_covers_session_command_file_approval_subagent_and_terminal_events() {
        let fixture: Value = serde_json::from_str(NORMAL_FIXTURE).expect("fixture");
        let documents = fixture["documents"].as_array().expect("documents");
        let mut adapter = adapter();
        let mut kinds = Vec::new();
        let mut serialized = String::new();
        for document in documents {
            let output = adapter
                .normalize(&serde_json::to_vec(document).expect("document"))
                .expect("normalize");
            let event = output.event.expect("normalized event");
            kinds.push(event.kind);
            serialized.push_str(&serde_json::to_string(&event).expect("serialize"));
        }
        for kind in [
            CodexEventKind::SessionStarted,
            CodexEventKind::ToolStarted,
            CodexEventKind::CommandCompleted,
            CodexEventKind::FileChanged,
            CodexEventKind::ApprovalDecided,
            CodexEventKind::SubagentStarted,
            CodexEventKind::SubagentEnded,
            CodexEventKind::TerminalState,
            CodexEventKind::SessionEnded,
        ] {
            assert!(kinds.contains(&kind), "{kind:?}");
        }
        assert!(!serialized.contains("private fixture reasoning"));
        assert!(!serialized.contains("raw fixture prompt"));
        assert!(!serialized.contains("sk-test_"));
    }

    #[test]
    fn duplicate_and_out_of_order_events_do_not_create_actions() {
        let mut adapter = adapter();
        let first = document(2, "session_started", json!({}));
        assert!(adapter.normalize(&first).expect("first").event.is_some());
        assert!(
            adapter
                .normalize(&first)
                .expect("duplicate")
                .duplicate_dropped
        );
        let out_of_order = document(1, "command_completed", json!({}));
        let output = adapter.normalize(&out_of_order).expect("out of order");
        assert!(output.event.is_none());
        assert!(output.gaps.contains(&CaptureGapCode::OutOfOrderSequence));
    }

    #[test]
    fn session_end_requests_a_descendant_drain_boundary() {
        let mut adapter = adapter();
        let started = adapter
            .normalize(&document(
                1,
                "session_started",
                json!({"providerProcessId": 100}),
            ))
            .expect("start")
            .observation_boundary
            .expect("start boundary");
        assert_eq!(started.kind, CodexObservationBoundaryKind::Started);
        assert_eq!(started.provider_process_id, Some(100));

        let ended = adapter
            .normalize(&document(
                2,
                "session_ended",
                json!({"providerProcessId": 100}),
            ))
            .expect("end")
            .observation_boundary
            .expect("end boundary");
        assert_eq!(ended.kind, CodexObservationBoundaryKind::DrainRequested);
        assert_eq!(ended.session_id, "session-1");
        assert_eq!(ended.local_monotonic_nanos, 200);
    }

    #[test]
    fn failed_install_records_intent_without_installed_effect() {
        let mut adapter = adapter();
        let output = adapter
            .normalize(&document(
                1,
                "command_failed",
                json!({
                    "toolCallId": "install-1",
                    "executable": "npm",
                    "arguments": ["install", "hidden-runtime"],
                    "exitCode": 1,
                    "inventoryBefore": {"snapshotId":"before","packages":[]},
                    "inventoryAfter": {"snapshotId":"after","packages":[]}
                }),
            ))
            .expect("normalize");
        let action = output.event.expect("event").action.expect("action");
        assert_eq!(action.outcome, ActionOutcome::Failed);
        assert_eq!(action.effect, EffectState::NoEffect);
        assert!(action.installed_state_delta.is_empty());
    }

    #[test]
    fn install_then_remove_preserves_both_effects_even_when_final_state_matches() {
        let mut adapter = adapter();
        let package = json!({
            "ecosystem":"npm",
            "name":"hidden-runtime",
            "version":"1.0.0",
            "layerId":"project"
        });
        let install = adapter
            .normalize(&document(
                1,
                "command_completed",
                json!({
                    "toolCallId":"install",
                    "inventoryBefore":{"snapshotId":"a","packages":[]},
                    "inventoryAfter":{"snapshotId":"b","packages":[package.clone()]}
                }),
            ))
            .expect("install")
            .event
            .expect("event")
            .action
            .expect("action");
        let remove = adapter
            .normalize(&document(
                2,
                "command_completed",
                json!({
                    "toolCallId":"remove",
                    "inventoryBefore":{"snapshotId":"b","packages":[package]},
                    "inventoryAfter":{"snapshotId":"c","packages":[]}
                }),
            ))
            .expect("remove")
            .event
            .expect("event")
            .action
            .expect("action");
        assert_eq!(install.installed_state_delta.added.len(), 1);
        assert_eq!(remove.installed_state_delta.removed.len(), 1);
    }

    #[test]
    fn missing_terminal_unknown_actor_and_human_modification_remain_explicit() {
        let mut lifecycle_adapter = adapter();
        lifecycle_adapter
            .normalize(&document(
                1,
                "command_started",
                json!({"toolCallId":"open"}),
            ))
            .expect("start");
        let ended = lifecycle_adapter
            .normalize(&document(2, "session_ended", json!({})))
            .expect("end");
        assert!(ended.gaps.contains(&CaptureGapCode::MissingTerminalEvent));

        let mut unknown_adapter = adapter();
        let unknown = unknown_adapter
            .normalize(&document(
                1,
                "command_completed",
                json!({"actor":"unknown","executorActor":"unknown"}),
            ))
            .expect("unknown")
            .event
            .expect("event")
            .action
            .expect("action");
        assert_eq!(
            unknown.attribution.classification,
            AttributionClass::Unknown
        );

        let mut mixed_adapter = adapter();
        let mixed = mixed_adapter
            .normalize(&document(
                1,
                "command_completed",
                json!({
                    "executorActor":"human",
                    "humanModified":true,
                    "approval":{
                        "decision":"approved",
                        "actor":"human",
                        "modifiedBeforeExecution":true
                    }
                }),
            ))
            .expect("mixed")
            .event
            .expect("event")
            .action
            .expect("action");
        assert_eq!(mixed.attribution.classification, AttributionClass::Mixed);
        assert_eq!(
            mixed
                .attribution
                .approval
                .expect("approval")
                .actor
                .expect("actor")
                .class,
            ActorClass::Human
        );

        let mut approved_adapter = adapter();
        let approved = approved_adapter
            .normalize(&document(
                1,
                "command_completed",
                json!({
                    "approval":{
                        "decision":"approved",
                        "actor":"human",
                        "modifiedBeforeExecution":false
                    }
                }),
            ))
            .expect("approved")
            .event
            .expect("event")
            .action
            .expect("action");
        assert_eq!(approved.attribution.classification, AttributionClass::Agent);
        assert_eq!(
            approved.attribution.approval.expect("approval").decision,
            ApprovalDecision::Approved
        );
    }

    #[test]
    fn descendant_process_factors_and_hook_capability_gaps_are_honest() {
        let mut adapter = adapter();
        let action = adapter
            .normalize(&document(
                1,
                "command_completed",
                json!({
                    "providerProcessId":100,
                    "processId":102,
                    "parentProcessIds":[101,100],
                    "terminalMatches":true,
                    "workingDirectoryMatches":true,
                    "realmMatches":true
                }),
            ))
            .expect("descendant")
            .event
            .expect("event")
            .action
            .expect("action");
        assert_eq!(action.attribution.classification, AttributionClass::Agent);
        assert!((action.attribution.confidence - 0.95).abs() < f64::EPSILON);

        let disabled = CodexAdapter::new(
            CodexAdapterConfig {
                provider_version: "0.1.0-fixture".to_owned(),
                surface: CODEX_LOCAL_SURFACE.to_owned(),
                hooks_enabled: false,
                hosted_execution: false,
            },
            Redactor::new(
                VersionedSecretKey {
                    version: 1,
                    key: SecretKey::from_bytes([1; 32]),
                },
                &[],
            )
            .expect("redactor"),
        );
        let profile = disabled.inspect();
        assert_eq!(
            profile.capabilities.session_lifecycle,
            CapabilityState::Unavailable
        );
        assert!(profile.known_gaps.contains(&CaptureGapCode::DisabledHook));
    }

    #[test]
    fn concurrent_human_and_agent_actions_remain_separate_and_missing_sequence_is_a_gap() {
        let mut adapter = adapter();
        let agent = adapter
            .normalize(&document(
                1,
                "command_completed",
                json!({
                    "eventId":"agent-overlap",
                    "startedMonotonicNanos":100,
                    "endedMonotonicNanos":300,
                    "actor":"agent",
                    "executorActor":"agent"
                }),
            ))
            .expect("agent")
            .event
            .expect("agent event")
            .action
            .expect("agent action");
        let human = adapter
            .normalize(&document(
                2,
                "command_completed",
                json!({
                    "eventId":"human-overlap",
                    "startedMonotonicNanos":150,
                    "endedMonotonicNanos":250,
                    "actor":"human",
                    "executorActor":"human"
                }),
            ))
            .expect("human")
            .event
            .expect("human event")
            .action
            .expect("human action");
        assert_ne!(agent.event_id, human.event_id);
        assert_eq!(agent.attribution.classification, AttributionClass::Agent);
        assert_eq!(human.attribution.classification, AttributionClass::Human);

        let mut missing: Value =
            serde_json::from_slice(&document(3, "terminal_state", json!({}))).expect("JSON");
        missing["event"]
            .as_object_mut()
            .expect("event")
            .remove("sequence");
        let output = adapter
            .normalize(&serde_json::to_vec(&missing).expect("JSON"))
            .expect("missing sequence");
        assert!(output.gaps.contains(&CaptureGapCode::MissingSequence));
    }

    #[test]
    fn rejects_wrong_version_without_echoing_payload() {
        let mut adapter = adapter();
        let invalid = document(1, "session_started", json!({}));
        let mut value: Value = serde_json::from_slice(&invalid).expect("json");
        value["schemaVersion"] = json!(2);
        let error = adapter
            .normalize(&serde_json::to_vec(&value).expect("json"))
            .expect_err("version");
        assert_eq!(
            error.code(),
            CodexAdapterErrorCode::UnsupportedSchemaVersion
        );
    }
}
