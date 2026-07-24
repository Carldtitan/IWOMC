export type BehaviorStepKind =
  "install" | "build" | "lint" | "typecheck" | "test" | "smoke" | "benchmark";

export interface DiscoveredBehaviorStep {
  readonly arguments: readonly string[];
  readonly discoveryEvidence: readonly string[];
  readonly discoveryFingerprint: string;
  readonly enabled: boolean;
  readonly executable: "npm";
  readonly expectedExitStatuses: readonly [0];
  readonly kind: BehaviorStepKind;
  readonly order: number;
  readonly required: boolean;
  readonly stepId: string;
  readonly targetSelector: "project-default";
  readonly timeoutSeconds: number;
  readonly workingDirectory: string;
}

export interface ProjectBehaviorContract {
  readonly acceptedAt?: string;
  readonly acceptedBy?: string;
  readonly contractId: string;
  readonly invalidatedBySourceIds: readonly string[];
  readonly projectGoal: string;
  readonly projectId: string;
  readonly reviewState: "needs_review" | "accepted" | "invalidated";
  readonly steps: readonly DiscoveredBehaviorStep[];
  readonly version: number;
}

export interface PolicyBudgets {
  readonly maximumCandidates: number;
  readonly maximumConcurrentValidations: number;
  readonly maximumCostUsd: number;
  readonly maximumElapsedSeconds: number;
  readonly maximumRetriesPerTarget: number;
}

export interface DefaultOptimalityPolicy {
  readonly budgets: PolicyBudgets;
  readonly hardGates: readonly [
    "accepted_behavior_contract",
    "all_required_targets_pass",
    "native_manager_only",
    "lockfile_consistent",
    "secret_guard_passed"
  ];
  readonly objectives: readonly [
    "fewest_direct_dependencies",
    "highest_reproducibility",
    "supported_versions",
    "smallest_change_surface"
  ];
  readonly policyId: string;
  readonly projectId: string;
  readonly requiredTargetIds: readonly string[];
  readonly version: number;
}

export interface CandidatePolicyFacts {
  readonly acceptedBehaviorContract: boolean;
  readonly allRequiredTargetsPass: boolean;
  readonly dependencyCount: number;
  readonly lockfileConsistent: boolean;
  readonly nativeManagerOnly: boolean;
  readonly reproducibilityScore: number;
  readonly secretGuardPassed: boolean;
  readonly supportedVersions: boolean;
  readonly touchedFileCount: number;
}

export interface CandidatePolicyDecision {
  readonly eligibleForVerification: boolean;
  readonly failedHardGates: readonly string[];
  readonly preferenceTuple?: readonly [number, number, number, number];
  readonly resultClass: "verified_eligible" | "reconstruction_passed" | "policy_rejected";
}

const SCRIPT_ORDER: readonly BehaviorStepKind[] = [
  "build",
  "lint",
  "typecheck",
  "test",
  "smoke",
  "benchmark"
];

function stableId(prefix: string, ...parts: readonly string[]): string {
  const normalized = parts
    .join(":")
    .toLowerCase()
    .replaceAll(/[^a-z0-9:_-]/gu, "-");
  return `${prefix}_${normalized}`.slice(0, 160);
}

function fingerprint(value: unknown): string {
  const text = JSON.stringify(value);
  let hash = 2_166_136_261;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function asRecord(value: unknown): Readonly<Record<string, unknown>> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Readonly<Record<string, unknown>>)
    : undefined;
}

export function discoverNpmBehaviorContract(input: {
  readonly hasPackageLock: boolean;
  readonly packageJson: string;
  readonly projectGoal: string;
  readonly projectId: string;
  readonly workingDirectory?: string;
}): ProjectBehaviorContract {
  const manifest = asRecord(JSON.parse(input.packageJson) as unknown);
  if (manifest === undefined) {
    throw new Error("package_json_must_be_an_object");
  }
  const scripts = asRecord(manifest.scripts) ?? {};
  const workingDirectory = input.workingDirectory ?? ".";
  const steps: DiscoveredBehaviorStep[] = [];

  if (input.hasPackageLock) {
    steps.push(
      makeStep({
        arguments: ["ci", "--ignore-scripts=false"],
        evidence: ["package-lock.json"],
        kind: "install",
        order: steps.length,
        required: true,
        timeoutSeconds: 600,
        workingDirectory
      })
    );
  }

  for (const kind of SCRIPT_ORDER) {
    if (typeof scripts[kind] !== "string") {
      continue;
    }
    steps.push(
      makeStep({
        arguments: ["run", kind],
        evidence: [`package.json#/scripts/${kind}`],
        kind,
        order: steps.length,
        required: kind === "test" || kind === "build" || kind === "typecheck",
        timeoutSeconds: kind === "benchmark" ? 900 : 600,
        workingDirectory
      })
    );
  }

  if (steps.length === 0) {
    throw new Error("no_behavior_steps_discovered");
  }

  return {
    contractId: stableId("contract", input.projectId, "1"),
    invalidatedBySourceIds: [],
    projectGoal: input.projectGoal.trim(),
    projectId: input.projectId,
    reviewState: "needs_review",
    steps,
    version: 1
  };
}

function makeStep(input: {
  readonly arguments: readonly string[];
  readonly evidence: readonly string[];
  readonly kind: BehaviorStepKind;
  readonly order: number;
  readonly required: boolean;
  readonly timeoutSeconds: number;
  readonly workingDirectory: string;
}): DiscoveredBehaviorStep {
  const semanticInput = {
    arguments: input.arguments,
    evidence: input.evidence,
    kind: input.kind,
    workingDirectory: input.workingDirectory
  };
  return {
    arguments: input.arguments,
    discoveryEvidence: input.evidence,
    discoveryFingerprint: fingerprint(semanticInput),
    enabled: true,
    executable: "npm",
    expectedExitStatuses: [0],
    kind: input.kind,
    order: input.order,
    required: input.required,
    stepId: stableId("step", input.kind, fingerprint(semanticInput)),
    targetSelector: "project-default",
    timeoutSeconds: input.timeoutSeconds,
    workingDirectory: input.workingDirectory
  };
}

export function acceptBehaviorContract(
  contract: ProjectBehaviorContract,
  actorId: string,
  acceptedAt: string
): ProjectBehaviorContract {
  if (
    actorId.trim() === "" ||
    contract.steps.filter((step) => step.enabled && step.required).length === 0
  ) {
    throw new Error("contract_requires_actor_and_required_behavior");
  }
  return {
    ...contract,
    acceptedAt,
    acceptedBy: actorId,
    reviewState: "accepted"
  };
}

export function invalidateBehaviorContract(
  contract: ProjectBehaviorContract,
  sourceIds: readonly string[]
): ProjectBehaviorContract {
  const invalidatedBySourceIds = [...new Set(sourceIds)].sort();
  const { acceptedAt: _acceptedAt, acceptedBy: _acceptedBy, ...unaccepted } = contract;
  return {
    ...unaccepted,
    invalidatedBySourceIds,
    reviewState: "invalidated",
    version: contract.version + 1
  };
}

export function createDefaultOptimalityPolicy(input: {
  readonly projectId: string;
  readonly requiredTargetIds: readonly string[];
}): DefaultOptimalityPolicy {
  if (input.requiredTargetIds.length === 0) {
    throw new Error("at_least_one_validation_target_is_required");
  }
  return {
    budgets: {
      maximumCandidates: 3,
      maximumConcurrentValidations: 4,
      maximumCostUsd: 5,
      maximumElapsedSeconds: 1_800,
      maximumRetriesPerTarget: 2
    },
    hardGates: [
      "accepted_behavior_contract",
      "all_required_targets_pass",
      "native_manager_only",
      "lockfile_consistent",
      "secret_guard_passed"
    ],
    objectives: [
      "fewest_direct_dependencies",
      "highest_reproducibility",
      "supported_versions",
      "smallest_change_surface"
    ],
    policyId: stableId("policy", input.projectId, "1"),
    projectId: input.projectId,
    requiredTargetIds: [...new Set(input.requiredTargetIds)].sort(),
    version: 1
  };
}

export function evaluateCandidatePolicy(
  _policy: DefaultOptimalityPolicy,
  facts: CandidatePolicyFacts
): CandidatePolicyDecision {
  const failedHardGates: string[] = [];
  if (!facts.acceptedBehaviorContract) {
    failedHardGates.push("accepted_behavior_contract");
  }
  if (!facts.allRequiredTargetsPass) {
    failedHardGates.push("all_required_targets_pass");
  }
  if (!facts.nativeManagerOnly) {
    failedHardGates.push("native_manager_only");
  }
  if (!facts.lockfileConsistent) {
    failedHardGates.push("lockfile_consistent");
  }
  if (!facts.secretGuardPassed) {
    failedHardGates.push("secret_guard_passed");
  }

  if (!facts.acceptedBehaviorContract && failedHardGates.length === 1) {
    return {
      eligibleForVerification: false,
      failedHardGates,
      resultClass: "reconstruction_passed"
    };
  }
  if (failedHardGates.length > 0) {
    return {
      eligibleForVerification: false,
      failedHardGates,
      resultClass: "policy_rejected"
    };
  }
  return {
    eligibleForVerification: true,
    failedHardGates: [],
    preferenceTuple: [
      facts.dependencyCount,
      -facts.reproducibilityScore,
      facts.supportedVersions ? 0 : 1,
      facts.touchedFileCount
    ],
    resultClass: "verified_eligible"
  };
}
