const GITHUB_API_VERSION = "2022-11-28";

export interface GitHubOAuthTokens {
  readonly accessToken: string;
  readonly accessTokenExpiresInSeconds?: number;
  readonly refreshToken?: string;
  readonly refreshTokenExpiresInSeconds?: number;
  readonly scope: string;
  readonly tokenType: string;
}

export interface GitHubUser {
  readonly avatarUrl: string;
  readonly id: string;
  readonly login: string;
  readonly name?: string;
}

export class GitHubClientError extends Error {
  readonly code: "oauth_exchange_failed" | "user_fetch_failed" | "invalid_response";

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
  const response = await fetcher("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: new URLSearchParams({
      client_id: input.clientId,
      client_secret: input.clientSecret,
      code: input.code,
      code_verifier: input.codeVerifier,
      redirect_uri: input.callbackUrl
    }).toString()
  });
  const body = await readJson(response);
  if (
    !response.ok ||
    !isRecord(body) ||
    typeof body.access_token !== "string" ||
    typeof body.scope !== "string" ||
    typeof body.token_type !== "string"
  ) {
    throw new GitHubClientError("oauth_exchange_failed");
  }

  return {
    accessToken: body.access_token,
    ...(typeof body.expires_in === "number"
      ? { accessTokenExpiresInSeconds: body.expires_in }
      : {}),
    ...(typeof body.refresh_token === "string" ? { refreshToken: body.refresh_token } : {}),
    ...(typeof body.refresh_token_expires_in === "number"
      ? { refreshTokenExpiresInSeconds: body.refresh_token_expires_in }
      : {}),
    scope: body.scope,
    tokenType: body.token_type
  };
}

export async function fetchGitHubUser(
  accessToken: string,
  fetcher: typeof fetch = fetch
): Promise<GitHubUser> {
  const response = await fetcher("https://api.github.com/user", {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "environment-reconciler",
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
    throw new GitHubClientError("user_fetch_failed");
  }

  return {
    avatarUrl: body.avatar_url,
    id: String(body.id),
    login: body.login,
    ...(typeof body.name === "string" ? { name: body.name } : {})
  };
}
