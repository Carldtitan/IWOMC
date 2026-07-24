import { describe, expect, it } from "vitest";

import { canonicalBytes, copyBuffer, decodeSha256, sha256 } from "./canonical.js";
import { IngestionError } from "./errors.js";
import type {
  ChainReceiptSignerPort,
  CommitStoredBatchResult,
  DeviceAuthenticationPort,
  IngestMetadataPort,
  IngestObjectStorePort,
  IngestQueuePort,
  PayloadProtectionPort,
  ProjectAuthorizationPort
} from "./ports.js";
import { IngestionService } from "./service.js";
import type {
  CompanionStoredEventPayload,
  CompanionUploadBatch,
  IngestEventBatchCommand,
  StoredBatchRecord,
  StreamChainState
} from "./types.js";
import { computeCompanionEventHash } from "./verification.js";

const genesis = `sha256:${"0".repeat(64)}` as const;

describe("device batch ingestion", () => {
  it("authenticates, verifies, stores durably, persists metadata, then queues", async () => {
    const harness = await createHarness();

    const result = await harness.service.ingestEventBatch(harness.command);

    expect(result.deduplicated).toBe(false);
    expect(harness.operations).toEqual([
      "auth",
      "authorize",
      "db.find",
      "db.stream",
      "protect",
      "r2.put",
      "db.commit",
      "queue.publish",
      "db.mark",
      "receipt.sign"
    ]);
    expect(harness.metadata.record?.state).toBe("enqueued");
  });

  it("rejects secret-bearing input before authentication or any durable system", async () => {
    const harness = await createHarness({ payload: { apiKey: "sk-secretsecretsecretsecret123" } });

    const error = await harness.service
      .ingestEventBatch(harness.command)
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({ code: "secret_detected" });
    expect(String(error)).not.toContain("sk-secret");
    expect(harness.operations).toEqual([]);
  });

  it("rejects tampered chains and signatures before external calls", async () => {
    const harness = await createHarness();
    const parsed = JSON.parse(new TextDecoder().decode(harness.command.rawBody)) as {
      events: { eventHash: string }[];
    };
    parsed.events[0]!.eventHash = `sha256:${"f".repeat(64)}`;
    const command = { ...harness.command, rawBody: canonicalBytes(parsed) };

    const error = await harness.service
      .ingestEventBatch(command)
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({ code: "invalid_chain" });
    expect(harness.operations).toEqual([]);
  });

  it("rejects out-of-order delivery before R2", async () => {
    const harness = await createHarness({
      streamState: { chainHead: `sha256:${"1".repeat(64)}`, lastSequence: 4 }
    });

    const error = await harness.service
      .ingestEventBatch(harness.command)
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({ code: "out_of_order" });
    expect(harness.operations).not.toContain("r2.put");
  });

  it.each([
    {
      expectedAbsent: ["db.commit", "queue.publish"],
      failure: "r2" as const,
      expectedCode: "object_store_unavailable"
    },
    {
      expectedAbsent: ["queue.publish"],
      failure: "db" as const,
      expectedCode: "metadata_unavailable"
    },
    {
      expectedAbsent: ["db.mark", "receipt.sign"],
      failure: "queue" as const,
      expectedCode: "queue_unavailable"
    }
  ])(
    "stops the pipeline safely on $failure failure",
    async ({ expectedAbsent, expectedCode, failure }) => {
      const harness = await createHarness({ failure });

      const error = await harness.service
        .ingestEventBatch(harness.command)
        .catch((reason: unknown) => reason);

      expect(error).toMatchObject({ code: expectedCode });
      for (const operation of expectedAbsent) {
        expect(harness.operations).not.toContain(operation);
      }
    }
  );

  it("resumes a stored-not-enqueued batch without rewriting R2 or metadata", async () => {
    const harness = await createHarness();
    harness.queue.fail = true;
    await expect(harness.service.ingestEventBatch(harness.command)).rejects.toMatchObject({
      code: "queue_unavailable"
    });
    harness.queue.fail = false;
    harness.operations.length = 0;

    const result = await harness.service.ingestEventBatch(harness.command);

    expect(result.deduplicated).toBe(true);
    expect(harness.operations).toEqual([
      "auth",
      "authorize",
      "db.find",
      "queue.publish",
      "db.mark",
      "receipt.sign"
    ]);
  });

  it("rejects a replayed batch ID bound to different logical content", async () => {
    const harness = await createHarness();
    await harness.service.ingestEventBatch(harness.command);
    const second = await signedBatch(harness.keys, { changed: true });
    const command = { ...harness.command, rawBody: canonicalBytes(second) };
    harness.operations.length = 0;

    const error = await harness.service
      .ingestEventBatch(command)
      .catch((reason: unknown) => reason);

    expect(error).toMatchObject({ code: "batch_conflict" });
    expect(harness.operations).not.toContain("r2.put");
  });

  it("rejects oversized and malformed batches without calling ports", async () => {
    const harness = await createHarness();
    const tinyService = new IngestionService(harness.dependencies, {
      maximumBodyBytes: 10
    });

    await expect(tinyService.ingestEventBatch(harness.command)).rejects.toMatchObject({
      code: "batch_too_large"
    });
    expect(harness.operations).toEqual([]);
  });
});

async function createHarness(
  options: {
    readonly failure?: "db" | "queue" | "r2";
    readonly payload?: unknown;
    readonly streamState?: StreamChainState;
  } = {}
) {
  const operations: string[] = [];
  const keys = await crypto.subtle.generateKey("Ed25519", true, ["sign", "verify"]);
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
  const publicKeyBase64 = encodeBase64(publicKey);
  const batch = await signedBatch(keys, options.payload ?? { safe: true });
  const metadata = new FakeMetadata(operations, options.streamState);
  metadata.failCommit = options.failure === "db";
  const queue = new FakeQueue(operations);
  queue.fail = options.failure === "queue";
  const objectStore: IngestObjectStorePort = {
    putImmutable(input) {
      operations.push("r2.put");
      if (options.failure === "r2") {
        return Promise.reject(new Error("r2 unavailable"));
      }
      return Promise.resolve({
        objectVersionId: `version-${input.logicalDigest}`,
        stored: true
      });
    }
  };
  const authenticator: DeviceAuthenticationPort = {
    authenticate() {
      operations.push("auth");
      return Promise.resolve({
        deviceId: "device-1",
        publicSigningKey: publicKeyBase64,
        signingKeyVersion: 1,
        workspaceId: "workspace-1"
      });
    }
  };
  const authorizer: ProjectAuthorizationPort = {
    authorizeDevice() {
      operations.push("authorize");
      return Promise.resolve(true);
    }
  };
  const payloadProtection: PayloadProtectionPort = {
    async protect(plaintext) {
      operations.push("protect");
      const digest = await sha256(plaintext);
      return {
        authenticatedMetadataDigest: digest,
        bytes: plaintext,
        ciphertextDigest: digest,
        compression: "gzip",
        encryptionAlgorithm: "AES-256-GCM",
        encryptionKeyVersion: "test-1",
        nonceDigest: digest
      };
    }
  };
  const receiptSigner: ChainReceiptSignerPort = {
    sign() {
      operations.push("receipt.sign");
      return Promise.resolve("test-receipt-signature");
    }
  };
  const dependencies = {
    authenticator,
    authorizer,
    metadata,
    objectStore,
    payloadProtection,
    queue,
    receiptSigner
  };
  const command: IngestEventBatchCommand = {
    credential: "device-credential",
    nowEpochMilliseconds: 1_750_000_000_000,
    projectId: "project-1",
    rawBody: canonicalBytes(batch),
    streamId: "stream-1"
  };
  return {
    command,
    dependencies,
    keys,
    metadata,
    operations,
    queue,
    service: new IngestionService(dependencies)
  };
}

class FakeMetadata implements IngestMetadataPort {
  failCommit = false;
  record: StoredBatchRecord | undefined;
  readonly #operations: string[];
  readonly #initialStream: StreamChainState | undefined;

  constructor(operations: string[], initialStream: StreamChainState | undefined) {
    this.#operations = operations;
    this.#initialStream = initialStream;
  }

  findBatch(): Promise<StoredBatchRecord | undefined> {
    this.#operations.push("db.find");
    return Promise.resolve(this.record);
  }

  loadStreamState(): Promise<StreamChainState | undefined> {
    this.#operations.push("db.stream");
    return Promise.resolve(this.#initialStream);
  }

  commitStoredBatch(input: {
    readonly record: StoredBatchRecord;
  }): Promise<CommitStoredBatchResult> {
    this.#operations.push("db.commit");
    if (this.failCommit) {
      return Promise.reject(new Error("database unavailable"));
    }
    this.record = input.record;
    return Promise.resolve({ kind: "created", record: input.record });
  }

  markEnqueued(): Promise<void> {
    this.#operations.push("db.mark");
    if (this.record !== undefined) {
      this.record = { ...this.record, state: "enqueued" };
    }
    return Promise.resolve();
  }
}

class FakeQueue implements IngestQueuePort {
  fail = false;
  readonly #operations: string[];

  constructor(operations: string[]) {
    this.#operations = operations;
  }

  publish(): Promise<void> {
    this.#operations.push("queue.publish");
    if (this.fail) {
      return Promise.reject(new Error("queue unavailable"));
    }
    return Promise.resolve();
  }
}

async function signedBatch(
  keys: CryptoKeyPair,
  innerPayload: unknown
): Promise<CompanionUploadBatch> {
  const payload: CompanionStoredEventPayload = {
    actionType: "package.install",
    eventId: "event-1",
    payload: innerPayload,
    redactionPolicyVersion: "redaction-v1",
    schemaVersion: 1,
    source: "codex",
    sourceSequence: null
  };
  const eventBase = {
    eventId: "event-1",
    localSequence: 1,
    payload,
    previousEventHash: genesis,
    sourceSequence: null
  };
  const eventHash = await computeCompanionEventHash(eventBase);
  const chainHead = decodeSha256(eventHash);
  if (chainHead === undefined) {
    throw new IngestionError("invalid_chain", 400);
  }
  const signature = new Uint8Array(
    await crypto.subtle.sign("Ed25519", keys.privateKey, copyBuffer(chainHead))
  );
  const publicKey = new Uint8Array(await crypto.subtle.exportKey("raw", keys.publicKey));
  return {
    attemptCount: 0,
    batchId: "batch-1",
    chainHead: eventHash,
    chainHeadSignature: encodeBase64(signature),
    eventCount: 1,
    events: [{ ...eventBase, eventHash }],
    firstSequence: 1,
    lastSequence: 1,
    publicKey: encodeBase64(publicKey),
    schemaVersion: 1,
    signingKeyVersion: 1
  };
}

function encodeBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
