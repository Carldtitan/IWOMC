import type {
  AllowlistedTraceRecord,
  BraintrustPort,
  CanonicalJsonValue,
  ExportAllowlistedTracesRequest,
  ExportAllowlistedTracesResult
} from "@environment-reconciler/integrations/ports";

import { canonicalJsonByteLength, DeterministicScenario, ScenarioFailure } from "./scenario.js";

export interface FakeBraintrustOptions {
  readonly scenario?: DeterministicScenario;
}

type ExportValue = Omit<ExportAllowlistedTracesResult, "receipt">;

const allowedTraceKeys = new Set([
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

export class FakeBraintrust implements BraintrustPort {
  readonly scenario: DeterministicScenario;
  readonly #recordsByProject = new Map<string, AllowlistedTraceRecord[]>();

  constructor(options: FakeBraintrustOptions = {}) {
    this.scenario = options.scenario ?? new DeterministicScenario();
  }

  async exportAllowlistedTraces(
    request: ExportAllowlistedTracesRequest
  ): Promise<ExportAllowlistedTracesResult> {
    if (request.projectName.trim().length === 0) {
      throw new ScenarioFailure("invalid_project_name", "braintrust.export");
    }
    assertPositiveSafeInteger(request.maxRecords, "maxRecords");
    assertPositiveSafeInteger(request.maxEncodedBytes, "maxEncodedBytes");

    const execution = await this.scenario.execute<ExportValue>({
      service: "braintrust",
      operation: "exportAllowlistedTraces",
      context: request.context,
      perform: async () => {
        if (request.records.length > request.maxRecords) {
          throw new ScenarioFailure("record_limit_exceeded", "braintrust.export");
        }
        for (const record of request.records) {
          assertAllowlistedRecord(record);
        }
        const encodedRecords = request.records.map((record) => recordToCanonicalJson(record));
        if (canonicalJsonByteLength(encodedRecords) > request.maxEncodedBytes) {
          throw new ScenarioFailure("encoded_byte_limit_exceeded", "braintrust.export");
        }
        const batchDigest = await this.scenario.hasher.hashCanonicalJson(encodedRecords);
        const stored = this.#projectRecords(request.projectName);
        stored.push(...request.records.map((record) => cloneRecord(record)));

        return {
          value: {
            acceptedRecords: request.records.length,
            rejectedRecords: 0,
            batchDigest
          },
          resultSummary: {
            acceptedRecords: request.records.length,
            rejectedRecords: 0,
            batchDigest
          },
          providerRequestId: this.scenario.ids.generate()
        };
      },
      clone: cloneExportValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  records(projectName: string): readonly AllowlistedTraceRecord[] {
    return (this.#recordsByProject.get(projectName) ?? []).map((record) => cloneRecord(record));
  }

  #projectRecords(projectName: string): AllowlistedTraceRecord[] {
    const existing = this.#recordsByProject.get(projectName);
    if (existing !== undefined) {
      return existing;
    }
    const records: AllowlistedTraceRecord[] = [];
    this.#recordsByProject.set(projectName, records);
    return records;
  }
}

function assertAllowlistedRecord(record: AllowlistedTraceRecord): void {
  for (const key of Object.keys(record)) {
    if (!allowedTraceKeys.has(key)) {
      throw new ScenarioFailure("non_allowlisted_trace_field", "braintrust.export");
    }
  }
  if (
    record.traceId.trim().length === 0 ||
    record.spanId.trim().length === 0 ||
    record.adapterVersion.trim().length === 0 ||
    record.policyVersion.trim().length === 0
  ) {
    throw new ScenarioFailure("invalid_trace_record", "braintrust.export");
  }
  assertNonNegativeSafeInteger(record.durationMs, "durationMs");
  assertPositiveSafeInteger(record.attemptCount, "attemptCount");
}

function recordToCanonicalJson(record: AllowlistedTraceRecord): CanonicalJsonValue {
  return {
    traceId: record.traceId,
    spanId: record.spanId,
    organizationPseudonym: record.organizationPseudonym,
    projectPseudonym: record.projectPseudonym,
    runPseudonym: record.runPseudonym,
    operation: record.operation,
    outcome: record.outcome,
    startedAt: record.startedAt,
    durationMs: record.durationMs,
    attemptCount: record.attemptCount,
    inputDigest: record.inputDigest,
    adapterVersion: record.adapterVersion,
    policyVersion: record.policyVersion,
    ...(record.parentSpanId === undefined ? {} : { parentSpanId: record.parentSpanId }),
    ...(record.outputDigest === undefined ? {} : { outputDigest: record.outputDigest }),
    ...(record.failureClass === undefined ? {} : { failureClass: record.failureClass }),
    ...(record.modelId === undefined ? {} : { modelId: record.modelId }),
    ...(record.inputTokens === undefined ? {} : { inputTokens: record.inputTokens }),
    ...(record.outputTokens === undefined ? {} : { outputTokens: record.outputTokens }),
    ...(record.cachedInputTokens === undefined
      ? {}
      : { cachedInputTokens: record.cachedInputTokens }),
    ...(record.candidateCount === undefined ? {} : { candidateCount: record.candidateCount }),
    ...(record.validationTargetCount === undefined
      ? {}
      : { validationTargetCount: record.validationTargetCount }),
    ...(record.validationPassCount === undefined
      ? {}
      : { validationPassCount: record.validationPassCount }),
    ...(record.estimatedCostMicros === undefined
      ? {}
      : { estimatedCostMicros: record.estimatedCostMicros })
  };
}

function cloneRecord(record: AllowlistedTraceRecord): AllowlistedTraceRecord {
  return { ...record };
}

function cloneExportValue(value: ExportValue): ExportValue {
  return { ...value };
}

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ScenarioFailure("invalid_numeric_parameter", name);
  }
}

function assertNonNegativeSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ScenarioFailure("invalid_numeric_parameter", name);
  }
}
