import {
  buildNpmEvidenceGraphSet,
  reconcileDeterministicDisagreements,
  type Finding,
  type NpmCheckpointInput,
  type ReconciliationResult
} from "@environment-REDACTED/REDACTED";

import type {
  ReconcileRequestedMessage,
  ReconcileRequestReason
} from "../queues/event-consumer.js";

export type ReconciliationTrigger =
  "material-action-stabilized" | "session-end" | "pull-request-update" | "manual-scan";

export interface DurableCheckpoint {
  readonly checkpointId: string;
  readonly input: NpmCheckpointInput;
  readonly inputDigest: string;
  readonly projectId: string;
  readonly workspaceId: string;
}

export interface CheckpointInputStore {
  load(checkpointId: string): Promise<DurableCheckpoint | undefined>;
}

export interface FindingPersistence {
  replaceProjectFindings(input: {
    readonly checkpointId: string;
    readonly current: readonly Finding[];
    readonly projectId: string;
    readonly supersededFindingIds: readonly string[];
    readonly trigger: ReconciliationTrigger;
    readonly workspaceId: string;
  }): Promise<void>;
  activeFindingIds(projectId: string): Promise<readonly string[]>;
}

export interface CandidateGenerationQueue {
  enqueue(input: {
    readonly checkpointId: string;
    readonly findingId: string;
    readonly idempotencyKey: string;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<void>;
}

export interface ReconciliationRun {
  readonly checkpointId: string;
  readonly inputDigest: string;
  readonly result: ReconciliationResult;
  readonly trigger: ReconciliationTrigger;
}

export class ReconcileCheckpointError extends Error {
  readonly code: "checkpoint_not_found" | "checkpoint_identity_mismatch";

  constructor(code: ReconcileCheckpointError["code"]) {
    super(code);
    this.name = "ReconcileCheckpointError";
    this.code = code;
  }
}

/**
 * Deterministic truth path. No model is consulted here: the service loads a
 * durable checkpoint, builds immutable evidence graphs, runs native rules,
 * persists supersession, and only then queues optional candidate reasoning.
 */
export class ReconcileCheckpointService {
  readonly #candidateQueue: CandidateGenerationQueue;
  readonly #checkpoints: CheckpointInputStore;
  readonly #findings: FindingPersistence;

  constructor(
    checkpoints: CheckpointInputStore,
    findings: FindingPersistence,
    candidateQueue: CandidateGenerationQueue
  ) {
    this.#checkpoints = checkpoints;
    this.#findings = findings;
    this.#candidateQueue = candidateQueue;
  }

  async reconcile(input: {
    readonly checkpointId: string;
    readonly projectId: string;
    readonly trigger: ReconciliationTrigger;
    readonly workspaceId: string;
  }): Promise<ReconciliationRun> {
    const checkpoint = await this.#checkpoints.load(input.checkpointId);
    if (checkpoint === undefined) {
      throw new ReconcileCheckpointError("checkpoint_not_found");
    }
    if (checkpoint.projectId !== input.projectId || checkpoint.workspaceId !== input.workspaceId) {
      throw new ReconcileCheckpointError("checkpoint_identity_mismatch");
    }

    const result = reconcileDeterministicDisagreements(buildNpmEvidenceGraphSet(checkpoint.input));
    const currentIds = new Set(result.findings.map((finding) => finding.findingId));
    const previousIds = await this.#findings.activeFindingIds(input.projectId);
    const supersededFindingIds = previousIds
      .filter((findingId) => !currentIds.has(findingId))
      .sort();

    await this.#findings.replaceProjectFindings({
      checkpointId: input.checkpointId,
      current: result.findings,
      projectId: input.projectId,
      supersededFindingIds,
      trigger: input.trigger,
      workspaceId: input.workspaceId
    });

    await Promise.all(
      result.findings.map((finding) =>
        this.#candidateQueue.enqueue({
          checkpointId: input.checkpointId,
          findingId: finding.findingId,
          idempotencyKey: [
            "candidate",
            input.projectId,
            input.checkpointId,
            finding.findingId
          ].join(":"),
          projectId: input.projectId,
          workspaceId: input.workspaceId
        })
      )
    );

    return {
      checkpointId: input.checkpointId,
      inputDigest: checkpoint.inputDigest,
      result,
      trigger: input.trigger
    };
  }
}

/**
 * Typed boundary for the checkpoint reconciliation queue. Queue delivery may
 * repeat; all durable writes and candidate publishes carry stable identities.
 */
export class ReconcileCheckpointQueueConsumer {
  readonly #service: ReconcileCheckpointService;

  constructor(service: ReconcileCheckpointService) {
    this.#service = service;
  }

  async consume(message: ReconcileRequestedMessage): Promise<ReconciliationRun> {
    assertQueueMessage(message);
    return await this.#service.reconcile({
      checkpointId: message.checkpointId,
      projectId: message.projectId,
      trigger: triggerFromReason(message.reason),
      workspaceId: message.workspaceId
    });
  }
}

function triggerFromReason(reason: ReconcileRequestReason): ReconciliationTrigger {
  const triggers: Readonly<Record<ReconcileRequestReason, ReconciliationTrigger>> = {
    manual_scan: "manual-scan",
    material_action_stabilized: "material-action-stabilized",
    pr_update: "pull-request-update",
    session_end: "session-end"
  };
  return triggers[reason];
}

function assertQueueMessage(message: ReconcileRequestedMessage): void {
  if (
    message.checkpointId.trim() === "" ||
    message.projectId.trim() === "" ||
    message.workspaceId.trim() === "" ||
    message.idempotencyKey.trim() === ""
  ) {
    throw new ReconcileCheckpointError("checkpoint_identity_mismatch");
  }
}
