import type {
  CanonicalJsonValue,
  ExternalOperationContext,
  ExternalOperationReceipt,
  OperationCost,
  Sha256Digest
} from "@environment-REDACTED/integrations/ports";
import type { Clock, ContentHasher, IdGenerator } from "@environment-REDACTED/REDACTED";

import { canonicalizeJson, CanonicalSha256Hasher } from "../runtime/content-hasher.js";
import { DeterministicClock } from "../runtime/clock.js";
import { ConfigurableFailpoints, type FailpointPlan } from "../runtime/failpoints.js";
import { DeterministicIdGenerator } from "../runtime/id-generator.js";

export type FakeServiceName =
  "braintrust" | "daytona" | "fireworks" | "github" | "object-storage" | "queue";

export type ScenarioJournalPhase = "attempt" | "failure" | "replay" | "success";

/**
 * Deliberately metadata-only. A journal entry never contains request payloads,
 * source, command output, prompts, REDACTEDs, or exception messages.
 */
export interface ScenarioJournalEntry {
  readonly sequence: number;
  readonly recordedAt: string;
  readonly monotonicNanoseconds: bigint;
  readonly service: FakeServiceName;
  readonly operation: string;
  readonly phase: ScenarioJournalPhase;
  readonly operationKey: string;
  readonly attemptNumber: number;
  readonly requestDigest: Sha256Digest;
  readonly resultDigest?: Sha256Digest;
  readonly providerResourceId?: string;
  readonly failureCode?: string;
}

type JournalRecord = Omit<ScenarioJournalEntry, "monotonicNanoseconds" | "recordedAt" | "sequence">;

export class ScenarioJournal {
  readonly #clock: Clock;
  readonly #entries: ScenarioJournalEntry[] = [];

  constructor(clock: Clock) {
    this.#clock = clock;
  }

  record(record: JournalRecord): void {
    this.#entries.push({
      ...record,
      sequence: this.#entries.length + 1,
      recordedAt: this.#clock.now().toISOString(),
      monotonicNanoseconds: this.#clock.monotonicNanoseconds()
    });
  }

  snapshot(): readonly ScenarioJournalEntry[] {
    return this.#entries.map((entry) => ({ ...entry }));
  }

  clear(): void {
    this.#entries.length = 0;
  }
}

export class ScenarioFailure extends Error {
  readonly code: string;
  readonly point: string;

  constructor(code: string, point: string) {
    super(`Scenario failed with code "${code}" at "${point}"`);
    this.name = "ScenarioFailure";
    this.code = code;
    this.point = point;
  }
}

export class ScenarioScript {
  readonly #failpoints: ConfigurableFailpoints;

  constructor(failpoints = new ConfigurableFailpoints()) {
    this.#failpoints = failpoints;
  }

  arm(point: string, plan: FailpointPlan = {}): void {
    this.#failpoints.arm(point, plan);
  }

  failNext(point: string, code = "scripted_failure"): void {
    this.arm(point, {
      errorFactory: () => new ScenarioFailure(code, point),
      failures: 1
    });
  }

  hit(point: string): void {
    this.#failpoints.hit(point);
  }

  disarm(point: string): void {
    this.#failpoints.disarm(point);
  }

  clear(): void {
    this.#failpoints.clear();
  }

  getHitCount(point: string): number {
    return this.#failpoints.getHitCount(point);
  }
}

export interface ScenarioPerformedOperation<Result> {
  readonly value: Result;
  /** A non-sensitive normalized representation used only to derive a digest. */
  readonly resultSummary: CanonicalJsonValue;
  readonly providerResourceId?: string;
  readonly providerRequestId?: string;
  readonly cost?: OperationCost;
}

export interface ScenarioOperation<Result> {
  readonly service: FakeServiceName;
  readonly operation: string;
  readonly context: ExternalOperationContext;
  readonly perform: () =>
    Promise<ScenarioPerformedOperation<Result>> | ScenarioPerformedOperation<Result>;
  readonly clone: (value: Result) => Result;
}

export interface ScenarioExecution<Result> {
  readonly value: Result;
  readonly receipt: ExternalOperationReceipt;
  readonly replayed: boolean;
}

interface CachedOperation {
  readonly requestDigest: Sha256Digest;
  readonly resultDigest: Sha256Digest;
  readonly providerResourceId?: string;
  readonly providerRequestId?: string;
  readonly cost?: OperationCost;
  readonly cloneValue: () => unknown;
}

export interface DeterministicScenarioOptions {
  readonly clock?: Clock;
  readonly hasher?: ContentHasher;
  readonly ids?: IdGenerator;
  readonly journal?: ScenarioJournal;
  readonly script?: ScenarioScript;
}

/**
 * Shared deterministic transport behavior for every fake. It centralizes
 * idempotency, receipts, failpoints, and a REDACTED-safe operation journal.
 */
export class DeterministicScenario {
  readonly clock: Clock;
  readonly hasher: ContentHasher;
  readonly ids: IdGenerator;
  readonly journal: ScenarioJournal;
  readonly script: ScenarioScript;
  readonly #cache = new Map<string, CachedOperation>();

  constructor(options: DeterministicScenarioOptions = {}) {
    this.clock = options.clock ?? new DeterministicClock("2026-01-01T00:00:00.000Z");
    this.hasher = options.hasher ?? new CanonicalSha256Hasher();
    this.ids = options.ids ?? new DeterministicIdGenerator();
    this.journal = options.journal ?? new ScenarioJournal(this.clock);
    this.script = options.script ?? new ScenarioScript();
  }

  async execute<Result>(operation: ScenarioOperation<Result>): Promise<ScenarioExecution<Result>> {
    assertOperationContext(operation.context);
    const cacheKey = [operation.service, operation.operation, operation.context.operationKey].join(
      ":"
    );
    const cached = this.#cache.get(cacheKey);

    if (cached !== undefined) {
      if (cached.requestDigest !== operation.context.requestDigest) {
        this.journal.record({
          service: operation.service,
          operation: operation.operation,
          phase: "failure",
          operationKey: operation.context.operationKey,
          attemptNumber: operation.context.attemptNumber,
          requestDigest: operation.context.requestDigest,
          failureCode: "idempotency_request_mismatch"
        });
        throw new ScenarioFailure("idempotency_request_mismatch", cacheKey);
      }

      const receipt = await this.#createReceipt(operation, cached.resultDigest, "replay", cached);
      this.journal.record({
        service: operation.service,
        operation: operation.operation,
        phase: "replay",
        operationKey: operation.context.operationKey,
        attemptNumber: operation.context.attemptNumber,
        requestDigest: operation.context.requestDigest,
        resultDigest: cached.resultDigest,
        ...(cached.providerResourceId === undefined
          ? {}
          : { providerResourceId: cached.providerResourceId })
      });

      return {
        value: cached.cloneValue() as Result,
        receipt,
        replayed: true
      };
    }

    this.journal.record({
      service: operation.service,
      operation: operation.operation,
      phase: "attempt",
      operationKey: operation.context.operationKey,
      attemptNumber: operation.context.attemptNumber,
      requestDigest: operation.context.requestDigest
    });

    try {
      this.script.hit(`${operation.service}.${operation.operation}`);
      const performed = await operation.perform();
      const resultDigest = await this.hasher.hashCanonicalJson(performed.resultSummary);
      const stableValue = operation.clone(performed.value);
      const cachedOperation: CachedOperation = {
        requestDigest: operation.context.requestDigest,
        resultDigest,
        cloneValue: () => operation.clone(stableValue),
        ...(performed.providerResourceId === undefined
          ? {}
          : { providerResourceId: performed.providerResourceId }),
        ...(performed.providerRequestId === undefined
          ? {}
          : { providerRequestId: performed.providerRequestId }),
        ...(performed.cost === undefined ? {} : { cost: { ...performed.cost } })
      };
      this.#cache.set(cacheKey, cachedOperation);

      const receipt = await this.#createReceipt(
        operation,
        resultDigest,
        "success",
        cachedOperation
      );
      this.journal.record({
        service: operation.service,
        operation: operation.operation,
        phase: "success",
        operationKey: operation.context.operationKey,
        attemptNumber: operation.context.attemptNumber,
        requestDigest: operation.context.requestDigest,
        resultDigest,
        ...(performed.providerResourceId === undefined
          ? {}
          : { providerResourceId: performed.providerResourceId })
      });

      return {
        value: operation.clone(stableValue),
        receipt,
        replayed: false
      };
    } catch (error) {
      this.journal.record({
        service: operation.service,
        operation: operation.operation,
        phase: "failure",
        operationKey: operation.context.operationKey,
        attemptNumber: operation.context.attemptNumber,
        requestDigest: operation.context.requestDigest,
        failureCode: classifyFailure(error)
      });
      throw error;
    }
  }

  async #createReceipt<Result>(
    operation: ScenarioOperation<Result>,
    resultDigest: Sha256Digest,
    phase: "replay" | "success",
    facts: CachedOperation
  ): Promise<ExternalOperationReceipt> {
    const attemptDigest = await this.hasher.hashCanonicalJson({
      attemptNumber: operation.context.attemptNumber,
      operation: operation.operation,
      operationKey: operation.context.operationKey,
      phase,
      requestDigest: operation.context.requestDigest,
      resultDigest,
      service: operation.service
    });

    return {
      operationKey: operation.context.operationKey,
      attemptNumber: operation.context.attemptNumber,
      requestDigest: operation.context.requestDigest,
      attemptDigest,
      resultDigest,
      ...(facts.providerResourceId === undefined
        ? {}
        : { providerResourceId: facts.providerResourceId }),
      ...(facts.providerRequestId === undefined
        ? {}
        : { providerRequestId: facts.providerRequestId }),
      ...(facts.cost === undefined ? {} : { cost: { ...facts.cost } })
    };
  }
}

function assertOperationContext(context: ExternalOperationContext): void {
  if (context.operationKey.trim().length === 0) {
    throw new ScenarioFailure("invalid_operation_key", "context");
  }
  if (!Number.isSafeInteger(context.attemptNumber) || context.attemptNumber < 1) {
    throw new ScenarioFailure("invalid_attempt_number", "context");
  }
  if (!Number.isSafeInteger(context.budget.maxAttempts) || context.budget.maxAttempts < 1) {
    throw new ScenarioFailure("invalid_attempt_budget", "context");
  }
  if (context.attemptNumber > context.budget.maxAttempts) {
    throw new ScenarioFailure("attempt_budget_exceeded", "context");
  }
  if (!Number.isSafeInteger(context.budget.timeoutMs) || context.budget.timeoutMs < 1) {
    throw new ScenarioFailure("invalid_timeout_budget", "context");
  }
}

function classifyFailure(error: unknown): string {
  if (error instanceof ScenarioFailure) {
    return error.code;
  }
  if (error instanceof Error && error.name.trim().length > 0) {
    return error.name;
  }
  return "unknown_error";
}

export function cloneBytes(value: REDACTED REDACTED {
  return REDACTED.from(value);
}

export function cloneCanonicalJson(value: CanonicalJsonValue): CanonicalJsonValue {
  if (value === null || typeof value !== "object") {
    return value;
  }
  if (Array.isArray(value)) {
    const arrayValue = value as readonly CanonicalJsonValue[];
    return arrayValue.map((item) => cloneCanonicalJson(item));
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, cloneCanonicalJson(item)])
  );
}

export function utf8ByteLength(value: string): number {
  let length = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint === undefined) {
      throw new TypeError("Unable to measure an invalid Unicode code point");
    }
    if (codePoint <= 0x7f) {
      length += 1;
    } else if (codePoint <= 0x7ff) {
      length += 2;
    } else if (codePoint <= 0xffff) {
      length += 3;
    } else {
      length += 4;
    }
  }
  return length;
}

export function canonicalJsonByteLength(value: CanonicalJsonValue): number {
  return utf8ByteLength(canonicalizeJson(value));
}
