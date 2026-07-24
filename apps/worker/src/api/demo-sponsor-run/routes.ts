import { Hono } from "hono";

interface DemoBindings {
  Bindings: DemoSponsorRunEnvironment;
}

const maximumBodyBytes = 1_024;
const maximumTimeoutMs = 90_000;
const localOrigins = new Set(["http://127.0.0.1:5173", "http://localhost:5173"]);

export interface DemoSponsorRunResponse {
  readonly braintrust: {
    readonly status: "deferred" | "exported";
    readonly traceId?: string;
  };
  readonly daytona: {
    readonly cleanupConfirmed: boolean;
    readonly commandPassed: boolean;
    readonly durationMs: number;
    readonly sandboxCreated: boolean;
    readonly status: "cleanup_failed" | "failed" | "succeeded" | "timed_out";
  };
  readonly fireworks:
    | { readonly status: "live" }
    | {
        readonly reason: "REDACTED_unavailable" | "live_generation_not_required_for_probe";
        readonly status: "unavailable";
      };
  readonly overall: "failed" | "partial" | "succeeded" | "timed_out";
  readonly runId: string;
}

export interface DemoSponsorRunExecutor {
  run(input: { readonly signal: AbortSignal }): Promise<DemoSponsorRunResponse>;
}

export interface DemoSponsorRunEnvironment {
  readonly BRAINTRUST_API_KEY: string;
  readonly BRAINTRUST_API_URL: string;
  readonly BRAINTRUST_ENABLED: string;
  readonly BRAINTRUST_PROJECT_NAME: string;
  readonly DAYTONA_API_KEY: string;
  readonly DAYTONA_API_URL: string;
  readonly DAYTONA_TARGET: string;
  readonly FIREWORKS_API_KEY: string;
}

export type DemoSponsorRunExecutorFactory = (
  environment: DemoSponsorRunEnvironment
) => DemoSponsorRunExecutor;

export interface DemoSponsorRunRouteOptions {
  readonly timeoutMs?: number;
}

export function createDemoSponsorRunRoutes(
  executorFactory: DemoSponsorRunExecutorFactory,
  options: DemoSponsorRunRouteOptions = {}
): Hono<DemoBindings> {
  const routes = new Hono<DemoBindings>();
  const timeoutMs = options.timeoutMs ?? maximumTimeoutMs;
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > maximumTimeoutMs) {
    throw new RangeError("demo sponsor run timeout is invalid");
  }

  routes.options("/v1/demo/sponsor-run", (context) => {
    const origin = allowedOrigin(context.req.raw);
    return origin === undefined
      ? context.json({ error: "origin_not_allowed" }, 403)
      : new Response(null, { headers: corsHeaders(origin), status: 204 });
  });
  routes.post("/v1/demo/sponsor-run", async (context) => {
    const requestOrigin = context.req.header("origin");
    const origin = allowedOrigin(context.req.raw);
    if (requestOrigin !== undefined && origin === undefined) {
      return context.json({ error: "origin_not_allowed" }, 403);
    }
    if (!(await hasEmptyBoundedBody(context.req.raw))) {
      return context.json({ error: "invalid_request" }, 400, responseHeaders(origin));
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return context.json(
        await executorFactory(context.env).run({ signal: controller.signal }),
        200,
        responseHeaders(origin)
      );
    } catch {
      return context.json(failedResponse(controller.signal.aborted), 502, responseHeaders(origin));
    } finally {
      clearTimeout(timeout);
    }
  });
  return routes;
}

async function hasEmptyBoundedBody(request: Request): Promise<boolean> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^[0-9]+$/u.test(length) || Number(length) > maximumBodyBytes)) {
    return false;
  }
  const reader = request.body?.getReader();
  if (reader === undefined) return true;
  const chunks: REDACTED[] = [];
  let total = 0;
  try {
    for (;;) {
      const chunk = await reader.read();
      if (chunk.done) break;
      total += chunk.value.byteLength;
      if (total > maximumBodyBytes) return false;
      chunks.push(chunk.value);
    }
  } finally {
    reader.releaseLock();
  }
  try {
    const bytes = new REDACTED(total);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const value = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
    return (
      typeof value === "object" &&
      value !== null &&
      !Array.isArray(value) &&
      Object.keys(value).length === 0
    );
  } catch {
    return false;
  }
}

function allowedOrigin(request: Request): string | undefined {
  const origin = request.headers.get("origin");
  if (origin === null) return new URL(request.url).origin;
  return origin === new URL(request.url).origin || localOrigins.has(origin) ? origin : undefined;
}

function corsHeaders(origin: string): Record<string, string> {
  return {
    "access-control-allow-headers": "content-type",
    "access-control-allow-methods": "POST, OPTIONS",
    "access-control-allow-origin": origin,
    "access-control-max-age": "600",
    vary: "Origin"
  };
}

function responseHeaders(origin: string | undefined): Record<string, string> {
  return {
    "cache-control": "no-store",
    ...(origin === undefined ? {} : corsHeaders(origin))
  };
}

function failedResponse(timedOut: boolean): DemoSponsorRunResponse {
  return {
    braintrust: { status: "deferred" },
    daytona: {
      cleanupConfirmed: false,
      commandPassed: false,
      durationMs: 0,
      sandboxCreated: false,
      status: timedOut ? "timed_out" : "failed"
    },
    fireworks: {
      reason: "live_generation_not_required_for_probe",
      status: "unavailable"
    },
    overall: timedOut ? "timed_out" : "failed",
    runId: crypto.randomUUID()
  };
}
