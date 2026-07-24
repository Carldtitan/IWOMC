import { assessCoverage, type CaptureCoverage } from "./coverage.js";

export const STATE_KEY = "environmentReconciler.state.v1";
export const DEVICE_CREDENTIAL_KEY = "environmentReconciler.deviceCredential.v1";

export type ExtensionStatus =
  | "disconnected"
  | "observing"
  | "offline_buffering"
  | "capture_gap"
  | "finding"
  | "validating"
  | "verified"
  | "error";

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
  readonly coverage?: CaptureCoverage;
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
    if (state.capture.coverage?.upload.state === "offline_buffering") {
      return "offline_buffering";
    }
    return state.capture.coverage !== undefined &&
      assessCoverage(state.capture.coverage) === "within_reported_coverage"
      ? "observing"
      : "capture_gap";
  }
  return state.project === undefined ? "disconnected" : "capture_gap";
}
