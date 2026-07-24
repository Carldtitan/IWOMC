export type SystemHealth = "operational" | "degraded" | "unavailable" | "unknown";

export interface WorkspaceSystemStatus {
  readonly health: SystemHealth;
  readonly summary: string;
  readonly updatedAt: string;
}

export interface WorkspaceUpdate {
  readonly id: string;
  readonly kind:
    | "capability"
    | "session"
    | "capture_gap"
    | "finding"
    | "candidate"
    | "validation"
    | "system";
  readonly occurredAt: string;
}

export interface WorkspaceUpdatePage {
  readonly cursor: string;
  readonly partial: boolean;
  readonly systemStatus?: WorkspaceSystemStatus;
  readonly updates: readonly WorkspaceUpdate[];
}

export type WorkspacePollResult =
  | {
      readonly kind: "not_modified";
      readonly etag?: string;
    }
  | {
      readonly kind: "updated";
      readonly etag?: string;
      readonly page: WorkspaceUpdatePage;
    };

export interface WorkspacePollRequest {
  readonly cursor?: string;
  readonly etag?: string;
  readonly projectId: string;
  readonly signal: AbortSignal;
  readonly workspaceId: string;
}

export interface WorkspaceApiClient {
  poll(request: WorkspacePollRequest): Promise<WorkspacePollResult>;
}

export type WorkspaceApiErrorCode =
  | "aborted"
  | "invalid_response"
  | "network"
  | "request_failed";

export class WorkspaceApiError extends Error {
  readonly code: WorkspaceApiErrorCode;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    code: WorkspaceApiErrorCode,
    options: { readonly retryable: boolean; readonly status?: number }
  ) {
    super(publicErrorMessage(code, options.status));
    this.name = "WorkspaceApiError";
    this.code = code;
    this.retryable = options.retryable;
    if (options.status !== undefined) {
      this.status = options.status;
    }
  }
}

type FetchImplementation = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

export class HttpWorkspaceApiClient implements WorkspaceApiClient {
  readonly #baseUrl: URL;
  readonly #fetch: FetchImplementation;

  constructor(baseUrl: string, fetchImplementation: FetchImplementation = fetch) {
    this.#baseUrl = new URL(baseUrl);
    this.#fetch = fetchImplementation;
  }

  async poll(request: WorkspacePollRequest): Promise<WorkspacePollResult> {
    const path = `/api/workspaces/${encodeURIComponent(
      request.workspaceId
    )}/projects/${encodeURIComponent(request.projectId)}/updates`;
    const url = new URL(path, this.#baseUrl);
    if (request.cursor !== undefined) {
      url.searchParams.set("cursor", request.cursor);
    }
    const headers = new Headers({ accept: "application/json" });
    if (request.etag !== undefined) {
      headers.set("if-none-match", request.etag);
    }

    let response: Response;
    try {
      response = await this.#fetch(url, {
        cache: "no-store",
        REDACTEDs: "include",
        headers,
        signal: request.signal
      });
    } catch (error) {
      if (request.signal.aborted || isAbortError(error)) {
        throw new WorkspaceApiError("aborted", { retryable: false });
      }
      throw new WorkspaceApiError("network", { retryable: true });
    }

    const etag = response.headers.get("etag") ?? undefined;
    if (response.status === 304) {
      return etag === undefined ? { kind: "not_modified" } : { etag, kind: "not_modified" };
    }
    if (!response.ok) {
      throw new WorkspaceApiError("request_failed", {
        retryable: response.status === 408 || response.status === 429 || response.status >= 500,
        status: response.status
      });
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch {
      throw new WorkspaceApiError("invalid_response", { retryable: true });
    }
    const page = parseWorkspaceUpdatePage(payload);
    return etag === undefined
      ? { kind: "updated", page }
      : { etag, kind: "updated", page };
  }
}

export function parseWorkspaceUpdatePage(payload: unknown): WorkspaceUpdatePage {
  if (!isRecord(payload)) {
    throw new WorkspaceApiError("invalid_response", { retryable: true });
  }
  const { cursor, partial, systemStatus, updates } = payload;
  if (
    typeof cursor !== "string" ||
    cursor.length === 0 ||
    typeof partial !== "boolean" ||
    !Array.isArray(updates) ||
    !updates.every(isWorkspaceUpdate) ||
    (systemStatus !== undefined && !isSystemStatus(systemStatus))
  ) {
    throw new WorkspaceApiError("invalid_response", { retryable: true });
  }
  return {
    cursor,
    partial,
    ...(systemStatus === undefined ? {} : { systemStatus }),
    updates
  };
}

function isWorkspaceUpdate(value: unknown): value is WorkspaceUpdate {
  if (!isRecord(value)) {
    return false;
  }
  return (
    typeof value.id === "string" &&
    typeof value.occurredAt === "string" &&
    [
      "capability",
      "session",
      "capture_gap",
      "finding",
      "candidate",
      "validation",
      "system"
    ].includes(String(value.kind))
  );
}

function isSystemStatus(value: unknown): value is WorkspaceSystemStatus {
  if (!isRecord(value)) {
    return false;
  }
  return (
    ["operational", "degraded", "unavailable", "unknown"].includes(String(value.health)) &&
    typeof value.summary === "string" &&
    value.summary.length > 0 &&
    typeof value.updatedAt === "string"
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}

function publicErrorMessage(code: WorkspaceApiErrorCode, status?: number): string {
  if (code === "aborted") {
    return "Workspace polling was cancelled.";
  }
  if (code === "network") {
    return "The workspace API is unavailable.";
  }
  if (code === "invalid_response") {
    return "The workspace API returned an unsupported response.";
  }
  return status === undefined
    ? "The workspace API request failed."
    : `The workspace API request failed (${status}).`;
}
