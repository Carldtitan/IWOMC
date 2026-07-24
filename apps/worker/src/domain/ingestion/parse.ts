import { IngestionError } from "./errors.js";
import type {
  CompanionStoredEventPayload,
  CompanionUploadBatch,
  CompanionUploadEvent
} from "./types.js";

const decoder = new TextDecoder("utf-8", { fatal: true });
const digestPattern = /^sha256:[0-9a-f]{64}$/u;
const identifierPattern = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;
const batchKeys = [
  "attemptCount",
  "batchId",
  "chainHead",
  "chainHeadSignature",
  "eventCount",
  "events",
  "firstSequence",
  "lastSequence",
  "publicKey",
  "schemaVersion",
  "signingKeyVersion"
] as const;
const eventKeys = [
  "eventHash",
  "eventId",
  "localSequence",
  "payload",
  "previousEventHash",
  "sourceSequence"
] as const;
const storedPayloadKeys = [
  "actionType",
  "eventId",
  "payload",
  "redactionPolicyVersion",
  "schemaVersion",
  "source",
  "sourceSequence"
] as const;

export interface ParseUploadBatchOptions {
  readonly maximumBodyBytes: number;
  readonly maximumEvents: number;
}

export function parseCompanionUploadBatch(
  rawBody: REDACTED,
  options: ParseUploadBatchOptions
): CompanionUploadBatch {
  if (rawBody.byteLength === 0 || rawBody.byteLength > options.maximumBodyBytes) {
    throw new IngestionError("batch_too_large", 413);
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(decoder.decode(rawBody)) as unknown;
  } catch {
    throw new IngestionError("invalid_batch", 400);
  }
  assertJsonComplexity(parsed);
  const batch = requireRecord(parsed);
  requireExactKeys(batch, batchKeys);
  if (
    batch.schemaVersion !== 1 ||
    !isIdentifier(batch.batchId) ||
    !isPositiveSafeInteger(batch.firstSequence) ||
    !isPositiveSafeInteger(batch.lastSequence) ||
    !isNonNegativeSafeInteger(batch.eventCount) ||
    !isNonNegativeSafeInteger(batch.signingKeyVersion) ||
    !isNonNegativeSafeInteger(batch.attemptCount) ||
    !isDigest(batch.chainHead) ||
    !isBase64(batch.publicKey, 32) ||
    !isBase64(batch.chainHeadSignature, 64) ||
    !Array.isArray(batch.events) ||
    batch.events.length === 0 ||
    batch.events.length > options.maximumEvents ||
    batch.eventCount !== batch.events.length
  ) {
    throw new IngestionError("invalid_batch", 400);
  }

  const events = batch.events.map((value) => parseEvent(value));
  const result: CompanionUploadBatch = {
    attemptCount: batch.attemptCount,
    batchId: batch.batchId,
    chainHead: batch.chainHead,
    chainHeadSignature: batch.chainHeadSignature,
    eventCount: batch.eventCount,
    events: Object.freeze(events),
    firstSequence: batch.firstSequence,
    lastSequence: batch.lastSequence,
    publicKey: batch.publicKey,
    schemaVersion: 1,
    signingKeyVersion: batch.signingKeyVersion
  };
  return Object.freeze(result);
}

function parseEvent(value: unknown): CompanionUploadEvent {
  const event = requireRecord(value);
  requireExactKeys(event, eventKeys);
  if (
    !isIdentifier(event.eventId) ||
    !isPositiveSafeInteger(event.localSequence) ||
    !isNullableShortString(event.sourceSequence, 200) ||
    !isDigest(event.previousEventHash) ||
    !isDigest(event.eventHash)
  ) {
    throw new IngestionError("invalid_batch", 400);
  }
  const payload = parseStoredPayload(event.payload);
  if (payload.eventId !== event.eventId || payload.sourceSequence !== event.sourceSequence) {
    throw new IngestionError("invalid_batch", 400);
  }
  return Object.freeze({
    eventHash: event.eventHash,
    eventId: event.eventId,
    localSequence: event.localSequence,
    payload,
    previousEventHash: event.previousEventHash,
    sourceSequence: event.sourceSequence
  });
}

function parseStoredPayload(value: unknown): CompanionStoredEventPayload {
  const payload = requireRecord(value);
  requireExactKeys(payload, storedPayloadKeys);
  if (
    payload.schemaVersion !== 1 ||
    !isIdentifier(payload.eventId) ||
    !isShortString(payload.source, 100) ||
    !isShortString(payload.actionType, 100) ||
    !isNullableShortString(payload.sourceSequence, 200) ||
    !isShortString(payload.redactionPolicyVersion, 100)
  ) {
    throw new IngestionError("invalid_batch", 400);
  }
  return Object.freeze({
    actionType: payload.actionType,
    eventId: payload.eventId,
    payload: deepFreeze(payload.payload),
    redactionPolicyVersion: payload.redactionPolicyVersion,
    schemaVersion: 1,
    source: payload.source,
    sourceSequence: payload.sourceSequence
  });
}

function requireRecord(value: unknown): Readonly<Record<string, unknown>> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new IngestionError("invalid_batch", 400);
  }
  return value as Readonly<Record<string, unknown>>;
}

function requireExactKeys(
  record: Readonly<Record<string, unknown>>,
  expected: readonly string[]
): void {
  const actual = Object.keys(record).sort();
  const sortedExpected = [...expected].sort();
  if (
    actual.length !== sortedExpected.length ||
    actual.some((key, index) => key !== sortedExpected[index])
  ) {
    throw new IngestionError("invalid_batch", 400);
  }
}

function isPositiveSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value > 0;
}

function isNonNegativeSafeInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && typeof value === "number" && value >= 0;
}

function isIdentifier(value: unknown): value is string {
  return typeof value === "string" && identifierPattern.test(value);
}

function isDigest(value: unknown): value is `sha256:${string}` {
  return typeof value === "string" && digestPattern.test(value);
}

function isShortString(value: unknown, maximumLength: number): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= maximumLength;
}

function isNullableShortString(value: unknown, maximumLength: number): value is null | string {
  return value === null || isShortString(value, maximumLength);
}

function isBase64(value: unknown, byteLength: number): value is string {
  if (
    typeof value !== "string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/u.test(value)
  ) {
    return false;
  }
  try {
    return atob(value).length === byteLength;
  } catch {
    return false;
  }
}

function assertJsonComplexity(value: unknown): void {
  const stack: { readonly depth: number; readonly value: unknown }[] = [{ depth: 0, value }];
  let nodes = 0;
  while (stack.length > 0) {
    const entry = stack.pop();
    if (entry === undefined) {
      break;
    }
    nodes += 1;
    if (nodes > 100_000 || entry.depth > 64) {
      throw new IngestionError("invalid_batch", 400);
    }
    if (Array.isArray(entry.value)) {
      for (const child of entry.value) {
        stack.push({ depth: entry.depth + 1, value: child });
      }
    } else if (typeof entry.value === "object" && entry.value !== null) {
      for (const child of Object.values(entry.value)) {
        stack.push({ depth: entry.depth + 1, value: child });
      }
    }
  }
}

function deepFreeze(value: unknown): unknown {
  if (Array.isArray(value)) {
    for (const item of value) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }
  if (typeof value === "object" && value !== null) {
    for (const item of Object.values(value)) {
      deepFreeze(item);
    }
    return Object.freeze(value);
  }
  return value;
}
