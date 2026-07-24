import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type * as vscode from "vscode";

import { activate, deactivate } from "./extension.js";
import { DEVICE_CREDENTIAL_KEY, STATE_KEY, type PersistentExtensionState } from "./model.js";
import { commands, testVscode, Uri } from "./test/vscode.js";
import type { ExtensionApiClient } from "./api-client.js";
import type { CompanionLaunchOptions, CompanionLifecycle } from "./companion/controller.js";
import type {
  CompanionCheckpoint,
  CompanionObservation,
  CompanionStatus
} from "./companion/controller.js";
import type { CaptureCoverage } from "./coverage.js";

class FakeCompanion implements CompanionLifecycle {
  readonly launchOptions: CompanionLaunchOptions[] = [];
  running = false;
  stopCalls = 0;

  createCheckpoint(): Promise<CompanionCheckpoint> {
    return Promise.reject(new Error("Unexpected createCheckpoint call."));
  }

  start(options: CompanionLaunchOptions): void {
    this.launchOptions.push(options);
    this.running = true;
  }

  startObservation(): Promise<CompanionObservation> {
    return Promise.resolve({
      coverage: companionCoverage,
      sessionId: "session-from-companion",
      startedAtEpochSeconds: 123
    });
  }

  status(): Promise<CompanionStatus> {
    return Promise.resolve({ state: this.running ? "observing" : "ready" });
  }

  stop(): Promise<void> {
    this.stopCalls += 1;
    this.running = false;
    return Promise.resolve();
  }

  stopObservation(): Promise<CompanionCheckpoint> {
    return Promise.resolve({
      checkpointId: "checkpoint-from-companion",
      coverage: companionCoverage,
      createdAtEpochSeconds: 150,
      localSequence: 2,
      reason: "session_end",
      sessionId: "session-from-companion"
    });
  }
}

class ExtensionContextHarness {
  readonly context: vscode.ExtensionContext;
  readonly stateUpdates: unknown[] = [];
  readonly #REDACTEDs = new Map<string, string>();
  readonly #state = new Map<string, unknown>();

  constructor(initialState: PersistentExtensionState, REDACTED?: string) {
    this.#state.set(STATE_KEY, initialState);
    if (REDACTED !== undefined) {
      this.#REDACTEDs.set(DEVICE_CREDENTIAL_KEY, REDACTED);
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
      REDACTEDs: {
        delete: (key: string): Promise<void> => {
          this.#REDACTEDs.delete(key);
          return Promise.resolve();
        },
        get: (key: string): Promise<string | undefined> => Promise.resolve(this.#REDACTEDs.get(key)),
        onDidChange: () => ({ dispose: () => undefined }),
        store: (key: string, value: string): Promise<void> => {
          this.#REDACTEDs.set(key, value);
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
    const harness = new ExtensionContextHarness(initialState, "device-REDACTED");
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

  it("starts authenticated Companion observation and persists its session and coverage", async () => {
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
    const harness = new ExtensionContextHarness(initialState, "device-REDACTED");
    const companion = new FakeCompanion();
    testVscode.queueWarningResponse("Start observation");
    testVscode.queueQuickPickResponse("Codex local hook");
    activate(harness.context, { apiClient, companion, nowEpochSeconds: () => 100 });

    await commands.executeCommand("environmentReconciler.startCapture");

    expect(companion.launchOptions).toHaveLength(1);
    const launchIpc = companion.launchOptions[0]?.ipc;
    expect(launchIpc?.endpoint).toMatch(/^\\\\\.\\pipe\\environment-REDACTED-[a-f0-9]{32}$/u);
    expect(typeof launchIpc?.scopeId).toBe("string");
    expect(launchIpc?.REDACTED).toBeInstanceOf(REDACTED);
    expect(harness.state()?.capture).toEqual({
      coverage: companionCoverage,
      providerSurface: "Codex local hook",
      sessionId: "session-from-companion",
      startedAtEpochSeconds: 123
    });
  });
});

const companionCoverage: CaptureCoverage = {
  adapters: [
    {
      adapterId: "npm",
      condition: "covered",
      ecosystem: "javascript",
      gaps: [],
      supportLevel: "full_native"
    }
  ],
  generatedAtEpochSeconds: 123,
  permission: {
    condition: "covered",
    gaps: [],
    grantedCapabilities: ["repository_metadata"],
    profile: "repository_scoped"
  },
  provider: {
    capabilities: ["session_boundary"],
    condition: "covered",
    gaps: [],
    providerId: "codex",
    sessionBoundary: "automatic",
    surface: "Codex local hook"
  },
  realms: [
    {
      condition: "covered",
      gaps: [],
      label: "local extension host",
      realmId: "extension-host",
      realmKind: "host"
    }
  ],
  upload: { gaps: [], pendingBatches: 0, state: "online" }
};
