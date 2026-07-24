import { describe, expect, it, vi } from "vitest";

import {
  CSRF_COOKIE,
  GITHUB_OAUTH_COOKIE,
  PRODUCT_SESSION_COOKIE,
  cookieValue
} from "../session.js";
import {
  handleGitHubOAuthCallback,
  handleGitHubLogout,
  handleGitHubOAuthStart,
  type GitHubAuthEnvironment,
  type StoredGitHubIdentity
} from "./routes.js";
import type { BrowserSessionRecord } from "../browser-session.js";

const environment: GitHubAuthEnvironment = {
  APP_SESSION_SECRET: "session-secret-with-at-least-thirty-two-characters",
  DATA_ENCRYPTION_KEY: "encryption-key-with-at-least-thirty-two-characters",
  GITHUB_APP_CLIENT_ID: "github-client",
  GITHUB_APP_CLIENT_SECRET: "github-secret",
  PUBLIC_APP_URL: "https://app.example.test"
};

describe("GitHub OAuth routes", () => {
  it("sets an encrypted transaction cookie and redirects to GitHub", async () => {
    const response = await handleGitHubOAuthStart(environment, 1_000);

    expect(response.status).toBe(302);
    expect(response.headers.get("Location")).toContain("https://github.com/login/oauth/authorize");
    const cookie = response.headers.get("Set-Cookie");
    expect(cookie).toContain(`${GITHUB_OAUTH_COOKIE}=`);
    expect(cookie).toContain("HttpOnly");
    expect(cookie).not.toContain("github-secret");
  });

  it("persists encrypted credentials and returns only product cookies", async () => {
    const start = await handleGitHubOAuthStart(environment, 1_000);
    const location = new URL(start.headers.get("Location")!);
    const transaction = cookieValue(start.headers.get("Set-Cookie")!, GITHUB_OAUTH_COOKIE)!;
    const identities: StoredGitHubIdentity[] = [];
    const sessions = new Map<string, BrowserSessionRecord>();
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        Response.json({
          access_token: "never-return-this-access-token",
          expires_in: 3_600,
          refresh_token: "never-return-this-refresh-token",
          scope: "repo",
          token_type: "bearer"
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
        create(record) {
          sessions.set(record.sessionId, record);
          return Promise.resolve();
        },
        find(sessionId) {
          return Promise.resolve(sessions.get(sessionId));
        },
        revoke() {
          return Promise.resolve(false);
        },
        upsertIdentity(identity) {
          identities.push(identity);
          return Promise.resolve("00000000-0000-4000-8000-000000000123");
        }
      },
      { fetcher, nowEpochSeconds: 1_100 }
    );

    expect(response.status).toBe(302);
    expect(identities).toHaveLength(1);
    expect(identities[0]?.githubUser.id).toBe("123");
    expect(identities[0]?.encryptedCredentials).not.toContain("never-return-this");
    expect(sessions.size).toBe(1);
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
      {
        create: () => Promise.resolve(),
        find: () => Promise.resolve(undefined),
        revoke: () => Promise.resolve(false),
        upsertIdentity: () => Promise.resolve("00000000-0000-4000-8000-000000000123")
      },
      { fetcher, nowEpochSeconds: 1_100 }
    );

    expect(response.status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("requires the double-submit CSRF token and revokes the server-side session on logout", async () => {
    const start = await handleGitHubOAuthStart(environment, 1_000);
    const location = new URL(start.headers.get("Location")!);
    const transaction = cookieValue(start.headers.get("Set-Cookie")!, GITHUB_OAUTH_COOKIE)!;
    const sessions = new Map<string, BrowserSessionRecord>();
    const store = {
      create(record: BrowserSessionRecord) {
        sessions.set(record.sessionId, record);
        return Promise.resolve();
      },
      find(sessionId: string) {
        return Promise.resolve(sessions.get(sessionId));
      },
      revoke(sessionId: string, revokedAtEpochSeconds: number) {
        const current = sessions.get(sessionId);
        if (current === undefined || current.revokedAtEpochSeconds !== undefined) {
          return Promise.resolve(false);
        }
        sessions.set(sessionId, { ...current, revokedAtEpochSeconds });
        return Promise.resolve(true);
      },
      upsertIdentity() {
        return Promise.resolve("00000000-0000-4000-8000-000000000123");
      }
    };
    const callback = await handleGitHubOAuthCallback(
      new Request(
        `https://app.example.test/v1/auth/github/callback?code=code&state=${location.searchParams.get("state")}`,
        { headers: { Cookie: `${GITHUB_OAUTH_COOKIE}=${transaction}` } }
      ),
      environment,
      store,
      {
        fetcher: vi
          .fn<typeof fetch>()
          .mockResolvedValueOnce(
            Response.json({
              access_token: "access-token",
              scope: "repo",
              token_type: "bearer"
            })
          )
          .mockResolvedValueOnce(
            Response.json({
              avatar_url: "https://avatars.example.test/123",
              id: 123,
              login: "developer"
            })
          ),
        nowEpochSeconds: 1_100
      }
    );
    const setCookies = callback.headers.getSetCookie();
    const session = cookieValue(
      setCookies.find((value) => value.startsWith(`${PRODUCT_SESSION_COOKIE}=`)),
      PRODUCT_SESSION_COOKIE
    );
    const csrf = cookieValue(
      setCookies.find((value) => value.startsWith(`${CSRF_COOKIE}=`)),
      CSRF_COOKIE
    );
    if (session === undefined || csrf === undefined) {
      throw new Error("expected callback session and CSRF cookies");
    }
    const cookieHeader = `${PRODUCT_SESSION_COOKIE}=${session}; ${CSRF_COOKIE}=${csrf}`;

    const rejected = await handleGitHubLogout(
      new Request("https://app.example.test/v1/auth/logout", {
        headers: { Cookie: cookieHeader, "X-CSRF-Token": "attacker" },
        method: "POST"
      }),
      environment,
      store,
      1_200
    );
    expect(rejected.status).toBe(403);
    expect([...sessions.values()][0]?.revokedAtEpochSeconds).toBeUndefined();

    const response = await handleGitHubLogout(
      new Request("https://app.example.test/v1/auth/logout", {
        headers: { Cookie: cookieHeader, "X-CSRF-Token": csrf },
        method: "POST"
      }),
      environment,
      store,
      1_200
    );
    expect(response.status).toBe(204);
    expect([...sessions.values()][0]?.revokedAtEpochSeconds).toBe(1_200);
    expect(response.headers.getSetCookie().join("\n")).toContain(
      `${PRODUCT_SESSION_COOKIE}=; Path=/; Max-Age=0`
    );
  });
});
