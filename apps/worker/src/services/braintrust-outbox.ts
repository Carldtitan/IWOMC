import type { Sha256Digest } from "@environment-reconciler/integrations/ports";

export interface EncryptedBraintrustTracePayload {
  readonly ciphertext: Uint8Array;
  readonly ciphertextDigest: Sha256Digest;
  readonly encryption: {
    readonly algorithm: "AES-256-GCM";
    readonly keyReferenceId: string;
    readonly nonceDigest: Sha256Digest;
  };
  readonly payloadDigest: Sha256Digest;
}

export interface PrivateEncryptedObjectPointer {
  readonly ciphertextDigest: Sha256Digest;
  readonly encryption: "application-managed";
  readonly objectKey: string;
  readonly objectMetadataId: string;
  readonly privacy: "private";
}

export interface BraintrustTraceOutboxRecord {
  readonly attemptCount: number;
  readonly id: string;
  readonly nextAttemptAt: Date;
  readonly payloadDigest: Sha256Digest;
  readonly payloadObjectMetadataId: string;
  readonly projectId?: string;
  readonly state: "pending" | "exporting" | "exported" | "failed" | "abandoned";
  readonly traceId: string;
  readonly workspaceId: string;
}

export interface ClaimedBraintrustTraceOutboxRecord extends BraintrustTraceOutboxRecord {
  readonly attemptCount: number;
  readonly state: "exporting";
}

export interface BraintrustOutboxObjectStore {
  putPrivateEncryptedPayload(input: {
    readonly objectKey: string;
    readonly payload: EncryptedBraintrustTracePayload;
    readonly workspaceId: string;
  }): Promise<PrivateEncryptedObjectPointer>;

  resolvePrivateEncryptedPayload(input: {
    readonly objectMetadataId: string;
    readonly workspaceId: string;
  }): Promise<PrivateEncryptedObjectPointer | undefined>;
}

export interface BraintrustOutboxPersistence {
  enqueue(input: {
    readonly id: string;
    readonly nextAttemptAt: Date;
    readonly payloadDigest: Sha256Digest;
    readonly payloadObjectMetadataId: string;
    readonly projectId?: string;
    readonly traceId: string;
    readonly workspaceId: string;
  }): Promise<BraintrustTraceOutboxRecord>;

  /**
   * Atomically claims due pending/failed rows (and stale exporting rows),
   * increments attemptCount, and persists state=exporting before returning.
   */
  claimDue(input: {
    readonly limit: number;
    readonly now: Date;
    readonly staleClaimBefore: Date;
  }): Promise<readonly ClaimedBraintrustTraceOutboxRecord[]>;

  markExported(input: {
    readonly attemptCount: number;
    readonly exportedAt: Date;
    readonly id: string;
    readonly providerResultDigest: Sha256Digest;
  }): Promise<void>;

  recordFailure(input: {
    readonly attemptCount: number;
    readonly failureClass: BraintrustOutboxFailureClass;
    readonly id: string;
    readonly nextAttemptAt: Date;
    readonly terminal: boolean;
  }): Promise<void>;
}

export interface BraintrustEncryptedTraceExporter {
  /**
   * Resolves/decrypts the private object inside the trusted adapter. Provider
   * row/event IDs must derive from idempotencyKey so a crash after export can
   * be reconciled without duplicate trace truth.
   */
  exportEncryptedTrace(input: {
    readonly idempotencyKey: string;
    readonly object: PrivateEncryptedObjectPointer;
    readonly payloadDigest: Sha256Digest;
    readonly traceId: string;
  }): Promise<{ readonly resultDigest: Sha256Digest }>;
}

export interface BraintrustOutboxClock {
  now(): Date;
}

export type BraintrustOutboxFailureClass =
  "configuration" | "object_missing" | "object_mismatch" | "provider" | "timeout" | "unknown";

export interface BraintrustOutboxConfiguration {
  readonly baseBackoffMs: number;
  readonly batchSize: number;
  readonly claimLeaseMs: number;
  readonly maximumAttempts: number;
  readonly maximumBackoffMs: number;
}

export class BraintrustOutboxExportError extends Error {
  readonly failureClass: BraintrustOutboxFailureClass;
  readonly retryable: boolean;

  constructor(failureClass: BraintrustOutboxFailureClass, retryable: boolean) {
    super(failureClass);
    this.name = "BraintrustOutboxExportError";
    this.failureClass = failureClass;
    this.retryable = retryable;
  }
}

export class BraintrustOutboxError extends Error {
  readonly code:
    "invalid_configuration" | "invalid_enqueue_input" | "invalid_object_pointer" | "invalid_claim";

  constructor(code: BraintrustOutboxError["code"]) {
    super(code);
    this.name = "BraintrustOutboxError";
    this.code = code;
  }
}

export interface BraintrustOutboxDrainSummary {
  readonly abandoned: number;
  readonly claimed: number;
  readonly exported: number;
  readonly retried: number;
}

export class BraintrustTraceOutboxService {
  readonly #clock: BraintrustOutboxClock;
  readonly #configuration: BraintrustOutboxConfiguration;
  readonly #exporter: BraintrustEncryptedTraceExporter;
  readonly #objects: BraintrustOutboxObjectStore;
  readonly #persistence: BraintrustOutboxPersistence;

  constructor(
    persistence: BraintrustOutboxPersistence,
    objects: BraintrustOutboxObjectStore,
    exporter: BraintrustEncryptedTraceExporter,
    clock: BraintrustOutboxClock,
    configuration: BraintrustOutboxConfiguration
  ) {
    validateConfiguration(configuration);
    this.#persistence = persistence;
    this.#objects = objects;
    this.#exporter = exporter;
    this.#clock = clock;
    this.#configuration = configuration;
  }

  async enqueue(input: {
    readonly id: string;
    readonly objectKey: string;
    readonly payload: EncryptedBraintrustTracePayload;
    readonly projectId?: string;
    readonly traceId: string;
    readonly workspaceId: string;
  }): Promise<BraintrustTraceOutboxRecord> {
    validateEnqueueInput(input);
    const object = await this.#objects.putPrivateEncryptedPayload({
      objectKey: input.objectKey,
      payload: input.payload,
      workspaceId: input.workspaceId
    });
    assertPrivatePointer(object, input.payload.ciphertextDigest);
    return this.#persistence.enqueue({
      id: input.id,
      nextAttemptAt: this.#clock.now(),
      payloadDigest: input.payload.payloadDigest,
      payloadObjectMetadataId: object.objectMetadataId,
      ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
      traceId: input.traceId,
      workspaceId: input.workspaceId
    });
  }

  async drainDue(): Promise<BraintrustOutboxDrainSummary> {
    const now = this.#clock.now();
    const claimed = await this.#persistence.claimDue({
      limit: this.#configuration.batchSize,
      now,
      staleClaimBefore: new Date(now.getTime() - this.#configuration.claimLeaseMs)
    });
    let abandoned = 0;
    let exported = 0;
    let retried = 0;

    for (const record of claimed) {
      validateClaim(record);
      try {
        const object = await this.#objects.resolvePrivateEncryptedPayload({
          objectMetadataId: record.payloadObjectMetadataId,
          workspaceId: record.workspaceId
        });
        if (object === undefined) {
          throw new BraintrustOutboxExportError("object_missing", false);
        }
        assertPrivatePointer(object);
        const result = await this.#exporter.exportEncryptedTrace({
          idempotencyKey: `braintrust-trace-outbox:${record.id}`,
          object,
          payloadDigest: record.payloadDigest,
          traceId: record.traceId
        });
        await this.#persistence.markExported({
          attemptCount: record.attemptCount,
          exportedAt: this.#clock.now(),
          id: record.id,
          providerResultDigest: result.resultDigest
        });
        exported += 1;
      } catch (error: unknown) {
        const failure = normalizeExportFailure(error);
        const terminal =
          !failure.retryable || record.attemptCount >= this.#configuration.maximumAttempts;
        await this.#persistence.recordFailure({
          attemptCount: record.attemptCount,
          failureClass: failure.failureClass,
          id: record.id,
          nextAttemptAt: terminal
            ? this.#clock.now()
            : new Date(
                this.#clock.now().getTime() + backoffMs(record.attemptCount, this.#configuration)
              ),
          terminal
        });
        if (terminal) {
          abandoned += 1;
        } else {
          retried += 1;
        }
      }
    }

    return { abandoned, claimed: claimed.length, exported, retried };
  }
}

function validateConfiguration(configuration: BraintrustOutboxConfiguration): void {
  if (
    !Number.isSafeInteger(configuration.baseBackoffMs) ||
    configuration.baseBackoffMs < 1 ||
    !Number.isSafeInteger(configuration.maximumBackoffMs) ||
    configuration.maximumBackoffMs < configuration.baseBackoffMs ||
    !Number.isSafeInteger(configuration.batchSize) ||
    configuration.batchSize < 1 ||
    configuration.batchSize > 100 ||
    !Number.isSafeInteger(configuration.claimLeaseMs) ||
    configuration.claimLeaseMs < 1 ||
    !Number.isSafeInteger(configuration.maximumAttempts) ||
    configuration.maximumAttempts < 1 ||
    configuration.maximumAttempts > 20
  ) {
    throw new BraintrustOutboxError("invalid_configuration");
  }
}

function validateEnqueueInput(input: {
  readonly id: string;
  readonly objectKey: string;
  readonly payload: EncryptedBraintrustTracePayload;
  readonly traceId: string;
  readonly workspaceId: string;
}): void {
  if (
    input.id.trim().length === 0 ||
    input.traceId.trim().length === 0 ||
    input.workspaceId.trim().length === 0 ||
    !input.objectKey.startsWith(`workspaces/${input.workspaceId}/braintrust-outbox/`) ||
    !input.objectKey.endsWith(".json.enc") ||
    input.payload.ciphertext.byteLength === 0 ||
    input.payload.encryption.keyReferenceId.trim().length === 0 ||
    !isSha256Digest(input.payload.ciphertextDigest) ||
    !isSha256Digest(input.payload.payloadDigest) ||
    !isSha256Digest(input.payload.encryption.nonceDigest)
  ) {
    throw new BraintrustOutboxError("invalid_enqueue_input");
  }
}

function validateClaim(record: ClaimedBraintrustTraceOutboxRecord): void {
  if (
    !runtimeEquals(record.state, "exporting") ||
    !Number.isSafeInteger(record.attemptCount) ||
    record.attemptCount < 1 ||
    record.id.trim().length === 0 ||
    record.traceId.trim().length === 0 ||
    record.workspaceId.trim().length === 0 ||
    record.payloadObjectMetadataId.trim().length === 0 ||
    !isSha256Digest(record.payloadDigest)
  ) {
    throw new BraintrustOutboxError("invalid_claim");
  }
}

function assertPrivatePointer(
  object: PrivateEncryptedObjectPointer,
  expectedCiphertextDigest?: Sha256Digest
): void {
  if (
    !runtimeEquals(object.privacy, "private") ||
    !runtimeEquals(object.encryption, "application-managed") ||
    object.objectKey.trim().length === 0 ||
    object.objectMetadataId.trim().length === 0 ||
    !isSha256Digest(object.ciphertextDigest) ||
    (expectedCiphertextDigest !== undefined && object.ciphertextDigest !== expectedCiphertextDigest)
  ) {
    throw new BraintrustOutboxError("invalid_object_pointer");
  }
}

function normalizeExportFailure(error: unknown): BraintrustOutboxExportError {
  if (error instanceof BraintrustOutboxExportError) {
    return error;
  }
  if (error instanceof BraintrustOutboxError) {
    return new BraintrustOutboxExportError("object_mismatch", false);
  }
  return new BraintrustOutboxExportError("unknown", true);
}

function backoffMs(attemptCount: number, configuration: BraintrustOutboxConfiguration): number {
  const exponent = Math.min(attemptCount - 1, 30);
  return Math.min(configuration.maximumBackoffMs, configuration.baseBackoffMs * 2 ** exponent);
}

function isSha256Digest(value: unknown): value is Sha256Digest {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}

function runtimeEquals(value: unknown, expected: string): boolean {
  return value === expected;
}
