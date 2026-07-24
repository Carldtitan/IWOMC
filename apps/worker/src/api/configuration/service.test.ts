// @vitest-environment node

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  type BehaviorContract,
  type BehaviorStep,
  type OptimalityPolicy
} from "@environment-reconciler/contracts";
import type { EditableProjectGoal } from "@environment-reconciler/reconciler";

import {
  ConfigurationError,
  ConfigurationService,
  type AppendConfigurationResult,
  type AppendConfigurationRevision,
  type CandidateBindingInvalidation,
  type ConfigurationAuditEvent,
  type ConfigurationPersistence,
  type ConfigurationRole,
  type VersionedOptimalityPolicy
} from "./service.js";

const workspaceId = "workspace-1";
const projectId = "project-1";
const ownerId = "user-owner";
const developerId = "user-developer";
const observerId = "user-observer";
const now = "2026-07-24T12:00:00.000Z";

describe("ConfigurationService", () => {
  it("authorizes reads, restricts writes, and atomically binds revisions to audit and invalidation", async () => {
    const store = MemoryConfigurationPersistence.create();
    const service = new ConfigurationService(store, runtime());

    await expect(service.getProjectGoal(projectId, observerId)).resolves.toMatchObject({
      projectId,
      version: 1
    });
    await expect(
      service.editProjectGoal({
        actorUserId: developerId,
        expectedVersion: 1,
        projectId,
        statement: "A developer must not be able to write this."
      })
    ).rejects.toEqual(new ConfigurationError("forbidden"));

    const edited = await service.editProjectGoal({
      actorUserId: ownerId,
      expectedVersion: 1,
      projectId,
      statement: "Keep clean installs reproducible and fast."
    });
    expect(edited).toMatchObject({
      statement: "Keep clean installs reproducible and fast.",
      version: 2
    });
    expect(store.auditEvents.at(-1)).toMatchObject({
      action: "project_goal_edited",
      actorUserId: ownerId,
      afterVersion: 2,
      beforeVersion: 1,
      objectType: "project_goal",
      workspaceId
    });
    expect(store.invalidations.at(-1)).toEqual({
      bindingKind: "project_goal",
      bindingObjectId: edited.goalId,
      bindingVersion: 1,
      reason: "project_goal_changed"
    });

    await expect(
      service.editProjectGoal({
        actorUserId: ownerId,
        expectedVersion: 1,
        projectId,
        statement: "Stale write"
      })
    ).rejects.toEqual(new ConfigurationError("version_conflict"));
    expect(store.projectGoalRevisions).toHaveLength(2);
  });

  it("reorders, enables or disables, and accepts behavior only through versioned revisions", async () => {
    const store = MemoryConfigurationPersistence.create();
    const service = new ConfigurationService(store, runtime());
    const original = await service.getBehaviorContract(projectId, ownerId);
    const reversed = [...original.steps].reverse().map(({ stepId }) => stepId);

    const reordered = await service.reorderBehaviorSteps({
      actorUserId: ownerId,
      expectedVersion: 1,
      orderedStepIds: reversed,
      projectId
    });
    expect(reordered.steps.map(({ stepId }) => stepId)).toEqual(reversed);
    expect(reordered.version).toBe(2);

    const optionalStep = reordered.steps.find((step) => !step.required);
    expect(optionalStep).toBeDefined();
    const disabled = await service.setBehaviorStepEnabled({
      actorUserId: ownerId,
      enabled: false,
      expectedVersion: 2,
      projectId,
      stepId: requiredValue(optionalStep).stepId
    });
    expect(disabled.steps.find((step) => step.stepId === optionalStep?.stepId)?.enabled).toBe(
      false
    );

    const accepted = await service.acceptBehaviorContract({
      actorUserId: ownerId,
      expectedVersion: 3,
      projectId
    });
    expect(accepted).toMatchObject({
      acceptedBy: ownerId,
      reviewState: "accepted",
      version: 4
    });
    expect(store.behaviorContractRevisions.map(({ version }) => version)).toEqual([1, 2, 3, 4]);
    expect(store.auditEvents.map(({ action }) => action)).toEqual([
      "behavior_steps_reordered",
      "behavior_step_disabled",
      "behavior_contract_accepted"
    ]);
    expect(store.invalidations.map(({ bindingVersion }) => bindingVersion)).toEqual([1, 2, 3]);
  });

  it("rejects policy edits that remove or weaken protected correctness gates", async () => {
    const store = MemoryConfigurationPersistence.create();
    const service = new ConfigurationService(store, runtime());
    const current = await service.getOptimalityPolicy(projectId, ownerId);
    const weakened = current.document.hardConstraints.filter(
      ({ constraintId }) => constraintId !== "constraint:accepted-contract"
    );

    await expect(
      service.editOptimalityPolicy({
        actorUserId: ownerId,
        expectedVersion: 1,
        patch: { hardConstraints: weakened },
        projectId
      })
    ).rejects.toEqual(new ConfigurationError("invalid_configuration"));
    expect(store.optimalityPolicyRevisions).toHaveLength(1);
    expect(store.invalidations).toEqual([]);
    expect(store.auditEvents).toEqual([]);
  });

  it("keeps every referenced policy revision immutable and invalidates its exact binding", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fc.integer({ min: 1, max: 1_000 }), {
          minLength: 1,
          maxLength: 12
        }),
        async (weights) => {
          const store = MemoryConfigurationPersistence.create();
          const service = new ConfigurationService(store, runtime());
          const firstSnapshot = JSON.stringify(store.optimalityPolicyRevisions[0]);
          let version = 1;
          for (const weight of weights) {
            await service.editOptimalityPolicy({
              actorUserId: ownerId,
              expectedVersion: version,
              patch: {
                objectives: [
                  {
                    direction: "minimize",
                    kind: "dependency_count",
                    measurement: "direct dependency count",
                    objectiveId: "objective:dependencies",
                    userSupplied: true,
                    weight
                  }
                ]
              },
              projectId
            });
            version += 1;
          }

          expect(JSON.stringify(store.optimalityPolicyRevisions[0])).toBe(firstSnapshot);
          expect(store.optimalityPolicyRevisions.map(({ document }) => document.version)).toEqual(
            Array.from({ length: weights.length + 1 }, (_, index) => index + 1)
          );
          expect(
            store.invalidations.map(({ bindingKind, bindingVersion }) => ({
              bindingKind,
              bindingVersion
            }))
          ).toEqual(
            weights.map((_, index) => ({
              bindingKind: "optimality_policy",
              bindingVersion: index + 1
            }))
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});

class MemoryConfigurationPersistence implements ConfigurationPersistence {
  readonly projectGoalRevisions: EditableProjectGoal[];
  readonly behaviorContractRevisions: BehaviorContract[];
  readonly optimalityPolicyRevisions: VersionedOptimalityPolicy[];
  readonly auditEvents: ConfigurationAuditEvent[] = [];
  readonly invalidations: CandidateBindingInvalidation[] = [];
  readonly #roles = new Map<string, ConfigurationRole>([
    [ownerId, "owner"],
    [developerId, "developer"],
    [observerId, "observer"]
  ]);

  private constructor(input: {
    readonly behaviorContract: BehaviorContract;
    readonly projectGoal: EditableProjectGoal;
    readonly policy: VersionedOptimalityPolicy;
  }) {
    this.projectGoalRevisions = [structuredClone(input.projectGoal)];
    this.behaviorContractRevisions = [structuredClone(input.behaviorContract)];
    this.optimalityPolicyRevisions = [structuredClone(input.policy)];
  }

  static create(): MemoryConfigurationPersistence {
    return new MemoryConfigurationPersistence({
      behaviorContract: behaviorContract(),
      projectGoal: {
        authoredBy: ownerId,
        contextOnly: true,
        createdAt: now,
        goalId: "goal:project-1",
        kind: "project_goal",
        nonFunctionalPriorities: [],
        projectId,
        schemaVersion: 1,
        statement: "Keep clean installs reproducible.",
        updatedAt: now,
        updatedBy: ownerId,
        version: 1,
        workspaceId
      },
      policy: optimalityPolicy()
    });
  }

  getProject(requestedProjectId: string) {
    return Promise.resolve(
      requestedProjectId === projectId ? { projectId, workspaceId } : undefined
    );
  }

  membershipRole(requestedWorkspaceId: string, userId: string) {
    return Promise.resolve(
      requestedWorkspaceId === workspaceId ? this.#roles.get(userId) : undefined
    );
  }

  getProjectGoal(requestedProjectId: string) {
    return Promise.resolve(
      requestedProjectId === projectId
        ? structuredClone(this.projectGoalRevisions.at(-1))
        : undefined
    );
  }

  getBehaviorContract(requestedProjectId: string) {
    return Promise.resolve(
      requestedProjectId === projectId
        ? structuredClone(this.behaviorContractRevisions.at(-1))
        : undefined
    );
  }

  getOptimalityPolicy(requestedProjectId: string) {
    return Promise.resolve(
      requestedProjectId === projectId
        ? structuredClone(this.optimalityPolicyRevisions.at(-1))
        : undefined
    );
  }

  appendProjectGoalRevision(
    input: AppendConfigurationRevision<EditableProjectGoal>
  ): Promise<AppendConfigurationResult> {
    return Promise.resolve(
      this.#append(this.projectGoalRevisions, input, (value) => value.version)
    );
  }

  appendBehaviorContractRevision(
    input: AppendConfigurationRevision<BehaviorContract>
  ): Promise<AppendConfigurationResult> {
    return Promise.resolve(
      this.#append(this.behaviorContractRevisions, input, (value) => value.version)
    );
  }

  appendOptimalityPolicyRevision(
    input: AppendConfigurationRevision<VersionedOptimalityPolicy>
  ): Promise<AppendConfigurationResult> {
    return Promise.resolve(
      this.#append(this.optimalityPolicyRevisions, input, (value) => value.document.version)
    );
  }

  #append<T>(
    revisions: T[],
    input: AppendConfigurationRevision<T>,
    version: (value: T) => number
  ): AppendConfigurationResult {
    const current = revisions.at(-1);
    if (current === undefined) {
      return "not_found";
    }
    if (
      input.projectId !== projectId ||
      input.workspaceId !== workspaceId ||
      version(current) !== input.expectedVersion
    ) {
      return "version_conflict";
    }
    revisions.push(structuredClone(input.next));
    this.auditEvents.push(structuredClone(input.audit));
    this.invalidations.push(structuredClone(input.invalidateCandidatesBoundTo));
    return "appended";
  }
}

function behaviorContract(): BehaviorContract {
  const steps: [BehaviorStep, ...BehaviorStep[]] = [
    behaviorStep("install", 0, true),
    behaviorStep("build", 1, true),
    behaviorStep("lint", 2, true),
    behaviorStep("test", 3, true),
    behaviorStep("benchmark", 4, false)
  ];
  return {
    contractDigest: `sha256:${"d".repeat(64)}`,
    contractId: "contract:project-1",
    createdAt: now,
    invalidatedBySourceIds: [],
    kind: "behavior_contract",
    projectId,
    reviewAssessment: {
      evidenceReferenceIds: ["evidence:package-json"],
      reasonCodes: ["human_review_required"],
      state: "unknown"
    },
    reviewState: "discovered",
    schemaVersion: 1,
    sourceInputDigest: `sha256:${"c".repeat(64)}`,
    steps,
    updatedAt: now,
    version: 1,
    workspaceId
  };
}

function optimalityPolicy(): VersionedOptimalityPolicy {
  const protectedConstraintIds = [
    "constraint:accepted-contract",
    "constraint:required-target",
    "constraint:native-manager",
    "constraint:lockfile",
    "constraint:secret-guard"
  ];
  const raw: OptimalityPolicy = {
    budgets: {
      maxAttempts: 2,
      maxCandidates: 3,
      maxConcurrentJobs: 4,
      maxElapsedSeconds: 1_800,
      maxEstimatedCostMicrousd: "5000000"
    },
    createdAt: now,
    createdBy: ownerId,
    hardConstraints: [
      {
        constraintId: protectedConstraintIds[0] ?? "",
        failureCode: "behavior_contract_missing",
        kind: "required_test",
        operand: "accepted",
        operator: "equals",
        subject: "behavior-contract"
      },
      {
        constraintId: protectedConstraintIds[1] ?? "",
        failureCode: "required_target_failed",
        kind: "required_target",
        operand: "linux-node-22",
        operator: "equals",
        subject: "validation-target"
      },
      {
        constraintId: protectedConstraintIds[2] ?? "",
        failureCode: "manager_switch_forbidden",
        kind: "allowed_manager",
        operand: "npm",
        operator: "equals",
        subject: "package-manager"
      },
      {
        constraintId: protectedConstraintIds[3] ?? "",
        failureCode: "lockfile_inconsistent",
        kind: "required_lockfile",
        operand: "package-lock.json",
        operator: "equals",
        subject: "lockfile"
      },
      {
        constraintId: protectedConstraintIds[4] ?? "",
        failureCode: "secret_guard_failed",
        kind: "secret_policy",
        operand: "pass",
        operator: "equals",
        subject: "secret-guard"
      }
    ],
    kind: "optimality_policy",
    mode: "default",
    objectives: [
      {
        direction: "minimize",
        kind: "dependency_count",
        measurement: "direct dependency count",
        objectiveId: "objective:dependencies",
        userSupplied: false,
        weight: 100
      }
    ],
    policyDigest: `sha256:${"0".repeat(64)}`,
    policyId: "policy:project-1",
    projectId,
    requiredTargetIds: ["linux-node-22"],
    schemaVersion: 1,
    version: 1,
    workspaceId
  };
  return {
    document: raw,
    protectedConstraintIds
  };
}

function behaviorStep(kind: BehaviorStep["kind"], order: number, required: boolean): BehaviorStep {
  return {
    arguments: kind === "install" ? ["ci"] : ["run", kind],
    assertions: [],
    discoveryEvidenceReferenceIds: ["evidence:package-json"],
    discoveryFingerprint: `sha256:${String(order + 1)
      .repeat(64)
      .slice(0, 64)}`,
    enabled: true,
    executable: "npm",
    expectedExitStatuses: [0],
    kind,
    order,
    realmAssessment: {
      evidenceReferenceIds: [],
      reasonCodes: ["project_default"],
      state: "unknown"
    },
    required,
    secretReferenceIds: [],
    stepId: `step:${kind}`,
    targetSelector: "linux-node-22",
    timeoutSeconds: 600,
    workingDirectory: "repository"
  };
}

function runtime() {
  let nextId = 0;
  return {
    now: () => now,
    randomUuid: () => {
      nextId += 1;
      return `00000000-0000-4000-8000-${String(nextId).padStart(12, "0")}`;
    }
  };
}

function requiredValue<T>(value: T | undefined): T {
  if (value === undefined) {
    throw new Error("Required test fixture value is missing.");
  }
  return value;
}
