import { randomBytes, randomUUID } from "node:crypto";
import * as path from "node:path";
import * as vscode from "vscode";

import {
  HttpExtensionApiClient,
  type ExtensionApiClient,
  type ProjectSummary
} from "./api-client.js";
import {
  CompanionController,
  type CompanionLaunchOptions,
  type CompanionLifecycle
} from "./companion/controller.js";
import { deriveCompanionEndpoint } from "./companion/ipc.js";
import {
  isEnrollmentExpired,
  statusForState,
  type ExtensionStatus,
  type PersistentExtensionState
} from "./model.js";
import { ExtensionStateStore } from "./storage.js";
import { assessCoverage, formatCoverageReport } from "./coverage.js";

const commandIds = {
  connectWorkspace: "environmentReconciler.connectWorkspace",
  diagnoseCoverage: "environmentReconciler.diagnoseCoverage",
  disconnect: "environmentReconciler.disconnect",
  linkProject: "environmentReconciler.linkProject",
  openStatus: "environmentReconciler.openStatus",
  openWebWorkspace: "environmentReconciler.openWebWorkspace",
  scanNow: "environmentReconciler.scanNow",
  startCapture: "environmentReconciler.startCapture",
  stopCapture: "environmentReconciler.stopCapture"
} as const;

const statusPresentation: Record<
  ExtensionStatus,
  { readonly icon: string; readonly label: string; readonly tooltip: string }
> = {
  disconnected: {
    icon: "plug",
    label: "disconnected",
    tooltip: "Connect and link this repository before observation can begin."
  },
  observing: {
    icon: "record",
    label: "observing",
    tooltip: "Observing this repository within the currently reported coverage."
  },
  offline_buffering: {
    icon: "cloud-upload",
    label: "offline · buffering",
    tooltip:
      "Cloud upload is unavailable. Redacted evidence may be buffering locally; diagnose coverage for the reported count."
  },
  capture_gap: {
    icon: "warning",
    label: "coverage gap",
    tooltip:
      "Observation is paused or at least one provider, realm, permission, upload, or adapter dimension is incomplete."
  },
  finding: {
    icon: "issues",
    label: "finding",
    tooltip: "A finding is ready for review."
  },
  validating: {
    icon: "loading~spin",
    label: "validating",
    tooltip: "A candidate is being validated."
  },
  verified: {
    icon: "verified",
    label: "verified within coverage",
    tooltip: "The latest result is verified only within its named capture coverage."
  },
  error: {
    icon: "error",
    label: "error",
    tooltip: "Environment Reconciler needs attention."
  }
};

export interface ActivationDependencies {
  readonly apiClient?: ExtensionApiClient;
  readonly companion?: CompanionLifecycle;
  readonly nowEpochSeconds?: () => number;
}

export class ExtensionRuntime {
  readonly #apiClient: ExtensionApiClient;
  readonly #companion: CompanionLifecycle;
  readonly #context: vscode.ExtensionContext;
  readonly #nowEpochSeconds: () => number;
  readonly #status: vscode.StatusBarItem;
  readonly #store: ExtensionStateStore;

  constructor(context: vscode.ExtensionContext, dependencies: ActivationDependencies = {}) {
    this.#context = context;
    this.#store = new ExtensionStateStore(context.globalState, context.REDACTEDs);
    this.#companion = dependencies.companion ?? new CompanionController();
    this.#nowEpochSeconds = dependencies.nowEpochSeconds ?? (() => Math.floor(Date.now() / 1_000));
    const serviceUrl = vscode.workspace
      .getConfiguration("environmentReconciler")
      .get<string>("serviceUrl", "http://localhost:8787");
    this.#apiClient = dependencies.apiClient ?? new HttpExtensionApiClient(serviceUrl);
    this.#status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20);
    this.#status.name = "Environment Reconciler";
    this.#status.command = commandIds.openStatus;
    this.#status.show();

    context.subscriptions.push(
      this.#status,
      this.#register(commandIds.connectWorkspace, () => this.#connectWorkspace()),
      this.#register(commandIds.diagnoseCoverage, () => this.#diagnoseCoverage()),
      this.#register(commandIds.linkProject, () => this.#linkProject()),
      this.#register(commandIds.startCapture, () => this.#startCapture()),
      this.#register(commandIds.stopCapture, () => this.#stopCapture()),
      this.#register(commandIds.scanNow, () => this.#scanNow()),
      this.#register(commandIds.openStatus, () => this.#openStatus()),
      this.#register(commandIds.openWebWorkspace, () => this.#openWebWorkspace()),
      this.#register(commandIds.disconnect, () => this.#disconnect())
    );
    const savedState = this.#store.load();
    if (savedState.capture !== undefined && !this.#companion.running) {
      void this.#store.saveCapture(undefined).then(() => {
        this.#setStatus("capture_gap");
      });
    } else {
      this.#refreshStatus();
    }
  }

  async dispose(): Promise<void> {
    await this.#companion.stop();
  }

  #register(command: string, action: () => Promise<void>): vscode.Disposable {
    return vscode.commands.registerCommand(command, async () => {
      try {
        await action();
      } catch (error) {
        this.#setStatus("error");
        const message =
          error instanceof Error ? error.message : "Environment Reconciler could not continue.";
        await vscode.window.showErrorMessage(message);
      }
    });
  }

  async #connectWorkspace(): Promise<void> {
    const repositoryPath = this.#repositoryPath();
    const enrolled = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Starting secure Environment Reconciler sign-in"
      },
      async () => {
        const signIn = await this.#apiClient.beginSignIn({ repositoryPath });
        await vscode.env.openExternal(vscode.Uri.parse(signIn.signInUrl, true));
        const code = await vscode.window.showInputBox({
          ignoreFocusOut: true,
          placeHolder: "One-time enrollment code",
          prompt: "Finish sign-in in your browser, then paste the one-time enrollment code."
        });
        if (code === undefined) {
          return false;
        }
        const enrollment = await this.#apiClient.completeEnrollment({
          code: code.trim(),
          enrollmentId: signIn.enrollmentId
        });
        await this.#store.saveEnrollment(
          {
            deviceId: enrollment.deviceId,
            expiresAtEpochSeconds: enrollment.expiresAtEpochSeconds,
            workspaceId: enrollment.workspaceId
          },
          enrollment.REDACTED
        );
        return true;
      }
    );
    if (!enrolled) {
      return;
    }
    this.#refreshStatus();
    const selection = await vscode.window.showInformationMessage(
      "Device enrolled. Link this repository to a project to continue.",
      "Link project"
    );
    if (selection === "Link project") {
      await this.#linkProject();
    }
  }

  async #linkProject(): Promise<void> {
    const state = this.#requireConnection();
    const REDACTED = await this.#requireCredential();
    const repositoryPath = this.#repositoryPath();
    const projects = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Loading Environment Reconciler projects"
      },
      () =>
        this.#apiClient.listProjects({
          REDACTED,
          repositoryPath,
          workspaceId: state.connection.workspaceId
        })
    );
    if (projects.length === 0) {
      throw new Error("No project in this workspace is available to link.");
    }
    const selected = await vscode.window.showQuickPick(
      projects.map((project) => ({
        description: project.projectId,
        label: project.projectName,
        project
      })),
      { placeHolder: "Choose the project for this repository" }
    );
    if (selected === undefined) {
      return;
    }
    await this.#saveProject(selected.project, repositoryPath);
    this.#refreshStatus();
    await vscode.window.showInformationMessage(
      `Linked ${selected.project.projectName}. Observation remains paused until you start it.`
    );
  }

  async #startCapture(): Promise<void> {
    const state = this.#requireProject();
    await this.#requireCredential();
    const consent = await vscode.window.showWarningMessage(
      "Start repository-scoped observation? Command metadata and installed-state changes may be observed. Raw prompts, reasoning, environment values, and arbitrary file contents remain unavailable and off.",
      { modal: true },
      "Start observation"
    );
    if (consent !== "Start observation") {
      return;
    }
    const providerSurface = await vscode.window.showQuickPick(
      ["Codex local hook", "Manual boundary"],
      {
        placeHolder: "Choose the current provider surface"
      }
    );
    if (providerSurface === undefined) {
      return;
    }
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Starting local observation"
      },
      async () => {
        const launchOptions = this.#companionLaunchOptions();
        this.#companion.start(launchOptions);
        try {
          const observation = await this.#companion.startObservation(
            state.project.projectId,
            providerSurface
          );
          await this.#store.saveCapture({
            coverage: observation.coverage,
            providerSurface,
            sessionId: observation.sessionId,
            startedAtEpochSeconds: observation.startedAtEpochSeconds
          });
        } catch (error) {
          await this.#companion.stop();
          throw error;
        }
      }
    );
    this.#refreshStatus();
    await vscode.window.showWarningMessage(
      `Observation started for ${state.project.projectName}, but coverage remains incomplete until the Companion reports provider, realm, permission, upload, and adapter capabilities.`
    );
  }

  async #stopCapture(): Promise<void> {
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Ending observation and draining the Companion"
      },
      async () => {
        const capture = this.#store.load().capture;
        try {
          if (capture !== undefined && this.#companion.running) {
            const checkpoint = await this.#companion.stopObservation(capture.sessionId);
            await this.#store.saveCheckpoint(checkpoint);
          }
        } finally {
          await this.#companion.stop();
          await this.#store.saveCapture(undefined);
        }
      }
    );
    this.#setStatus("capture_gap");
    await vscode.window.showWarningMessage(
      "Observation stopped. New activity is now a visible coverage gap."
    );
  }

  async #scanNow(): Promise<void> {
    const state = this.#requireProject();
    const REDACTED = await this.#requireCredential();
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Creating a manual environment checkpoint"
      },
      async () => {
        if (state.capture !== undefined && this.#companion.running) {
          const checkpoint = await this.#companion.createCheckpoint("manual");
          await this.#store.saveCheckpoint(checkpoint);
          await this.#store.saveCapture({
            ...state.capture,
            coverage: checkpoint.coverage
          });
        }
        await this.#apiClient.createCheckpoint({
          REDACTED,
          projectId: state.project.projectId
        });
      }
    );
    await vscode.window.showInformationMessage("Manual checkpoint requested.");
  }

  async #openStatus(): Promise<void> {
    const state = this.#store.load();
    const connection =
      state.connection === undefined
        ? "not connected"
        : `device ${state.connection.deviceId}, workspace ${state.connection.workspaceId}`;
    const project =
      state.project === undefined
        ? "no project linked"
        : `${state.project.projectName} (${state.project.projectId})`;
    const capture =
      state.capture === undefined
        ? "observation paused; activity is outside current coverage"
        : `observation active via ${state.capture.providerSurface}`;
    const coverage =
      state.capture?.coverage === undefined
        ? "Coverage is incomplete: no current provider, realm, permission, upload, and adapter report is available."
        : formatCoverageReport(state.capture.coverage);
    await vscode.window.showInformationMessage(
      `Environment Reconciler — ${connection}; ${project}; ${capture}.\n${coverage}`
    );
  }

  async #diagnoseCoverage(): Promise<void> {
    const coverage = this.#store.load().capture?.coverage;
    if (coverage === undefined) {
      await vscode.window.showWarningMessage(
        "Coverage is incomplete: observation is paused or no Companion capability report is available. Provider, realm, permission, upload, and adapter coverage are unreported."
      );
      return;
    }
    const report = formatCoverageReport(coverage);
    if (assessCoverage(coverage) === "incomplete") {
      await vscode.window.showWarningMessage(report, { modal: true });
    } else {
      await vscode.window.showInformationMessage(report, { modal: true });
    }
  }

  async #openWebWorkspace(): Promise<void> {
    const state = this.#requireProject();
    const serviceUrl = vscode.workspace
      .getConfiguration("environmentReconciler")
      .get<string>("serviceUrl", "http://localhost:8787");
    const target = new URL(
      `/workspaces/${encodeURIComponent(state.connection.workspaceId)}/projects/${encodeURIComponent(
        state.project.projectId
      )}`,
      serviceUrl
    );
    await vscode.env.openExternal(vscode.Uri.parse(target.toString(), true));
  }

  async #disconnect(): Promise<void> {
    const confirmation = await vscode.window.showWarningMessage(
      "Disconnect this device? Observation will stop and its local device REDACTED will be deleted.",
      { modal: true },
      "Disconnect"
    );
    if (confirmation !== "Disconnect") {
      return;
    }
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Disconnecting Environment Reconciler"
      },
      async () => {
        await this.#companion.stop();
        await this.#store.clear();
      }
    );
    this.#setStatus("disconnected");
  }

  #requireConnection(): PersistentExtensionState & {
    readonly connection: NonNullable<PersistentExtensionState["connection"]>;
  } {
    const state = this.#store.load();
    if (state.connection === undefined) {
      throw new Error("Connect and sign in before continuing.");
    }
    if (isEnrollmentExpired(state.connection, this.#nowEpochSeconds())) {
      throw new Error("This device enrollment expired. Connect again to continue.");
    }
    return state as PersistentExtensionState & {
      readonly connection: NonNullable<PersistentExtensionState["connection"]>;
    };
  }

  #requireProject(): PersistentExtensionState & {
    readonly connection: NonNullable<PersistentExtensionState["connection"]>;
    readonly project: NonNullable<PersistentExtensionState["project"]>;
  } {
    const state = this.#requireConnection();
    if (state.project === undefined) {
      throw new Error("Link this repository to a project before continuing.");
    }
    return state as PersistentExtensionState & {
      readonly connection: NonNullable<PersistentExtensionState["connection"]>;
      readonly project: NonNullable<PersistentExtensionState["project"]>;
    };
  }

  async #requireCredential(): Promise<string> {
    const REDACTED = await this.#store.deviceCredential();
    if (REDACTED === undefined || REDACTED.length === 0) {
      throw new Error("The device REDACTED is missing. Connect again to continue.");
    }
    return REDACTED;
  }

  #repositoryPath(): string {
    const folder = vscode.workspace.workspaceFolders?.[0];
    if (folder === undefined) {
      throw new Error("Open a repository folder before connecting Environment Reconciler.");
    }
    return folder.uri.fsPath;
  }

  #companionLaunchOptions(): CompanionLaunchOptions {
    const scopeId = randomUUID();
    const REDACTED = REDACTED;
    const ipc = {
      endpoint: deriveCompanionEndpoint({
        ...(process.platform === "win32"
          ? {}
          : {
              runtimeDirectory: path
                .join(this.#context.globalStorageUri.fsPath, "ipc")
                .replaceAll("\\", "/")
            }),
        scopeId
      }),
      scopeId,
      REDACTED
    };
    const configured = vscode.workspace
      .getConfiguration("environmentReconciler")
      .get<string>("companionPath", "")
      .trim();
    if (configured.length > 0) {
      return {
        binaryPath: configured,
        dataDirectory: this.#context.globalStorageUri.fsPath,
        integrity: { kind: "development_override" },
        ipc
      };
    }
    const binaryName =
      process.platform === "win32"
        ? "environment-REDACTED-companion.exe"
        : "environment-REDACTED-companion";
    const relativeBinaryPath = ["bin", process.platform, process.arch, binaryName].join("/");
    return {
      binaryPath: this.#context.asAbsolutePath(
        path.join("bin", process.platform, process.arch, binaryName)
      ),
      dataDirectory: this.#context.globalStorageUri.fsPath,
      ipc,
      integrity: {
        architecture: process.arch,
        kind: "embedded_manifest",
        manifestPath: this.#context.asAbsolutePath(path.join("bin", "companion-manifest.json")),
        platform: process.platform,
        relativeBinaryPath
      }
    };
  }

  async #saveProject(project: ProjectSummary, repositoryPath: string): Promise<void> {
    await this.#store.saveProject({
      projectId: project.projectId,
      projectName: project.projectName,
      repositoryPath
    });
  }

  #refreshStatus(): void {
    this.#setStatus(statusForState(this.#store.load(), this.#nowEpochSeconds()));
  }

  #setStatus(status: ExtensionStatus): void {
    const presentation = statusPresentation[status];
    this.#status.text = `$(${presentation.icon}) Reconciler: ${presentation.label}`;
    this.#status.tooltip = presentation.tooltip;
    this.#status.backgroundColor =
      status === "error" ? new vscode.ThemeColor("statusBarItem.errorBackground") : undefined;
  }
}

let activeRuntime: ExtensionRuntime | undefined;

export function activate(
  context: vscode.ExtensionContext,
  dependencies: ActivationDependencies = {}
): void {
  activeRuntime = new ExtensionRuntime(context, dependencies);
}

export async function deactivate(): Promise<void> {
  const runtime = activeRuntime;
  activeRuntime = undefined;
  await runtime?.dispose();
}
