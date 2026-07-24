import { sha256Canonical } from "../internal/digest.js";
import { toCanonicalJson } from "../internal/boundary-safety.js";
import type {
  ExternalOperationContext,
  ExternalOperationReceipt,
  FireworksPort,
  FireworksSamplingPolicy,
  FireworksTokenUsage,
  Sha256Digest
} from "../ports/index.js";
import {
  candidatePlanSchemaReference,
  candidateReasoningPacketToJson,
  createDeterministicNpmQuickFix,
  guardCandidatePlan,
  type AcceptedCandidatePlan,
  type CandidateReasoningPacket
} from "./candidate.js";
import { FireworksIntegrationError } from "./http-client.js";

export interface CandidateGeneratorConfiguration {
  readonly modelId: string;
  readonly promptTemplateId: string;
  readonly promptTemplateVersion: string;
  readonly sampling: FireworksSamplingPolicy;
  readonly maximumInputBytes: number;
}

export interface CandidateGenerationMetadata {
  readonly modelId: string;
  readonly promptTemplateId: string;
  readonly promptTemplateVersion: string;
  readonly sampling: FireworksSamplingPolicy;
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly toolName: "npm";
  readonly toolVersion: string;
  readonly policyVersion: string;
  readonly redactedInputFingerprint: Sha256Digest;
  readonly outputFingerprint: Sha256Digest;
  readonly usage: FireworksTokenUsage;
  readonly receipt: ExternalOperationReceipt;
}

export interface FireworksCandidateGenerationResult extends AcceptedCandidatePlan {
  readonly source: "fireworks";
  readonly findingId: string;
  readonly metadata: CandidateGenerationMetadata;
}

export interface DeterministicCandidateGenerationResult extends AcceptedCandidatePlan {
  readonly source: "deterministic-quick-fix";
  readonly findingId: string;
  readonly outputFingerprint: Sha256Digest;
}

export type CandidateGenerationResult =
  FireworksCandidateGenerationResult | DeterministicCandidateGenerationResult;

export class CandidateGenerator {
  readonly #configuration: CandidateGeneratorConfiguration;
  readonly #fireworks: FireworksPort;

  constructor(fireworks: FireworksPort, configuration: CandidateGeneratorConfiguration) {
    if (
      configuration.modelId.length === 0 ||
      configuration.promptTemplateId.length === 0 ||
      configuration.promptTemplateVersion.length === 0 ||
      !Number.isSafeInteger(configuration.maximumInputBytes) ||
      configuration.maximumInputBytes < 1 ||
      !Number.isFinite(configuration.sampling.temperature) ||
      configuration.sampling.temperature < 0 ||
      configuration.sampling.temperature > 2 ||
      !Number.isFinite(configuration.sampling.topP) ||
      configuration.sampling.topP <= 0 ||
      configuration.sampling.topP > 1 ||
      !Number.isSafeInteger(configuration.sampling.seed) ||
      !Number.isSafeInteger(configuration.sampling.maxOutputTokens) ||
      configuration.sampling.maxOutputTokens < 1
    ) {
      throw new FireworksIntegrationError("invalid_configuration");
    }
    this.#fireworks = fireworks;
    this.#configuration = configuration;
  }

  async generate(
    packet: CandidateReasoningPacket,
    context: ExternalOperationContext
  ): Promise<FireworksCandidateGenerationResult> {
    const redactedInput = candidateReasoningPacketToJson(packet);
    const [redactedInputDigest, responseSchema] = await Promise.all([
      sha256Canonical(redactedInput),
      candidatePlanSchemaReference()
    ]);
    const response = await this.#fireworks.generateStructured({
      context,
      maxInputBytes: this.#configuration.maximumInputBytes,
      modelId: this.#configuration.modelId,
      promptTemplateId: this.#configuration.promptTemplateId,
      promptTemplateVersion: this.#configuration.promptTemplateVersion,
      redactedInput,
      redactedInputDigest,
      responseSchema,
      sampling: this.#configuration.sampling
    });
    if (
      response.responseSchema.schemaId !== responseSchema.schemaId ||
      response.responseSchema.schemaVersion !== responseSchema.schemaVersion ||
      response.responseSchema.schemaDigest !== responseSchema.schemaDigest
    ) {
      throw new FireworksIntegrationError("schema_digest_mismatch");
    }
    if (response.finishReason !== "complete") {
      throw new FireworksIntegrationError(
        response.finishReason === "length" ? "output_truncated" : "provider_error"
      );
    }
    const actualOutputDigest = await sha256Canonical(response.output);
    if (actualOutputDigest !== response.outputDigest) {
      throw new FireworksIntegrationError("provider_response_invalid");
    }
    const accepted = guardCandidatePlan(packet, response.output);
    return {
      ...accepted,
      findingId: packet.finding.id,
      metadata: {
        adapterId: packet.capabilitySummary.adapterId,
        adapterVersion: packet.capabilitySummary.adapterVersion,
        modelId: this.#configuration.modelId,
        outputFingerprint: response.outputDigest,
        policyVersion: packet.effectivePolicy.policyVersion,
        promptTemplateId: this.#configuration.promptTemplateId,
        promptTemplateVersion: this.#configuration.promptTemplateVersion,
        receipt: response.receipt,
        redactedInputFingerprint: redactedInputDigest,
        sampling: this.#configuration.sampling,
        toolName: packet.capabilitySummary.toolName,
        toolVersion: packet.capabilitySummary.toolVersion,
        usage: response.usage
      },
      source: "fireworks"
    };
  }
}

export async function generateCandidateWithDeterministicFallback(
  generator: CandidateGenerator,
  packet: CandidateReasoningPacket,
  context: ExternalOperationContext
): Promise<CandidateGenerationResult> {
  try {
    return await generator.generate(packet, context);
  } catch (error: unknown) {
    if (
      !(error instanceof FireworksIntegrationError) ||
      (error.code !== "provider_error" && error.code !== "timeout")
    ) {
      throw error;
    }
    const accepted = createDeterministicNpmQuickFix(packet);
    return {
      ...accepted,
      findingId: packet.finding.id,
      outputFingerprint: await sha256Canonical(toCanonicalJson(accepted.plan)),
      source: "deterministic-quick-fix"
    };
  }
}

export function acceptUserAuthoredCandidate(
  packet: CandidateReasoningPacket,
  candidate: unknown
): AcceptedCandidatePlan {
  return guardCandidatePlan(packet, candidate);
}
