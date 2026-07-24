import {
  assertCanonicalJsonSafe,
  BoundaryValidationError,
  isSha256Digest,
  toCanonicalJson
} from "../internal/boundary-safety.js";
import { sha256Canonical, sha256Text } from "../internal/digest.js";
import type {
  AllowlistedTraceRecord,
  BraintrustPort,
  CanonicalJsonValue,
  ExportAllowlistedTracesRequest,
  ExportAllowlistedTracesResult,
  TraceOperation,
  TraceOutcome
} from "../ports/index.js";

const DEFAULT_API_BASE_URL = "https://api.braintrust.dev/v1/";
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/u;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const TRACE_OPERATIONS: ReadonlySet<TraceOperation> = new Set([
  "capture",
  "reconcile",
  "generate-candidate",
  "validate",
  "publish",
  "cleanup"
]);
const TRACE_OUTCOMES: ReadonlySet<TraceOutcome> = new Set([
  "succeeded",
  "failed",
  "cancelled",
  "timed-out"
]);
const ALLOWLISTED_TRACE_KEYS: ReadonlySet<string> = new Set([
  "adapterVersion",
  "attemptCount",
  "cachedInputTokens",
  "candidateCount",
  "durationMs",
  "estimatedCostMicros",
  "failureClass",
  "inputDigest",
  "inputTokens",
  "modelId",
  "operation",
  "organizationPseudonym",
  "outcome",
  "outputDigest",
  "outputTokens",
  "parentSpanId",
  "policyVersion",
  "projectPseudonym",
  "runPseudonym",
  "spanId",
  "startedAt",
  "traceId",
  "validationPassCount",
  "validationTargetCount"
]);

export interface BraintrustHttpClientConfiguration {
  readonly apiKey: string;
  readonly projectId: string;
  readonly apiBaseUrl?: string;
  readonly fetch?: typeof fetch;
  readonly requestTimeoutMs?: number;
}

export class BraintrustIntegrationError extends Error {
  readonly code:
    | "invalid_configuration"
    | "invalid_request"
    | "provider_error"
    | "provider_response_invalid"
    | "timeout";

  constructor(code: BraintrustIntegrationError["code"]) {
    super(code);
    this.name = "BraintrustIntegrationError";
    this.code = code;
  }
}

export type BraintrustBestEffortResult =
  | {
      readonly delivery: "exported";
      readonly result: ExportAllowlistedTracesResult;
    }
  | {
      readonly delivery: "deferred";
      readonly failureClass: "configuration" | "provider" | "timeout" | "unknown";
    };

type BraintrustFailureClass = "configuration" | "provider" | "timeout" | "unknown";

function isFiniteNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function recordIsValid(record: AllowlistedTraceRecord): boolean {
  const startedAt = Date.parse(record.startedAt);
  if (
    !Object.keys(record).every((key) => ALLOWLISTED_TRACE_KEYS.has(key)) ||
    !ID_PATTERN.test(record.traceId) ||
    !ID_PATTERN.test(record.spanId) ||
    (record.parentSpanId !== undefined && !ID_PATTERN.test(record.parentSpanId)) ||
    !isSha256Digest(record.organizationPseudonym) ||
    !isSha256Digest(record.projectPseudonym) ||
    !isSha256Digest(record.runPseudonym) ||
    !isSha256Digest(record.inputDigest) ||
    (record.outputDigest !== undefined && !isSha256Digest(record.outputDigest)) ||
    !TRACE_OPERATIONS.has(record.operation) ||
    !TRACE_OUTCOMES.has(record.outcome) ||
    !Number.isFinite(startedAt) ||
    !isFiniteNonNegative(record.durationMs) ||
    !Number.isInteger(record.attemptCount) ||
    record.attemptCount < 1 ||
    record.adapterVersion.length === 0 ||
    record.policyVersion.length === 0
  ) {
    return false;
  }
  const optionalNumbers = [
    record.inputTokens,
    record.outputTokens,
    record.cachedInputTokens,
    record.candidateCount,
    record.validationTargetCount,
    record.validationPassCount,
    record.estimatedCostMicros
  ];
  return optionalNumbers.every(
    (value) => value === undefined || (Number.isSafeInteger(value) && value >= 0)
  );
}

function traceName(operation: TraceOperation): string {
  return operation === "generate-candidate"
    ? "candidate.reasoning"
    : `environment-REDACTED.${operation}`;
}

function mapRecord(record: AllowlistedTraceRecord): CanonicalJsonValue {
  const startedSeconds = Date.parse(record.startedAt) / 1_000;
  const inputTokens = record.inputTokens ?? 0;
  const outputTokens = record.outputTokens ?? 0;
  return toCanonicalJson({
    created: record.startedAt,
    id: record.spanId,
    metadata: {
      adapter_version: record.adapterVersion,
      attempt_count: record.attemptCount,
      ...(record.candidateCount === undefined ? {} : { candidate_count: record.candidateCount }),
      ...(record.estimatedCostMicros === undefined
        ? {}
        : { estimated_cost_micros: record.estimatedCostMicros }),
      ...(record.failureClass === undefined ? {} : { failure_class: record.failureClass }),
      input_digest: record.inputDigest,
      ...(record.modelId === undefined ? {} : { model_id: record.modelId }),
      operation: record.operation,
      organization_pseudonym: record.organizationPseudonym,
      ...(record.outputDigest === undefined ? {} : { output_digest: record.outputDigest }),
      outcome: record.outcome,
      policy_version: record.policyVersion,
      project_pseudonym: record.projectPseudonym,
      run_pseudonym: record.runPseudonym,
      ...(record.validationPassCount === undefined
        ? {}
        : { validation_REDACTED_count: record.validationPassCount }),
      ...(record.validationTargetCount === undefined
        ? {}
        : { validation_target_count: record.validationTargetCount })
    },
    metrics: {
      completion_REDACTEDs: outputTokens,
      end: startedSeconds + record.durationMs / 1_000,
      prompt_REDACTEDs: inputTokens,
      start: startedSeconds,
      REDACTEDs: inputTokens + outputTokens
    },
    ...(record.parentSpanId === undefined ? {} : { span_parents: [record.parentSpanId] }),
    root_span_id: record.traceId,
    span_attributes: {
      name: traceName(record.operation),
      type: record.operation === "generate-candidate" ? "llm" : "task"
    },
    span_id: record.spanId
  });
}

function classifyFailure(error: unknown): BraintrustFailureClass {
  if (!(error instanceof BraintrustIntegrationError)) {
    return "unknown";
  }
  switch (error.code) {
    case "invalid_configuration":
    case "invalid_request":
      return "configuration";
    case "timeout":
      return "timeout";
    case "provider_error":
    case "provider_response_invalid":
      return "provider";
  }
}

export class BraintrustHttpClient implements BraintrustPort {
  readonly #apiKey: string;
  readonly #endpoint: string;
  readonly #fetch: typeof fetch;
  readonly #projectId: string;
  readonly #requestTimeoutMs: number;

  constructor(configuration: BraintrustHttpClientConfiguration) {
    const requestTimeoutMs = configuration.requestTimeoutMs ?? 10_000;
    let baseUrl: URL;
    try {
      baseUrl = new URL(configuration.apiBaseUrl ?? DEFAULT_API_BASE_URL);
    } catch {
      throw new BraintrustIntegrationError("invalid_configuration");
    }
    if (
      REDACTED.length === 0 ||
      !UUID_PATTERN.test(configuration.projectId) ||
      baseUrl.protocol !== "https:" ||
      requestTimeoutMs < 1
    ) {
      throw new BraintrustIntegrationError("invalid_configuration");
    }
    this.#apiKey = REDACTED;
    this.#projectId = configuration.projectId;
    this.#endpoint = new URL(
      `project_logs/${encodeURIComponent(configuration.projectId)}/insert`,
      baseUrl
    ).toString();
    this.#fetch = configuration.fetch ?? globalThis.fetch;
    this.#requestTimeoutMs = requestTimeoutMs;
  }

  async exportAllowlistedTraces(
    request: ExportAllowlistedTracesRequest
  ): Promise<ExportAllowlistedTracesResult> {
    if (
      !Number.isSafeInteger(request.maxRecords) ||
      request.maxRecords < 1 ||
      !Number.isSafeInteger(request.maxEncodedBytes) ||
      request.maxEncodedBytes < 64 ||
      request.context.budget.timeoutMs < 1 ||
      request.records.length > 10_000
    ) {
      throw new BraintrustIntegrationError("invalid_request");
    }

    const acceptedEvents: CanonicalJsonValue[] = [];
    let rejectedRecords = 0;
    for (const record of request.records) {
      if (acceptedEvents.length >= request.maxRecords || !recordIsValid(record)) {
        rejectedRecords += 1;
        continue;
      }
      let event: CanonicalJsonValue;
      try {
        event = mapRecord(record);
        assertCanonicalJsonSafe(event, { rejectPromptInjection: false });
      } catch (error: unknown) {
        if (error instanceof BoundaryValidationError) {
          rejectedRecords += 1;
          continue;
        }
        throw error;
      }
      const proposedBody = JSON.stringify({ events: [...acceptedEvents, event] });
      if (new TextEncoder().encode(proposedBody).byteLength > request.maxEncodedBytes) {
        rejectedRecords += 1;
        continue;
      }
      acceptedEvents.push(event);
    }

    const batchDigest = await sha256Canonical(acceptedEvents);
    if (acceptedEvents.length === 0) {
      return {
        acceptedRecords: 0,
        batchDigest,
        receipt: {
          attemptDigest: batchDigest,
          attemptNumber: request.context.attemptNumber,
          operationKey: request.context.operationKey,
          providerResourceId: this.#projectId,
          requestDigest: request.context.requestDigest,
          resultDigest: batchDigest
        },
        rejectedRecords
      };
    }

    const body = JSON.stringify({ events: acceptedEvents });
    const response = await this.#post(
      body,
      Math.min(this.#requestTimeoutMs, request.context.budget.timeoutMs)
    );
    if (!response.ok) {
      throw new BraintrustIntegrationError("provider_error");
    }
    let responseValue: unknown;
    try {
      responseValue = JSON.parse(await response.text());
    } catch {
      throw new BraintrustIntegrationError("provider_response_invalid");
    }
    if (
      typeof responseValue !== "object" ||
      responseValue === null ||
      !Array.isArray((responseValue as { row_ids?: unknown }).row_ids) ||
      !(responseValue as { row_ids: unknown[] }).row_ids.every(
        (rowId) => typeof rowId === "string"
      ) ||
      (responseValue as { row_ids: unknown[] }).row_ids.length !== acceptedEvents.length
    ) {
      throw new BraintrustIntegrationError("provider_response_invalid");
    }
    const providerRequestId = response.headers.get("x-request-id") ?? undefined;
    const resultDigest = await sha256Text(body);
    return {
      acceptedRecords: acceptedEvents.length,
      batchDigest,
      receipt: {
        attemptDigest: await sha256Canonical({
          acceptedRecords: acceptedEvents.length,
          providerRequestId: providerRequestId ?? null,
          rejectedRecords
        }),
        attemptNumber: request.context.attemptNumber,
        operationKey: request.context.operationKey,
        providerResourceId: this.#projectId,
        ...(providerRequestId === undefined ? {} : { providerRequestId }),
        requestDigest: request.context.requestDigest,
        resultDigest
      },
      rejectedRecords
    };
  }

  async #post(body: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(
      () => {
        controller.abort();
      },
      Math.max(1, timeoutMs)
    );
    try {
      return await this.#fetch(this.#endpoint, {
        body,
        headers: {
          Authorization: `Bearer ${this.#apiKey}`,
          "Content-Type": "application/json"
        },
        method: "POST",
        signal: controller.signal
      });
    } catch (error: unknown) {
      if (
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        throw new BraintrustIntegrationError("timeout");
      }
      throw new BraintrustIntegrationError("provider_error");
    } finally {
      clearTimeout(timeout);
    }
  }
}

export async function exportAllowlistedTracesBestEffort(
  braintrust: BraintrustPort,
  request: ExportAllowlistedTracesRequest
): Promise<BraintrustBestEffortResult> {
  try {
    return {
      delivery: "exported",
      result: await braintrust.exportAllowlistedTraces(request)
    };
  } catch (error: unknown) {
    return {
      delivery: "deferred",
      failureClass: classifyFailure(error)
    };
  }
}
