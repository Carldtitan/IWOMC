//! Independent component health reporting with REDACTED-free failure codes.

use std::{
    collections::BTreeMap,
    sync::{Arc, RwLock},
};

use serde::Serialize;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ComponentState {
    Healthy,
    Degraded,
    Unavailable,
    Unknown,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ComponentHealth {
    pub state: ComponentState,
    pub failure_code: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct HealthSnapshot {
    pub status: ComponentState,
    pub components: BTreeMap<String, ComponentHealth>,
    pub pending_events: u64,
    pub pending_batches: u64,
}

#[derive(Clone, Default)]
pub struct HealthReporter {
    inner: Arc<RwLock<HealthSnapshot>>,
}

impl Default for HealthSnapshot {
    fn default() -> Self {
        Self {
            status: ComponentState::Unknown,
            components: BTreeMap::new(),
            pending_events: 0,
            pending_batches: 0,
        }
    }
}

impl HealthReporter {
    pub fn set_component(
        &self,
        name: impl Into<String>,
        state: ComponentState,
        failure_code: Option<&str>,
    ) {
        let mut snapshot = self
            .inner
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        snapshot.components.insert(
            name.into(),
            ComponentHealth {
                state,
                failure_code: failure_code.map(ToOwned::to_owned),
            },
        );
        snapshot.status = aggregate(snapshot.components.values().map(|value| value.state));
    }

    pub fn set_queue_depth(&self, pending_events: u64, pending_batches: u64) {
        let mut snapshot = self
            .inner
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        snapshot.pending_events = pending_events;
        snapshot.pending_batches = pending_batches;
    }

    #[must_use]
    pub fn snapshot(&self) -> HealthSnapshot {
        self.inner
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .clone()
    }
}

fn aggregate(states: impl Iterator<Item = ComponentState>) -> ComponentState {
    states.fold(ComponentState::Healthy, |overall, state| {
        match (overall, state) {
            (_, ComponentState::Unavailable) | (ComponentState::Unavailable, _) => {
                ComponentState::Unavailable
            }
            (_, ComponentState::Degraded) | (ComponentState::Degraded, _) => {
                ComponentState::Degraded
            }
            (_, ComponentState::Unknown) | (ComponentState::Unknown, _) => ComponentState::Unknown,
            _ => ComponentState::Healthy,
        }
    })
}

#[cfg(test)]
mod tests {
    use super::{ComponentState, HealthReporter};

    #[test]
    fn reports_components_independently_and_aggregates_worst_state() {
        let reporter = HealthReporter::default();
        reporter.set_component("spool", ComponentState::Healthy, None);
        reporter.set_component(
            "provider.codex",
            ComponentState::Degraded,
            Some("hook_sequence_gap"),
        );
        reporter.set_queue_depth(12, 2);

        let snapshot = reporter.snapshot();
        assert_eq!(snapshot.status, ComponentState::Degraded);
        assert_eq!(snapshot.pending_events, 12);
        assert_eq!(
            snapshot.components["provider.codex"]
                .failure_code
                .as_deref(),
            Some("hook_sequence_gap")
        );
    }
}
