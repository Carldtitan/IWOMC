import type {
  CanonicalJsonValue,
  ExternalOperationContext,
  ExternalOperationReceipt,
  RedactedExcerpt,
  Sha256Digest
} from "./common.js";

export interface StructuredOutputSchemaReference {
  readonly schemaId: string;
  readonly schemaVersion: string;
  readonly schemaDigest: Sha256Digest;
}

export interface FireworksSamplingPolicy {
  readonly temperature: number;
  readonly topP: number;
  readonly seed: number;
  readonly maxOutputTokens: number;
}

export interface FireworksStructuredGenerationRequest {
  readonly context: ExternalOperationContext;
  readonly modelId: string;
  readonly promptTemplateId: string;
  readonly promptTemplateVersion: string;
  /**
   * Only application-approved, redacted fields may be supplied. Raw source,
   * terminal transcripts, environment variables, and credentials are not
   * valid inputs to this boundary.
   */
  readonly redactedInput: CanonicalJsonValue;
  readonly redactedInputDigest: Sha256Digest;
  readonly responseSchema: StructuredOutputSchemaReference;
  readonly sampling: FireworksSamplingPolicy;
  readonly maxInputBytes: number;
}

export interface FireworksTokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly cachedInputTokens: number;
}

export interface FireworksStructuredGenerationResult {
  readonly output: CanonicalJsonValue;
  readonly outputDigest: Sha256Digest;
  readonly responseSchema: StructuredOutputSchemaReference;
  readonly finishReason: "complete" | "length" | "content-filter" | "provider-error";
  readonly usage: FireworksTokenUsage;
  readonly redactedDiagnostic?: RedactedExcerpt;
  readonly receipt: ExternalOperationReceipt;
}

export interface FireworksPort {
  generateStructured(
    request: FireworksStructuredGenerationRequest
  ): Promise<FireworksStructuredGenerationResult>;
}
