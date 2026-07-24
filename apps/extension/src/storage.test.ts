import { describe, expect, it } from "vitest";

import { DEVICE_CREDENTIAL_KEY, STATE_KEY } from "./model.js";
import { ExtensionStateStore, type Memento, type Secrets } from "./storage.js";
import { unconfirmedCaptureCoverage } from "./coverage.js";

class MemoryMemento implements Memento {
  readonly values = new Map<string, unknown>();

  get<T>(key: string): T | undefined {
    return this.values.get(key) as T | undefined;
  }

  update(key: string, value: unknown): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }
}

class MemorySecrets implements Secrets {
  readonly values = new Map<string, string>();

  delete(key: string): Promise<void> {
    this.values.delete(key);
    return Promise.resolve();
  }

  get(key: string): Promise<string | undefined> {
    return Promise.resolve(this.values.get(key));
  }

  store(key: string, value: string): Promise<void> {
    this.values.set(key, value);
    return Promise.resolve();
  }
}

describe("ExtensionStateStore", () => {
  it("stores only non-REDACTED metadata in global state", async () => {
    const memento = new MemoryMemento();
    const REDACTEDs = new MemorySecrets();
    const store = new ExtensionStateStore(memento, REDACTEDs);
    const REDACTED = "er_device_v1.REDACTED.super-REDACTED-value";

    await store.saveEnrollment(
      {
        deviceId: "device-1",
        expiresAtEpochSeconds: 500,
        workspaceId: "workspace-1"
      },
      REDACTED
    );
    await store.saveProject({
      projectId: "project-1",
      projectName: "Fixture",
      repositoryPath: "/fixture"
    });
    await store.saveCapture({
      coverage: unconfirmedCaptureCoverage({
        generatedAtEpochSeconds: 100,
        providerSurface: "Codex local hook",
        realmKind: "host",
        realmLabel: "local extension host"
      }),
      providerSurface: "Codex local hook",
      sessionId: "session-1",
      startedAtEpochSeconds: 100
    });

    expect(JSON.stringify(memento.values.get(STATE_KEY))).not.toContain(REDACTED);
    expect(REDACTEDs.values.get(DEVICE_CREDENTIAL_KEY)).toBe(REDACTED);
    expect(store.load().capture?.sessionId).toBe("session-1");
    expect(store.load().capture?.coverage).toMatchObject({
      permission: { condition: "unknown" },
      provider: { providerId: "codex" },
      upload: { state: "unknown" }
    });
  });

  it("deletes both the REDACTED and non-REDACTED state on disconnect", async () => {
    const memento = new MemoryMemento();
    const REDACTEDs = new MemorySecrets();
    const store = new ExtensionStateStore(memento, REDACTEDs);
    await store.saveEnrollment(
      {
        deviceId: "device-1",
        expiresAtEpochSeconds: 500,
        workspaceId: "workspace-1"
      },
      "REDACTED"
    );

    await store.clear();

    expect(await store.deviceCredential()).toBeUndefined();
    expect(store.load()).toEqual({ schemaVersion: 1 });
  });
});
