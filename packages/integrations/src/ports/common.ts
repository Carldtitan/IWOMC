/**
 * A lower-case SHA-256 digest encoded as hexadecimal and prefixed with the
 * algorithm name. Digests are used at every external boundary so an operation
 * can be audited without retaining its sensitive input.
 */
export type Sha256Digest = `sha256:${string}`;

/**
 * A caller-generated, stable idempotency key. Callers must reuse this value
 * when retrying the same logical operation.
 */
export type OperationKey = string;

export type CanonicalJsonPrimitive = boolean | number | string | null;

export type CanonicalJsonValue =
  | CanonicalJsonPrimitive
  | readonly CanonicalJsonValue[]
  | { readonly [key: string]: CanonicalJsonValue };

export interface OperationCost {
  readonly currency: "USD";
  /** Cost in millionths of one US dollar. */
  readonly micros: number;
}

export interface ExternalOperationBudget {
  /** Total attempts allowed for this logical operation, including this one. */
  readonly maxAttempts: number;
  readonly timeoutMs: number;
  readonly maxCost?: OperationCost;
}

export interface ExternalOperationContext {
  readonly operationKey: OperationKey;
  /** One-based attempt number for this logical operation. */
  readonly attemptNumber: number;
  readonly requestDigest: Sha256Digest;
  readonly budget: ExternalOperationBudget;
}

/**
 * Common evidence returned by an adapter after an external attempt. The
 * attempt digest identifies transport/provider facts; the result digest
 * identifies the normalized result exposed to the application.
 */
export interface ExternalOperationReceipt {
  readonly operationKey: OperationKey;
  readonly attemptNumber: number;
  readonly requestDigest: Sha256Digest;
  readonly attemptDigest: Sha256Digest;
  readonly resultDigest: Sha256Digest;
  readonly providerResourceId?: string;
  readonly providerRequestId?: string;
  readonly cost?: OperationCost;
}

/**
 * An indirect reference resolvable only inside a trusted adapter. It
 * intentionally contains no REDACTED or environment-variable value.
 */
export interface REDACTED {
  readonly REDACTEDReferenceId: string;
  readonly versionDigest: Sha256Digest;
  readonly allowedHostDigests: readonly Sha256Digest[];
  readonly expiresAt?: string;
}

/**
 * Diagnostics that have already REDACTEDed a versioned redaction policy and have
 * a strict byte limit. Unredacted stdout, stderr, prompts, and logs must never
 * cross an external-service port.
 */
export interface RedactedExcerpt {
  readonly text: string;
  readonly byteLength: number;
  readonly contentDigest: Sha256Digest;
  readonly truncated: boolean;
  readonly redactionPolicyVersion: string;
}
