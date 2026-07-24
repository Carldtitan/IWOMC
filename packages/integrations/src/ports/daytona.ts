import type {
  ExternalOperationContext,
  ExternalOperationReceipt,
  OpaqueSecretReference,
  RedactedExcerpt,
  Sha256Digest
} from "./common.js";

export interface DaytonaSandboxTarget {
  readonly operatingSystem: "linux";
  readonly architecture: "amd64" | "arm64";
  readonly imageReference: string;
  readonly imageDigest: Sha256Digest;
  readonly cpuCores: number;
  readonly memoryMiB: number;
  readonly diskMiB: number;
}

export interface DaytonaSandboxReference {
  readonly sandboxId: string;
  readonly providerResourceId: string;
}

export type DaytonaSandboxLabel =
  | {
      readonly key: "operation-key";
      readonly value: string;
    }
  | {
      readonly key:
        "organization-pseudonym" | "project-pseudonym" | "run-pseudonym" | "target-digest";
      readonly value: Sha256Digest;
    };

export interface ProvisionDaytonaSandboxRequest {
  readonly context: ExternalOperationContext;
  readonly target: DaytonaSandboxTarget;
  readonly labels: readonly DaytonaSandboxLabel[];
  readonly autoDeleteAfterSeconds: number;
  readonly maxProvisioningTimeMs: number;
}

export interface ProvisionDaytonaSandboxResult {
  readonly sandbox: DaytonaSandboxReference;
  readonly created: boolean;
  readonly status: "provisioning" | "ready" | "failed" | "deleting" | "deleted";
  readonly receipt: ExternalOperationReceipt;
}

export interface FindDaytonaSandboxRequest {
  readonly context: ExternalOperationContext;
  readonly provisionOperationKey: string;
}

export interface FindDaytonaSandboxResult {
  readonly sandbox: DaytonaSandboxReference | null;
  readonly receipt: ExternalOperationReceipt;
}

export interface InspectDaytonaSandboxRequest {
  readonly context: ExternalOperationContext;
  readonly sandbox: DaytonaSandboxReference;
}

export interface DaytonaSandboxStatus {
  readonly phase: "provisioning" | "ready" | "busy" | "failed" | "deleting" | "deleted";
  readonly providerHealthy: boolean;
  readonly guestReachable: boolean;
  readonly observedAt: string;
  readonly failureClass?: "provider" | "guest" | "unknown";
  readonly statusDigest: Sha256Digest;
}

export interface InspectDaytonaSandboxResult {
  readonly status: DaytonaSandboxStatus;
  readonly receipt: ExternalOperationReceipt;
}

export interface DaytonaCommandSecretBinding {
  readonly secret: OpaqueSecretReference;
  readonly mountAs: "environment-variable";
  /** The variable name only; never its value. */
  readonly targetName: string;
}

export interface DaytonaNetworkPolicy {
  readonly mode: "deny-all" | "allowlist";
  readonly allowedHostDigests: readonly Sha256Digest[];
}

export interface ExecuteDaytonaCommandRequest {
  readonly context: ExternalOperationContext;
  readonly sandbox: DaytonaSandboxReference;
  /** Structured argv avoids shell interpolation and hidden compound commands. */
  readonly executable: string;
  readonly arguments: readonly string[];
  readonly workingDirectory: string;
  readonly timeoutMs: number;
  readonly maxOutputBytes: number;
  readonly networkPolicy: DaytonaNetworkPolicy;
  readonly secretBindings: readonly DaytonaCommandSecretBinding[];
}

export interface DaytonaCommandResourceUsage {
  readonly wallTimeMs: number;
  readonly peakMemoryMiB?: number;
  readonly cpuTimeMs?: number;
}

export interface ExecuteDaytonaCommandResult {
  readonly commandId: string;
  readonly exitCode: number | null;
  readonly timedOut: boolean;
  readonly stdout: RedactedExcerpt;
  readonly stderr: RedactedExcerpt;
  readonly resourceUsage: DaytonaCommandResourceUsage;
  readonly receipt: ExternalOperationReceipt;
}

export interface DeleteDaytonaSandboxRequest {
  readonly context: ExternalOperationContext;
  readonly sandbox: DaytonaSandboxReference;
  readonly reasonCode: "completed" | "cancelled" | "expired" | "failed" | "orphan-recovery";
  readonly expectedRunDigest: Sha256Digest;
  readonly maxCleanupTimeMs: number;
}

export interface DeleteDaytonaSandboxResult {
  readonly deleted: boolean;
  readonly confirmedAt?: string;
  readonly receipt: ExternalOperationReceipt;
}

export interface DaytonaPort {
  provisionSandbox(request: ProvisionDaytonaSandboxRequest): Promise<ProvisionDaytonaSandboxResult>;
  findSandboxByOperationKey(request: FindDaytonaSandboxRequest): Promise<FindDaytonaSandboxResult>;
  inspectSandbox(request: InspectDaytonaSandboxRequest): Promise<InspectDaytonaSandboxResult>;
  executeCommand(request: ExecuteDaytonaCommandRequest): Promise<ExecuteDaytonaCommandResult>;
  deleteSandbox(request: DeleteDaytonaSandboxRequest): Promise<DeleteDaytonaSandboxResult>;
}
