const encoder = new TextEncoder();
const MAX_WEBHOOK_BYTES = 2 * 1024 * 1024;
const SIGNATURE_PATTERN = /^sha256=([0-9a-f]{64})$/u;
const DELIVERY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,199}$/u;

const allowedActions = {
  installation: new Set(["created", "deleted", "new_permissions_accepted", "suspend", "unsuspend"]),
  installation_repositories: new Set(["added", "removed"]),
  pull_request: new Set(["closed", "opened", "reopened", "synchronize"])
} as const;

export type SupportedGitHubWebhookEvent =
  "installation" | "installation_repositories" | "pull_request" | "push";

export type GitHubWebhookReason =
  "installation.changed" | "repository.changed" | "source.pull_request" | "source.push";

export interface GitHubWebhookDelivery {
  readonly action?: string;
  readonly deliveryId: string;
  readonly event: SupportedGitHubWebhookEvent;
  readonly installationId: string;
  readonly payloadDigest: `sha256:${string}`;
  readonly rawBody: Uint8Array;
  readonly receivedAtEpochMilliseconds: number;
  readonly repositoryIds: readonly string[];
}

export interface GitHubWebhookDeliveryStore {
  /**
   * Atomically persists the raw delivery and its metadata. Implementations
   * must enforce a unique constraint over `(provider, deliveryId)`.
   */
  reserve(delivery: GitHubWebhookDelivery): Promise<"accepted" | "duplicate">;
}

export interface GitHubWebhookMessage {
  readonly action?: string;
  readonly deliveryId: string;
  readonly event: SupportedGitHubWebhookEvent;
  readonly installationId: string;
  readonly payloadDigest: `sha256:${string}`;
  readonly reason: GitHubWebhookReason;
  readonly repositoryIds: readonly string[];
  readonly requestFreshCheckpoint: boolean;
}

export interface GitHubWebhookQueue {
  publish(message: GitHubWebhookMessage): Promise<void>;
}

export interface GitHubWebhookDependencies {
  readonly deliveries: GitHubWebhookDeliveryStore;
  readonly queue: GitHubWebhookQueue;
  readonly webhookSecret: string;
}

export interface GitHubWebhookOptions {
  readonly maximumBodyBytes?: number;
  readonly now?: () => number;
}

export class GitHubWebhookError extends Error {
  readonly code:
    | "invalid_body"
    | "invalid_delivery"
    | "invalid_event"
    | "invalid_signature"
    | "payload_too_large"
    | "storage_unavailable";
  readonly status: 400 | 401 | 413 | 503;

  constructor(code: GitHubWebhookError["code"], status: GitHubWebhookError["status"]) {
    super(code);
    this.name = "GitHubWebhookError";
    this.code = code;
    this.status = status;
  }
}

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function hexadecimal(bytes: Uint8Array): string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(bytes: Uint8Array): Promise<`sha256:${string}`> {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)));
  return `sha256:${hexadecimal(digest)}`;
}

export async function createGitHubWebhookSignature(
  secret: string,
  rawBody: Uint8Array
): Promise<string> {
  if (secret.length < 16) {
    throw new Error("GitHub webhook secret must contain at least 16 characters");
  }
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encoder.encode(secret)),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["sign"]
  );
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, toArrayBuffer(rawBody)));
  return `sha256=${hexadecimal(signature)}`;
}

export async function verifyGitHubWebhookSignature(
  secret: string,
  rawBody: Uint8Array,
  signatureHeader: string | undefined
): Promise<boolean> {
  const match = signatureHeader?.match(SIGNATURE_PATTERN);
  if (match?.[1] === undefined || secret.length < 16) {
    return false;
  }
  const signatureBytes = Uint8Array.from(match[1].match(/.{2}/gu) ?? [], (part) =>
    Number.parseInt(part, 16)
  );
  const key = await crypto.subtle.importKey(
    "raw",
    toArrayBuffer(encoder.encode(secret)),
    { hash: "SHA-256", name: "HMAC" },
    false,
    ["verify"]
  );
  return crypto.subtle.verify("HMAC", key, toArrayBuffer(signatureBytes), toArrayBuffer(rawBody));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function identifier(value: unknown): string | undefined {
  if (
    (typeof value !== "number" || !Number.isSafeInteger(value) || value < 1) &&
    (typeof value !== "string" || !/^[1-9]\d*$/u.test(value))
  ) {
    return undefined;
  }
  return String(value);
}

function nestedIdentifier(value: unknown, key: string): string | undefined {
  return isRecord(value) ? identifier(value[key]) : undefined;
}

function repositoryIds(payload: Record<string, unknown>): readonly string[] {
  const ids = new Set<string>();
  const single = nestedIdentifier(payload.repository, "id");
  if (single !== undefined) {
    ids.add(single);
  }
  for (const field of ["repositories", "repositories_added", "repositories_removed"]) {
    const values = payload[field];
    if (!Array.isArray(values)) {
      continue;
    }
    for (const value of values) {
      const id = nestedIdentifier(value, "id");
      if (id !== undefined) {
        ids.add(id);
      }
    }
  }
  return [...ids].sort((left, right) => left.localeCompare(right));
}

function parsePayload(rawBody: Uint8Array): Record<string, unknown> {
  try {
    const value: unknown = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(rawBody));
    if (!isRecord(value)) {
      throw new Error("not an object");
    }
    return value;
  } catch {
    throw new GitHubWebhookError("invalid_body", 400);
  }
}

function parseEvent(value: string | undefined): SupportedGitHubWebhookEvent | undefined {
  switch (value) {
    case "installation":
    case "installation_repositories":
    case "pull_request":
    case "push":
      return value;
    default:
      return undefined;
  }
}

function classify(
  event: SupportedGitHubWebhookEvent,
  action: string | undefined
): { readonly accepted: boolean; readonly reason: GitHubWebhookReason } {
  if (event === "push") {
    return { accepted: action === undefined, reason: "source.push" };
  }
  if (event === "installation") {
    return {
      accepted: action !== undefined && allowedActions.installation.has(action),
      reason: "installation.changed"
    };
  }
  if (event === "installation_repositories") {
    return {
      accepted: action !== undefined && allowedActions.installation_repositories.has(action),
      reason: "repository.changed"
    };
  }
  return {
    accepted: action !== undefined && allowedActions.pull_request.has(action),
    reason: "source.pull_request"
  };
}

async function boundedRawBody(request: Request, maximumBytes: number): Promise<Uint8Array> {
  const length = request.headers.get("content-length");
  if (length !== null && (!/^\d+$/u.test(length) || Number(length) > maximumBytes)) {
    throw new GitHubWebhookError("payload_too_large", 413);
  }
  if (request.body === null) {
    throw new GitHubWebhookError("invalid_body", 400);
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    totalBytes += value.byteLength;
    if (totalBytes > maximumBytes) {
      await reader.cancel();
      throw new GitHubWebhookError("payload_too_large", 413);
    }
    chunks.push(value);
  }
  if (totalBytes === 0) {
    throw new GitHubWebhookError("invalid_body", 400);
  }
  const rawBody = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    rawBody.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return rawBody;
}

export async function handleGitHubWebhook(
  request: Request,
  dependencies: GitHubWebhookDependencies,
  options: GitHubWebhookOptions = {}
): Promise<Response> {
  try {
    const maximumBytes = options.maximumBodyBytes ?? MAX_WEBHOOK_BYTES;
    const rawBody = await boundedRawBody(request, maximumBytes);
    if (
      !(await verifyGitHubWebhookSignature(
        dependencies.webhookSecret,
        rawBody,
        request.headers.get("x-hub-signature-256") ?? undefined
      ))
    ) {
      throw new GitHubWebhookError("invalid_signature", 401);
    }

    const deliveryId = request.headers.get("x-github-delivery") ?? undefined;
    if (deliveryId === undefined || !DELIVERY_PATTERN.test(deliveryId)) {
      throw new GitHubWebhookError("invalid_delivery", 400);
    }
    const event = parseEvent(request.headers.get("x-github-event") ?? undefined);
    if (event === undefined) {
      throw new GitHubWebhookError("invalid_event", 400);
    }

    const payload = parsePayload(rawBody);
    const action = typeof payload.action === "string" ? payload.action : undefined;
    const classification = classify(event, action);
    const installationId = nestedIdentifier(payload.installation, "id");
    if (installationId === undefined) {
      throw new GitHubWebhookError("invalid_body", 400);
    }
    const digest = await sha256(rawBody);
    const ids = repositoryIds(payload);
    let reservation: "accepted" | "duplicate";
    try {
      reservation = await dependencies.deliveries.reserve({
        ...(action === undefined ? {} : { action }),
        deliveryId,
        event,
        installationId,
        payloadDigest: digest,
        rawBody,
        receivedAtEpochMilliseconds: options.now?.() ?? Date.now(),
        repositoryIds: ids
      });
    } catch {
      throw new GitHubWebhookError("storage_unavailable", 503);
    }
    if (reservation === "duplicate") {
      return Response.json({ accepted: true, duplicate: true }, { status: 202 });
    }
    if (!classification.accepted) {
      return Response.json({ accepted: true, ignored: true }, { status: 202 });
    }

    try {
      await dependencies.queue.publish({
        ...(action === undefined ? {} : { action }),
        deliveryId,
        event,
        installationId,
        payloadDigest: digest,
        reason: classification.reason,
        repositoryIds: ids,
        requestFreshCheckpoint: event !== "installation"
      });
    } catch {
      // The durable delivery remains reserved for a reconciliation job to
      // enqueue later. GitHub should retry this delivery in the meantime.
      throw new GitHubWebhookError("storage_unavailable", 503);
    }
    return Response.json({ accepted: true, duplicate: false }, { status: 202 });
  } catch (error) {
    const safe =
      error instanceof GitHubWebhookError
        ? error
        : new GitHubWebhookError("storage_unavailable", 503);
    return Response.json({ error: safe.code }, { status: safe.status });
  }
}
