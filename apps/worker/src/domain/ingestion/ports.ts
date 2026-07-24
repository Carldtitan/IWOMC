import type { Sha256Digest } from "@environment-reconciler/contracts";

import type {
  ChainAnchorReceipt,
  DeviceBatchPrincipal,
  IngestQueuePointer,
  StoredBatchRecord,
  StreamChainState
} from "./types.js";

export interface DeviceAuthenticationPort {
  authenticate(credential: string, nowEpochSeconds: number): Promise<DeviceBatchPrincipal>;
}

export interface ProjectAuthorizationPort {
  authorizeDevice(input: {
    readonly deviceId: string;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<boolean>;
}

export interface ProtectedPayload {
  readonly authenticatedMetadataDigest: Sha256Digest;
  readonly bytes: Uint8Array;
  readonly ciphertextDigest: Sha256Digest;
  readonly compression: "gzip";
  readonly encryptionAlgorithm: "AES-256-GCM";
  readonly encryptionKeyVersion: string;
  readonly nonceDigest: Sha256Digest;
}

export interface PayloadProtectionPort {
  protect(plaintext: Uint8Array, authenticatedMetadata: Uint8Array): Promise<ProtectedPayload>;
}

export interface IngestObjectWrite {
  readonly bytes: Uint8Array;
  readonly ciphertextDigest: Sha256Digest;
  readonly logicalDigest: Sha256Digest;
  readonly objectKey: string;
}

export interface IngestObjectWriteResult {
  readonly objectVersionId: string;
  readonly stored: boolean;
}

export interface IngestObjectStorePort {
  putImmutable(input: IngestObjectWrite): Promise<IngestObjectWriteResult>;
}

export type CommitStoredBatchResult =
  | {
      readonly kind: "created";
      readonly record: StoredBatchRecord;
    }
  | {
      readonly kind: "duplicate";
      readonly record: StoredBatchRecord;
    }
  | {
      readonly kind: "out_of_order";
    }
  | {
      readonly kind: "conflict";
    };

export interface IngestMetadataPort {
  commitStoredBatch(input: {
    readonly expectedStreamState: StreamChainState | undefined;
    readonly record: StoredBatchRecord;
  }): Promise<CommitStoredBatchResult>;
  findBatch(input: {
    readonly batchId: string;
    readonly deviceId: string;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<StoredBatchRecord | undefined>;
  loadStreamState(input: {
    readonly deviceId: string;
    readonly projectId: string;
    readonly streamId: string;
    readonly workspaceId: string;
  }): Promise<StreamChainState | undefined>;
  markEnqueued(input: {
    readonly batchId: string;
    readonly logicalDigest: Sha256Digest;
    readonly workspaceId: string;
  }): Promise<void>;
}

export interface IngestQueuePort {
  publish(pointer: IngestQueuePointer): Promise<void>;
}

export interface ChainReceiptSignerPort {
  sign(unsignedReceipt: Omit<ChainAnchorReceipt, "signature">): Promise<string>;
}
