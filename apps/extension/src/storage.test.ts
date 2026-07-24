import { describe, expect, it } from "vitest";

import { DEVICE_CREDENTIAL_KEY, STATE_KEY } from "./model.js";
import { ExtensionStateStore, type Memento, type Secrets } from "./storage.js";

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
  it("stores only non-secret metadata in global state", async () => {
    const memento = new MemoryMemento();
    const secrets = new MemorySecrets();
    const store = new ExtensionStateStore(memento, secrets);
    const credential = "er_device_v1.credential.super-secret-value";

    await store.saveEnrollment(
      {
        deviceId: "device-1",
        expiresAtEpochSeconds: 500,
        workspaceId: "workspace-1"
      },
      credential
    );
    await store.saveProject({
      projectId: "project-1",
      projectName: "Fixture",
      repositoryPath: "/fixture"
    });
    await store.saveCapture({
      providerSurface: "Codex local hook",
      sessionId: "session-1",
      startedAtEpochSeconds: 100
    });

    expect(JSON.stringify(memento.values.get(STATE_KEY))).not.toContain(credential);
    expect(secrets.values.get(DEVICE_CREDENTIAL_KEY)).toBe(credential);
    expect(store.load().capture?.sessionId).toBe("session-1");
  });

  it("deletes both the credential and non-secret state on disconnect", async () => {
    const memento = new MemoryMemento();
    const secrets = new MemorySecrets();
    const store = new ExtensionStateStore(memento, secrets);
    await store.saveEnrollment(
      {
        deviceId: "device-1",
        expiresAtEpochSeconds: 500,
        workspaceId: "workspace-1"
      },
      "credential"
    );

    await store.clear();

    expect(await store.deviceCredential()).toBeUndefined();
    expect(store.load()).toEqual({ schemaVersion: 1 });
  });
});
