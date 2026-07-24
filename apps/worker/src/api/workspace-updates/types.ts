export interface WorkspaceUpdatesPrincipal {
  readonly subjectId: string;
  readonly workspaceIds: readonly string[];
}

export interface WorkspaceUpdatesAuthenticator {
  authenticate(input: {
    readonly nowEpochMilliseconds: number;
    readonly request: Request;
  }): Promise<WorkspaceUpdatesPrincipal | undefined>;
}

export type WorkspaceUpdateKind =
  | "capability"
  | "session"
  | "capture_gap"
  | "finding"
  | "candidate"
  | "validation"
  | "system";

export interface WorkspaceUpdateRecord {
  readonly id: string;
  readonly kind: WorkspaceUpdateKind;
  readonly occurredAt: string;
}

export interface WorkspaceSystemStatus {
  readonly health: "operational" | "degraded" | "unavailable" | "unknown";
  readonly summary: string;
  readonly updatedAt: string;
}

export interface WorkspaceUpdatePage {
  readonly cursor: string;
  readonly partial: boolean;
  readonly stale: boolean;
  readonly systemStatus?: WorkspaceSystemStatus;
  readonly updates: readonly WorkspaceUpdateRecord[];
}

export interface WorkspaceUpdatesService {
  canReadProject(input: {
    readonly principal: WorkspaceUpdatesPrincipal;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<boolean>;
  readUpdates(input: {
    readonly cursor?: string;
    readonly nowEpochMilliseconds: number;
    readonly principal: WorkspaceUpdatesPrincipal;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<WorkspaceUpdatePage>;
}
