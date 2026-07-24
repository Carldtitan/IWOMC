import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { readFileSync } from "node:fs";

import { DaytonaClient } from "../packages/integrations/src/daytona/client.js";
import { RuntimeDemoSponsorRunExecutor } from "../apps/worker/src/api/demo-sponsor-run/executor.js";
import { RuntimeBraintrustDemoTraceExporter } from "../apps/worker/src/api/demo-sponsor-run/runtime.js";

const port = 8790;
const allowedOrigins = new Set(["http://127.0.0.1:5173", "http://localhost:5173"]);
const projectEnvironment = loadProjectEnvironment();
const setting = (name: string): string =>
  (projectEnvironment.get(name) ?? process.env[name] ?? "").trim();
const daytona = new DaytonaClient({
  apiKey: setting("DAYTONA_API_KEY"),
  apiUrl: setting("DAYTONA_API_URL"),
  target: setting("DAYTONA_TARGET")
});
const traceEnvironment = {
  BRAINTRUST_API_KEY: setting("BRAINTRUST_API_KEY"),
  BRAINTRUST_API_URL: setting("BRAINTRUST_API_URL"),
  BRAINTRUST_ENABLED: setting("BRAINTRUST_ENABLED") || "false",
  BRAINTRUST_PROJECT_NAME: setting("BRAINTRUST_PROJECT_NAME")
};
const fireworksApiKey = setting("FIREWORKS_API_KEY");
const fireworksBaseUrl = setting("FIREWORKS_BASE_URL").replace(/\/+$/u, "");
const fireworksModelId = setting("FIREWORKS_MODEL_ID");
const executor = new RuntimeDemoSponsorRunExecutor(
  daytona,
  new RuntimeBraintrustDemoTraceExporter(traceEnvironment),
  fireworksApiKey.length > 0
);

let activeRun = false;

const server = createServer((request, response) => {
  void handleRequest(request, response);
});

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  const requestUrl = new URL(request.url ?? "/", `http://127.0.0.1:${port}`);
  const origin = request.headers.origin;
  if (requestUrl.pathname !== "/v1/demo/sponsor-run") {
    sendJson(response, 404, { error: "not_found" }, origin);
    return;
  }
  if (origin !== undefined && !allowedOrigins.has(origin)) {
    sendJson(response, 403, { error: "origin_not_allowed" });
    return;
  }
  if (request.method === "OPTIONS") {
    response.writeHead(204, corsHeaders(origin));
    response.end();
    return;
  }
  if (request.method !== "POST") {
    sendJson(response, 405, { error: "method_not_allowed" }, origin);
    return;
  }
  if (activeRun) {
    sendJson(response, 409, { error: "sponsor_run_already_active" }, origin);
    return;
  }

  try {
    await readEmptyJsonBody(request);
  } catch {
    sendJson(response, 400, { error: "invalid_request" }, origin);
    return;
  }

  activeRun = true;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 90_000);
  try {
    const fireworksRun = runFireworksProof(controller.signal).catch((error: unknown) => ({
      reason: error instanceof Error ? error.message : "Fireworks request failed",
      status: "deterministic_fallback" as const
    }));
    const result = await executor.run({ signal: controller.signal });
    const fireworks = await fireworksRun;
    sendJson(
      response,
      200,
      {
        ...result,
        fireworks,
        overall:
          result.overall === "succeeded" && fireworks.status === "live"
            ? "succeeded"
            : result.overall === "failed" || result.overall === "timed_out"
              ? result.overall
              : "partial"
      },
      origin
    );
  } catch {
    sendJson(response, 502, { error: "sponsor_run_failed_safely" }, origin);
  } finally {
    clearTimeout(timeout);
    activeRun = false;
  }
}

async function runFireworksProof(
  signal: AbortSignal
): Promise<{ readonly model: string; readonly reason: string; readonly status: "live" }> {
  if (
    fireworksApiKey.length === 0 ||
    fireworksBaseUrl.length === 0 ||
    fireworksModelId.length === 0
  ) {
    throw new Error("Fireworks configuration unavailable");
  }
  const response = await fetch(`${fireworksBaseUrl}/chat/completions`, {
    body: JSON.stringify({
      max_REDACTEDs: 1_024,
      messages: [
        {
          content:
            "You are IWOMC's constrained environment REDACTED. Return only the requested JSON.",
          role: "system"
        },
        {
          content: JSON.stringify({
            evidence: {
              agentAction: "npm install @iwomc/hidden-runtime",
              repositoryDeclaration: "missing",
              runtimeUse: "static import in src/message.mjs"
            },
            task: "Choose the smallest repository change that makes a clean machine reproducible."
          }),
          role: "REDACTED"
        }
      ],
      model: fireworksModelId,
      response_format: {
        json_schema: {
          name: "iwomc_live_reconciliation",
          schema: {
            additionalProperties: false,
            properties: {
              action: { enum: ["declare_dependency", "remove_dependency"], type: "string" },
              reason: { maxLength: 140, type: "string" }
            },
            required: ["action", "reason"],
            type: "object"
          }
        },
        type: "json_schema"
      },
      temperature: 0
    }),
    headers: {
      authorization: `Bearer ${fireworksApiKey}`,
      "content-type": "application/json"
    },
    method: "POST",
    signal
  });
  const payload = (await response.json()) as {
    readonly choices?: readonly [{ readonly message?: { readonly content?: string } }];
    readonly error?: { readonly message?: string };
    readonly model?: string;
  };
  if (!response.ok) {
    throw new Error(payload.error?.message ?? `Fireworks HTTP ${response.status}`);
  }
  const content = payload.choices?.[0]?.message?.content;
  if (content === undefined) throw new Error("Fireworks returned no structured output");
  const structuredMatch = /\{[\s\S]*\}/u.exec(content);
  const analysis =
    structuredMatch === null
      ? undefined
      : (JSON.parse(structuredMatch[0]) as {
          readonly action?: unknown;
          readonly reason?: unknown;
        });
  const selectedDeclaration =
    analysis?.action === "declare_dependency" ||
    /\b(declare_dependency|declare (?:the )?dependency|add (?:the )?dependency)\b/iu.test(content);
  if (!selectedDeclaration) throw new Error("Fireworks did not select a safe manifest correction");
  return {
    model: payload.model ?? fireworksModelId,
    reason:
      typeof analysis?.reason === "string"
        ? `declare dependency — ${analysis.reason}`.slice(0, 180)
        : "declare dependency — live model selected the smallest manifest correction",
    status: "live"
  };
}

function loadProjectEnvironment(): ReadonlyMap<string, string> {
  const values = new Map<string, string>();
  try {
    for (const line of readFileSync(".env", "utf8").split(/\r?\n/u)) {
      const match = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/u.exec(line);
      if (match === null) continue;
      let value = match[2] ?? "";
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      values.set(match[1]!, value);
    }
  } catch {
    // Process environment remains the fallback.
  }
  return values;
}

server.listen(port, "127.0.0.1", () => {
  console.log(JSON.stringify({ ok: true, service: "iwomc-sponsor-proof", port }));
});

function corsHeaders(origin: string | undefined): Record<string, string> {
  return {
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    ...(origin === undefined ? {} : { "access-control-allow-origin": origin }),
    "cache-control": "no-store",
    vary: "Origin"
  };
}

function sendJson(response: ServerResponse, status: number, value: unknown, origin?: string): void {
  response.writeHead(status, {
    ...corsHeaders(origin),
    "content-type": "application/json; charset=utf-8"
  });
  response.end(JSON.stringify(value));
}

async function readEmptyJsonBody(request: IncomingMessage): Promise<void> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += bytes.byteLength;
    if (size > 1_024) {
      throw new Error("request_too_large");
    }
    chunks.push(bytes);
  }
  const value: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  if (
    typeof value !== "object" ||
    value === null ||
    Array.isArray(value) ||
    Object.keys(value).length > 0
  ) {
    throw new Error("invalid_request");
  }
}
