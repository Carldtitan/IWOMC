//! Provider-neutral action, attribution, and installed-state evidence.

use std::collections::BTreeSet;

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ActorClass {
    Human,
    Agent,
    Subagent,
    System,
    Unknown,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum AttributionClass {
    Human,
    Agent,
    Subagent,
    System,
    Mixed,
    Unknown,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ApprovalDecision {
    Approved,
    Denied,
    NotRequired,
    Unknown,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActorReference {
    pub class: ActorClass,
    pub pseudonymous_id: Option<String>,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ApprovalEvidence {
    pub decision: ApprovalDecision,
    pub actor: Option<ActorReference>,
    pub modified_before_execution: bool,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttributionEvidence {
    pub initiator: ActorReference,
    pub executor: ActorReference,
    pub approval: Option<ApprovalEvidence>,
    pub classification: AttributionClass,
    pub confidence: f64,
    pub factors: Vec<String>,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ActionOutcome {
    Attempted,
    Succeeded,
    Failed,
    Unknown,
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EffectState {
    Observed,
    NoEffect,
    Unknown,
    ContradictsProviderOutcome,
}

#[derive(Clone, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledPackage {
    pub ecosystem: String,
    pub name: String,
    pub version: String,
    pub layer_id: String,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledState {
    pub snapshot_id: String,
    pub packages: BTreeSet<InstalledPackage>,
}

#[derive(Clone, Debug, Default, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct InstalledStateDelta {
    pub added: BTreeSet<InstalledPackage>,
    pub removed: BTreeSet<InstalledPackage>,
}

impl InstalledStateDelta {
    #[must_use]
    pub fn between(before: &InstalledState, after: &InstalledState) -> Self {
        Self {
            added: after
                .packages
                .difference(&before.packages)
                .cloned()
                .collect(),
            removed: before
                .packages
                .difference(&after.packages)
                .cloned()
                .collect(),
        }
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.added.is_empty() && self.removed.is_empty()
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, Ord, PartialEq, PartialOrd, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CaptureGapCode {
    DisabledHook,
    InvalidProviderPayload,
    MissingPreState,
    MissingSequence,
    MissingTerminalEvent,
    ObserverLoss,
    OutOfOrderSequence,
    ProviderGroundTruthConflict,
    StabilizationTimeout,
    UnsupportedHostedExecution,
    UnsupportedRealm,
}

#[derive(Clone, Debug, Deserialize, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ActionEnvelope {
    pub schema_version: u16,
    pub event_id: String,
    pub provider: String,
    pub provider_event_id: String,
    pub session_id: String,
    pub turn_id: Option<String>,
    pub tool_call_id: Option<String>,
    pub subagent_id: Option<String>,
    pub source_sequence: Option<u64>,
    pub local_monotonic_nanos: u64,
    pub action_type: String,
    pub executable: Option<String>,
    pub arguments: Vec<String>,
    pub working_directory_pseudonym: Option<String>,
    pub terminal_id: Option<String>,
    pub process_id: Option<u32>,
    pub parent_process_ids: Vec<u32>,
    pub provider_process_id: Option<u32>,
    pub realm_id: String,
    pub layer_id: Option<String>,
    pub started_monotonic_nanos: Option<u64>,
    pub ended_monotonic_nanos: Option<u64>,
    pub attribution: AttributionEvidence,
    pub outcome: ActionOutcome,
    pub effect: EffectState,
    pub installed_state_delta: InstalledStateDelta,
    pub affected_path_pseudonyms: Vec<String>,
    pub gaps: BTreeSet<CaptureGapCode>,
    pub redaction_policy_version: String,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
#[allow(
    clippy::struct_excessive_bools,
    reason = "each flag records an independent correlation fact from the observer"
)]
pub struct CorrelationEvidence {
    pub explicit_provider_actor: Option<ActorClass>,
    pub executor_actor: Option<ActorClass>,
    pub provider_process_id: Option<u32>,
    pub process_id: Option<u32>,
    pub parent_process_ids: Vec<u32>,
    pub terminal_matches: bool,
    pub working_directory_matches: bool,
    pub realm_matches: bool,
    pub human_modified: bool,
    pub approval: Option<ApprovalEvidence>,
}

#[must_use]
pub fn correlate_attribution(evidence: &CorrelationEvidence) -> AttributionEvidence {
    let initiator_class = evidence
        .explicit_provider_actor
        .unwrap_or(ActorClass::Unknown);
    let executor_class = evidence.executor_actor.unwrap_or(ActorClass::Unknown);
    let mut factors = Vec::new();
    if evidence
        .provider_process_id
        .zip(evidence.process_id)
        .is_some_and(|(provider, process)| {
            provider == process || evidence.parent_process_ids.contains(&provider)
        })
    {
        factors.push("process_ancestry".to_owned());
    }
    if evidence.terminal_matches {
        factors.push("terminal_identity".to_owned());
    }
    if evidence.working_directory_matches {
        factors.push("working_directory".to_owned());
    }
    if evidence.realm_matches {
        factors.push("realm_identity".to_owned());
    }
    if evidence.explicit_provider_actor.is_some() {
        factors.push("provider_actor_id".to_owned());
    }
    if evidence.human_modified {
        factors.push("human_modified_before_execution".to_owned());
    }

    let classification = if evidence.human_modified
        || matches!(
            (initiator_class, executor_class),
            (ActorClass::Agent | ActorClass::Subagent, ActorClass::Human)
        ) {
        AttributionClass::Mixed
    } else {
        match (initiator_class, executor_class) {
            (ActorClass::Agent, ActorClass::Agent) => AttributionClass::Agent,
            (ActorClass::Subagent, ActorClass::Subagent | ActorClass::Agent) => {
                AttributionClass::Subagent
            }
            (ActorClass::Human, ActorClass::Human) => AttributionClass::Human,
            (ActorClass::System, ActorClass::System) => AttributionClass::System,
            _ => AttributionClass::Unknown,
        }
    };
    let explicit_factor_count = factors
        .iter()
        .filter(|factor| factor.as_str() != "human_modified_before_execution")
        .count();
    let confidence = match classification {
        AttributionClass::Unknown => 0.0,
        AttributionClass::Mixed => 0.8,
        _ if explicit_factor_count >= 3 => 0.95,
        _ if explicit_factor_count >= 1 => 0.65,
        _ => 0.25,
    };
    AttributionEvidence {
        initiator: ActorReference {
            class: initiator_class,
            pseudonymous_id: None,
        },
        executor: ActorReference {
            class: executor_class,
            pseudonymous_id: None,
        },
        approval: evidence.approval.clone(),
        classification,
        confidence,
        factors,
    }
}

#[must_use]
pub fn correlate_effect(
    outcome: ActionOutcome,
    before: Option<&InstalledState>,
    after: Option<&InstalledState>,
) -> (EffectState, InstalledStateDelta, BTreeSet<CaptureGapCode>) {
    let mut gaps = BTreeSet::new();
    let (Some(before), Some(after)) = (before, after) else {
        gaps.insert(CaptureGapCode::MissingPreState);
        return (EffectState::Unknown, InstalledStateDelta::default(), gaps);
    };
    let delta = InstalledStateDelta::between(before, after);
    let effect = if delta.is_empty() {
        EffectState::NoEffect
    } else if outcome == ActionOutcome::Failed {
        gaps.insert(CaptureGapCode::ProviderGroundTruthConflict);
        EffectState::ContradictsProviderOutcome
    } else {
        EffectState::Observed
    };
    (effect, delta, gaps)
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeSet;

    use super::{
        ActionOutcome, ActorClass, AttributionClass, CorrelationEvidence, EffectState,
        InstalledPackage, InstalledState, correlate_attribution, correlate_effect,
    };

    fn state(id: &str, packages: &[(&str, &str)]) -> InstalledState {
        InstalledState {
            snapshot_id: id.to_owned(),
            packages: packages
                .iter()
                .map(|(name, version)| InstalledPackage {
                    ecosystem: "npm".to_owned(),
                    name: (*name).to_owned(),
                    version: (*version).to_owned(),
                    layer_id: "project".to_owned(),
                })
                .collect::<BTreeSet<_>>(),
        }
    }

    #[test]
    fn failed_install_with_unchanged_inventory_has_no_effect() {
        let before = state("before", &[]);
        let after = state("after", &[]);
        let (effect, delta, gaps) =
            correlate_effect(ActionOutcome::Failed, Some(&before), Some(&after));
        assert_eq!(effect, EffectState::NoEffect);
        assert!(delta.is_empty());
        assert!(gaps.is_empty());
    }

    #[test]
    fn timing_without_explicit_correlation_never_claims_agent() {
        let attribution = correlate_attribution(&CorrelationEvidence::default());
        assert_eq!(attribution.classification, AttributionClass::Unknown);
        assert!(attribution.confidence.abs() < f64::EPSILON);
    }

    #[test]
    fn descendant_process_and_provider_ids_support_agent_attribution() {
        let attribution = correlate_attribution(&CorrelationEvidence {
            explicit_provider_actor: Some(ActorClass::Agent),
            executor_actor: Some(ActorClass::Agent),
            provider_process_id: Some(100),
            process_id: Some(102),
            parent_process_ids: vec![101, 100],
            terminal_matches: true,
            working_directory_matches: true,
            realm_matches: true,
            ..CorrelationEvidence::default()
        });
        assert_eq!(attribution.classification, AttributionClass::Agent);
        assert!((attribution.confidence - 0.95).abs() < f64::EPSILON);
        assert!(attribution.factors.contains(&"process_ancestry".to_owned()));
    }

    #[test]
    fn human_modification_forces_mixed_attribution() {
        let attribution = correlate_attribution(&CorrelationEvidence {
            explicit_provider_actor: Some(ActorClass::Agent),
            executor_actor: Some(ActorClass::Human),
            human_modified: true,
            ..CorrelationEvidence::default()
        });
        assert_eq!(attribution.classification, AttributionClass::Mixed);
    }
}
