import { describe, expect, it, vi } from "vitest";

import {
  GitHubCredentialError,
  GitHubUserCredentialService,
  encryptGitHubCredentials,
  type GitHubCredentialStore,
  type StoredGitHubCredential
} from "./credential-lifecycle.js";

const encryptionKey = "github-credential-encryption-key-with-at-least-32-characters";

class MemoryCredentialStore implements GitHubCredentialStore {
  credential: StoredGitHubCredential | undefined;
  leaseAvailable = true;
  revoked = false;

  findCredential(): Promise<StoredGitHubCredential | undefined> {
    return Promise.resolve(this.credential);
  }

  tryAcquireRefreshLease(input: {
    readonly leaseExpiresAtEpochSeconds: number;
    readonly leaseId: string;
  }): Promise<boolean> {
    if (!this.leaseAvailable || this.credential === undefined) {
      return Promise.resolve(false);
    }
    this.credential = {
      ...this.credential,
      refreshLeaseExpiresAtEpochSeconds: input.leaseExpiresAtEpochSeconds,
      refreshLeaseId: input.leaseId
    };
    return Promise.resolve(true);
  }

  completeRefresh(input: {
    readonly encryptedCredentials: string;
    readonly leaseId: string;
    readonly tokenExpiresAtEpochSeconds: number;
    readonly updatedAtEpochSeconds: number;
  }): Promise<boolean> {
    if (this.credential?.refreshLeaseId !== input.leaseId) {
      return Promise.resolve(false);
    }
    this.credential = {
      ...this.credential,
      encryptedCredentials: input.encryptedCredentials,
      tokenExpiresAtEpochSeconds: input.tokenExpiresAtEpochSeconds
    };
    return Promise.resolve(true);
  }

  releaseRefreshLease(): Promise<void> {
    if (this.credential !== undefined) {
      const {
        refreshLeaseExpiresAtEpochSeconds: _expires,
        refreshLeaseId: _id,
        ...credential
      } = this.credential;
      this.credential = credential;
    }
    return Promise.resolve();
  }

  revokeCredentialAndSessions(input: { readonly revokedAtEpochSeconds: number }): Promise<void> {
    this.revoked = true;
    if (this.credential !== undefined) {
      this.credential = {
        ...this.credential,
        revokedAtEpochSeconds: input.revokedAtEpochSeconds
      };
    }
    return Promise.resolve();
  }
}

async function storedCredential(input: {
  readonly accessLifetimeSeconds?: number;
  readonly refreshLifetimeSeconds?: number;
  readonly refreshToken?: string;
}): Promise<StoredGitHubCredential> {
  return {
    encryptedCredentials: await encryptGitHubCredentials({
      encryptionKey,
      githubUserId: "123",
      issuedAtEpochSeconds: 1_000,
      tokens: {
        accessToken: "original-access",
        ...(input.accessLifetimeSeconds === undefined
          ? {}
          : { accessTokenExpiresInSeconds: input.accessLifetimeSeconds }),
        ...(input.refreshToken === undefined ? {} : { refreshToken: input.refreshToken }),
        ...(input.refreshLifetimeSeconds === undefined
          ? {}
          : { refreshTokenExpiresInSeconds: input.refreshLifetimeSeconds }),
        scope: "",
        tokenType: "bearer"
      }
    }),
    githubUserId: "123",
    ...(input.accessLifetimeSeconds === undefined
      ? {}
      : { tokenExpiresAtEpochSeconds: 1_000 + input.accessLifetimeSeconds }),
    userId: "00000000-0000-4000-8000-000000000123"
  };
}

describe("GitHubUserCredentialService", () => {
  it("returns an unexpired token without contacting GitHub", async () => {
    const store = new MemoryCredentialStore();
    store.credential = await storedCredential({
      accessLifetimeSeconds: 3_600,
      refreshLifetimeSeconds: 7_200,
      refreshToken: "original-refresh"
    });
    const fetcher = vi.fn<typeof fetch>();

    await expect(
      new GitHubUserCredentialService(
        {
          clientId: "client-id",
          clientSecret: "client-secret",
          encryptionKey,
          store
        },
        { fetcher }
      ).accessToken({ nowEpochSeconds: 1_100, userId: store.credential.userId })
    ).resolves.toBe("original-access");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("rotates and durably replaces an expiring access and refresh token pair", async () => {
    const store = new MemoryCredentialStore();
    store.credential = await storedCredential({
      accessLifetimeSeconds: 300,
      refreshLifetimeSeconds: 7_200,
      refreshToken: "original-refresh"
    });
    const oldEnvelope = store.credential.encryptedCredentials;
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      Response.json({
        access_token: "rotated-access",
        expires_in: 3_600,
        refresh_token: "rotated-refresh",
        refresh_token_expires_in: 10_800,
        scope: "",
        token_type: "bearer"
      })
    );

    await expect(
      new GitHubUserCredentialService(
        {
          clientId: "client-id",
          clientSecret: "client-secret",
          encryptionKey,
          store
        },
        { fetcher, refreshLeewaySeconds: 60 }
      ).accessToken({ nowEpochSeconds: 1_250, userId: store.credential.userId })
    ).resolves.toBe("rotated-access");

    expect(store.credential.encryptedCredentials).not.toBe(oldEnvelope);
    expect(store.credential.encryptedCredentials).not.toContain("rotated-access");
    expect(store.credential.tokenExpiresAtEpochSeconds).toBe(4_850);
    expect(store.revoked).toBe(false);
  });

  it("revokes credentials and product sessions after GitHub rejects the refresh grant", async () => {
    const store = new MemoryCredentialStore();
    store.credential = await storedCredential({
      accessLifetimeSeconds: 60,
      refreshLifetimeSeconds: 7_200,
      refreshToken: "revoked-refresh"
    });
    const service = new GitHubUserCredentialService(
      {
        clientId: "client-id",
        clientSecret: "client-secret",
        encryptionKey,
        store
      },
      {
        fetcher: vi
          .fn<typeof fetch>()
          .mockResolvedValue(Response.json({ error: "bad_verification_code" }, { status: 400 })),
        refreshLeewaySeconds: 0
      }
    );

    await expect(
      service.accessToken({ nowEpochSeconds: 1_100, userId: store.credential.userId })
    ).rejects.toEqual(new GitHubCredentialError("reauthorization_required"));
    expect(store.revoked).toBe(true);
  });

  it("does not race a second refresh while another request holds the lease", async () => {
    const store = new MemoryCredentialStore();
    store.credential = await storedCredential({
      accessLifetimeSeconds: 60,
      refreshLifetimeSeconds: 7_200,
      refreshToken: "original-refresh"
    });
    store.leaseAvailable = false;

    await expect(
      new GitHubUserCredentialService(
        {
          clientId: "client-id",
          clientSecret: "client-secret",
          encryptionKey,
          store
        },
        { refreshLeewaySeconds: 0 }
      ).accessToken({ nowEpochSeconds: 1_100, userId: store.credential.userId })
    ).rejects.toEqual(new GitHubCredentialError("refresh_in_progress"));
  });
});
