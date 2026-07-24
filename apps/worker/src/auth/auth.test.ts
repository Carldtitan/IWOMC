import { describe, expect, it } from "vitest";

import {
  DeviceEnrollmentService,
  type DeviceEnrollmentError,
  type DeviceEnrollmentRecord,
  type DeviceEnrollmentRepository
} from "../api/device-enrollments/service.js";
import { openJson, sealJson } from "../security/crypto.js";
import { beginGitHubOAuth, completeGitHubOAuth, type GitHubOAuthError } from "./github/oauth.js";
import {
  PRODUCT_SESSION_COOKIE,
  cookieValue,
  issueProductSession,
  secureCookie,
  verifyCsrf,
  verifyProductSession
} from "./session.js";

const sessionSecret = "test-only-session-secret-with-more-than-thirty-two-characters";

class MemoryEnrollmentRepository implements DeviceEnrollmentRepository {
  readonly records = new Map<string, DeviceEnrollmentRecord>();

  create(record: DeviceEnrollmentRecord): Promise<void> {
    if (this.records.has(record.enrollmentId)) {
      throw new Error("duplicate enrollment");
    }
    this.records.set(record.enrollmentId, record);
    return Promise.resolve();
  }

  find(enrollmentId: string): Promise<DeviceEnrollmentRecord | undefined> {
    return Promise.resolve(this.records.get(enrollmentId));
  }

  consume(enrollmentId: string, consumedAtEpochSeconds: number): Promise<boolean> {
    const current = this.records.get(enrollmentId);
    if (current === undefined || current.consumedAtEpochSeconds !== undefined) {
      return Promise.resolve(false);
    }
    this.records.set(enrollmentId, { ...current, consumedAtEpochSeconds });
    return Promise.resolve(true);
  }
}

describe("Worker authentication security primitives", () => {
  it("seals payloads with purpose-bound authenticated encryption", async () => {
    const sealed = await sealJson({ userId: "user-1" }, sessionSecret, "test/purpose-a");

    await expect(openJson(sealed, sessionSecret, "test/purpose-a")).resolves.toEqual({
      userId: "user-1"
    });
    await expect(openJson(sealed, sessionSecret, "test/purpose-b")).rejects.toThrow(
      "invalid sealed payload"
    );
    const [, nonce, ciphertext] = sealed.split(".");
    const tamperedCiphertext = `${ciphertext!.startsWith("A") ? "B" : "A"}${ciphertext!.slice(1)}`;
    await expect(
      openJson(`v1.${nonce}.${tamperedCiphertext}`, sessionSecret, "test/purpose-a")
    ).rejects.toThrow("invalid sealed payload");
  });

  it("creates and validates GitHub OAuth state, PKCE, expiry, and exact callback binding", async () => {
    const configuration = {
      clientId: "github-client-id",
      callbackUrl: "https://app.example.test/v1/auth/github/callback",
      sessionSecret
    };
    const started = await beginGitHubOAuth(configuration, 1_000);
    const url = new URL(started.authorizationUrl);

    expect(url.origin).toBe("https://github.com");
    expect(url.searchParams.get("state")).toBe(started.state);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
    expect(url.searchParams.get("code_challenge")).not.toBeNull();
    expect(started.sealedTransaction).not.toContain(started.state);

    const completed = await completeGitHubOAuth(
      configuration,
      {
        callbackUrl: configuration.callbackUrl,
        sealedTransaction: started.sealedTransaction,
        state: started.state
      },
      1_100
    );
    expect(typeof completed.codeVerifier).toBe("string");

    await expect(
      completeGitHubOAuth(
        configuration,
        {
          callbackUrl: configuration.callbackUrl,
          sealedTransaction: started.sealedTransaction,
          state: "attacker-state"
        },
        1_100
      )
    ).rejects.toMatchObject({ code: "invalid_state" } satisfies Partial<GitHubOAuthError>);
    await expect(
      completeGitHubOAuth(
        configuration,
        {
          callbackUrl: "https://attacker.example/callback",
          sealedTransaction: started.sealedTransaction,
          state: started.state
        },
        1_100
      )
    ).rejects.toMatchObject({ code: "invalid_callback" } satisfies Partial<GitHubOAuthError>);
    await expect(
      completeGitHubOAuth(
        configuration,
        {
          callbackUrl: configuration.callbackUrl,
          sealedTransaction: started.sealedTransaction,
          state: started.state
        },
        1_601
      )
    ).rejects.toMatchObject({ code: "expired_transaction" } satisfies Partial<GitHubOAuthError>);
  });

  it("issues expiring HttpOnly product sessions with CSRF binding", async () => {
    const issued = await issueProductSession({
      lifetimeSeconds: 3_600,
      nowEpochSeconds: 10_000,
      sessionSecret,
      userId: "github-user-1"
    });
    const cookie = secureCookie(PRODUCT_SESSION_COOKIE, issued.sealedSession, 3_600);

    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookieValue(cookie, PRODUCT_SESSION_COOKIE)).toBe(issued.sealedSession);

    const verified = await verifyProductSession(issued.sealedSession, sessionSecret, 10_001);
    await expect(verifyCsrf(verified, issued.csrfToken)).resolves.toBe(true);
    await expect(verifyCsrf(verified, "wrong-csrf-token")).resolves.toBe(false);
    await expect(verifyProductSession(issued.sealedSession, sessionSecret, 13_601)).rejects.toThrow(
      "expired product session"
    );
  });

  it("creates short-lived workspace-bound enrollment codes that are single use", async () => {
    const repository = new MemoryEnrollmentRepository();
    const service = new DeviceEnrollmentService(repository);
    const created = await service.create({
      devicePublicKey: "ed25519-public-key-material-for-device-0001",
      lifetimeSeconds: 300,
      nowEpochSeconds: 2_000,
      workspaceId: "workspace-1"
    });
    const stored = await repository.find(created.enrollmentId);

    expect(stored?.workspaceId).toBe("workspace-1");
    expect(stored?.codeDigest).not.toContain(created.code);
    await expect(
      service.consume({
        code: created.code,
        devicePublicKey: "ed25519-public-key-material-for-device-0001",
        enrollmentId: created.enrollmentId,
        nowEpochSeconds: 2_100
      })
    ).resolves.toMatchObject({ workspaceId: "workspace-1", consumedAtEpochSeconds: 2_100 });
    await expect(
      service.consume({
        code: created.code,
        devicePublicKey: "ed25519-public-key-material-for-device-0001",
        enrollmentId: created.enrollmentId,
        nowEpochSeconds: 2_101
      })
    ).rejects.toMatchObject({
      code: "already_consumed"
    } satisfies Partial<DeviceEnrollmentError>);
  });

  it("rejects expired enrollment codes without consuming them", async () => {
    const repository = new MemoryEnrollmentRepository();
    const service = new DeviceEnrollmentService(repository);
    const created = await service.create({
      devicePublicKey: "ed25519-public-key-material-for-device-0002",
      lifetimeSeconds: 60,
      nowEpochSeconds: 3_000,
      workspaceId: "workspace-2"
    });

    await expect(
      service.consume({
        code: created.code,
        devicePublicKey: "ed25519-public-key-material-for-device-0002",
        enrollmentId: created.enrollmentId,
        nowEpochSeconds: 3_061
      })
    ).rejects.toMatchObject({ code: "expired" } satisfies Partial<DeviceEnrollmentError>);
    expect((await repository.find(created.enrollmentId))?.consumedAtEpochSeconds).toBeUndefined();
  });
});
