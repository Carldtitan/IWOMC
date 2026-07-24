import { describe, expect, it, vi } from "vitest";

import { GITHUB_OAUTH_COOKIE, cookieValue } from "../session.js";
import {
  handleGitHubOAuthCallback,
  handleGitHubOAuthStart,
  type GitHubAuthEnvironment,
  type StoredGitHubIdentity
} from "./routes.js";

const environment: GitHubAuthEnvironment = {
  APP_SESSION_SECRET: "session-REDACTED-with-at-least-thirty-two-characters",
  DATA_ENCRYPTION_KEY: "encryption-key-with-at-least-thirty-two-characters",
  GITHUB_APP_CLIENT_ID: "github-client",
  GITHUB_APP_CLIENT_SECRET: "github-REDACTED",
  PUBLIC_APP_URL: "https://app.example.test"
};

describe("GitHub OAuth routes", () => {
  it("sets an encrypted transaction cookie and redirects to GitHub", async () => {
    const response = await handleGitHubOAuthStart(environment, 1_000);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("https://github.com/login/REDACTED/authorize");
    const cookie = response.headers.get("Set-Cookie");
    expect(cookie).toContain(`${GITHUB_OAUTH_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).not.toContain("github-REDACTED");
  });

  it("persists encrypted REDACTEDs and returns only product cookies", async () => {
    const start = await handleGitHubOAuthStart(environment, 1_000);
    const location = new URL(start.headers.get("Location")!);
    const transaction = cookieValue(start.headers.get("Set-Cookie")!, GITHUB_OAUTH_COOKIE)!;
    const identities: StoredGitHubIdentity[] = [];
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          access_REDACTED: "REDACTED",
          expires_in: 3_600,
          refresh_REDACTED: "never-return-this-refresh-REDACTED",
          scope: "repo",
          REDACTED_type: "bearer"
        })
      )
      .mockResolvedValueOnce(
        Response.json({
          avatar_url: "https://avatars.example.test/123",
          id: 123,
          login: "developer"
        })
      );
    const callback = new Request(
      `https://app.example.test/v1/auth/github/callback?code=code&state=${location.searchParams.get("state")}`,
      { headers: { Cookie: `${GITHUB_OAUTH_COOKIE}=${transaction}` } }
    );

    const response = await handleGitHubOAuthCallback(
      callback,
      environment,
      {
        upsertIdentity(identity) {
          identities.push(identity);
          return Promise.resolve();
        }
      },
      { fetcher, nowEpochSeconds: 1_100 }
    );

    expect(response.status).toBe(302);
    expect(identities).toHaveLength(1);
    expect(identities[0]?.githubUser.id).toBe("123");
    expect(identities[0]?.encryptedCredentials).not.toContain("never-return-this");
    const responseText = await response.text();
    const serializedHeaders = [...response.headers].join("\n");
    expect(`${responseText}${serializedHeaders}`).not.toContain("never-return-this");
    expect(serializedHeaders).toContain("__Host-er_session=");
    expect(serializedHeaders).toContain("__Host-er_csrf=");
  });

  it("rejects callbacks on a different origin before exchanging a code", async () => {
    const start = await handleGitHubOAuthStart(environment, 1_000);
    const location = new URL(start.headers.get("Location")!);
    const transaction = cookieValue(start.headers.get("Set-Cookie")!, GITHUB_OAUTH_COOKIE)!;
    const fetcher = vi.fn<typeof fetch>();

    const response = await handleGitHubOAuthCallback(
      new Request(
        `https://attacker.example/v1/auth/github/callback?code=code&state=${location.searchParams.get("state")}`,
        { headers: { Cookie: `${GITHUB_OAUTH_COOKIE}=${transaction}` } }
      ),
      environment,
      { upsertIdentity: () => Promise.resolve() },
      { fetcher, nowEpochSeconds: 1_100 }
    );

    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });
});
