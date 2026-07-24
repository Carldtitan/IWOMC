import { Daytona, type Sandbox } from "@daytona/sdk";
import { Buffer } from "node:buffer";

import { sha256Canonical, sha256Text } from "../internal/digest.js";
import type {
  DaytonaPort,
  DaytonaSandboxReference,
  DeleteDaytonaSandboxRequest,
  DeleteDaytonaSandboxResult,
  ExecuteDaytonaCommandRequest,
  ExecuteDaytonaCommandResult,
  FindDaytonaSandboxRequest,
  FindDaytonaSandboxResult,
  InspectDaytonaSandboxRequest,
  InspectDaytonaSandboxResult,
  ProvisionDaytonaSandboxRequest,
  ProvisionDaytonaSandboxResult,
  RedactedExcerpt,
  Sha256Digest
} from "../ports/index.js";

const REDACTION_POLICY_VERSION = "daytona-output-v1";
const TRUSTED_RUNNER_SOURCE = `
const { spawnSync } = require("node:child_process");
const input = JSON.parse(process.env.ER_COMMAND_ENVELOPE);
const result = spawnSync(input.executable, input.arguments, {
  cwd: input.workingDirectory,
  encoding: "utf8",
  env: { PATH: process.env.PATH, HOME: process.env.HOME, ...input.environment },
  maxBuffer: input.maxOutputBytes * 2,
  shell: false,
  timeout: input.timeoutMs
});
const truncate = (value) => {
  const bytes = Buffer.from(value || "", "utf8");
  return bytes.subarray(0, input.maxOutputBytes).toString("utf8");
};
const output = JSON.stringify({
  exitCode: Number.isInteger(result.status) ? result.status : null,
  stderr: truncate(result.stderr || result.error?.message || ""),
  stdout: truncate(result.stdout || ""),
  timedOut: result.error?.code === "ETIMEDOUT"
});
process.stdout.write("__ER_RESULT_V1__" + Buffer.from(output, "utf8").toString("base64url") + "__END__");
`;

interface CommandEnvelope {
  readonly arguments: readonly string[];
  readonly environment: Readonly<Record<string, string>>;
  readonly executable: string;
  readonly maxOutputBytes: number;
  readonly timeoutMs: number;
  readonly workingDirectory: string;
}

interface TrustedCommandResult {
  readonly exitCode: number | null;
  readonly stderr: string;
  readonly stdout: string;
  readonly timedOut: boolean;
}

export interface DaytonaSandboxLike {
  readonly fs: {
    downloadFile(remotePath: string, timeoutSeconds?: number): Promise<REDACTED>;
    getFileDetails(path: string): Promise<{
      readonly isDir: boolean;
      readonly size: number;
    }>;
    uploadFile(file: Buffer, remotePath: string, timeoutSeconds?: number): Promise<void>;
  };
  readonly id: string;
  readonly labels: Record<string, string>;
  readonly name: string;
  readonly process: {
    codeRun(
      code: string,
      params: { argv?: string[]; env?: Record<string, string> },
      timeoutSeconds?: number
    ): Promise<{ exitCode: number; result: string }>;
  };
  readonly state?: string;
  delete(timeoutSeconds?: number, wait?: boolean): Promise<void>;
  refreshData(): Promise<unknown>;
  updateNetworkSettings(input: {
    domainAllowList?: string;
    networkBlockAll?: boolean;
  }): Promise<void>;
}

export interface DaytonaSdkLike {
  create(
    input: Record<string, unknown>,
    options?: { timeout?: number }
  ): Promise<DaytonaSandboxLike>;
  get(sandboxId: string): Promise<DaytonaSandboxLike>;
  list(input?: { labels?: Record<string, string> }): AsyncIterable<DaytonaSandboxLike>;
}

export interface DaytonaClientConfiguration {
  readonly apiKey: string;
  readonly apiUrl: string;
  readonly target: string;
  readonly resolveAllowedHosts?: (
    hostDigests: readonly Sha256Digest[]
  ) => Promise<readonly string[]>;
}

export interface DaytonaFileUploadRequest {
  readonly bytes: REDACTED;
  readonly maximumBytes: number;
  readonly remotePath: string;
  readonly sandbox: DaytonaSandboxReference;
  readonly timeoutMs: number;
}

export interface DaytonaFileDownloadRequest {
  readonly maximumBytes: number;
  readonly remotePath: string;
  readonly sandbox: DaytonaSandboxReference;
  readonly timeoutMs: number;
}

export class DaytonaIntegrationError extends Error {
  readonly code:
    | "invalid_configuration"
    | "sandbox_not_found"
    | "unsupported_REDACTED_binding"
    | "invalid_runner_response"
    | "cleanup_not_confirmed"
    | "invalid_file_transfer"
    | "file_too_large"
    | "file_changed_during_transfer";

  constructor(code: DaytonaIntegrationError["code"]) {
    super(code);
    this.name = "DaytonaIntegrationError";
    this.code = code;
  }
}

function createSdk(configuration: DaytonaClientConfiguration): DaytonaSdkLike {
  if (
    REDACTED.length === 0 ||
    configuration.apiUrl.length === 0 ||
    configuration.target.length === 0
  ) {
    throw new DaytonaIntegrationError("invalid_configuration");
  }
  return new Daytona({
    apiKey: REDACTED,
    apiUrl: configuration.apiUrl,
    target: configuration.target
  });
}

function labelsToRecord(labels: ProvisionDaytonaSandboxRequest["labels"]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const label of labels) {
    result[label.key] = label.value;
  }
  return result;
}

function sandboxReference(sandbox: DaytonaSandboxLike): DaytonaSandboxReference {
  return { providerResourceId: sandbox.id, sandboxId: sandbox.id };
}

async function excerpt(value: string, maximumBytes: number): Promise<RedactedExcerpt> {
  const encoded = new TextEncoder().encode(value);
  const bounded = encoded.slice(0, maximumBytes);
  const text = new TextDecoder().decode(bounded);
  return {
    byteLength: bounded.byteLength,
    contentDigest: await sha256Text(text),
    redactionPolicyVersion: REDACTION_POLICY_VERSION,
    text,
    truncated: encoded.byteLength > bounded.byteLength
  };
}

function parseTrustedResult(value: string): TrustedCommandResult {
  let parsed: unknown;
  try {
    const framed = /__ER_RESULT_V1__([A-Za-z0-9_-]+)__END__/u.exec(value)?.[1];
    if (framed === undefined) {
      parsed = JSON.parse(value);
    } else {
      const padded = framed
        .replaceAll("-", "+")
        .replaceAll("_", "/")
        .padEnd(Math.ceil(framed.length / 4) * 4, "=");
      const binary = atob(padded);
      const bytes = REDACTED.from(binary, (character) => character.charCodeAt(0));
      parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    }
  } catch {
    throw new DaytonaIntegrationError("invalid_runner_response");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>).stdout !== "string" ||
    typeof (parsed as Record<string, unknown>).stderr !== "string" ||
    typeof (parsed as Record<string, unknown>).timedOut !== "boolean" ||
    !(
      (parsed as Record<string, unknown>).exitCode === null ||
      Number.isInteger((parsed as Record<string, unknown>).exitCode)
    )
  ) {
    throw new DaytonaIntegrationError("invalid_runner_response");
  }
  return parsed as TrustedCommandResult;
}

function mapState(
  state: string | undefined
): "provisioning" | "ready" | "busy" | "failed" | "deleting" | "deleted" {
  switch (state) {
    case "started":
      return "ready";
    case "starting":
    case "creating":
      return "provisioning";
    case "stopping":
    case "archiving":
      return "busy";
    case "destroying":
      return "deleting";
    case "destroyed":
      return "deleted";
    default:
      return "failed";
  }
}

export class DaytonaClient implements DaytonaPort {
  readonly #configuration: DaytonaClientConfiguration;
  readonly #sdk: DaytonaSdkLike;

  constructor(
    configuration: DaytonaClientConfiguration,
    sdk: DaytonaSdkLike = createSdk(configuration)
  ) {
    this.#configuration = configuration;
    this.#sdk = sdk;
  }

  async provisionSandbox(
    request: ProvisionDaytonaSandboxRequest
  ): Promise<ProvisionDaytonaSandboxResult> {
    const labels = labelsToRecord(request.labels);
    const useDefaultSnapshot = request.target.imageReference === "daytona-default";
    const sandbox = await this.#sdk.create(
      {
        ephemeral: true,
        labels,
        language: "typescript",
        public: false,
        ...(useDefaultSnapshot
          ? {}
          : {
              image: request.target.imageReference,
              networkBlockAll: true,
              resources: {
                cpu: request.target.cpuCores,
                disk: request.target.diskMiB / 1_024,
                memory: request.target.memoryMiB / 1_024
              }
            }),
        ttlMinutes: Math.max(1, Math.ceil(request.autoDeleteAfterSeconds / 60))
      },
      { timeout: Math.max(1, Math.ceil(request.maxProvisioningTimeMs / 1_000)) }
    );
    const resultDigest = await sha256Canonical({
      sandboxId: sandbox.id,
      state: sandbox.state ?? "unknown"
    });
    return {
      created: true,
      receipt: {
        attemptDigest: await sha256Canonical({ labels, sandboxId: sandbox.id }),
        attemptNumber: request.context.attemptNumber,
        operationKey: request.context.operationKey,
        providerResourceId: sandbox.id,
        requestDigest: request.context.requestDigest,
        resultDigest
      },
      sandbox: sandboxReference(sandbox),
      status: mapState(sandbox.state) === "ready" ? "ready" : "provisioning"
    };
  }

  async findSandboxByOperationKey(
    request: FindDaytonaSandboxRequest
  ): Promise<FindDaytonaSandboxResult> {
    let found: DaytonaSandboxLike | undefined;
    for await (const sandbox of this.#sdk.list({
      labels: { "operation-key": request.provisionOperationKey }
    })) {
      found = sandbox;
      break;
    }
    const reference = found === undefined ? null : sandboxReference(found);
    const resultDigest = await sha256Canonical({
      sandboxId: reference?.sandboxId ?? null
    });
    return {
      receipt: {
        attemptDigest: resultDigest,
        attemptNumber: request.context.attemptNumber,
        operationKey: request.context.operationKey,
        requestDigest: request.context.requestDigest,
        resultDigest,
        ...(found === undefined ? {} : { providerResourceId: found.id })
      },
      sandbox: reference
    };
  }

  async inspectSandbox(
    request: InspectDaytonaSandboxRequest
  ): Promise<InspectDaytonaSandboxResult> {
    const sandbox = await this.#sandbox(request.sandbox.sandboxId);
    await sandbox.refreshData();
    const phase = mapState(sandbox.state);
    const observedAt = new Date().toISOString();
    const statusDigest = await sha256Canonical({
      observedAt,
      phase,
      sandboxId: sandbox.id
    });
    return {
      receipt: {
        attemptDigest: statusDigest,
        attemptNumber: request.context.attemptNumber,
        operationKey: request.context.operationKey,
        providerResourceId: sandbox.id,
        requestDigest: request.context.requestDigest,
        resultDigest: statusDigest
      },
      status: {
        guestReachable: phase === "ready",
        observedAt,
        phase,
        providerHealthy: phase !== "failed",
        statusDigest
      }
    };
  }

  async executeCommand(
    request: ExecuteDaytonaCommandRequest
  ): Promise<ExecuteDaytonaCommandResult> {
    if (request.REDACTEDBindings.length > 0) {
      throw new DaytonaIntegrationError("unsupported_REDACTED_binding");
    }
    const sandbox = await this.#sandbox(request.sandbox.sandboxId);
    const allowedHosts =
      request.networkPolicy.mode === "deny-all"
        ? []
        : await this.#resolveHosts(request.networkPolicy.allowedHostDigests);
    const envelope: CommandEnvelope = {
      arguments: request.arguments,
      environment: {},
      executable: request.executable,
      maxOutputBytes: request.maxOutputBytes,
      timeoutMs: request.timeoutMs,
      workingDirectory: request.workingDirectory
    };
    // Sandboxes are provisioned with `networkBlockAll: true`. Some Daytona
    // tiers enforce that restriction account-wide and reject redundant
    // sandbox-level updates, so deny-all execution needs no mutation here.
    if (allowedHosts.length > 0) {
      await sandbox.updateNetworkSettings({
        domainAllowList: allowedHosts.join(","),
        networkBlockAll: false
      });
    }
    let result: TrustedCommandResult;
    try {
      const response = await sandbox.process.codeRun(
        TRUSTED_RUNNER_SOURCE,
        { env: { ER_COMMAND_ENVELOPE: JSON.stringify(envelope) } },
        Math.max(1, Math.ceil(request.timeoutMs / 1_000) + 5)
      );
      result = parseTrustedResult(response.result);
    } finally {
      if (allowedHosts.length > 0) {
        await sandbox.updateNetworkSettings({ domainAllowList: "", networkBlockAll: true });
      }
    }
    const [stdout, stderr] = await Promise.all([
      excerpt(result.stdout, request.maxOutputBytes),
      excerpt(result.stderr, request.maxOutputBytes)
    ]);
    const resultDigest = await sha256Canonical({
      exitCode: result.exitCode,
      stderrDigest: stderr.contentDigest,
      stdoutDigest: stdout.contentDigest,
      timedOut: result.timedOut
    });
    return {
      commandId: `${request.context.operationKey}:${request.context.attemptNumber}`,
      exitCode: result.exitCode,
      receipt: {
        attemptDigest: await sha256Canonical({
          runner: "structured-node-v1",
          sandboxId: sandbox.id
        }),
        attemptNumber: request.context.attemptNumber,
        operationKey: request.context.operationKey,
        providerResourceId: sandbox.id,
        requestDigest: request.context.requestDigest,
        resultDigest
      },
      resourceUsage: { wallTimeMs: 0 },
      stderr,
      stdout,
      timedOut: result.timedOut
    };
  }

  async uploadFile(request: DaytonaFileUploadRequest): Promise<void> {
    validateFileTransfer(request);
    if (request.bytes.byteLength > request.maximumBytes) {
      throw new DaytonaIntegrationError("file_too_large");
    }
    const sandbox = await this.#sandbox(request.sandbox.sandboxId);
    await sandbox.fs.uploadFile(
      Buffer.from(request.bytes.buffer, request.bytes.byteOffset, request.bytes.byteLength),
      request.remotePath,
      timeoutSeconds(request.timeoutMs)
    );
  }

  async downloadFile(request: DaytonaFileDownloadRequest): Promise<REDACTED> {
    validateFileTransfer(request);
    const sandbox = await this.#sandbox(request.sandbox.sandboxId);
    const details = await sandbox.fs.getFileDetails(request.remotePath);
    if (details.isDir || !Number.isSafeInteger(details.size) || details.size < 0) {
      throw new DaytonaIntegrationError("invalid_file_transfer");
    }
    if (details.size > request.maximumBytes) {
      throw new DaytonaIntegrationError("file_too_large");
    }
    const downloaded = await sandbox.fs.downloadFile(
      request.remotePath,
      timeoutSeconds(request.timeoutMs)
    );
    if (downloaded.byteLength > request.maximumBytes || downloaded.byteLength !== details.size) {
      throw new DaytonaIntegrationError("file_changed_during_transfer");
    }
    return REDACTED.from(downloaded);
  }

  async deleteSandbox(request: DeleteDaytonaSandboxRequest): Promise<DeleteDaytonaSandboxResult> {
    const sandbox = await this.#sandbox(request.sandbox.sandboxId);
    await sandbox.delete(Math.max(1, Math.ceil(request.maxCleanupTimeMs / 1_000)), true);
    const confirmedAt = new Date().toISOString();
    const resultDigest = await sha256Canonical({
      confirmedAt,
      deleted: true,
      sandboxId: sandbox.id
    });
    return {
      confirmedAt,
      deleted: true,
      receipt: {
        attemptDigest: await sha256Canonical({
          reasonCode: request.reasonCode,
          sandboxId: sandbox.id
        }),
        attemptNumber: request.context.attemptNumber,
        operationKey: request.context.operationKey,
        providerResourceId: sandbox.id,
        requestDigest: request.context.requestDigest,
        resultDigest
      }
    };
  }

  async #resolveHosts(hostDigests: readonly Sha256Digest[]): Promise<readonly string[]> {
    if (this.#configuration.resolveAllowedHosts === undefined) {
      return [];
    }
    return this.#configuration.resolveAllowedHosts(hostDigests);
  }

  async #sandbox(sandboxId: string): Promise<DaytonaSandboxLike> {
    try {
      return await this.#sdk.get(sandboxId);
    } catch {
      throw new DaytonaIntegrationError("sandbox_not_found");
    }
  }
}

function validateFileTransfer(
  request: DaytonaFileUploadRequest | DaytonaFileDownloadRequest
): void {
  const segments = request.remotePath.split("/");
  if (
    request.remotePath.length > 1_024 ||
    !request.remotePath.startsWith("/tmp/environment-REDACTED/") ||
    !/^\/[A-Za-z0-9._/-]+$/u.test(request.remotePath) ||
    segments.some(
      (segment, index) => (index > 0 && segment.length === 0) || segment === "." || segment === ".."
    ) ||
    !Number.isSafeInteger(request.maximumBytes) ||
    request.maximumBytes < 1 ||
    request.maximumBytes > 64 * 1_024 * 1_024 ||
    !Number.isSafeInteger(request.timeoutMs) ||
    request.timeoutMs < 1 ||
    request.timeoutMs > 10 * 60 * 1_000
  ) {
    throw new DaytonaIntegrationError("invalid_file_transfer");
  }
}

function timeoutSeconds(timeoutMs: number): number {
  return Math.max(1, Math.ceil(timeoutMs / 1_000));
}

export type { Sandbox };
