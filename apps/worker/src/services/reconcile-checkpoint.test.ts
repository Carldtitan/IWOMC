import { describe, expect, it } from "vitest";

import type { Finding, NpmCheckpointInput } from "@environment-REDACTED/REDACTED";

import type { ReconcileRequestedMessage } from "../queues/event-consumer.js";
import {
  ReconcileCheckpointError,
  ReconcileCheckpointQueueConsumer,
  ReconcileCheckpointService,
  type CandidateGenerationQueue,
  type CheckpointInputStore,
  type DurableCheckpoint,
  type FindingPersistence,
  type ReconciliationTrigger
} from "./reconcile-checkpoint.js";

const checkpoint: DurableCheckpoint = Object.freeze({
  checkpointId: "checkpoint-1",
  input: positiveInput(),
  inputDigest: "sha256:input",
  projectId: "project-1",
  workspaceId: "workspace-1"
});

describe("ReconcileCheckpointService", () => {
  it("loads durable facts, runs deterministic rules, supersedes stale findings, and enqueues once", async () => {
    const findings = new FakeFindings(["finding-stale"]);
    const queue = new FakeCandidateQueue();
    const service = new ReconcileCheckpointService(
      new FakeCheckpoints(checkpoint),
      findings,
      queue
    );

    const run = await service.reconcile({
      checkpointId: checkpoint.checkpointId,
      projectId: checkpoint.projectId,
      trigger: "session-end",
      workspaceId: checkpoint.workspaceId
    });

    expect(run.result.findings).toHaveLength(1);
    expect(run.result.findings[0]?.category).toBe("dependency.used_but_undeclared");
    expect(findings.replacements).toEqual([
      expect.objectContaining({
        checkpointId: "checkpoint-1",
        supersededFindingIds: ["finding-stale"],
        trigger: "session-end"
      })
    ]);
    expect(queue.items).toEqual([
      expect.objectContaining({
        idempotencyKey: `candidate:project-1:checkpoint-1:${run.result.findings[0]?.findingId}`
      })
    ]);
  });

  it("is effect-idempotent across repeated queue deliveries", async () => {
    const findings = new FakeFindings([]);
    const queue = new FakeCandidateQueue();
    const consumer = new ReconcileCheckpointQueueConsumer(
      new ReconcileCheckpointService(new FakeCheckpoints(checkpoint), findings, queue)
    );
    const message = reconcileMessage("session_end");

    const first = await consumer.consume(message);
    const second = await consumer.consume(message);

    expect(second).toEqual(first);
    expect(queue.items).toHaveLength(1);
    expect(findings.active).toEqual(first.result.findings.map(({ findingId }) => findingId));
  });

  it.each([
    ["material_action_stabilized", "material-action-stabilized"],
    ["session_end", "session-end"],
    ["pr_update", "pull-request-update"],
    ["manual_scan", "manual-scan"]
  ] as const)("maps %s to the stable service trigger %s", async (reason, trigger) => {
    const findings = new FakeFindings([]);
    const consumer = new ReconcileCheckpointQueueConsumer(
      new ReconcileCheckpointService(
        new FakeCheckpoints({ ...checkpoint, input: negativeInput() }),
        findings,
        new FakeCandidateQueue()
      )
    );

    const run = await consumer.consume(reconcileMessage(reason));

    expect(run.trigger).toBe(trigger);
    expect(run.result.findings).toEqual([]);
    expect(findings.replacements[0]?.trigger).toBe(trigger);
  });

  it("fails closed for missing or cross-project checkpoint identity", async () => {
    const missing = new ReconcileCheckpointService(
      new FakeCheckpoints(undefined),
      new FakeFindings([]),
      new FakeCandidateQueue()
    );
    await expect(
      missing.reconcile({
        checkpointId: "missing",
        projectId: "project-1",
        trigger: "manual-scan",
        workspaceId: "workspace-1"
      })
    ).rejects.toMatchObject({ code: "checkpoint_not_found" });

    const mismatched = new ReconcileCheckpointService(
      new FakeCheckpoints(checkpoint),
      new FakeFindings([]),
      new FakeCandidateQueue()
    );
    await expect(
      mismatched.reconcile({
        checkpointId: checkpoint.checkpointId,
        projectId: "REDACTED-project",
        trigger: "manual-scan",
        workspaceId: checkpoint.workspaceId
      })
    ).rejects.toMatchObject({ code: "checkpoint_identity_mismatch" });
  });

  it("rejects malformed queue messages before loading durable state", async () => {
    const checkpoints = new FakeCheckpoints(checkpoint);
    const consumer = new ReconcileCheckpointQueueConsumer(
      new ReconcileCheckpointService(checkpoints, new FakeFindings([]), new FakeCandidateQueue())
    );

    await expect(
      consumer.consume({ ...reconcileMessage("manual_scan"), idempotencyKey: "" })
    ).rejects.toBeInstanceOf(ReconcileCheckpointError);
    expect(checkpoints.loads).toBe(0);
  });
});

class FakeCheckpoints implements CheckpointInputStore {
  loads = 0;

  constructor(private readonly checkpoint: DurableCheckpoint | undefined) {}

  load(): Promise<DurableCheckpoint | undefined> {
    this.loads += 1;
    return Promise.resolve(this.checkpoint);
  }
}

class FakeFindings implements FindingPersistence {
  active: string[];
  readonly replacements: {
    readonly checkpointId: string;
    readonly current: readonly Finding[];
    readonly projectId: string;
    readonly supersededFindingIds: readonly string[];
    readonly trigger: ReconciliationTrigger;
    readonly workspaceId: string;
  }[] = [];

  constructor(active: readonly string[]) {
    this.active = [...active];
  }

  activeFindingIds(): Promise<readonly string[]> {
    return Promise.resolve([...this.active]);
  }

  replaceProjectFindings(input: {
    readonly checkpointId: string;
    readonly current: readonly Finding[];
    readonly projectId: string;
    readonly supersededFindingIds: readonly string[];
    readonly trigger: ReconciliationTrigger;
    readonly workspaceId: string;
  }): Promise<void> {
    this.replacements.push(input);
    this.active = input.current.map(({ findingId }) => findingId);
    return Promise.resolve();
  }
}

class FakeCandidateQueue implements CandidateGenerationQueue {
  readonly items: {
    readonly checkpointId: string;
    readonly findingId: string;
    readonly idempotencyKey: string;
    readonly projectId: string;
    readonly workspaceId: string;
  }[] = [];
  readonly #keys = new Set<string>();

  enqueue(input: {
    readonly checkpointId: string;
    readonly findingId: string;
    readonly idempotencyKey: string;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<void> {
    if (!this.#keys.has(input.idempotencyKey)) {
      this.#keys.add(input.idempotencyKey);
      this.items.push(input);
    }
    return Promise.resolve();
  }
}

function reconcileMessage(reason: ReconcileRequestedMessage["reason"]): ReconcileRequestedMessage {
  return {
    checkpointId: checkpoint.checkpointId,
    idempotencyKey: `reconcile:${reason}:checkpoint-1`,
    kind: "checkpoint.reconcile_requested",
    projectId: checkpoint.projectId,
    reason,
    schemaVersion: 1,
    sourceBatchId: "batch-1",
    sourceLogicalDigest: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    workspaceId: checkpoint.workspaceId
  };
}

function positiveInput(): NpmCheckpointInput {
  return {
    installed: [
      {
        adapter: inventoryAdapter(),
        evidenceId: "installed",
        name: "@fixture/runtime",
        projectRoot: "",
        stateEffect: "present",
        version: "1.0.0"
      }
    ],
    observedActions: [
      {
        action: "install",
        adapter: inventoryAdapter(),
        attribution: { actorType: "agent", confidence: 0.9 },
        evidenceId: "action",
        name: "@fixture/runtime",
        outcome: "succeeded",
        projectRoot: "",
        stateEffect: "present"
      }
    ],
    repository: repository(true),
    validated: [
      {
        adapter: inventoryAdapter(),
        evidenceId: "validated",
        name: "@fixture/runtime",
        outcome: "REDACTEDed",
        projectRoot: ""
      }
    ]
  };
}

function negativeInput(): NpmCheckpointInput {
  return { repository: repository(false) };
}

function repository(withUse: boolean): NpmCheckpointInput["repository"] {
  const source = repositoryAdapter();
  return {
    adapter: source,
    projects: [
      {
        declared: [],
        gaps: [],
        locked: [],
        projectRoot: "",
        usage: withUse
          ? [
              {
                adapter: source,
                certainty: "certain",
                executable: true,
                kind: "static_import",
                normalizedName: "@fixture/runtime",
                projectRoot: "",
                sourceLocation: { line: 1, path: "src/index.ts" }
              }
            ]
          : []
      }
    ]
  };
}

function repositoryAdapter() {
  return {
    adapterId: "node/npm",
    adapterVersion: "1.0.0",
    inputSourceId: "commit-1",
    supportLevel: "native_validation" as const
  };
}

function inventoryAdapter() {
  return {
    adapterId: "companion/node/npm",
    adapterVersion: "1.0.0",
    inputSourceId: "checkpoint-1",
    supportLevel: "full_native" as const
  };
}
