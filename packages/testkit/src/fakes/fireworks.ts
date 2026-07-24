import type {
  CanonicalJsonValue,
  FireworksPort,
  FireworksStructuredGenerationRequest,
  FireworksStructuredGenerationResult,
  FireworksTokenUsage,
  RedactedExcerpt
} from "@environment-reconciler/integrations/ports";

import {
  canonicalJsonByteLength,
  cloneCanonicalJson,
  DeterministicScenario,
  ScenarioFailure,
  utf8ByteLength
} from "./scenario.js";

export interface ScriptedFireworksResponse {
  readonly output: CanonicalJsonValue;
  readonly finishReason?: FireworksStructuredGenerationResult["finishReason"];
  readonly usage?: FireworksTokenUsage;
  readonly redactedDiagnostic?: RedactedExcerpt;
}

export interface FakeFireworksOptions {
  readonly scenario?: DeterministicScenario;
  readonly responses?: readonly ScriptedFireworksResponse[];
}

type GenerationValue = Omit<FireworksStructuredGenerationResult, "receipt">;

export class FakeFireworks implements FireworksPort {
  readonly scenario: DeterministicScenario;
  readonly #responses: ScriptedFireworksResponse[] = [];

  constructor(options: FakeFireworksOptions = {}) {
    this.scenario = options.scenario ?? new DeterministicScenario();
    for (const response of options.responses ?? []) {
      this.enqueueResponse(response);
    }
  }

  enqueueResponse(response: ScriptedFireworksResponse): void {
    this.#responses.push(cloneScriptedResponse(response));
  }

  pendingResponses(): number {
    return this.#responses.length;
  }

  async generateStructured(
    request: FireworksStructuredGenerationRequest
  ): Promise<FireworksStructuredGenerationResult> {
    assertPositiveSafeInteger(request.maxInputBytes, "maxInputBytes");
    assertPositiveSafeInteger(request.sampling.maxOutputTokens, "maxOutputTokens");

    const execution = await this.scenario.execute<GenerationValue>({
      service: "fireworks",
      operation: "generateStructured",
      context: request.context,
      perform: async () => {
        const encodedBytes = canonicalJsonByteLength(request.redactedInput);
        if (encodedBytes > request.maxInputBytes) {
          throw new ScenarioFailure("input_limit_exceeded", "fireworks.generateStructured");
        }
        const actualInputDigest = await this.scenario.hasher.hashCanonicalJson(
          request.redactedInput
        );
        if (actualInputDigest !== request.redactedInputDigest) {
          throw new ScenarioFailure("input_digest_mismatch", "fireworks.generateStructured");
        }

        const scripted = this.#responses.shift();
        if (scripted === undefined) {
          throw new ScenarioFailure("unscripted_model_call", "fireworks.generateStructured");
        }
        if (scripted.redactedDiagnostic !== undefined) {
          await this.#validateDiagnostic(scripted.redactedDiagnostic);
        }

        const output = cloneCanonicalJson(scripted.output);
        const outputDigest = await this.scenario.hasher.hashCanonicalJson(output);
        const providerRequestId = this.scenario.ids.generate();
        const value: GenerationValue = {
          output,
          outputDigest,
          responseSchema: { ...request.responseSchema },
          finishReason: scripted.finishReason ?? "complete",
          usage: cloneUsage(scripted.usage ?? emptyUsage),
          ...(scripted.redactedDiagnostic === undefined
            ? {}
            : { redactedDiagnostic: { ...scripted.redactedDiagnostic } })
        };
        return {
          value,
          resultSummary: {
            outputDigest,
            schemaDigest: request.responseSchema.schemaDigest,
            finishReason: value.finishReason,
            inputTokens: value.usage.inputTokens,
            outputTokens: value.usage.outputTokens,
            cachedInputTokens: value.usage.cachedInputTokens
          },
          providerRequestId
        };
      },
      clone: cloneGenerationValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async #validateDiagnostic(diagnostic: RedactedExcerpt): Promise<void> {
    if (utf8ByteLength(diagnostic.text) !== diagnostic.byteLength) {
      throw new ScenarioFailure("diagnostic_byte_length_mismatch", "fireworks.generateStructured");
    }
    const actualDigest = await this.scenario.hasher.hashText(diagnostic.text);
    if (actualDigest !== diagnostic.contentDigest) {
      throw new ScenarioFailure("diagnostic_digest_mismatch", "fireworks.generateStructured");
    }
  }
}

const emptyUsage: FireworksTokenUsage = {
  inputTokens: 0,
  outputTokens: 0,
  cachedInputTokens: 0
};

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ScenarioFailure("invalid_numeric_parameter", name);
  }
}

function cloneUsage(value: FireworksTokenUsage): FireworksTokenUsage {
  return { ...value };
}

function cloneScriptedResponse(value: ScriptedFireworksResponse): ScriptedFireworksResponse {
  return {
    output: cloneCanonicalJson(value.output),
    ...(value.finishReason === undefined ? {} : { finishReason: value.finishReason }),
    ...(value.usage === undefined ? {} : { usage: cloneUsage(value.usage) }),
    ...(value.redactedDiagnostic === undefined
      ? {}
      : { redactedDiagnostic: { ...value.redactedDiagnostic } })
  };
}

function cloneGenerationValue(value: GenerationValue): GenerationValue {
  return {
    ...value,
    output: cloneCanonicalJson(value.output),
    responseSchema: { ...value.responseSchema },
    usage: cloneUsage(value.usage),
    ...(value.redactedDiagnostic === undefined
      ? {}
      : { redactedDiagnostic: { ...value.redactedDiagnostic } })
  };
}
