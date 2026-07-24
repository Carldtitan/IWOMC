import type {
  CanonicalJsonValue,
  DaytonaSandboxTarget,
  Sha256Digest
} from "@environment-reconciler/integrations/ports";

export type TargetRequirementSource = "workspace-policy" | "repository" | "ci" | "user";

export interface ValidationTargetConstraint {
  readonly architecture?: string;
  readonly nodeVersion?: string;
  readonly npmVersion?: string;
  readonly operatingSystem?: string;
  readonly requiredCapabilities?: readonly string[];
  readonly source: TargetRequirementSource;
  readonly sourceReference: string;
}

export interface ImmutableMvpTargetCapability {
  readonly architecture: "amd64";
  readonly baseIdentity: {
    readonly baselineInventoryDigest: Sha256Digest;
    readonly capabilityReportDigest: Sha256Digest;
    readonly capabilityReportId: string;
    readonly createdAt: string;
    readonly snapshotDigest: Sha256Digest;
    readonly snapshotId: string;
  };
  readonly egress: {
    readonly capabilityDigest: Sha256Digest;
    readonly registryHosts: readonly string[];
    readonly supportsDenyAll: boolean;
    readonly supportsDomainAllowlist: boolean;
  };
  readonly imageReference: string;
  readonly nodeVersion: string;
  readonly npmVersion: string;
  readonly operatingSystem: "linux";
  readonly providedCapabilities: readonly string[];
  readonly resources: {
    readonly capabilityDigest: Sha256Digest;
    readonly maximumCpuCores: number;
    readonly maximumDiskMiB: number;
    readonly maximumMemoryMiB: number;
  };
  readonly targetId: string;
}

export interface ValidationTargetDerivationInput {
  readonly availableMvpTarget: ImmutableMvpTargetCapability;
  readonly ciMatrixTargets: readonly ValidationTargetConstraint[];
  readonly repositorySelectors: readonly ValidationTargetConstraint[];
  readonly userConfirmedTargets: readonly ValidationTargetConstraint[];
  readonly workspacePolicy: {
    readonly allowMvpDefaultWhenUnspecified: boolean;
    readonly egress:
      | { readonly mode: "deny-all" }
      | {
          readonly allowedRegistryHosts: readonly string[];
          readonly mode: "registry-allowlist";
        };
    readonly policyVersion: string;
    readonly requiredTargets: readonly ValidationTargetConstraint[];
    readonly resources: {
      readonly cpuCores: number;
      readonly diskMiB: number;
      readonly memoryMiB: number;
    };
  };
}

export interface DerivedMvpValidationTarget {
  readonly architecture: "amd64";
  readonly baseIdentity: ImmutableMvpTargetCapability["baseIdentity"];
  readonly capabilityIdentity: {
    readonly capabilityReportDigest: Sha256Digest;
    readonly capabilityReportId: string;
    readonly egressCapabilityDigest: Sha256Digest;
    readonly resourceCapabilityDigest: Sha256Digest;
  };
  readonly managerSelections: { readonly npm: string };
  readonly networkPolicy:
    | {
        readonly allowedHosts: readonly [];
        readonly enforcement: "provider-enforced";
        readonly mode: "deny-all";
      }
    | {
        readonly allowedHosts: readonly string[];
        readonly enforcement: "provider-enforced";
        readonly mode: "registry-allowlist";
      };
  readonly operatingSystem: "linux";
  readonly policyVersion: string;
  readonly resourcePolicy: {
    readonly cpuCores: number;
    readonly diskMiB: number;
    readonly memoryMiB: number;
  };
  readonly runtimeSelections: { readonly node: string };
  readonly sandboxTarget: DaytonaSandboxTarget;
  readonly sourceRequirements: readonly {
    readonly source: TargetRequirementSource;
    readonly sourceReference: string;
  }[];
  readonly targetDigest: Sha256Digest;
  readonly targetId: string;
}

export type ValidationTargetDerivationResult =
  | {
      readonly status: "supported";
      readonly target: DerivedMvpValidationTarget;
    }
  | {
      readonly status: "unsupported_target_or_capability";
      readonly unsupported: readonly {
        readonly reason:
          | "capability_unavailable"
          | "egress_unavailable"
          | "invalid_or_missing_requirement"
          | "resource_unavailable"
          | "target_unavailable";
        readonly source: TargetRequirementSource | "planner";
        readonly sourceReference: string;
      }[];
    };

export class ValidationTargetDerivationError extends Error {
  readonly code: "invalid_capability_catalog" | "invalid_policy";

  constructor(code: ValidationTargetDerivationError["code"]) {
    super(code);
    this.name = "ValidationTargetDerivationError";
    this.code = code;
  }
}

/**
 * MVP planner: it can prove exactly one immutable Linux/Node/npm target. Any
 * additional or unavailable required target makes the whole derivation
 * unsupported; required matrix entries are never silently dropped.
 */
export async function deriveMvpValidationTarget(
  input: ValidationTargetDerivationInput
): Promise<ValidationTargetDerivationResult> {
  validateInput(input);
  const requirements = [
    ...input.workspacePolicy.requiredTargets,
    ...input.repositorySelectors,
    ...input.ciMatrixTargets,
    ...input.userConfirmedTargets
  ];
  if (requirements.length === 0 && !input.workspacePolicy.allowMvpDefaultWhenUnspecified) {
    return unsupported([
      {
        reason: "invalid_or_missing_requirement",
        source: "planner",
        sourceReference: "no-required-target"
      }
    ]);
  }

  const failures: Extract<
    ValidationTargetDerivationResult,
    { status: "unsupported_target_or_capability" }
  >["unsupported"][number][] = [];
  for (const requirement of requirements) {
    if (!validRequirement(requirement)) {
      failures.push({
        reason: "invalid_or_missing_requirement",
        source: requirement.source,
        sourceReference: requirement.sourceReference
      });
      continue;
    }
    if (!matchesAvailableTarget(requirement, input.availableMvpTarget)) {
      failures.push({
        reason: "target_unavailable",
        source: requirement.source,
        sourceReference: requirement.sourceReference
      });
      continue;
    }
    const availableCapabilities = new Set(input.availableMvpTarget.providedCapabilities);
    if (
      requirement.requiredCapabilities?.some(
        (capability) => !availableCapabilities.has(capability)
      ) === true
    ) {
      failures.push({
        reason: "capability_unavailable",
        source: requirement.source,
        sourceReference: requirement.sourceReference
      });
    }
  }

  const resources = input.workspacePolicy.resources;
  const capacity = input.availableMvpTarget.resources;
  if (
    resources.cpuCores > capacity.maximumCpuCores ||
    resources.diskMiB > capacity.maximumDiskMiB ||
    resources.memoryMiB > capacity.maximumMemoryMiB
  ) {
    failures.push({
      reason: "resource_unavailable",
      source: "workspace-policy",
      sourceReference: input.workspacePolicy.policyVersion
    });
  }

  const networkPolicy = deriveNetworkPolicy(input, failures);
  if (failures.length > 0 || networkPolicy === undefined) {
    return unsupported(failures);
  }

  const capability = input.availableMvpTarget;
  const sourceRequirements = requirements
    .map((requirement) => ({
      source: requirement.source,
      sourceReference: requirement.sourceReference
    }))
    .sort((left, right) =>
      `${left.source}:${left.sourceReference}`.localeCompare(
        `${right.source}:${right.sourceReference}`
      )
    );
  const targetWithoutDigest = {
    architecture: capability.architecture,
    baseIdentity: capability.baseIdentity,
    capabilityIdentity: {
      capabilityReportDigest: capability.baseIdentity.capabilityReportDigest,
      capabilityReportId: capability.baseIdentity.capabilityReportId,
      egressCapabilityDigest: capability.egress.capabilityDigest,
      resourceCapabilityDigest: capability.resources.capabilityDigest
    },
    managerSelections: { npm: capability.npmVersion },
    networkPolicy,
    operatingSystem: capability.operatingSystem,
    policyVersion: input.workspacePolicy.policyVersion,
    resourcePolicy: {
      cpuCores: resources.cpuCores,
      diskMiB: resources.diskMiB,
      memoryMiB: resources.memoryMiB
    },
    runtimeSelections: { node: capability.nodeVersion },
    sandboxTarget: {
      architecture: capability.architecture,
      cpuCores: resources.cpuCores,
      diskMiB: resources.diskMiB,
      imageDigest: capability.baseIdentity.snapshotDigest,
      imageReference: capability.imageReference,
      memoryMiB: resources.memoryMiB,
      operatingSystem: capability.operatingSystem
    },
    sourceRequirements,
    targetId: capability.targetId
  } satisfies Omit<DerivedMvpValidationTarget, "targetDigest">;

  return {
    status: "supported",
    target: {
      ...targetWithoutDigest,
      targetDigest: await sha256Canonical(toCanonicalJson(targetWithoutDigest))
    }
  };
}

function deriveNetworkPolicy(
  input: ValidationTargetDerivationInput,
  failures: {
    reason:
      | "capability_unavailable"
      | "egress_unavailable"
      | "invalid_or_missing_requirement"
      | "resource_unavailable"
      | "target_unavailable";
    source: TargetRequirementSource | "planner";
    sourceReference: string;
  }[]
): DerivedMvpValidationTarget["networkPolicy"] | undefined {
  const requested = input.workspacePolicy.egress;
  const available = input.availableMvpTarget.egress;
  if (requested.mode === "deny-all") {
    if (!available.supportsDenyAll) {
      failures.push({
        reason: "egress_unavailable",
        source: "workspace-policy",
        sourceReference: input.workspacePolicy.policyVersion
      });
      return undefined;
    }
    return { allowedHosts: [], enforcement: "provider-enforced", mode: "deny-all" };
  }
  const availableHosts = new Set(available.registryHosts);
  const requestedHosts = [...new Set(requested.allowedRegistryHosts)].sort();
  if (
    !available.supportsDomainAllowlist ||
    requestedHosts.length === 0 ||
    requestedHosts.some((host) => !availableHosts.has(host))
  ) {
    failures.push({
      reason: "egress_unavailable",
      source: "workspace-policy",
      sourceReference: input.workspacePolicy.policyVersion
    });
    return undefined;
  }
  return {
    allowedHosts: requestedHosts,
    enforcement: "provider-enforced",
    mode: "registry-allowlist"
  };
}

function matchesAvailableTarget(
  requirement: ValidationTargetConstraint,
  available: ImmutableMvpTargetCapability
): boolean {
  return (
    (requirement.operatingSystem === undefined ||
      requirement.operatingSystem === available.operatingSystem) &&
    (requirement.architecture === undefined ||
      requirement.architecture === available.architecture) &&
    (requirement.nodeVersion === undefined || requirement.nodeVersion === available.nodeVersion) &&
    (requirement.npmVersion === undefined || requirement.npmVersion === available.npmVersion)
  );
}

function validRequirement(requirement: ValidationTargetConstraint): boolean {
  return (
    requirement.sourceReference.trim().length > 0 &&
    (requirement.operatingSystem !== undefined ||
      requirement.architecture !== undefined ||
      requirement.nodeVersion !== undefined ||
      requirement.npmVersion !== undefined ||
      (requirement.requiredCapabilities?.length ?? 0) > 0) &&
    (requirement.operatingSystem === undefined || requirement.operatingSystem.trim().length > 0) &&
    (requirement.architecture === undefined || requirement.architecture.trim().length > 0) &&
    (requirement.nodeVersion === undefined || /^\d+\.\d+\.\d+$/u.test(requirement.nodeVersion)) &&
    (requirement.npmVersion === undefined || /^\d+\.\d+\.\d+$/u.test(requirement.npmVersion)) &&
    requirement.requiredCapabilities?.every((capability) => capability.trim().length > 0) !== false
  );
}

function validateInput(input: ValidationTargetDerivationInput): void {
  const capability = input.availableMvpTarget;
  const base = capability.baseIdentity;
  if (
    !runtimeEquals(capability.operatingSystem, "linux") ||
    !runtimeEquals(capability.architecture, "amd64") ||
    capability.targetId.trim().length === 0 ||
    capability.imageReference.trim().length === 0 ||
    !/^\d+\.\d+\.\d+$/u.test(capability.nodeVersion) ||
    !/^\d+\.\d+\.\d+$/u.test(capability.npmVersion) ||
    base.snapshotId.trim().length === 0 ||
    base.capabilityReportId.trim().length === 0 ||
    !Number.isFinite(Date.parse(base.createdAt)) ||
    ![
      base.snapshotDigest,
      base.baselineInventoryDigest,
      base.capabilityReportDigest,
      capability.resources.capabilityDigest,
      capability.egress.capabilityDigest
    ].every(isSha256Digest) ||
    capability.providedCapabilities.some(
      (providedCapability) => providedCapability.trim().length === 0
    )
  ) {
    throw new ValidationTargetDerivationError("invalid_capability_catalog");
  }

  const resources = input.workspacePolicy.resources;
  const capacities = capability.resources;
  if (
    input.workspacePolicy.policyVersion.trim().length === 0 ||
    ![resources.cpuCores, resources.diskMiB, resources.memoryMiB].every(
      (value) => Number.isSafeInteger(value) && value > 0
    ) ||
    ![capacities.maximumCpuCores, capacities.maximumDiskMiB, capacities.maximumMemoryMiB].every(
      (value) => Number.isSafeInteger(value) && value > 0
    ) ||
    capability.egress.registryHosts.some((host) => !validHostname(host))
  ) {
    throw new ValidationTargetDerivationError("invalid_policy");
  }
}

function unsupported(
  failures: Extract<
    ValidationTargetDerivationResult,
    { status: "unsupported_target_or_capability" }
  >["unsupported"]
): ValidationTargetDerivationResult {
  return {
    status: "unsupported_target_or_capability",
    unsupported: [...failures].sort((left, right) =>
      `${left.source}:${left.sourceReference}:${left.reason}`.localeCompare(
        `${right.source}:${right.sourceReference}:${right.reason}`
      )
    )
  };
}

function validHostname(value: string): boolean {
  return (
    value.length > 0 && value.length <= 253 && /^[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/u.test(value)
  );
}

function isSha256Digest(value: unknown): value is Sha256Digest {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}

function runtimeEquals(value: unknown, expected: string): boolean {
  return value === expected;
}

function toCanonicalJson(value: unknown): CanonicalJsonValue {
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => toCanonicalJson(item));
  }
  if (typeof value !== "object") {
    throw new ValidationTargetDerivationError("invalid_capability_catalog");
  }
  return Object.fromEntries(
    Object.entries(value)
      .filter((entry) => entry[1] !== undefined)
      .map(([key, item]) => [key, toCanonicalJson(item)])
  );
}

function canonicalJson(value: CanonicalJsonValue): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (isCanonicalArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${canonicalJson(item)}`)
    .join(",")}}`;
}

function isCanonicalArray(value: CanonicalJsonValue): value is readonly CanonicalJsonValue[] {
  return Array.isArray(value);
}

async function sha256Canonical(value: CanonicalJsonValue): Promise<Sha256Digest> {
  const bytes = new TextEncoder().encode(canonicalJson(value));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return `sha256:${[...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}
