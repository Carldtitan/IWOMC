import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type * as vscode from "vscode";

import { activate, deactivate } from "./extension.js";
import { DEVICE_CREDENTIAL_KEY, STATE_KEY, type PersistentExtensionState } from "./model.js";
import { commands, testVscode, Uri } from "./test/vscode.js";
import type { ExtensionApiClient } from "./api-client.js";
import type { CompanionLaunchOptions, CompanionLifecycle } from "./companion/controller.js";

class FakeCompanion implements CompanionLifecycle {
  readonly launchOptions: CompanionLaunchOptions[] = [];
  running = false;
  stopCalls = 0;

  start(options: CompanionLaunchOptions): void {
    this.launchOptions.push(options);
    this.running = true;
  }

  stop(): Promise<void> {
    this.stopCalls += 1;
    this.running = false;
    return Promise.resolve();
  }
}

class ExtensionContextHarness {
  readonly context: vscode.ExtensionContext;
  readonly stateUpdates: unknown[] = [];
  readonly #secrets = new Map<string, string>();
  readonly #state = new Map<string, unknown>();

  constructor(initialState: PersistentExtensionState, credential?: string) {
    this.#state.set(STATE_KEY, initialState);
    if (credential !== undefined) {
      this.#secrets.set(DEVICE_CREDENTIAL_KEY, credential);
    }
    const extensionRoot = path.resolve("/test-extension");
    this.context = {
      asAbsolutePath: (relativePath: string) => path.resolve(extensionRoot, relativePath),
      globalState: {
        get: <T>(key: string): T | undefined => this.#state.get(key) as T | undefined,
        keys: () => [...this.#state.keys()],
        setKeysForSync: () => undefined,
        update: (key: string, value: unknown): Promise<void> => {
          this.stateUpdates.push(value);
          this.#state.set(key, value);
          return Promise.resolve();
        }
      },
      globalStorageUri: Uri.file(path.resolve("/test-storage")) as unknown as vscode.Uri,
      secrets: {
        delete: (key: string): Promise<void> => {
          this.#secrets.delete(key);
          return Promise.resolve();
        },
        get: (key: string): Promise<string | undefined> => Promise.resolve(this.#secrets.get(key)),
        onDidChange: () => ({ dispose: () => undefined }),
        store: (key: string, value: string): Promise<void> => {
          this.#secrets.set(key, value);
          return Promise.resolve();
        }
      },
      subscriptions: []
    } as unknown as vscode.ExtensionContext;
  }

  state(): PersistentExtensionState | undefined {
    return this.#state.get(STATE_KEY) as PersistentExtensionState | undefined;
  }
}

const apiClient: ExtensionApiClient = {
  beginSignIn: () => Promise.reject(new Error("Unexpected beginSignIn call.")),
  completeEnrollment: () => Promise.reject(new Error("Unexpected completeEnrollment call.")),
  createCheckpoint: () => Promise.reject(new Error("Unexpected createCheckpoint call.")),
  listProjects: () => Promise.reject(new Error("Unexpected listProjects call."))
};

describe("extension activation", () => {
  beforeEach(() => {
    testVscode.reset();
    testVscode.setWorkspaceFolder(path.resolve("/repository"));
  });

  afterEach(async () => {
    await deactivate();
  });

  it("activates through the VS Code surface and registers every contributed command", async () => {
    const harness = new ExtensionContextHarness({ schemaVersion: 1 });
    const companion = new FakeCompanion();

    activate(harness.context, { apiClient, companion, nowEpochSeconds: () => 100 });

    expect([...testVscode.commandHandlers.keys()].sort()).toEqual(
      [
        "environmentReconciler.connectWorkspace",
        "environmentReconciler.diagnoseCoverage",
        "environmentReconciler.disconnect",
        "environmentReconciler.linkProject",
        "environmentReconciler.openStatus",
        "environmentReconciler.openWebWorkspace",
        "environmentReconciler.scanNow",
        "environmentReconciler.startCapture",
        "environmentReconciler.stopCapture"
      ].sort()
    );
    expect(harness.context.subscriptions).toHaveLength(10);
    expect(testVscode.statusBarItems).toHaveLength(1);
    expect(testVscode.statusBarItems[0]).toMatchObject({
      command: "environmentReconciler.openStatus",
      name: "Environment Reconciler",
      shown: true,
      text: "$(plug) Reconciler: disconnected"
    });

    await deactivate();

    expect(companion.stopCalls).toBe(1);
  });

  it("treats modal consent denial as a no-op before provider selection or Companion launch", async () => {
    const initialState: PersistentExtensionState = {
      connection: {
        deviceId: "device-1",
        expiresAtEpochSeconds: 1_000,
        workspaceId: "workspace-1"
      },
      project: {
        projectId: "project-1",
        projectName: "Fixture",
        repositoryPath: path.resolve("/repository")
      },
      schemaVersion: 1
    };
    const harness = new ExtensionContextHarness(initialState, "device-credential");
    const companion = new FakeCompanion();
    testVscode.queueWarningResponse(undefined);
    activate(harness.context, { apiClient, companion, nowEpochSeconds: () => 100 });

    await commands.executeCommand("environmentReconciler.startCapture");

    expect(testVscode.warningMessages).toHaveLength(1);
    expect(testVscode.warningMessages[0]).toMatchObject({
      arguments: [{ modal: true }, "Start observation"]
    });
    expect(testVscode.quickPickCalls).toHaveLength(0);
    expect(companion.launchOptions).toHaveLength(0);
    expect(harness.stateUpdates).toHaveLength(0);
    expect(harness.state()).toEqual(initialState);
    expect(testVscode.statusBarItems[0]?.text).toBe("$(warning) Reconciler: coverage gap");
    expect(testVscode.errorMessages).toHaveLength(0);
  });
});
