import {
  BraintrustHttpClient,
  DaytonaClient,
  exportAllowlistedTracesBestEffort,
  type BraintrustPort
} from "@environment-REDACTED/integrations";

import {
  RuntimeDemoSponsorRunExecutor,
  type DemoTraceExporter,
  type DemoTraceExportInput
} from "./executor.js";
import type { DemoSponsorRunEnvironment, DemoSponsorRunExecutor } from "./routes.js";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export interface BraintrustDemoEnvironment {
  readonly BRAINTRUST_API_KEY: string;
  readonly BRAINTRUST_API_URL: string;
  readonly BRAINTRUST_ENABLED: string;
  readonly BRAINTRUST_PROJECT_NAME: string;
}

export function createRuntimeDemoSponsorRunExecutor(
  environment: DemoSponsorRunEnvironment
): DemoSponsorRunExecutor {
  return new RuntimeDemoSponsorRunExecutor(
    new DaytonaClient({
      apiKey: REDACTED,
      apiUrl: environment.DAYTONA_API_URL,
      target: environment.DAYTONA_TARGET
    }),
    new RuntimeBraintrustDemoTraceExporter(environment),
    environment.FIREWORKS_API_KEY.trim().length > 0
  );
}

export class RuntimeBraintrustDemoTraceExporter implements DemoTraceExporter {
  readonly #environment: BraintrustDemoEnvironment;

  constructor(environment: BraintrustDemoEnvironment) {
    this.#environment = environment;
  }

  async export(input: DemoTraceExportInput): Promise<"deferred" | "exported"> {
    if (
      this.#environment.BRAINTRUST_ENABLED !== "true" ||
      REDACTED.trim().length === 0
    ) {
      return "deferred";
    }
    try {
      const projectId = await resolveProjectId(this.#environment);
      const braintrust: BraintrustPort = new BraintrustHttpClient({
        apiBaseUrl: this.#environment.BRAINTRUST_API_URL,
        apiKey: REDACTED,
        projectId,
        requestTimeoutMs: 5_000
      });
      const result = await exportAllowlistedTracesBestEffort(braintrust, {
        context: {
          attemptNumber: 1,
          budget: { maxAttempts: 1, timeoutMs: 5_000 },
          operationKey: `${input.traceId}:braintrust`,
          requestDigest: input.runDigest
        },
        maxEncodedBytes: 8_192,
        maxRecords: 1,
        projectName: this.#environment.BRAINTRUST_PROJECT_NAME,
        records: [
          {
            adapterVersion: "demo-sponsor-run-v1",
            attemptCount: 1,
            durationMs: input.durationMs,
            inputDigest: input.runDigest,
            operation: "validate",
            organizationPseudonym: input.organizationPseudonym,
            outcome: input.commandPassed ? "succeeded" : "failed",
            policyVersion: "demo-probe-v1",
            projectPseudonym: input.projectPseudonym,
            runPseudonym: input.runDigest,
            spanId: `${input.traceId}-daytona`,
            startedAt: new Date(Date.now() - input.durationMs).toISOString(),
            traceId: input.traceId,
            validationPassCount: input.commandPassed ? 1 : 0,
            validationTargetCount: 1
          }
        ]
      });
      if (result.delivery === "deferred") {
        console.error(
          JSON.stringify({
            failureClass: result.failureClass,
            message: "Braintrust demo trace delivery deferred",
            ...(result.providerStatus === undefined
              ? {}
              : { providerStatus: result.providerStatus })
          })
        );
      }
      return result.delivery;
    } catch {
      console.error(JSON.stringify({ message: "Braintrust demo trace setup failed" }));
      return "deferred";
    }
  }
}

async function resolveProjectId(environment: BraintrustDemoEnvironment): Promise<string> {
  const base = new URL(environment.BRAINTRUST_API_URL);
  if (base.protocol !== "https:") throw new Error("invalid_braintrust_url");
  const endpoint = new URL("v1/project", base.toString().endsWith("/") ? base : `${base}/`);
  endpoint.searchParams.set("project_name", environment.BRAINTRUST_PROJECT_NAME);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5_000);
  try {
    const response = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${environment.BRAINTRUST_API_KEY}` },
      signal: controller.signal
    });
    const text = await readBoundedText(response, 32 * 1_024);
    if (!response.ok) throw new Error("project_lookup_failed");
    const value = JSON.parse(text) as unknown;
    if (
      typeof value !== "object" ||
      value === null ||
      !("objects" in value) ||
      !Array.isArray(value.objects)
    ) {
      throw new Error("project_lookup_invalid");
    }
    for (const entry of value.objects as unknown[]) {
      if (
        typeof entry === "object" &&
        entry !== null &&
        "id" in entry &&
        typeof entry.id === "string" &&
        uuidPattern.test(entry.id)
      ) {
        return entry.id;
      }
    }
    throw new Error("project_not_found");
  } finally {
    clearTimeout(timeout);
  }
}

async function readBoundedText(response: Response, maximumBytes: number): Promise<string> {
  const reader = response.body?.getReader();
  if (reader === undefined) return "";
  const chunks: REDACTED[] = [];
  let total = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maximumBytes) throw new Error("project_lookup_too_large");
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new REDACTED(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}
