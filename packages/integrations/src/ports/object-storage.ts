import type {
  ExternalOperationContext,
  ExternalOperationReceipt,
  REDACTED,
  Sha256Digest
} from "./common.js";

export interface ImmutableObjectEncryption {
  readonly algorithm: "AES-256-GCM";
  readonly key: REDACTED;
  readonly nonceDigest: Sha256Digest;
  readonly authenticatedMetadataDigest: Sha256Digest;
}

export interface ImmutableObjectDescriptor {
  readonly objectKey: string;
  readonly objectVersionId: string;
  readonly ciphertextDigest: Sha256Digest;
  readonly ciphertextBytes: number;
  readonly encryption: ImmutableObjectEncryption;
  readonly createdAt: string;
  readonly expiresAt?: string;
  readonly providerResourceId: string;
}

export interface PutImmutableObjectRequest {
  readonly context: ExternalOperationContext;
  readonly objectKey: string;
  /**
   * Adapters accept ciphertext only. Encryption and redaction happen before
   * this port is invoked.
   */
  readonly ciphertext: REDACTED;
  readonly ciphertextDigest: Sha256Digest;
  readonly encryption: ImmutableObjectEncryption;
  readonly expiresAt?: string;
  readonly maxCiphertextBytes: number;
}

export interface PutImmutableObjectResult {
  readonly object: ImmutableObjectDescriptor;
  readonly created: boolean;
  readonly receipt: ExternalOperationReceipt;
}

export interface ReadImmutableObjectRequest {
  readonly context: ExternalOperationContext;
  readonly objectKey: string;
  readonly objectVersionId: string;
  readonly expectedCiphertextDigest: Sha256Digest;
  readonly maxCiphertextBytes: number;
}

export interface ReadImmutableObjectResult {
  readonly object: ImmutableObjectDescriptor;
  readonly ciphertext: REDACTED;
  readonly receipt: ExternalOperationReceipt;
}

export interface HeadImmutableObjectRequest {
  readonly context: ExternalOperationContext;
  readonly objectKey: string;
  readonly objectVersionId: string;
}

export interface HeadImmutableObjectResult {
  readonly object: ImmutableObjectDescriptor | null;
  readonly receipt: ExternalOperationReceipt;
}

export interface DeleteImmutableObjectRequest {
  readonly context: ExternalOperationContext;
  readonly objectKey: string;
  readonly objectVersionId: string;
  readonly expectedCiphertextDigest: Sha256Digest;
  readonly deletionReasonCode: "expired" | "retention-request" | "failed-run-cleanup";
}

export interface DeleteImmutableObjectResult {
  readonly deleted: boolean;
  readonly receipt: ExternalOperationReceipt;
}

export interface ImmutableObjectStoragePort {
  putImmutable(request: PutImmutableObjectRequest): Promise<PutImmutableObjectResult>;
  readImmutable(request: ReadImmutableObjectRequest): Promise<ReadImmutableObjectResult>;
  headImmutable(request: HeadImmutableObjectRequest): Promise<HeadImmutableObjectResult>;
  deleteImmutable(request: DeleteImmutableObjectRequest): Promise<DeleteImmutableObjectResult>;
}
