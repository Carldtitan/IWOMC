import { openJson, sealJson } from "../../security/crypto.js";
import { GitHubClientError, refreshGitHubOAuthToken, type GitHubOAuthTokens } from "./client.js";

const GITHUB_TOKEN_PURPOSE = "environment-reconciler/github-user-token/v1";
const DEFAULT_REFRESH_LEEWAY_SECONDS = 5 * 60;
const DEFAULT_REFRESH_LEASE_SECONDS = 60;

interface GitHubCredentialPayload {
  readonly accessToken: string;
  readonly accessTokenExpiresAtEpochSeconds?: number;
  readonly githubUserId: string;
  readonly refreshToken?: string;
  readonly refreshTokenExpiresAtEpochSeconds?: number;
  readonly scope: string;
  readonly tokenType: string;
}

export interface StoredGitHubCredential {
  readonly encryptedCredentials: string;
  readonly githubUserId: string;
  readonly refreshLeaseExpiresAtEpochSeconds?: number;
  readonly refreshLeaseId?: string;
  readonly revokedAtEpochSeconds?: number;
  readonly tokenExpiresAtEpochSeconds?: number;
  readonly userDisabledAtEpochSeconds?: number;
  readonly userId: string;
}

export interface GitHubCredentialStore {
  findCredential(userId: string): Promise<StoredGitHubCredential | undefined>;
  tryAcquireRefreshLease(input: {
    readonly leaseExpiresAtEpochSeconds: number;
    readonly leaseId: string;
    readonly nowEpochSeconds: number;
    readonly userId: string;
  }): Promise<boolean>;
  completeRefresh(input: {
    readonly encryptedCredentials: string;
    readonly leaseId: string;
    readonly tokenExpiresAtEpochSeconds: number;
    readonly updatedAtEpochSeconds: number;
    readonly userId: string;
  }): Promise<boolean>;
  releaseRefreshLease(input: { readonly leaseId: string; readonly userId: string }): Promise<void>;
  /**
   * Revokes the user credential and every product browser session. This is
   * used only for a provider-confirmed invalid refresh grant or an explicit
   * disconnect, never for a transient GitHub/network failure.
   */
  revokeCredentialAndSessions(input: {
    readonly revokedAtEpochSeconds: number;
    readonly userId: string;
  }): Promise<void>;
}

export class GitHubCredentialError extends Error {
  readonly code:
    | "credential_invalid"
    | "identity_disabled"
    | "identity_revoked"
    | "reauthorization_required"
    | "refresh_in_progress"
    | "refresh_persistence_failed"
    | "refresh_unavailable";

  constructor(code: GitHubCredentialError["code"]) {
    super(code);
    this.name = "GitHubCredentialError";
    this.code = code;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function optionalEpochSeconds(value: unknown): number | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : undefined;
}

function parseCredential(value: unknown): GitHubCredentialPayload {
  if (
    !isRecord(value) ||
    typeof value.accessToken !== "string" ||
    value.accessToken.length === 0 ||
    typeof value.scope !== "string" ||
    typeof value.tokenType !== "string" ||
    value.tokenType.toLowerCase() !== "bearer"
  ) {
    throw new GitHubCredentialError("credential_invalid");
  }
  // v1 callback payloads called this field `userId`; it is the immutable
  // GitHub numeric user ID, not the product's local UUID.
  const githubUserId =
    typeof value.githubUserId === "string"
      ? value.githubUserId
      : typeof value.userId === "string"
        ? value.userId
        : undefined;
  if (githubUserId === undefined || !/^[1-9]\d*$/u.test(githubUserId)) {
    throw new GitHubCredentialError("credential_invalid");
  }
  const refreshToken =
    typeof value.refreshToken === "string" && value.refreshToken.length > 0
      ? value.refreshToken
      : undefined;
  return {
    accessToken: value.accessToken,
    githubUserId,
    ...(refreshToken === undefined ? {} : { refreshToken }),
    ...(optionalEpochSeconds(value.accessTokenExpiresAtEpochSeconds) === undefined
      ? {}
      : {
          accessTokenExpiresAtEpochSeconds: optionalEpochSeconds(
            value.accessTokenExpiresAtEpochSeconds
          )!
        }),
    ...(optionalEpochSeconds(value.refreshTokenExpiresAtEpochSeconds) === undefined
      ? {}
      : {
          refreshTokenExpiresAtEpochSeconds: optionalEpochSeconds(
            value.refreshTokenExpiresAtEpochSeconds
          )!
        }),
    scope: value.scope,
    tokenType: value.tokenType
  };
}

export async function encryptGitHubCredentials(input: {
  readonly encryptionKey: string;
  readonly githubUserId: string;
  readonly issuedAtEpochSeconds: number;
  readonly tokens: GitHubOAuthTokens;
}): Promise<string> {
  return sealJson(
    {
      accessToken: input.tokens.accessToken,
      accessTokenExpiresAtEpochSeconds:
        input.tokens.accessTokenExpiresInSeconds === undefined
          ? null
          : input.issuedAtEpochSeconds + input.tokens.accessTokenExpiresInSeconds,
      githubUserId: input.githubUserId,
      refreshToken: input.tokens.refreshToken ?? null,
      refreshTokenExpiresAtEpochSeconds:
        input.tokens.refreshTokenExpiresInSeconds === undefined
          ? null
          : input.issuedAtEpochSeconds + input.tokens.refreshTokenExpiresInSeconds,
      scope: input.tokens.scope,
      tokenType: input.tokens.tokenType,
      version: 2
    },
    input.encryptionKey,
    GITHUB_TOKEN_PURPOSE
  );
}

async function decryptGitHubCredentials(
  encryptedCredentials: string,
  encryptionKey: string
): Promise<GitHubCredentialPayload> {
  try {
    return parseCredential(
      await openJson(encryptedCredentials, encryptionKey, GITHUB_TOKEN_PURPOSE)
    );
  } catch (error) {
    if (error instanceof GitHubCredentialError) {
      throw error;
    }
    throw new GitHubCredentialError("credential_invalid");
  }
}

export class GitHubUserCredentialService {
  readonly #clientId: string;
  readonly #clientSecret: string;
  readonly #encryptionKey: string;
  readonly #fetcher: typeof fetch;
  readonly #refreshLeaseSeconds: number;
  readonly #refreshLeewaySeconds: number;
  readonly #store: GitHubCredentialStore;

  constructor(
    input: {
      readonly clientId: string;
      readonly clientSecret: string;
      readonly encryptionKey: string;
      readonly store: GitHubCredentialStore;
    },
    options: {
      readonly fetcher?: typeof fetch;
      readonly refreshLeaseSeconds?: number;
      readonly refreshLeewaySeconds?: number;
    } = {}
  ) {
    this.#clientId = input.clientId;
    this.#clientSecret = input.clientSecret;
    this.#encryptionKey = input.encryptionKey;
    this.#store = input.store;
    this.#fetcher = options.fetcher ?? fetch;
    this.#refreshLeaseSeconds = options.refreshLeaseSeconds ?? DEFAULT_REFRESH_LEASE_SECONDS;
    this.#refreshLeewaySeconds = options.refreshLeewaySeconds ?? DEFAULT_REFRESH_LEEWAY_SECONDS;
  }

  async accessToken(input: {
    readonly nowEpochSeconds: number;
    readonly userId: string;
  }): Promise<string> {
    const stored = await this.#store.findCredential(input.userId);
    if (stored === undefined) {
      throw new GitHubCredentialError("reauthorization_required");
    }
    if (stored.userDisabledAtEpochSeconds !== undefined) {
      throw new GitHubCredentialError("identity_disabled");
    }
    if (stored.revokedAtEpochSeconds !== undefined) {
      throw new GitHubCredentialError("identity_revoked");
    }
    const credentials = await decryptGitHubCredentials(
      stored.encryptedCredentials,
      this.#encryptionKey
    );
    if (credentials.githubUserId !== stored.githubUserId) {
      throw new GitHubCredentialError("credential_invalid");
    }
    const accessExpiry =
      credentials.accessTokenExpiresAtEpochSeconds ?? stored.tokenExpiresAtEpochSeconds;
    if (
      accessExpiry === undefined ||
      accessExpiry > input.nowEpochSeconds + this.#refreshLeewaySeconds
    ) {
      return credentials.accessToken;
    }
    if (
      credentials.refreshToken === undefined ||
      (credentials.refreshTokenExpiresAtEpochSeconds !== undefined &&
        credentials.refreshTokenExpiresAtEpochSeconds <= input.nowEpochSeconds)
    ) {
      await this.#store.revokeCredentialAndSessions({
        revokedAtEpochSeconds: input.nowEpochSeconds,
        userId: input.userId
      });
      throw new GitHubCredentialError("reauthorization_required");
    }

    const leaseId = crypto.randomUUID();
    const acquired = await this.#store.tryAcquireRefreshLease({
      leaseExpiresAtEpochSeconds: input.nowEpochSeconds + this.#refreshLeaseSeconds,
      leaseId,
      nowEpochSeconds: input.nowEpochSeconds,
      userId: input.userId
    });
    if (!acquired) {
      throw new GitHubCredentialError("refresh_in_progress");
    }

    try {
      const rotated = await refreshGitHubOAuthToken(
        {
          clientId: this.#clientId,
          clientSecret: this.#clientSecret,
          refreshToken: credentials.refreshToken
        },
        this.#fetcher
      );
      const tokenExpiresAtEpochSeconds =
        input.nowEpochSeconds + rotated.accessTokenExpiresInSeconds!;
      const completed = await this.#store.completeRefresh({
        encryptedCredentials: await encryptGitHubCredentials({
          encryptionKey: this.#encryptionKey,
          githubUserId: credentials.githubUserId,
          issuedAtEpochSeconds: input.nowEpochSeconds,
          tokens: rotated
        }),
        leaseId,
        tokenExpiresAtEpochSeconds,
        updatedAtEpochSeconds: input.nowEpochSeconds,
        userId: input.userId
      });
      if (!completed) {
        throw new GitHubCredentialError("refresh_persistence_failed");
      }
      return rotated.accessToken;
    } catch (error) {
      if (error instanceof GitHubClientError && error.code === "oauth_refresh_rejected") {
        await this.#store.revokeCredentialAndSessions({
          revokedAtEpochSeconds: input.nowEpochSeconds,
          userId: input.userId
        });
        throw new GitHubCredentialError("reauthorization_required");
      }
      await this.#store.releaseRefreshLease({
        leaseId,
        userId: input.userId
      });
      if (error instanceof GitHubCredentialError) {
        throw error;
      }
      throw new GitHubCredentialError("refresh_unavailable");
    }
  }
}
