import {
  constantTimeEqual,
  openJson,
  randomToken,
  sealJson,
  sha256Base64Url
} from "../security/crypto.js";

export const PRODUCT_SESSION_COOKIE = "__Host-er_session";
export const GITHUB_OAUTH_COOKIE = "__Host-er_github_oauth";
export const CSRF_COOKIE = "__Host-er_csrf";

const SESSION_PURPOSE = "environment-reconciler/product-session/v1";

export interface ProductSession {
  readonly csrfDigest: string;
  readonly expiresAtEpochSeconds: number;
  readonly issuedAtEpochSeconds: number;
  readonly sessionId: string;
  readonly userId: string;
}

export interface IssuedProductSession {
  readonly csrfToken: string;
  readonly sealedSession: string;
  readonly session: ProductSession;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseSession(value: unknown): ProductSession {
  if (
    !isRecord(value) ||
    typeof value.csrfDigest !== "string" ||
    typeof value.expiresAtEpochSeconds !== "number" ||
    typeof value.issuedAtEpochSeconds !== "number" ||
    typeof value.sessionId !== "string" ||
    typeof value.userId !== "string"
  ) {
    throw new Error("invalid product session");
  }
  return {
    csrfDigest: value.csrfDigest,
    expiresAtEpochSeconds: value.expiresAtEpochSeconds,
    issuedAtEpochSeconds: value.issuedAtEpochSeconds,
    sessionId: value.sessionId,
    userId: value.userId
  };
}

export async function issueProductSession(input: {
  readonly lifetimeSeconds: number;
  readonly nowEpochSeconds: number;
  readonly sessionSecret: string;
  readonly userId: string;
}): Promise<IssuedProductSession> {
  if (
    !Number.isSafeInteger(input.lifetimeSeconds) ||
    input.lifetimeSeconds < 60 ||
    input.lifetimeSeconds > 30 * 24 * 60 * 60
  ) {
    throw new RangeError("session lifetime must be between one minute and 30 days");
  }
  const csrfToken = randomToken();
  const session: ProductSession = {
    csrfDigest: await sha256Base64Url(csrfToken),
    expiresAtEpochSeconds: input.nowEpochSeconds + input.lifetimeSeconds,
    issuedAtEpochSeconds: input.nowEpochSeconds,
    sessionId: crypto.randomUUID(),
    userId: input.userId
  };
  return {
    csrfToken,
    sealedSession: await sealJson({ ...session }, input.sessionSecret, SESSION_PURPOSE),
    session
  };
}

export async function verifyProductSession(
  sealedSession: string,
  sessionSecret: string,
  nowEpochSeconds: number
): Promise<ProductSession> {
  let session: ProductSession;
  try {
    session = parseSession(await openJson(sealedSession, sessionSecret, SESSION_PURPOSE));
  } catch {
    throw new Error("invalid product session");
  }
  if (session.expiresAtEpochSeconds < nowEpochSeconds) {
    throw new Error("expired product session");
  }
  return session;
}

export async function verifyCsrf(session: ProductSession, csrfToken: string): Promise<boolean> {
  return constantTimeEqual(await sha256Base64Url(csrfToken), session.csrfDigest);
}

export function secureCookie(
  name: string,
  value: string,
  maximumAgeSeconds: number,
  sameSite: "Lax" | "Strict" = "Lax"
): string {
  if (!name.startsWith("__Host-")) {
    throw new Error("security cookies must use the __Host- prefix");
  }
  return `${name}=${value}; Path=/; Max-Age=${maximumAgeSeconds}; HttpOnly; Secure; SameSite=${sameSite}`;
}

export function expireSecureCookie(name: string): string {
  return secureCookie(name, "", 0, "Strict");
}

export function browserReadableCookie(
  name: string,
  value: string,
  maximumAgeSeconds: number
): string {
  if (!name.startsWith("__Host-")) {
    throw new Error("security cookies must use the __Host- prefix");
  }
  return `${name}=${value}; Path=/; Max-Age=${maximumAgeSeconds}; Secure; SameSite=Strict`;
}

export function cookieValue(header: string | undefined, name: string): string | undefined {
  if (header === undefined) {
    return undefined;
  }
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) {
      continue;
    }
    const candidateName = part.slice(0, separator).trim();
    if (candidateName === name) {
      return part.slice(separator + 1).trim();
    }
  }
  return undefined;
}
