//! Provider-neutral observation-lease lifecycle and descendant-process draining.

use std::{collections::BTreeSet, error::Error, fmt, time::Duration};

/// A conservative default that lets short-lived installers finish without keeping observation
/// open indefinitely.
pub const DEFAULT_DESCENDANT_DRAIN_TIMEOUT: Duration = Duration::from_secs(30);
const DEFAULT_DESCENDANT_DRAIN_TIMEOUT_NANOS: u64 = 30_000_000_000;

/// A short observer barrier prevents a temporarily empty process set from closing the lease before
/// a causally related child-start event is delivered.
pub const DEFAULT_DESCENDANT_QUIET_PERIOD: Duration = Duration::from_millis(250);
const DEFAULT_DESCENDANT_QUIET_PERIOD_NANOS: u64 = 250_000_000;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct DescendantDrainPolicy {
    quiet_period_nanos: u64,
    hard_timeout_nanos: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum DescendantDrainPolicyError {
    ZeroHardTimeout,
    QuietPeriodExceedsHardTimeout,
    DurationOverflow,
}

impl fmt::Display for DescendantDrainPolicyError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("invalid descendant-process drain policy")
    }
}

impl Error for DescendantDrainPolicyError {}

impl DescendantDrainPolicy {
    /// Create a validated policy whose hard deadline is always finite.
    ///
    /// # Errors
    ///
    /// Returns a classified error for a zero timeout, a quiet period longer than the hard timeout,
    /// or durations that cannot be represented by the monotonic nanosecond clock.
    pub fn new(
        quiet_period: Duration,
        hard_timeout: Duration,
    ) -> Result<Self, DescendantDrainPolicyError> {
        let quiet_period_nanos = duration_nanos(quiet_period)?;
        let hard_timeout_nanos = duration_nanos(hard_timeout)?;
        if hard_timeout_nanos == 0 {
            return Err(DescendantDrainPolicyError::ZeroHardTimeout);
        }
        if quiet_period_nanos > hard_timeout_nanos {
            return Err(DescendantDrainPolicyError::QuietPeriodExceedsHardTimeout);
        }
        Ok(Self {
            quiet_period_nanos,
            hard_timeout_nanos,
        })
    }

    #[must_use]
    pub fn standard() -> Self {
        Self {
            quiet_period_nanos: DEFAULT_DESCENDANT_QUIET_PERIOD_NANOS,
            hard_timeout_nanos: DEFAULT_DESCENDANT_DRAIN_TIMEOUT_NANOS,
        }
    }
}

impl Default for DescendantDrainPolicy {
    fn default() -> Self {
        Self::standard()
    }
}

fn duration_nanos(duration: Duration) -> Result<u64, DescendantDrainPolicyError> {
    u64::try_from(duration.as_nanos()).map_err(|_| DescendantDrainPolicyError::DurationOverflow)
}

/// A process identity includes its boot and start identity so PID reuse cannot inherit provenance.
#[derive(Clone, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub struct ProcessIdentity {
    pub boot_id: String,
    pub process_id: u32,
    pub started_monotonic_nanos: u64,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ProcessObserverHealth {
    Healthy,
    Lost,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ObservationLeaseState {
    Observing,
    Draining,
    Checkpointing,
    Ended,
    PartialCapture,
}

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd)]
pub enum ObservationLeaseGap {
    DescendantDrainTimeout,
    ObserverLoss,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct ObservationLeaseSnapshot {
    pub session_id: String,
    pub state: ObservationLeaseState,
    pub drain_deadline_monotonic_nanos: Option<u64>,
    pub live_descendants: BTreeSet<ProcessIdentity>,
    pub gaps: BTreeSet<ObservationLeaseGap>,
}

/// Owns one session's process lineage and bounded close transition.
///
/// Provider adapters request the end boundary. A platform process observer supplies process
/// identities and liveness, keeping provider claims separate from host ground truth.
#[derive(Clone, Debug)]
pub struct ObservationLease {
    session_id: String,
    provider_root: ProcessIdentity,
    policy: DescendantDrainPolicy,
    state: ObservationLeaseState,
    drain_deadline_monotonic_nanos: Option<u64>,
    quiet_since_monotonic_nanos: Option<u64>,
    known_lineage: BTreeSet<ProcessIdentity>,
    live_descendants: BTreeSet<ProcessIdentity>,
    gaps: BTreeSet<ObservationLeaseGap>,
}

impl ObservationLease {
    #[must_use]
    pub fn new(
        session_id: impl Into<String>,
        provider_root: ProcessIdentity,
        policy: DescendantDrainPolicy,
    ) -> Self {
        let known_lineage = BTreeSet::from([provider_root.clone()]);
        Self {
            session_id: session_id.into(),
            provider_root,
            policy,
            state: ObservationLeaseState::Observing,
            drain_deadline_monotonic_nanos: None,
            quiet_since_monotonic_nanos: None,
            known_lineage,
            live_descendants: BTreeSet::new(),
            gaps: BTreeSet::new(),
        }
    }

    /// Admit a process only when its exact parent identity already belongs to this lease.
    ///
    /// Returns `true` when the process was accepted as a descendant. Activity while draining resets
    /// the quiet barrier but never extends the hard deadline.
    pub fn record_process_start(
        &mut self,
        process: ProcessIdentity,
        parent: &ProcessIdentity,
        observed_monotonic_nanos: u64,
    ) -> bool {
        if !matches!(
            self.state,
            ObservationLeaseState::Observing | ObservationLeaseState::Draining
        ) || process.boot_id != self.provider_root.boot_id
            || !self.known_lineage.contains(parent)
        {
            return false;
        }
        let accepted = self.known_lineage.insert(process.clone());
        self.live_descendants.insert(process);
        if self.state == ObservationLeaseState::Draining {
            self.quiet_since_monotonic_nanos = None;
            self.advance(observed_monotonic_nanos, ProcessObserverHealth::Healthy);
        }
        accepted
    }

    /// Remove an exact process identity from the live set.
    ///
    /// The historical lineage remains available so a grandchild whose start is delivered after its
    /// parent's exit can still be correlated without trusting a reused PID.
    pub fn record_process_exit(
        &mut self,
        process: &ProcessIdentity,
        observed_monotonic_nanos: u64,
    ) -> bool {
        let removed = self.live_descendants.remove(process);
        if removed
            && self.state == ObservationLeaseState::Draining
            && self.live_descendants.is_empty()
        {
            self.quiet_since_monotonic_nanos = Some(observed_monotonic_nanos);
        }
        self.advance(observed_monotonic_nanos, ProcessObserverHealth::Healthy);
        removed
    }

    /// Request session closure without immediately releasing observation.
    ///
    /// Duplicate requests are idempotent and cannot move the original hard deadline.
    pub fn request_end(&mut self, observed_monotonic_nanos: u64) {
        if self.state != ObservationLeaseState::Observing {
            return;
        }
        self.state = ObservationLeaseState::Draining;
        self.drain_deadline_monotonic_nanos =
            Some(observed_monotonic_nanos.saturating_add(self.policy.hard_timeout_nanos));
        self.quiet_since_monotonic_nanos = self
            .live_descendants
            .is_empty()
            .then_some(observed_monotonic_nanos);
        self.advance(observed_monotonic_nanos, ProcessObserverHealth::Healthy);
    }

    /// Advance the drain using the observer's monotonic clock and current health.
    ///
    /// A lost observer makes the close partial immediately. A healthy drain enters checkpointing
    /// after a quiet barrier, or at the hard deadline if no descendants remain. Live descendants at
    /// the hard deadline produce an explicit timeout gap.
    pub fn advance(
        &mut self,
        observed_monotonic_nanos: u64,
        observer_health: ProcessObserverHealth,
    ) {
        if self.state != ObservationLeaseState::Draining {
            return;
        }
        if observer_health == ProcessObserverHealth::Lost {
            self.gaps.insert(ObservationLeaseGap::ObserverLoss);
            self.state = ObservationLeaseState::PartialCapture;
            return;
        }

        let Some(deadline) = self.drain_deadline_monotonic_nanos else {
            self.gaps.insert(ObservationLeaseGap::ObserverLoss);
            self.state = ObservationLeaseState::PartialCapture;
            return;
        };
        if observed_monotonic_nanos >= deadline {
            if self.live_descendants.is_empty() {
                self.state = ObservationLeaseState::Checkpointing;
            } else {
                self.gaps
                    .insert(ObservationLeaseGap::DescendantDrainTimeout);
                self.state = ObservationLeaseState::PartialCapture;
            }
            return;
        }

        if self.live_descendants.is_empty()
            && self.quiet_since_monotonic_nanos.is_some_and(|quiet_since| {
                observed_monotonic_nanos.saturating_sub(quiet_since)
                    >= self.policy.quiet_period_nanos
            })
        {
            self.state = ObservationLeaseState::Checkpointing;
        }
    }

    /// Mark the required session-end checkpoint durable.
    ///
    /// Returns `true` only for the valid `checkpointing -> ended` transition.
    pub fn checkpoint_completed(&mut self) -> bool {
        if self.state != ObservationLeaseState::Checkpointing {
            return false;
        }
        self.state = ObservationLeaseState::Ended;
        true
    }

    #[must_use]
    pub fn is_open(&self) -> bool {
        matches!(
            self.state,
            ObservationLeaseState::Observing
                | ObservationLeaseState::Draining
                | ObservationLeaseState::Checkpointing
        )
    }

    #[must_use]
    pub fn snapshot(&self) -> ObservationLeaseSnapshot {
        ObservationLeaseSnapshot {
            session_id: self.session_id.clone(),
            state: self.state,
            drain_deadline_monotonic_nanos: self.drain_deadline_monotonic_nanos,
            live_descendants: self.live_descendants.clone(),
            gaps: self.gaps.clone(),
        }
    }
}

#[cfg(test)]
mod tests {
    use std::time::Duration;

    use super::{
        DescendantDrainPolicy, ObservationLease, ObservationLeaseGap, ObservationLeaseState,
        ProcessIdentity, ProcessObserverHealth,
    };

    fn process(process_id: u32, started_monotonic_nanos: u64) -> ProcessIdentity {
        ProcessIdentity {
            boot_id: "boot-a".to_owned(),
            process_id,
            started_monotonic_nanos,
        }
    }

    fn policy() -> DescendantDrainPolicy {
        DescendantDrainPolicy::new(Duration::from_nanos(10), Duration::from_nanos(100))
            .expect("policy")
    }

    fn lease() -> ObservationLease {
        ObservationLease::new("session-1", process(10, 1), policy())
    }

    #[test]
    fn keeps_lease_open_until_the_last_descendant_exits_and_the_barrier_REDACTEDes() {
        let root = process(10, 1);
        let child = process(20, 2);
        let mut lease = lease();
        assert!(lease.record_process_start(child.clone(), &root, 5));

        lease.request_end(10);
        assert!(lease.is_open());
        assert_eq!(lease.snapshot().state, ObservationLeaseState::Draining);

        assert!(lease.record_process_exit(&child, 30));
        lease.advance(39, ProcessObserverHealth::Healthy);
        assert_eq!(lease.snapshot().state, ObservationLeaseState::Draining);
        lease.advance(40, ProcessObserverHealth::Healthy);
        assert_eq!(lease.snapshot().state, ObservationLeaseState::Checkpointing);
        assert!(lease.checkpoint_completed());
        assert_eq!(lease.snapshot().state, ObservationLeaseState::Ended);
        assert!(!lease.is_open());
    }

    #[test]
    fn descendant_activity_resets_quiet_time_without_extending_the_deadline() {
        let root = process(10, 1);
        let child = process(20, 2);
        let grandchild = process(30, 3);
        let mut lease = lease();
        lease.request_end(10);
        let deadline = lease.snapshot().drain_deadline_monotonic_nanos;

        assert!(lease.record_process_start(child.clone(), &root, 15));
        assert!(lease.record_process_exit(&child, 20));
        assert!(lease.record_process_start(grandchild.clone(), &child, 25));
        lease.request_end(90);

        assert_eq!(lease.snapshot().drain_deadline_monotonic_nanos, deadline);
        assert_eq!(lease.snapshot().state, ObservationLeaseState::Draining);
        assert!(lease.record_process_exit(&grandchild, 30));
        lease.advance(40, ProcessObserverHealth::Healthy);
        assert_eq!(lease.snapshot().state, ObservationLeaseState::Checkpointing);
    }

    #[test]
    fn hard_deadline_is_bounded_and_reports_live_descendants() {
        let root = process(10, 1);
        let child = process(20, 2);
        let mut lease = lease();
        assert!(lease.record_process_start(child.clone(), &root, 5));
        lease.request_end(10);

        lease.advance(109, ProcessObserverHealth::Healthy);
        assert_eq!(lease.snapshot().state, ObservationLeaseState::Draining);
        lease.advance(110, ProcessObserverHealth::Healthy);

        let snapshot = lease.snapshot();
        assert_eq!(snapshot.state, ObservationLeaseState::PartialCapture);
        assert!(snapshot.live_descendants.contains(&child));
        assert!(
            snapshot
                .gaps
                .contains(&ObservationLeaseGap::DescendantDrainTimeout)
        );
        assert!(!lease.is_open());
    }

    #[test]
    fn exact_process_identity_blocks_pid_reuse_and_cross_boot_lineage() {
        let root = process(10, 1);
        let reused_root = process(10, 999);
        let child = process(20, 2);
        let REDACTED_boot_child = ProcessIdentity {
            boot_id: "boot-b".to_owned(),
            ..process(30, 3)
        };
        let mut lease = lease();

        assert!(!lease.record_process_start(child.clone(), &reused_root, 5));
        assert!(!lease.record_process_start(REDACTED_boot_child, &root, 5));
        assert!(lease.record_process_start(child, &root, 5));
    }

    #[test]
    fn observer_loss_closes_as_partial_capture() {
        let mut lease = lease();
        lease.request_end(10);
        lease.advance(11, ProcessObserverHealth::Lost);

        let snapshot = lease.snapshot();
        assert_eq!(snapshot.state, ObservationLeaseState::PartialCapture);
        assert!(snapshot.gaps.contains(&ObservationLeaseGap::ObserverLoss));
        assert!(!lease.is_open());
    }

    #[test]
    fn empty_drain_waits_for_the_quiet_barrier_but_not_past_the_hard_deadline() {
        let mut lease = lease();
        lease.request_end(10);
        lease.advance(19, ProcessObserverHealth::Healthy);
        assert_eq!(lease.snapshot().state, ObservationLeaseState::Draining);
        lease.advance(20, ProcessObserverHealth::Healthy);
        assert_eq!(lease.snapshot().state, ObservationLeaseState::Checkpointing);

        let long_barrier =
            DescendantDrainPolicy::new(Duration::from_nanos(100), Duration::from_nanos(100))
                .expect("policy");
        let mut deadline_lease = ObservationLease::new("session-2", process(10, 1), long_barrier);
        deadline_lease.request_end(10);
        deadline_lease.advance(110, ProcessObserverHealth::Healthy);
        assert_eq!(
            deadline_lease.snapshot().state,
            ObservationLeaseState::Checkpointing
        );
    }
}
