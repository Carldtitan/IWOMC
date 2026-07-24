import type {
  BraintrustOutboxFailureClass,
  BraintrustTraceOutboxRecord
} from "./braintrust-outbox.js";
import type { ValidationTerminalSummaryClass } from "../workflows/validate-candidate.js";

type BraintrustOutboxState = BraintrustTraceOutboxRecord["state"];

export interface BraintrustIntegrationStatusSnapshot {
  readonly finalValidationSummary?: {
    readonly completedAt: Date;
    readonly summaryClass: ValidationTerminalSummaryClass;
    readonly validationBatchId: string;
  };
  readonly projectId: string;
  readonly reasoningTraceId: string;
  readonly traceExport?: {
    readonly attemptCount: number;
    readonly failureClass?: BraintrustOutboxFailureClass;
    readonly nextAttemptAt: Date;
    readonly state: BraintrustOutboxState;
  };
  readonly workspaceId: string;
}

export interface BraintrustIntegrationStatusReadModel {
  /**
   * The implementation must apply workspace and project scope in the same
   * query. The caller remains responsible for authenticating the API actor.
   */
  loadStatus(input: {
    readonly projectId: string;
    readonly reasoningTraceId: string;
    readonly workspaceId: string;
  }): Promise<BraintrustIntegrationStatusSnapshot | undefined>;
}

export type BraintrustTraceExportApiStatus =
  | {
      readonly attemptCount: 0;
      readonly outcome: "pending";
      readonly phase: "not_queued";
      readonly terminal: false;
    }
  | {
      readonly attemptCount: number;
      readonly nextAttemptAt: string;
      readonly outcome: "pending";
      readonly phase: "queued";
      readonly terminal: false;
    }
  | {
      readonly attemptCount: number;
      readonly outcome: "pending";
      readonly phase: "exporting";
      readonly terminal: false;
    }
  | {
      readonly attemptCount: number;
      readonly failureClass: BraintrustOutboxFailureClass;
      readonly nextAttemptAt: string;
      readonly outcome: "pending";
      readonly phase: "retry_scheduled";
      readonly terminal: false;
    }
  | {
      readonly attemptCount: number;
      readonly outcome: "exported";
      readonly terminal: true;
    }
  | {
      readonly attemptCount: number;
      readonly failureClass: BraintrustOutboxFailureClass;
      readonly operatorAction: "inspect_braintrust_integration";
      readonly outcome: "terminal_failure";
      readonly terminal: true;
    };

export type FinalValidationSummaryApiLink =
  | {
      readonly state: "pending";
    }
  | {
      readonly completedAt: string;
      readonly href: string;
      readonly state: "available";
      readonly summaryClass: ValidationTerminalSummaryClass;
      readonly validationBatchId: string;
    };

export interface BraintrustIntegrationOperatorStatus {
  readonly apiVersion: "braintrust-integration-status.v1";
  /**
   * Trace export is observability only. A provider outage cannot change the
   * persisted finding, candidate, validation, or recommendation state.
   */
  readonly deterministicProductState: "independent_of_trace_export";
  readonly finalValidationSummary: FinalValidationSummaryApiLink;
  readonly projectId: string;
  readonly provider: "braintrust";
  readonly reasoningTraceId: string;
  readonly traceExport: BraintrustTraceExportApiStatus;
  readonly workspaceId: string;
}

export class IntegrationStatusError extends Error {
  readonly code: "invalid_input" | "invalid_snapshot" | "not_found";

  constructor(code: IntegrationStatusError["code"]) {
    super(code);
    this.name = "IntegrationStatusError";
    this.code = code;
  }
}

export class IntegrationStatusService {
  readonly #readModel: BraintrustIntegrationStatusReadModel;

  constructor(readModel: BraintrustIntegrationStatusReadModel) {
    this.#readModel = readModel;
  }

  async getBraintrustStatus(input: {
    readonly projectId: string;
    readonly reasoningTraceId: string;
    readonly workspaceId: string;
  }): Promise<BraintrustIntegrationOperatorStatus> {
    validateLookup(input);
    const snapshot = await this.#readModel.loadStatus(input);
    if (snapshot === undefined) {
      throw new IntegrationStatusError("not_found");
    }
    validateSnapshot(input, snapshot);

    return {
      apiVersion: "braintrust-integration-status.v1",
      deterministicProductState: "independent_of_trace_export",
      finalValidationSummary: mapFinalValidationSummary(snapshot),
      projectId: snapshot.projectId,
      provider: "braintrust",
      reasoningTraceId: snapshot.reasoningTraceId,
      traceExport: mapTraceExport(snapshot.traceExport),
      workspaceId: snapshot.workspaceId
    };
  }
}

function mapTraceExport(
  traceExport: BraintrustIntegrationStatusSnapshot["traceExport"]
): BraintrustTraceExportApiStatus {
  if (traceExport === undefined) {
    return {
      attemptCount: 0,
      outcome: "pending",
      phase: "not_queued",
      terminal: false
    };
  }

  switch (traceExport.state) {
    case "pending":
      return {
        attemptCount: traceExport.attemptCount,
        nextAttemptAt: traceExport.nextAttemptAt.toISOString(),
        outcome: "pending",
        phase: "queued",
        terminal: false
      };
    case "exporting":
      return {
        attemptCount: traceExport.attemptCount,
        outcome: "pending",
        phase: "exporting",
        terminal: false
      };
    case "failed":
      return {
        attemptCount: traceExport.attemptCount,
        failureClass: requiredFailureClass(traceExport),
        nextAttemptAt: traceExport.nextAttemptAt.toISOString(),
        outcome: "pending",
        phase: "retry_scheduled",
        terminal: false
      };
    case "exported":
      return {
        attemptCount: traceExport.attemptCount,
        outcome: "exported",
        terminal: true
      };
    case "abandoned":
      return {
        attemptCount: traceExport.attemptCount,
        failureClass: requiredFailureClass(traceExport),
        operatorAction: "inspect_braintrust_integration",
        outcome: "terminal_failure",
        terminal: true
      };
  }
}

function mapFinalValidationSummary(
  snapshot: BraintrustIntegrationStatusSnapshot
): FinalValidationSummaryApiLink {
  const summary = snapshot.finalValidationSummary;
  if (summary === undefined) {
    return { state: "pending" };
  }
  return {
    completedAt: summary.completedAt.toISOString(),
    href: [
      "",
      "v1",
      "workspaces",
      encodeURIComponent(snapshot.workspaceId),
      "projects",
      encodeURIComponent(snapshot.projectId),
      "validation-batches",
      encodeURIComponent(summary.validationBatchId),
      "summary"
    ].join("/"),
    state: "available",
    summaryClass: summary.summaryClass,
    validationBatchId: summary.validationBatchId
  };
}

function requiredFailureClass(
  traceExport: NonNullable<BraintrustIntegrationStatusSnapshot["traceExport"]>
): BraintrustOutboxFailureClass {
  if (traceExport.failureClass === undefined) {
    throw new IntegrationStatusError("invalid_snapshot");
  }
  return traceExport.failureClass;
}

function validateLookup(input: {
  readonly projectId: string;
  readonly reasoningTraceId: string;
  readonly workspaceId: string;
}): void {
  if (
    !validIdentifier(input.projectId) ||
    !validIdentifier(input.reasoningTraceId) ||
    !validIdentifier(input.workspaceId)
  ) {
    throw new IntegrationStatusError("invalid_input");
  }
}

function validateSnapshot(
  input: {
    readonly projectId: string;
    readonly reasoningTraceId: string;
    readonly workspaceId: string;
  },
  snapshot: BraintrustIntegrationStatusSnapshot
): void {
  if (
    snapshot.projectId !== input.projectId ||
    snapshot.reasoningTraceId !== input.reasoningTraceId ||
    snapshot.workspaceId !== input.workspaceId
  ) {
    throw new IntegrationStatusError("invalid_snapshot");
  }

  const traceExport = snapshot.traceExport;
  if (
    traceExport !== undefined &&
    (!validOutboxState(traceExport.state) ||
      !Number.isSafeInteger(traceExport.attemptCount) ||
      traceExport.attemptCount < 0 ||
      !validDate(traceExport.nextAttemptAt) ||
      (traceExport.failureClass !== undefined && !validFailureClass(traceExport.failureClass)) ||
      (traceExport.state === "exporting" && traceExport.attemptCount < 1) ||
      ((traceExport.state === "failed" || traceExport.state === "abandoned") &&
        traceExport.failureClass === undefined))
  ) {
    throw new IntegrationStatusError("invalid_snapshot");
  }

  const summary = snapshot.finalValidationSummary;
  if (
    summary !== undefined &&
    (!validIdentifier(summary.validationBatchId) ||
      !validDate(summary.completedAt) ||
      !validSummaryClass(summary.summaryClass))
  ) {
    throw new IntegrationStatusError("invalid_snapshot");
  }
}

function validIdentifier(value: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u.test(value);
}

function validDate(value: Date): boolean {
  return value instanceof Date && Number.isFinite(value.getTime());
}

function validOutboxState(value: unknown): value is BraintrustOutboxState {
  return (
    value === "pending" ||
    value === "exporting" ||
    value === "exported" ||
    value === "failed" ||
    value === "abandoned"
  );
}

function validFailureClass(value: unknown): value is BraintrustOutboxFailureClass {
  return (
    value === "configuration" ||
    value === "object_missing" ||
    value === "object_mismatch" ||
    value === "provider" ||
    value === "timeout" ||
    value === "unknown"
  );
}

function validSummaryClass(value: unknown): value is ValidationTerminalSummaryClass {
  return (
    value === "verified" ||
    value === "behavior_contract_missing" ||
    value === "baseline_already_passed" ||
    value === "candidate_failed" ||
    value === "infrastructure_error" ||
    value === "cleanup_failed"
  );
}
