import { Hono } from "hono";

import type {
  WorkspaceUpdatePage,
  WorkspaceUpdateRecord,
  WorkspaceUpdatesAuthenticator,
  WorkspaceUpdatesService
} from "./types.js";

interface WorkspaceUpdateBindings {
  Bindings: Env;
}

export interface WorkspaceUpdateRouteOptions {
  readonly now?: () => number;
}

type RouteErrorCode =
  "forbidden" | "invalid_cursor" | "invalid_identifier" | "service_unavailable" | "unauthorized";

export class WorkspaceUpdateRouteError extends Error {
  readonly code: RouteErrorCode;
  readonly retryable: boolean;
  readonly status: 400 | 401 | 403 | 503;

  constructor(
    code: RouteErrorCode,
    status: WorkspaceUpdateRouteError["status"],
    retryable = false
  ) {
    super(code);
    this.name = "WorkspaceUpdateRouteError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function createWorkspaceUpdateRoutes(
  authenticator: WorkspaceUpdatesAuthenticator,
  service: WorkspaceUpdatesService,
  options: WorkspaceUpdateRouteOptions = {}
): Hono<WorkspaceUpdateBindings> {
  const routes = new Hono<WorkspaceUpdateBindings>();
  const now = options.now ?? Date.now;

  routes.get("/api/workspaces/:workspace/projects/:project/updates", async (context) => {
    const nowEpochMilliseconds = now();
    const principal = await authenticator.authenticate({
      nowEpochMilliseconds,
      request: context.req.raw
    });
    if (principal === undefined) {
      throw new WorkspaceUpdateRouteError("unauthorized", 401);
    }

    const workspaceId = requiredIdentifier(context.req.param("workspace"));
    const projectId = requiredIdentifier(context.req.param("project"));
    const cursor = optionalCursor(context.req.query("cursor"));
    if (
      !principal.workspaceIds.includes(workspaceId) ||
      !(await service.canReadProject({ principal, projectId, workspaceId }))
    ) {
      throw new WorkspaceUpdateRouteError("forbidden", 403);
    }

    const page = validatePage(
      await service.readUpdates({
        ...(cursor === undefined ? {} : { cursor }),
        nowEpochMilliseconds,
        principal,
        projectId,
        workspaceId
      })
    );
    const responseBody = {
      cursor: page.cursor,
      partial: page.partial,
      stale: page.stale,
      ...(page.systemStatus === undefined ? {} : { systemStatus: page.systemStatus }),
      updates: page.updates
    };
    const etag = await responseEtag(responseBody);
    const resultState = dataState(page);
    const headers = {
      "cache-control": "private, no-cache",
      etag,
      vary: "Authorization, Cookie",
      "x-reconciler-data-state": resultState
    };
    if (ifNoneMatch(context.req.header("if-none-match"), etag)) {
      return new Response(null, { headers, status: 304 });
    }
    return context.json(responseBody, 200, headers);
  });

  routes.onError((error, context) => {
    const mapped = mapRouteError(error);
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

export function mapRouteError(error: unknown): {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: 400 | 401 | 403 | 500 | 503;
} {
  return error instanceof WorkspaceUpdateRouteError
    ? { code: error.code, retryable: error.retryable, status: error.status }
    : { code: "internal_server_error", retryable: false, status: 500 };
}

function requiredIdentifier(value: string | undefined): string {
  if (value === undefined || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u.test(value)) {
    throw new WorkspaceUpdateRouteError("invalid_identifier", 400);
  }
  return value;
}

function optionalCursor(value: string | undefined): string | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (!/^[A-Za-z0-9._~-]{1,512}$/u.test(value)) {
    throw new WorkspaceUpdateRouteError("invalid_cursor", 400);
  }
  return value;
}

function validatePage(page: WorkspaceUpdatePage): WorkspaceUpdatePage {
  const valid =
    /^[A-Za-z0-9._~-]{1,512}$/u.test(page.cursor) &&
    typeof page.partial === "boolean" &&
    typeof page.stale === "boolean" &&
    Array.isArray(page.updates) &&
    page.updates.length <= 1_000 &&
    page.updates.every(validUpdate) &&
    (page.systemStatus === undefined ||
      (["operational", "degraded", "unavailable", "unknown"].includes(page.systemStatus.health) &&
        page.systemStatus.summary.length > 0 &&
        page.systemStatus.summary.length <= 500 &&
        validTimestamp(page.systemStatus.updatedAt)));
  if (!valid) {
    throw new Error("invalid workspace update service result");
  }
  return page;
}

function validUpdate(update: WorkspaceUpdateRecord): boolean {
  return (
    /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u.test(update.id) &&
    [
      "capability",
      "session",
      "capture_gap",
      "finding",
      "candidate",
      "validation",
      "system"
    ].includes(update.kind) &&
    validTimestamp(update.occurredAt)
  );
}

function validTimestamp(value: string): boolean {
  return value.length <= 64 && Number.isFinite(Date.parse(value));
}

function dataState(page: WorkspaceUpdatePage): string {
  if (page.stale && page.partial) {
    return "stale_partial";
  }
  if (page.stale) {
    return "stale";
  }
  return page.partial ? "partial" : "fresh";
}

async function responseEtag(body: object): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(body));
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `"sha256-${hex}"`;
}

function ifNoneMatch(header: string | undefined, currentEtag: string): boolean {
  if (header === undefined || header.length > 4_096) {
    return false;
  }
  const normalizedCurrent = normalizeEtag(currentEtag);
  return header.split(",").some((candidate) => {
    const trimmed = candidate.trim();
    return trimmed === "*" || normalizeEtag(trimmed) === normalizedCurrent;
  });
}

function normalizeEtag(value: string): string {
  return value.startsWith("W/") ? value.slice(2) : value;
}
