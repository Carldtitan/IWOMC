export const STATE_KEY = "environmentReconciler.state.v1";
export const DEVICE_CREDENTIAL_KEY = "environmentReconciler.deviceCredential.v1";

export type ExtensionStatus =
  "disconnected" | "observing" | "capture_gap" | "finding" | "validating" | "verified" | "error";

export interface DeviceConnection {
  readonly deviceId: string;
  readonly expiresAtEpochSeconds: number;
  readonly workspaceId: string;
}

export interface LinkedProject {
  readonly projectId: string;
  readonly projectName: string;
  readonly repositoryPath: string;
}

export interface ActiveCapture {
  readonly providerSurface: string;
  readonly sessionId: string;
  readonly startedAtEpochSeconds: number;
}

export interface PersistentExtensionState {
  readonly schemaVersion: 1;
  readonly connection?: DeviceConnection;
  readonly project?: LinkedProject;
  readonly capture?: ActiveCapture;
}

export const emptyState = (): PersistentExtensionState => ({ schemaVersion: 1 });

export function isEnrollmentExpired(
  connection: DeviceConnection,
  nowEpochSeconds: number
): boolean {
  return connection.expiresAtEpochSeconds <= nowEpochSeconds;
}

export function statusForState(
  state: PersistentExtensionState,
  nowEpochSeconds: number
): ExtensionStatus {
  if (state.connection === undefined) {
    return "disconnected";
  }
  if (isEnrollmentExpired(state.connection, nowEpochSeconds)) {
    return "error";
  }
  if (state.capture !== undefined) {
    return "observing";
  }
  return state.project === undefined ? "disconnected" : "capture_gap";
}
