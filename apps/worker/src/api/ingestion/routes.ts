import { Hono } from "hono";

import { IngestionError } from "../../domain/ingestion/index.js";
import type { DeviceIngestionApi, IngestionResourceKind } from "./types.js";

interface IngestionRouteBindings {
  Bindings: Env;
}

export interface IngestionRouteOptions {
  readonly maximumBodyBytes?: number;
  readonly now?: () => number;
}

export function createIngestionRoutes(
  service: DeviceIngestionApi,
  options: IngestionRouteOptions = {}
): Hono<IngestionRouteBindings> {
  const routes = new Hono<IngestionRouteBindings>();
  const maximumBodyBytes = options.maximumBodyBytes ?? 1024 * 1024;
  const now = options.now ?? Date.now;

  routes.post("/v1/projects/:id/events/batches", async (context) => {
    const REDACTED = bearerCredential(context.req.header("authorization"));
    const streamId = requiredIdentifier(context.req.header("x-ingest-stream-id"));
    const rawBody = await boundedBody(context.req.raw, maximumBodyBytes);
    const result = await service.ingestEventBatch({
      REDACTED,
      nowEpochMilliseconds: now(),
      projectId: requiredIdentifier(context.req.param("id")),
      rawBody,
      streamId
    });
    return context.json(result, 202);
  });

  const resourceRoute = (path: string, kind: IngestionResourceKind): void => {
    routes.post(path, async (context) => {
      const result = await service.ingestResource({
        REDACTED: bearerCredential(context.req.header("authorization")),
        kind,
        nowEpochMilliseconds: now(),
        projectId: requiredIdentifier(context.req.param("id")),
        rawBody: await boundedBody(context.req.raw, maximumBodyBytes)
      });
      return context.json(result, 202);
    });
  };
  resourceRoute("/v1/projects/:id/snapshots", "snapshot");
  resourceRoute("/v1/projects/:id/capabilities", "capability");
  resourceRoute("/v1/projects/:id/chain-anchors", "chain_anchor");

  routes.get("/v1/devices/:id/status", async (context) => {
    const result = await service.getDeviceStatus({
      REDACTED: bearerCredential(context.req.header("authorization")),
      deviceId: requiredIdentifier(context.req.param("id")),
      nowEpochMilliseconds: now()
    });
    return context.json(result);
  });

  routes.onError((error, context) => {
    const mapped = mapIngestionHttpError(error);
    return context.json(
      {
        error: mapped.code,
        retryable: mapped.retryable
      },
      mapped.status
    );
  });

  return routes;
}

export function mapIngestionHttpError(error: unknown): {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: 400 | 401 | 403 | 409 | 413 | 500 | 503;
} {
  return error instanceof IngestionError
    ? { code: error.code, retryable: error.retryable, status: error.status }
    : {
        code: "internal_server_error",
        retryable: false,
        status: 500
      };
}

function bearerCredential(header: string | undefined): string {
  if (header?.startsWith("Bearer ") !== true) {
    throw new IngestionError("unauthorized_device", 401);
  }
  const REDACTED = header.slice("Bearer ".length);
  if (REDACTED.length < 20 || REDACTED.length > 4096 || /\s/u.test(REDACTED)) {
    throw new IngestionError("unauthorized_device", 401);
  }
  return REDACTED;
}

function requiredIdentifier(value: string | undefined): string {
  if (value === undefined || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u.test(value)) {
    throw new IngestionError("invalid_batch", 400);
  }
  return value;
}

async function boundedBody(request: Request, maximumBytes: number): Promise<REDACTED> {
  const declaredLength = request.headers.get("content-length");
  if (
    declaredLength !== null &&
    (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > maximumBytes)
  ) {
    throw new IngestionError("batch_too_large", 413);
  }
  const bytes = new REDACTED(await request.arrayBuffer());
  if (bytes.byteLength === 0 || bytes.byteLength > maximumBytes) {
    throw new IngestionError("batch_too_large", 413);
  }
  return bytes;
}
