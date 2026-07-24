import { describe, expect, it, vi } from "vitest";

import { GitHubRepositoryError } from "./errors.js";
import { GitHubAppInstallationTokenBroker } from "./token.js";

describe("GitHubAppInstallationTokenBroker", () => {
  it.each([
    ["contents_read", { contents: "read" }],
    ["contents_write", { contents: "write" }],
    ["pull_requests_write", { pull_requests: "write" }]
  ] as const)(
    "requests one repository with only the %s permission",
    async (purpose, expectedPermissions) => {
      const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
        Response.json(
          {
            token: `issued-${purpose}-token`,
            expires_at: "2999-01-01T00:00:00Z"
          },
          { status: 201 }
        )
      );
      const broker = new GitHubAppInstallationTokenBroker(
        {
          getAppJwt: () => Promise.resolve("app-jwt-secret")
        },
        fetcher
      );

      await expect(
        broker.issueRepositoryCredential({
          installationId: "41",
          repositoryId: "73",
          purpose
        })
      ).resolves.toEqual({
        token: `issued-${purpose}-token`,
        expiresAt: "2999-01-01T00:00:00Z"
      });

      expect(fetcher).toHaveBeenCalledTimes(1);
      const [input, init] = fetcher.mock.calls[0]!;
      expect(input).toBe("https://api.github.com/app/installations/41/access_tokens");
      expect(init?.method).toBe("POST");
      expect(init?.redirect).toBe("error");
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer app-jwt-secret");
      if (typeof init?.body !== "string") {
        throw new TypeError("expected a JSON string request body");
      }
      expect(JSON.parse(init.body) as unknown).toEqual({
        repository_ids: [73],
        permissions: expectedPermissions
      });
    }
  );

  it("uses a safe typed error without attaching provider credentials or response content", async () => {
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(
        Response.json(
          { message: "provider leaked app-jwt-secret and installation token" },
          { status: 403 }
        )
      );
    const broker = new GitHubAppInstallationTokenBroker(
      {
        getAppJwt: () => Promise.resolve("app-jwt-secret")
      },
      fetcher
    );

    const error = await broker
      .issueRepositoryCredential({
        installationId: "41",
        repositoryId: "73",
        purpose: "contents_read"
      })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(GitHubRepositoryError);
    expect(error).toMatchObject({ code: "token_issue_failed" });
    expect(String(error)).not.toContain("app-jwt-secret");
    expect(String(error)).not.toContain("provider leaked");
  });
});
