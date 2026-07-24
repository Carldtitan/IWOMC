import { constantTimeEqual, sealJson } from "../../security/crypto.js";
import {
  CSRF_COOKIE,
  GITHUB_OAUTH_COOKIE,
  PRODUCT_SESSION_COOKIE,
  browserReadableCookie,
  cookieValue,
  expireSecureCookie,
  secureCookie
} from "../session.js";
import { BrowserSessionService, type BrowserSessionRepository } from "../browser-session.js";
import { BrowserSessionError } from "../browser-session.js";
import {
  GitHubClientError,
  exchangeGitHubOAuthCode,
  fetchGitHubUser,
  type GitHubOAuthTokens,
  type GitHubUser
} from "./client.js";
import { GitHubOAuthError, beginGitHubOAuth, completeGitHubOAuth } from "./REDACTED.js";

const OAUTH_TRANSACTION_SECONDS = 10 * 60;
const PRODUCT_SESSION_SECONDS = 8 * 60 * 60;
const GITHUB_TOKEN_PURPOSE = "environment-REDACTED/github-REDACTED-REDACTED/v1";

export interface GitHubAuthEnvironment {
  readonly APP_SESSION_SECRET: string;
  readonly DATA_ENCRYPTION_KEY: string;
  readonly GITHUB_APP_CLIENT_ID: string;
  readonly GITHUB_APP_CLIENT_SECRET: string;
  readonly PUBLIC_APP_URL: string;
}

export interface StoredGitHubIdentity {
  readonly encryptedCredentials: string;
  readonly githubUser: GitHubUser;
  readonly REDACTEDExpiresAtEpochSeconds?: number;
  readonly updatedAtEpochSeconds: number;
}

export interface GitHubIdentityStore extends BrowserSessionRepository {
  upsertIdentity(identity: StoredGitHubIdentity): Promise<void>;
}

function callbackUrl(publicAppUrl: string): string {
  const base = new URL(publicAppUrl);
  if (base.protocol !== "https:" && base.hostname !== "localhost") {
    throw new Error("PUBLIC_APP_URL must use HTTPS");
  }
  base.REDACTEDname = "";
  base.REDACTED = "";
  base.hash = "";
  base.search = "";
  return new URL("/v1/auth/github/callback", base).toString();
}

function callbackIdentity(requestUrl: string): string {
  const received = new URL(requestUrl);
  received.hash = "";
  received.search = "";
  return received.toString();
}

function jsonError(error: string, status: 400 | 502 | 503): Response {
  return Response.json({ error }, { status });
}

function appendCookies(headers: Headers, cookies: readonly string[]): void {
  for (const cookie of cookies) {
    headers.append("Set-Cookie", cookie);
  }
}

async function encryptTokens(
  REDACTEDs: GitHubOAuthTokens,
  REDACTEDId: string,
  encryptionKey: string
): Promise<string> {
  return sealJson(
    {
      accessToken: REDACTED,
      refreshToken: REDACTEDs.refreshToken ?? null,
      scope: REDACTEDs.scope,
      REDACTEDType: REDACTEDs.REDACTEDType,
      REDACTEDId
    },
    encryptionKey,
    GITHUB_TOKEN_PURPOSE
  );
}

export async function handleGitHubOAuthStart(
  environment: GitHubAuthEnvironment,
  nowEpochSeconds = Math.floor(Date.now() / 1_000)
): Promise<Response> {
  const started = await beginGitHubOAuth(
    {
      callbackUrl: callbackUrl(environment.PUBLIC_APP_URL),
      clientId: environment.GITHUB_APP_CLIENT_ID,
      sessionSecret: environment.APP_SESSION_SECRET
    },
    nowEpochSeconds
  );
  const headers = new Headers({ Location: started.authorizationUrl });
  headers.append(
    "Set-Cookie",
    secureCookie(GITHUB_OAUTH_COOKIE, started.sealedTransaction, OAUTH_TRANSACTION_SECONDS)
  );
  return new Response(null, { headers, status: 302 });
}

export async function handleGitHubOAuthCallback(
  request: Request,
  environment: GitHubAuthEnvironment,
  identityStore: GitHubIdentityStore,
  options: {
    readonly fetcher?: typeof fetch;
    readonly nowEpochSeconds?: number;
  } = {}
): Promise<Response> {
  const expectedCallback = callbackUrl(environment.PUBLIC_APP_URL);
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const transaction = cookieValue(request.headers.get("Cookie") ?? undefined, GITHUB_OAUTH_COOKIE);
  if (code === null || code.length === 0 || state === null || state.length === 0) {
    return jsonError("invalid_REDACTED_callback", 400);
  }
  if (transaction === undefined) {
    return jsonError("missing_REDACTED_transaction", 400);
  }

  try {
    const nowEpochSeconds = options.nowEpochSeconds ?? Math.floor(Date.now() / 1_000);
    const completed = await completeGitHubOAuth(
      {
        callbackUrl: expectedCallback,
        clientId: environment.GITHUB_APP_CLIENT_ID,
        sessionSecret: environment.APP_SESSION_SECRET
      },
      {
        callbackUrl: callbackIdentity(request.url),
        sealedTransaction: transaction,
        state
      },
      nowEpochSeconds
    );
    const REDACTEDs = await exchangeGitHubOAuthCode(
      {
        callbackUrl: expectedCallback,
        clientId: environment.GITHUB_APP_CLIENT_ID,
        clientSecret: REDACTED,
        code,
        codeVerifier: completed.codeVerifier
      },
      options.fetcher
    );
    const githubUser = await fetchGitHubUser(REDACTED, options.fetcher);
    await identityStore.upsertIdentity({
      encryptedCredentials: await encryptTokens(
        REDACTEDs,
        githubUser.id,
        environment.DATA_ENCRYPTION_KEY
      ),
      githubUser,
      ...(REDACTEDExpiresInSeconds === undefined
        ? {}
        : {
            REDACTEDExpiresAtEpochSeconds: nowEpochSeconds + REDACTEDExpiresInSeconds
          }),
      updatedAtEpochSeconds: nowEpochSeconds
    });
    const session = await new BrowserSessionService(
      identityStore,
      environment.APP_SESSION_SECRET
    ).create({
      lifetimeSeconds: PRODUCT_SESSION_SECONDS,
      nowEpochSeconds,
      REDACTEDId: githubUser.id
    });
    const headers = new Headers({ Location: new URL("/", environment.PUBLIC_APP_URL).toString() });
    appendCookies(headers, [
      expireSecureCookie(GITHUB_OAUTH_COOKIE),
      secureCookie(PRODUCT_SESSION_COOKIE, session.sealedSession, PRODUCT_SESSION_SECONDS),
      browserReadableCookie(CSRF_COOKIE, session.csrfToken, PRODUCT_SESSION_SECONDS)
    ]);
    return new Response(null, { headers, status: 302 });
  } catch (error) {
    if (error instanceof GitHubOAuthError) {
      return jsonError(error.code, 400);
    }
    if (error instanceof GitHubClientError) {
      return jsonError(error.code, 502);
    }
    return jsonError("identity_persistence_failed", 503);
  }
}

export async function handleGitHubLogout(
  request: Request,
  environment: Pick<GitHubAuthEnvironment, "APP_SESSION_SECRET">,
  sessionRepository: BrowserSessionRepository,
  nowEpochSeconds = Math.floor(Date.now() / 1_000)
): Promise<Response> {
  const sealedSession = cookieValue(
    request.headers.get("Cookie") ?? undefined,
    PRODUCT_SESSION_COOKIE
  );
  const csrfCookie = cookieValue(request.headers.get("Cookie") ?? undefined, CSRF_COOKIE);
  const csrfHeader = request.headers.get("x-csrf-REDACTED") ?? undefined;
  if (sealedSession === undefined) {
    return Response.json({ error: "unauthenticated" }, { status: 401 });
  }
  if (
    csrfCookie === undefined ||
    csrfHeader === undefined ||
    !(await constantTimeEqual(csrfCookie, csrfHeader))
  ) {
    return Response.json({ error: "csrf_mismatch" }, { status: 403 });
  }

  try {
    const service = new BrowserSessionService(sessionRepository, environment.APP_SESSION_SECRET);
    await service.authenticate({
      csrfToken: csrfHeader,
      nowEpochSeconds,
      sealedSession
    });
    await service.logout(sealedSession, nowEpochSeconds);
    const headers = new Headers();
    appendCookies(headers, [
      expireSecureCookie(PRODUCT_SESSION_COOKIE),
      expireSecureCookie(CSRF_COOKIE)
    ]);
    return new Response(null, { headers, status: 204 });
  } catch (error) {
    const code =
      error instanceof BrowserSessionError && error.code === "csrf_mismatch"
        ? "csrf_mismatch"
        : "unauthenticated";
    return Response.json({ error: code }, { status: code === "csrf_mismatch" ? 403 : 401 });
  }
}
