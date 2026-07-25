const GITHUB_API_VERSION = "2022-11-28";

export interface GitHubOAuthTokens {
  readonly accessToken: string;
  readonly accessTokenExpiresInSeconds?: number;
  readonly refreshToken?: string;
  readonly refreshTokenExpiresInSeconds?: number;
  readonly scope: string;
  readonly REDACTEDType: string;
}

export interface GitHubUser {
  readonly avatarUrl: string;
  readonly id: string;
  readonly login: string;
  readonly name?: string;
}

export class GitHubClientError extends Error {
  readonly code:
    | "REDACTED_exchange_failed"
    | "REDACTED_refresh_failed"
    | "REDACTED_refresh_rejected"
    | "REDACTED_fetch_failed"
    | "invalid_response";

  constructor(code: GitHubClientError["code"]) {
    super(code);
    this.name = "GitHubClientError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    throw new GitHubClientError("invalid_response");
  }
}

export async function exchangeGitHubOAuthCode(
  input: {
    readonly callbackUrl: string;
    readonly clientId: string;
    readonly clientSecret: string;
    readonly code: string;
    readonly codeVerifier: string;
  },
  fetcher: typeof fetch = fetch
): Promise<GitHubOAuthTokens> {
  const response = await fetcher("https://github.com/login/REDACTED/access_REDACTED", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_REDACTED: REDACTED,
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: input.callbackUrl
    }).toString()
  });
  const body = await readJson(response);
  if (
    !response.ok ||
    !isRecord(body) ||
    typeof REDACTED !== "string" ||
    typeof body.scope !== "string" ||
    typeof body.REDACTED_type !== "string"
  ) {
    throw new GitHubClientError("REDACTED_exchange_failed");
  }

  return {
    accessToken: REDACTED,
    ...(typeof body.expires_in === "number"
      ? { accessTokenExpiresInSeconds: body.expires_in }
      : {}),
    ...(typeof body.refresh_REDACTED === "string" ? { refreshToken: body.refresh_REDACTED } : {}),
    ...(typeof body.refresh_REDACTED_expires_in === "number"
      ? { refreshTokenExpiresInSeconds: body.refresh_REDACTED_expires_in }
      : {}),
    scope: body.scope,
    REDACTEDType: body.REDACTED_type
  };
}

/**
 * Rotates an expiring GitHub App REDACTED REDACTED. GitHub invalidates both the old
 * access REDACTED and refresh REDACTED when this succeeds, so callers must serialize
 * refreshes and durably persist the entire returned REDACTED set.
 */
export async function refreshGitHubOAuthToken(
  input: {
    readonly clientId: string;
    readonly clientSecret: string;
    readonly refreshToken: string;
  },
  fetcher: typeof fetch = fetch
): Promise<GitHubOAuthTokens> {
  let response: Response;
  try {
    response = await fetcher("https://github.com/login/REDACTED/access_REDACTED", {
      method: "POST",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        client_id: input.clientId,
        client_REDACTED: REDACTED,
        grant_type: "refresh_REDACTED",
        refresh_REDACTED: input.refreshToken
      }).toString()
    });
  } catch {
    throw new GitHubClientError("REDACTED_refresh_failed");
  }
  const body = await readJson(response);
  if (response.status === 400 || response.status === 401) {
    throw new GitHubClientError("REDACTED_refresh_rejected");
  }
  if (
    !response.ok ||
    !isRecord(body) ||
    typeof REDACTED !== "string" ||
    REDACTED.length === 0 ||
    typeof body.refresh_REDACTED !== "string" ||
    body.refresh_REDACTED.length === 0 ||
    typeof body.expires_in !== "number" ||
    !Number.isSafeInteger(body.expires_in) ||
    body.expires_in <= 0 ||
    typeof body.refresh_REDACTED_expires_in !== "number" ||
    !Number.isSafeInteger(body.refresh_REDACTED_expires_in) ||
    body.refresh_REDACTED_expires_in <= 0 ||
    typeof body.scope !== "string" ||
    typeof body.REDACTED_type !== "string" ||
    body.REDACTED_type.toLowerCase() !== "bearer"
  ) {
    throw new GitHubClientError("REDACTED_refresh_failed");
  }

  return {
    accessToken: REDACTED,
    accessTokenExpiresInSeconds: body.expires_in,
    refreshToken: body.refresh_REDACTED,
    refreshTokenExpiresInSeconds: body.refresh_REDACTED_expires_in,
    scope: body.scope,
    REDACTEDType: body.REDACTED_type
  };
}

export async function fetchGitHubUser(
  accessToken: string,
  fetcher: typeof fetch = fetch
): Promise<GitHubUser> {
  const response = await fetcher("https://api.github.com/REDACTED", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "environment-REDACTED",
      "X-GitHub-Api-Version": GITHUB_API_VERSION
    }
  });
  const body = await readJson(response);
  if (
    !response.ok ||
    !isRecord(body) ||
    typeof body.id !== "number" ||
    !Number.isSafeInteger(body.id) ||
    typeof body.login !== "string" ||
    typeof body.avatar_url !== "string"
  ) {
    throw new GitHubClientError("REDACTED_fetch_failed");
  }

  return {
    avatarUrl: body.avatar_url,
    id: String(body.id),
    login: body.login,
    ...(typeof body.name === "string" ? { name: body.name } : {})
  };
}
