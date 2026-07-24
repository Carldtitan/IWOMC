import type {
  DeleteImmutableObjectRequest,
  DeleteImmutableObjectResult,
  HeadImmutableObjectRequest,
  HeadImmutableObjectResult,
  ImmutableObjectDescriptor,
  ImmutableObjectEncryption,
  ImmutableObjectStoragePort,
  PutImmutableObjectRequest,
  PutImmutableObjectResult,
  ReadImmutableObjectRequest,
  ReadImmutableObjectResult
} from "@environment-reconciler/integrations/ports";

import { cloneBytes, DeterministicScenario, ScenarioFailure } from "./scenario.js";

interface StoredImmutableObject {
  readonly descriptor: ImmutableObjectDescriptor;
  readonly ciphertext: Uint8Array;
}

export interface FakeImmutableObjectStorageOptions {
  readonly scenario?: DeterministicScenario;
}

export interface FakeImmutableObjectStorageSnapshot {
  readonly liveObjects: number;
  readonly reservedObjectKeys: number;
}

type PutValue = Omit<PutImmutableObjectResult, "receipt">;
type ReadValue = Omit<ReadImmutableObjectResult, "receipt">;
type HeadValue = Omit<HeadImmutableObjectResult, "receipt">;
type DeleteValue = Omit<DeleteImmutableObjectResult, "receipt">;

export class FakeImmutableObjectStorage implements ImmutableObjectStoragePort {
  readonly scenario: DeterministicScenario;
  readonly #objects = new Map<string, StoredImmutableObject>();
  readonly #reservedObjectKeys = new Set<string>();

  constructor(options: FakeImmutableObjectStorageOptions = {}) {
    this.scenario = options.scenario ?? new DeterministicScenario();
  }

  async putImmutable(request: PutImmutableObjectRequest): Promise<PutImmutableObjectResult> {
    assertObjectKey(request.objectKey);
    assertPositiveSafeInteger(request.maxCiphertextBytes, "maxCiphertextBytes");
    if (request.ciphertext.byteLength > request.maxCiphertextBytes) {
      throw new ScenarioFailure("ciphertext_limit_exceeded", "object-storage.putImmutable");
    }

    const execution = await this.scenario.execute<PutValue>({
      service: "object-storage",
      operation: "putImmutable",
      context: request.context,
      perform: async () => {
        if (this.#reservedObjectKeys.has(request.objectKey)) {
          throw new ScenarioFailure("immutable_key_conflict", "object-storage.putImmutable");
        }
        const actualDigest = await this.scenario.hasher.hashBytes(request.ciphertext);
        if (actualDigest !== request.ciphertextDigest) {
          throw new ScenarioFailure("ciphertext_digest_mismatch", "object-storage.putImmutable");
        }

        const versionId = this.scenario.ids.generate();
        const providerResourceId = `fake-object://${request.objectKey}?version=${versionId}`;
        const descriptor: ImmutableObjectDescriptor = {
          objectKey: request.objectKey,
          objectVersionId: versionId,
          ciphertextDigest: request.ciphertextDigest,
          ciphertextBytes: request.ciphertext.byteLength,
          encryption: cloneEncryption(request.encryption),
          createdAt: this.scenario.clock.now().toISOString(),
          providerResourceId,
          ...(request.expiresAt === undefined ? {} : { expiresAt: request.expiresAt })
        };
        this.#objects.set(request.objectKey, {
          descriptor: cloneDescriptor(descriptor),
          ciphertext: cloneBytes(request.ciphertext)
        });
        this.#reservedObjectKeys.add(request.objectKey);

        return {
          value: { object: descriptor, created: true },
          resultSummary: {
            objectKey: descriptor.objectKey,
            objectVersionId: descriptor.objectVersionId,
            ciphertextDigest: descriptor.ciphertextDigest,
            ciphertextBytes: descriptor.ciphertextBytes,
            created: true
          },
          providerResourceId
        };
      },
      clone: clonePutValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async readImmutable(request: ReadImmutableObjectRequest): Promise<ReadImmutableObjectResult> {
    assertObjectKey(request.objectKey);
    assertPositiveSafeInteger(request.maxCiphertextBytes, "maxCiphertextBytes");

    const execution = await this.scenario.execute<ReadValue>({
      service: "object-storage",
      operation: "readImmutable",
      context: request.context,
      perform: () => {
        const stored = this.#requireExactObject(
          request.objectKey,
          request.objectVersionId,
          "object-storage.readImmutable"
        );
        assertNotExpired(stored.descriptor, this.scenario.clock.now().getTime());
        if (stored.descriptor.ciphertextDigest !== request.expectedCiphertextDigest) {
          throw new ScenarioFailure("ciphertext_digest_mismatch", "object-storage.readImmutable");
        }
        if (stored.ciphertext.byteLength > request.maxCiphertextBytes) {
          throw new ScenarioFailure("ciphertext_limit_exceeded", "object-storage.readImmutable");
        }

        return {
          value: {
            object: cloneDescriptor(stored.descriptor),
            ciphertext: cloneBytes(stored.ciphertext)
          },
          resultSummary: {
            objectKey: stored.descriptor.objectKey,
            objectVersionId: stored.descriptor.objectVersionId,
            ciphertextDigest: stored.descriptor.ciphertextDigest,
            ciphertextBytes: stored.descriptor.ciphertextBytes
          },
          providerResourceId: stored.descriptor.providerResourceId
        };
      },
      clone: cloneReadValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async headImmutable(request: HeadImmutableObjectRequest): Promise<HeadImmutableObjectResult> {
    assertObjectKey(request.objectKey);
    const execution = await this.scenario.execute<HeadValue>({
      service: "object-storage",
      operation: "headImmutable",
      context: request.context,
      perform: () => {
        const stored = this.#objects.get(request.objectKey);
        const object =
          stored?.descriptor.objectVersionId === request.objectVersionId &&
          !isExpired(stored.descriptor, this.scenario.clock.now().getTime())
            ? cloneDescriptor(stored.descriptor)
            : null;
        return {
          value: { object },
          resultSummary:
            object === null
              ? { found: false }
              : {
                  found: true,
                  objectKey: object.objectKey,
                  objectVersionId: object.objectVersionId,
                  ciphertextDigest: object.ciphertextDigest
                },
          ...(object === null ? {} : { providerResourceId: object.providerResourceId })
        };
      },
      clone: cloneHeadValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async deleteImmutable(
    request: DeleteImmutableObjectRequest
  ): Promise<DeleteImmutableObjectResult> {
    assertObjectKey(request.objectKey);
    const execution = await this.scenario.execute<DeleteValue>({
      service: "object-storage",
      operation: "deleteImmutable",
      context: request.context,
      perform: () => {
        const stored = this.#objects.get(request.objectKey);
        if (stored?.descriptor.objectVersionId !== request.objectVersionId) {
          return {
            value: { deleted: false },
            resultSummary: {
              deleted: false,
              objectKey: request.objectKey,
              deletionReasonCode: request.deletionReasonCode
            }
          };
        }
        if (stored.descriptor.ciphertextDigest !== request.expectedCiphertextDigest) {
          throw new ScenarioFailure("ciphertext_digest_mismatch", "object-storage.deleteImmutable");
        }

        this.#objects.delete(request.objectKey);
        return {
          value: { deleted: true },
          resultSummary: {
            deleted: true,
            objectKey: request.objectKey,
            objectVersionId: request.objectVersionId,
            deletionReasonCode: request.deletionReasonCode
          },
          providerResourceId: stored.descriptor.providerResourceId
        };
      },
      clone: cloneDeleteValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  snapshot(): FakeImmutableObjectStorageSnapshot {
    return {
      liveObjects: this.#objects.size,
      reservedObjectKeys: this.#reservedObjectKeys.size
    };
  }

  #requireExactObject(objectKey: string, versionId: string, point: string): StoredImmutableObject {
    const stored = this.#objects.get(objectKey);
    if (stored?.descriptor.objectVersionId !== versionId) {
      throw new ScenarioFailure("object_not_found", point);
    }
    return stored;
  }
}

function assertObjectKey(value: string): void {
  if (value.trim().length === 0) {
    throw new ScenarioFailure("invalid_object_key", "object-storage");
  }
}

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ScenarioFailure("invalid_numeric_parameter", name);
  }
}

function isExpired(descriptor: ImmutableObjectDescriptor, now: number): boolean {
  return descriptor.expiresAt !== undefined && new Date(descriptor.expiresAt).getTime() <= now;
}

function assertNotExpired(descriptor: ImmutableObjectDescriptor, now: number): void {
  if (isExpired(descriptor, now)) {
    throw new ScenarioFailure("object_expired", "object-storage.readImmutable");
  }
}

function cloneEncryption(value: ImmutableObjectEncryption): ImmutableObjectEncryption {
  return {
    ...value,
    key: {
      ...value.key,
      allowedHostDigests: [...value.key.allowedHostDigests]
    }
  };
}

function cloneDescriptor(value: ImmutableObjectDescriptor): ImmutableObjectDescriptor {
  return {
    ...value,
    encryption: cloneEncryption(value.encryption)
  };
}

function clonePutValue(value: PutValue): PutValue {
  return { ...value, object: cloneDescriptor(value.object) };
}

function cloneReadValue(value: ReadValue): ReadValue {
  return {
    object: cloneDescriptor(value.object),
    ciphertext: cloneBytes(value.ciphertext)
  };
}

function cloneHeadValue(value: HeadValue): HeadValue {
  return {
    object: value.object === null ? null : cloneDescriptor(value.object)
  };
}

function cloneDeleteValue(value: DeleteValue): DeleteValue {
  return { ...value };
}
