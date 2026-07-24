import { describe, expect, it } from "vitest";

import {
  IntegrationStatusError,
  IntegrationStatusService,
  type BraintrustIntegrationStatusReadModel,
  type BraintrustIntegrationStatusSnapshot
} from "./integration-status.js";

const lookup = {
  projectId: "project-1",
  reasoningTraceId: "trace:reasoning-1",
  workspaceId: "workspace-1"
};

class FakeReadModel implements BraintrustIntegrationStatusReadModel {
  snapshot: BraintrustIntegrationStatusSnapshot | undefined;

  loadStatus(): Promise<BraintrustIntegrationStatusSnapshot | undefined> {
    return Promise.resolve(this.snapshot);
  }
}

function snapshot(): BraintrustIntegrationStatusSnapshot {
  return {
    finalValidationSummary: {
      completedAt: new Date("2026-07-24T18:00:00.000Z"),
      summaryClass: "verified",
      validationBatchId: "batch:validation-1"
    },
    projectId: lookup.projectId,
    reasoningTraceId: lookup.reasoningTraceId,
    traceExport: {
      attemptCount: 2,
      failureClass: "provider",
      nextAttemptAt: new Date("2026-07-24T18:01:00.000Z"),
      state: "failed"
    },
    workspaceId: lookup.workspaceId
  };
}

describe("IntegrationStatusService", () => {
  it("exposes a retryable outbox failure as pending while linking the final validation truth", async () => {
    const readModel = new FakeReadModel();
    readModel.snapshot = snapshot();

    const status = await new IntegrationStatusService(readModel).getBraintrustStatus(lookup);

    expect(status).toEqual({
      apiVersion: "braintrust-integration-status.v1",
      deterministicProductState: "independent_of_trace_export",
      finalValidationSummary: {
        completedAt: "2026-07-24T18:00:00.000Z",
        href: "/v1/workspaces/workspace-1/projects/project-1/validation-batches/batch%3Avalidation-1/summary",
        state: "available",
        summaryClass: "verified",
        validationBatchId: "batch:validation-1"
      },
      projectId: "project-1",
      provider: "braintrust",
      reasoningTraceId: "trace:reasoning-1",
      traceExport: {
        attemptCount: 2,
        failureClass: "provider",
        nextAttemptAt: "2026-07-24T18:01:00.000Z",
        outcome: "pending",
        phase: "retry_scheduled",
        terminal: false
      },
      workspaceId: "workspace-1"
    });
  });

  it("exposes exhausted delivery as terminal without hiding the independently persisted summary", async () => {
    const readModel = new FakeReadModel();
    readModel.snapshot = {
      ...snapshot(),
      finalValidationSummary: {
        completedAt: new Date("2026-07-24T18:00:00.000Z"),
        summaryClass: "infrastructure_error",
        validationBatchId: "batch-2"
      },
      traceExport: {
        attemptCount: 5,
        failureClass: "configuration",
        nextAttemptAt: new Date("2026-07-24T18:05:00.000Z"),
        state: "abandoned"
      }
    };

    const status = await new IntegrationStatusService(readModel).getBraintrustStatus(lookup);

    expect(status.traceExport).toEqual({
      attemptCount: 5,
      failureClass: "configuration",
      operatorAction: "inspect_braintrust_integration",
      outcome: "terminal_failure",
      terminal: true
    });
    expect(status.finalValidationSummary).toMatchObject({
      state: "available",
      summaryClass: "infrastructure_error",
      validationBatchId: "batch-2"
    });
    expect(JSON.stringify(status)).not.toMatch(
      /payloadDigest|payloadObjectMetadataId|ciphertext|objectKey|REDACTED/iu
    );
  });

  it("reports pre-enqueue and exported states without inventing a final validation summary", async () => {
    const readModel = new FakeReadModel();
    readModel.snapshot = {
      projectId: lookup.projectId,
      reasoningTraceId: lookup.reasoningTraceId,
      workspaceId: lookup.workspaceId
    };
    const service = new IntegrationStatusService(readModel);

    await expect(service.getBraintrustStatus(lookup)).resolves.toMatchObject({
      finalValidationSummary: { state: "pending" },
      traceExport: {
        attemptCount: 0,
        outcome: "pending",
        phase: "not_queued",
        terminal: false
      }
    });

    readModel.snapshot = {
      projectId: lookup.projectId,
      reasoningTraceId: lookup.reasoningTraceId,
      traceExport: {
        attemptCount: 1,
        nextAttemptAt: new Date("2026-07-24T18:00:00.000Z"),
        state: "exported"
      },
      workspaceId: lookup.workspaceId
    };
    await expect(service.getBraintrustStatus(lookup)).resolves.toMatchObject({
      finalValidationSummary: { state: "pending" },
      traceExport: { attemptCount: 1, outcome: "exported", terminal: true }
    });
  });

  it("fails closed for missing, cross-scope, or malformed durable state", async () => {
    const readModel = new FakeReadModel();
    const service = new IntegrationStatusService(readModel);

    await expect(service.getBraintrustStatus(lookup)).rejects.toEqual(
      new IntegrationStatusError("not_found")
    );

    readModel.snapshot = {
      ...snapshot(),
      workspaceId: "different-workspace"
    };
    await expect(service.getBraintrustStatus(lookup)).rejects.toEqual(
      new IntegrationStatusError("invalid_snapshot")
    );

    readModel.snapshot = {
      ...snapshot(),
      traceExport: {
        attemptCount: 5,
        nextAttemptAt: new Date("not-a-date"),
        state: "abandoned"
      }
    };
    await expect(service.getBraintrustStatus(lookup)).rejects.toEqual(
      new IntegrationStatusError("invalid_snapshot")
    );
  });
});
