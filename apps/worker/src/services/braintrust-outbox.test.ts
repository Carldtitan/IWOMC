import type { Sha256Digest } from "@environment-REDACTED/integrations/ports";
import { describe, expect, it } from "vitest";

import {
  BraintrustOutboxExportError,
  BraintrustTraceOutboxService,
  type REDACTED,
  type BraintrustOutboxClock,
  type BraintrustOutboxObjectStore,
  type BraintrustOutboxPersistence,
  type BraintrustTraceOutboxRecord,
  type EncryptedBraintrustTracePayload,
  type PrivateEncryptedObjectPointer
} from "./braintrust-outbox.js";

const payloadDigest: Sha256Digest = `sha256:${"a".repeat(64)}`;
const ciphertextDigest: Sha256Digest = `sha256:${"b".repeat(64)}`;
const nonceDigest: Sha256Digest = `sha256:${"c".repeat(64)}`;
const resultDigest: Sha256Digest = `sha256:${"d".repeat(64)}`;

class FakeClock implements BraintrustOutboxClock {
  current = new Date("2026-07-24T12:00:00.000Z");

  now(): Date {
    return new Date(this.current);
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

class FakeObjectStore implements BraintrustOutboxObjectStore {
  readonly order: string[];
  pointer: PrivateEncryptedObjectPointer | undefined;

  constructor(order: string[]) {
    this.order = order;
  }

  putPrivateEncryptedPayload(
    input: Parameters<BraintrustOutboxObjectStore["putPrivateEncryptedPayload"]>[0]
  ): Promise<PrivateEncryptedObjectPointer> {
    this.order.push("store-encrypted-object");
    this.pointer = {
      ciphertextDigest: input.payload.ciphertextDigest,
      encryption: "application-managed",
      objectKey: input.objectKey,
      objectMetadataId: "object-metadata-1",
      privacy: "private"
    };
    return Promise.resolve(this.pointer);
  }

  resolvePrivateEncryptedPayload(): Promise<PrivateEncryptedObjectPointer | undefined> {
    this.order.push("resolve-private-object");
    return Promise.resolve(this.pointer);
  }
}

class FakePersistence implements BraintrustOutboxPersistence {
  readonly order: string[];
  record: BraintrustTraceOutboxRecord | undefined;

  constructor(order: string[]) {
    this.order = order;
  }

  enqueue(
    input: Parameters<BraintrustOutboxPersistence["enqueue"]>[0]
  ): Promise<BraintrustTraceOutboxRecord> {
    this.order.push("persist-outbox");
    this.record ??= {
      attemptCount: 0,
      id: input.id,
      nextAttemptAt: input.nextAttemptAt,
      payloadDigest: input.payloadDigest,
      payloadObjectMetadataId: input.payloadObjectMetadataId,
      ...(input.projectId === undefined ? {} : { projectId: input.projectId }),
      state: "pending",
      traceId: input.traceId,
      workspaceId: input.workspaceId
    };
    return Promise.resolve(this.record);
  }

  claimDue(
    input: Parameters<BraintrustOutboxPersistence["claimDue"]>[0]
  ): ReturnType<BraintrustOutboxPersistence["claimDue"]> {
    const record = this.record;
    if (
      record === undefined ||
      record.state === "exported" ||
      record.state === "abandoned" ||
      record.nextAttemptAt > input.now
    ) {
      return Promise.resolve([]);
    }
    this.order.push("claim-durable-attempt");
    this.record = {
      ...record,
      attemptCount: record.attemptCount + 1,
      state: "exporting"
    };
    return Promise.resolve([{ ...this.record, state: "exporting" }]);
  }

  markExported(input: Parameters<BraintrustOutboxPersistence["markExported"]>[0]): Promise<void> {
    this.order.push("persist-exported");
    if (this.record?.attemptCount !== input.attemptCount) {
      return Promise.reject(new Error("attempt_mismatch"));
    }
    this.record = { ...this.record, state: "exported" };
    return Promise.resolve();
  }

  recordFailure(input: Parameters<BraintrustOutboxPersistence["recordFailure"]>[0]): Promise<void> {
    this.order.push(input.terminal ? "persist-abandoned" : "persist-backoff");
    if (this.record?.attemptCount !== input.attemptCount) {
      return Promise.reject(new Error("attempt_mismatch"));
    }
    this.record = {
      ...this.record,
      nextAttemptAt: input.nextAttemptAt,
      state: input.terminal ? "abandoned" : "failed"
    };
    return Promise.resolve();
  }
}

class FakeExporter implements REDACTED {
  readonly idempotencyKeys: string[] = [];
  readonly order: string[];
  fail = false;

  constructor(order: string[]) {
    this.order = order;
  }

  exportEncryptedTrace(
    input: Parameters<REDACTED["exportEncryptedTrace"]>[0]
  ): Promise<{ readonly resultDigest: Sha256Digest }> {
    this.order.push("provider-export");
    this.idempotencyKeys.push(input.idempotencyKey);
    return this.fail
      ? Promise.reject(new BraintrustOutboxExportError("provider", true))
      : Promise.resolve({ resultDigest });
  }
}

function payload(): EncryptedBraintrustTracePayload {
  return {
    ciphertext: new REDACTED([1, 2, 3, 4]),
    ciphertextDigest,
    encryption: {
      algorithm: "AES-256-GCM",
      keyReferenceId: "workspace-key-1",
      nonceDigest
    },
    payloadDigest
  };
}

function service(
  persistence: BraintrustOutboxPersistence,
  objects: BraintrustOutboxObjectStore,
  exporter: REDACTED,
  clock: BraintrustOutboxClock
): BraintrustTraceOutboxService {
  return new BraintrustTraceOutboxService(persistence, objects, exporter, clock, {
    baseBackoffMs: 1_000,
    batchSize: 10,
    claimLeaseMs: 30_000,
    maximumAttempts: 2,
    maximumBackoffMs: 10_000
  });
}

async function enqueue(outbox: BraintrustTraceOutboxService): Promise<void> {
  await outbox.enqueue({
    id: "outbox-1",
    objectKey: "workspaces/workspace-1/braintrust-outbox/sha256-aaaaaaaa.json.enc",
    payload: payload(),
    projectId: "project-1",
    traceId: "trace-1",
    workspaceId: "workspace-1"
  });
}

describe("BraintrustTraceOutboxService", () => {
  it("stores a private encrypted pointer, reserves before export, and persists terminal backoff truth", async () => {
    const order: string[] = [];
    const clock = new FakeClock();
    const objects = new FakeObjectStore(order);
    const persistence = new FakePersistence(order);
    const exporter = new FakeExporter(order);
    exporter.fail = true;
    const firstProcess = service(persistence, objects, exporter, clock);
    await enqueue(firstProcess);

    await expect(firstProcess.drainDue()).resolves.toEqual({
      abandoned: 0,
      claimed: 1,
      exported: 0,
      retried: 1
    });
    expect(persistence.record).toMatchObject({
      attemptCount: 1,
      nextAttemptAt: new Date("2026-07-24T12:00:01.000Z"),
      payloadDigest,
      payloadObjectMetadataId: "object-metadata-1",
      state: "failed"
    });
    expect(order.indexOf("claim-durable-attempt")).toBeLessThan(order.indexOf("provider-export"));

    clock.advance(1_000);
    const restartedProcess = service(persistence, objects, exporter, clock);
    await expect(restartedProcess.drainDue()).resolves.toEqual({
      abandoned: 1,
      claimed: 1,
      exported: 0,
      retried: 0
    });
    expect(persistence.record).toMatchObject({ attemptCount: 2, state: "abandoned" });
    expect(exporter.idempotencyKeys).toEqual([
      "braintrust-trace-outbox:outbox-1",
      "braintrust-trace-outbox:outbox-1"
    ]);
    expect(JSON.stringify(persistence.record)).not.toContain("ciphertext");
  });

  it("exports once and an idempotent drain cannot reclaim terminal state", async () => {
    const order: string[] = [];
    const clock = new FakeClock();
    const objects = new FakeObjectStore(order);
    const persistence = new FakePersistence(order);
    const exporter = new FakeExporter(order);
    const outbox = service(persistence, objects, exporter, clock);
    await enqueue(outbox);

    await expect(outbox.drainDue()).resolves.toEqual({
      abandoned: 0,
      claimed: 1,
      exported: 1,
      retried: 0
    });
    await expect(outbox.drainDue()).resolves.toEqual({
      abandoned: 0,
      claimed: 0,
      exported: 0,
      retried: 0
    });
    expect(exporter.idempotencyKeys).toEqual(["braintrust-trace-outbox:outbox-1"]);
    expect(persistence.record?.state).toBe("exported");
  });
});
