import * as vscode from "vscode";

const commandIds = {
  connectWorkspace: "environmentReconciler.connectWorkspace",
  openStatus: "environmentReconciler.openStatus",
  scanNow: "environmentReconciler.scanNow"
} as const;

export function activate(context: vscode.ExtensionContext): void {
  const status = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 20);
  status.name = "Environment Reconciler";
  status.text = "$(shield) Reconciler: disconnected";
  status.tooltip = "Connect a workspace before environment observation can begin.";
  status.command = commandIds.openStatus;
  status.show();

  context.subscriptions.push(
    status,
    vscode.commands.registerCommand(commandIds.connectWorkspace, async () => {
      await vscode.window.showInformationMessage(
        "Workspace connection is not available in the foundation build."
      );
    }),
    vscode.commands.registerCommand(commandIds.scanNow, async () => {
      await vscode.window.showWarningMessage(
        "Scan unavailable: no trusted Companion is connected."
      );
    }),
    vscode.commands.registerCommand(commandIds.openStatus, async () => {
      await vscode.window.showInformationMessage(
        "Environment Reconciler is installed but not connected."
      );
    })
  );
}

export function deactivate(): void {
  // VS Code disposes all context subscriptions registered during activation.
}
