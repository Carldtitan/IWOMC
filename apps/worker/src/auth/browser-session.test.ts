import { describe, expect, it } from "vitest";

import {
  BrowserSessionError,
  BrowserSessionService,
  type BrowserSessionRecord,
  type BrowserSessionRepository
} from "./browser-session.js";

class MemoryBrowserSessionRepository implements BrowserSessionRepository {
  readonly sessions = new Map<string, BrowserSessionRecord>();

  create(record: BrowserSessionRecord): Promise<void> {
    this.sessions.set(record.sessionId, record);
    return Promise.resolve();
  }

  find(sessionId: string): Promise<BrowserSessionRecord | undefined> {
    return Promise.resolve(this.sessions.get(sessionId));
  }

  revoke(sessionId: string, revokedAtEpochSeconds: number): Promise<boolean> {
    const record = this.sessions.get(sessionId);
    if (record === undefined || record.revokedAtEpochSeconds !== undefined) {
      return Promise.resolve(false);
    }
    this.sessions.set(sessionId, { ...record, revokedAtEpochSeconds });
    return Promise.resolve(true);
  }
}

const secret = "browser-session-test-secret-with-at-least-thirty-two-characters";

describe("BrowserSessionService", () => {
  it("persists an expiring session and enforces its CSRF binding", async () => {
    const repository = new MemoryBrowserSessionRepository();
    const service = new BrowserSessionService(repository, secret);
    const issued = await service.create({
      lifetimeSeconds: 3_600,
      nowEpochSeconds: 1_000,
      userId: "github-user-1"
    });

    expect(repository.sessions.get(issued.session.sessionId)).toMatchObject({
      userId: "github-user-1"
    });
    await expect(
      service.authenticate({
        csrfToken: issued.csrfToken,
        nowEpochSeconds: 1_001,
        sealedSession: issued.sealedSession
      })
    ).resolves.toMatchObject({ userId: "github-user-1" });
    await expect(
      service.authenticate({
        csrfToken: "attacker-csrf",
        nowEpochSeconds: 1_001,
        sealedSession: issued.sealedSession
      })
    ).rejects.toEqual(new BrowserSessionError("csrf_mismatch"));
  });

  it("rejects deleted, tampered, expired, and revoked sessions", async () => {
    const repository = new MemoryBrowserSessionRepository();
    const service = new BrowserSessionService(repository, secret);
    const issued = await service.create({
      lifetimeSeconds: 60,
      nowEpochSeconds: 1_000,
      userId: "github-user-1"
    });

    await expect(
      service.authenticate({
        nowEpochSeconds: 1_001,
        sealedSession: `${issued.sealedSession}tampered`
      })
    ).rejects.toEqual(new BrowserSessionError("invalid"));
    await expect(
      service.authenticate({
        nowEpochSeconds: 1_061,
        sealedSession: issued.sealedSession
      })
    ).rejects.toEqual(new BrowserSessionError("expired"));
    await service.logout(issued.sealedSession, 1_050);
    await expect(
      service.authenticate({
        nowEpochSeconds: 1_051,
        sealedSession: issued.sealedSession
      })
    ).rejects.toEqual(new BrowserSessionError("revoked"));
    repository.sessions.clear();
    await expect(
      service.authenticate({
        nowEpochSeconds: 1_051,
        sealedSession: issued.sealedSession
      })
    ).rejects.toEqual(new BrowserSessionError("invalid"));
  });
});
