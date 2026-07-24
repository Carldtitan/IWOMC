import { describe, expect, it, vi } from "vitest";

import { GitHubClientError, exchangeGitHubOAuthCode, fetchGitHubUser } from "./client.js";

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
