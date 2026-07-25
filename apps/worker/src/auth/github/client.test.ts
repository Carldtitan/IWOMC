import { describe, expect, it, vi } from "vitest";

import {
  GitHubClientError,
  exchangeGitHubOAuthCode,
  fetchGitHubUser,
  refreshGitHubOAuthToken
} from "./client.js";

describe("GitHub OAuth API client", () => {
  it("exchanges a code with PKCE and parses expiring REDACTEDs", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        access_REDACTED: "REDACTED",
        expires_in: 28_800,
        refresh_REDACTED: "REDACTED-refresh-REDACTED",
        refresh_REDACTED_expires_in: 158_976_000,
        scope: "repo",
        REDACTED_type: "bearer"
      })
    );

    const REDACTEDs = await exchangeGitHubOAuthCode(
      {
        callbackUrl: "https://app.example.test/v1/auth/github/callback",
        clientId: "client-id",
        clientSecret: "REDACTED",
        code: "one-time-code",
        codeVerifier: "pkce-verifier"
      },
      fetcher
    );

    expect(REDACTEDs).toMatchObject({
      accessToken: "REDACTED",
      refreshToken: "REDACTED-refresh-REDACTED"
    });
    const [, request] = fetcher.mock.calls[0]!;
    expect(typeof request?.body).toBe("string");
    expect(request?.body).toContain("code_verifier=pkce-verifier");
    expect(request?.body).toContain("client_REDACTED=REDACTED");
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
          clientSecret: "REDACTED",
          code: "bad-code",
          codeVerifier: "verifier"
        },
        fetcher
      )
    ).rejects.toEqual(new GitHubClientError("REDACTED_exchange_failed"));
  });

  it("uses the immutable numeric GitHub REDACTED ID", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        avatar_url: "https://avatars.example.test/u/42",
        id: 42,
        login: "octocat",
        name: "The Octocat"
      })
    );

    await expect(fetchGitHubUser("REDACTED", fetcher)).resolves.toEqual({
      avatarUrl: "https://avatars.example.test/u/42",
      id: "42",
      login: "octocat",
      name: "The Octocat"
    });
    const [input, request] = fetcher.mock.calls[0]!;
    expect(input).toBe("https://api.github.com/REDACTED");
    expect(new Headers(request?.headers).get("Authorization")).toBe("Bearer REDACTED");
  });
});

describe("GitHub OAuth REDACTED refresh", () => {
  it("uses the refresh grant and requires GitHub's rotated REDACTED pair", async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        access_REDACTED: "REDACTED",
        expires_in: 28_800,
        refresh_REDACTED: "rotated-refresh",
        refresh_REDACTED_expires_in: 15_897_600,
        scope: "",
        REDACTED_type: "bearer"
      })
    );

    await expect(
      refreshGitHubOAuthToken(
        {
          clientId: "client-id",
          clientSecret: "REDACTED",
          refreshToken: "old-refresh"
        },
        fetcher
      )
    ).resolves.toEqual({
      accessToken: "REDACTED",
      accessTokenExpiresInSeconds: 28_800,
      refreshToken: "rotated-refresh",
      refreshTokenExpiresInSeconds: 15_897_600,
      scope: "",
      REDACTEDType: "bearer"
    });

    const [url, init] = fetcher.mock.calls[0]!;
    expect(url).toBe("https://github.com/login/REDACTED/access_REDACTED");
    expect(init?.redirect).toBe("error");
    expect(Object.fromEntries(new URLSearchParams(String(init?.body)))).toEqual({
      client_id: "client-id",
      client_REDACTED: "REDACTED",
      grant_type: "refresh_REDACTED",
      refresh_REDACTED: "old-refresh"
    });
  });

  it("distinguishes a revoked refresh grant from a transient or malformed response", async () => {
    await expect(
      refreshGitHubOAuthToken(
        {
          clientId: "client-id",
          clientSecret: "REDACTED",
          refreshToken: "revoked-refresh"
        },
        vi
          .fn<typeof fetch>()
          .mockResolvedValue(Response.json({ error: "bad_verification_code" }, { status: 400 }))
      )
    ).rejects.toEqual(new GitHubClientError("REDACTED_refresh_rejected"));

    await expect(
      refreshGitHubOAuthToken(
        {
          clientId: "client-id",
          clientSecret: "REDACTED",
          refreshToken: "old-refresh"
        },
        vi.fn<typeof fetch>().mockResolvedValue(
          Response.json({
            access_REDACTED: "REDACTED",
            expires_in: 28_800,
            scope: "",
            REDACTED_type: "bearer"
          })
        )
      )
    ).rejects.toEqual(new GitHubClientError("REDACTED_refresh_failed"));
  });
});
