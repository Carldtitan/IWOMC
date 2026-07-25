import { describe, expect, it, vi } from "vitest";

import {
  GitHubClientError,
  exchangeGitHubOAuthCode,
  fetchGitHubUser,
  refreshGitHubOAuthToken
} from "./client.js";

describe("GitHub OAuth API client", () => {
  it("exchanges a code with PKCE and parses expiring tokens", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        access_token: "secret-access-token",
        expires_in: 28_800,
        refresh_token: "secret-refresh-token",
        refresh_token_expires_in: 158_976_000,
        scope: "repo",
        token_type: "bearer"
      })
    );

    const tokens = await exchangeGitHubOAuthCode(
      {
        callbackUrl: "https://app.example.test/v1/auth/github/callback",
        clientId: "client-id",
        clientSecret: "client-secret",
        code: "one-time-code",
        codeVerifier: "pkce-verifier"
      },
      fetcher
    );

    expect(tokens).toMatchObject({
      accessToken: "secret-access-token",
      refreshToken: "secret-refresh-token"
    });
    const [, request] = fetcher.mock.calls[0]!;
    expect(typeof request?.body).toBe("string");
    expect(request?.body).toContain("code_verifier=pkce-verifier");
    expect(request?.body).toContain("client_secret=client-secret");
  });

  it("rejects provider errors without exposing their response", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json({ error: "bad_verification_code" }, { status: 401 }));

    await expect(
      exchangeGitHubOAuthCode(
        {
          callbackUrl: "https://app.example.test/callback",
          clientId: "client-id",
          clientSecret: "client-secret",
          code: "bad-code",
          codeVerifier: "verifier"
        },
        fetcher
      )
    ).rejects.toEqual(new GitHubClientError("oauth_exchange_failed"));
  });

  it("uses the immutable numeric GitHub user ID", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        avatar_url: "https://avatars.example.test/u/42",
        id: 42,
        login: "octocat",
        name: "The Octocat"
      })
    );

    await expect(fetchGitHubUser("access-token", fetcher)).resolves.toEqual({
      avatarUrl: "https://avatars.example.test/u/42",
      id: "42",
      login: "octocat",
      name: "The Octocat"
    });
    const [input, request] = fetcher.mock.calls[0]!;
    expect(input).toBe("https://api.github.com/user");
    expect(new Headers(request?.headers).get("Authorization")).toBe("Bearer access-token");
  });
});

describe("GitHub OAuth token refresh", () => {
  it("uses the refresh grant and requires GitHub's rotated token pair", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        access_token: "rotated-access",
        expires_in: 28_800,
        refresh_token: "rotated-refresh",
        refresh_token_expires_in: 15_897_600,
        scope: "",
        token_type: "bearer"
      })
    );

    await expect(
      refreshGitHubOAuthToken(
        {
          clientId: "client-id",
          clientSecret: "client-secret",
          refreshToken: "old-refresh"
        },
        fetcher
      )
    ).resolves.toEqual({
      accessToken: "rotated-access",
      accessTokenExpiresInSeconds: 28_800,
      refreshToken: "rotated-refresh",
      refreshTokenExpiresInSeconds: 15_897_600,
      scope: "",
      tokenType: "bearer"
    });

    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://github.com/login/oauth/access_token");
    expect(init?.redirect).toBe("error");
    expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({
      client_id: "client-id",
      client_secret: "client-secret",
      grant_type: "refresh_token",
      refresh_token: "old-refresh"
    });
  });

  it("distinguishes a revoked refresh grant from a transient or malformed response", async () => {
    await expect(
      refreshGitHubOAuthToken(
        {
          clientId: "client-id",
          clientSecret: "client-secret",
          refreshToken: "revoked-refresh"
        },
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(Response.json({ error: "bad_verification_code" }, { status: 400 }))
      )
    ).rejects.toEqual(new GitHubClientError("oauth_refresh_rejected"));

    await expect(
      refreshGitHubOAuthToken(
        {
          clientId: "client-id",
          clientSecret: "client-secret",
          refreshToken: "old-refresh"
        },
        vi.fn<typeof fetch>().mockResolvedValue(
          Response.json({
            access_token: "access-without-rotated-refresh",
            expires_in: 28_800,
            scope: "",
            token_type: "bearer"
          })
        )
      )
    ).rejects.toEqual(new GitHubClientError("oauth_refresh_failed"));
  });
});
