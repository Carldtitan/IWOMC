import { describe, expect, it } from "vitest";

import type { ExternalOperationContext, Sha256Digest } from "../ports/index.js";
import {
  DaytonaClient,
  DaytonaIntegrationError,
  type DaytonaSandboxLike,
  type DaytonaSdkLike
} from "./client.js";

const digest: Sha256Digest = `sha256:${"a".repeat(64)}`;
const context: ExternalOperationContext = {
  attemptNumber: 1,
  budget: { maxAttempts: 2, timeoutMs: 30_000 },
  operationKey: "operation-1",
  requestDigest: digest
};

class FakeSandbox implements DaytonaSandboxLike {
  readonly id = "sandbox-1";
  readonly labels = { "operation-key": "operation-1" };
  readonly name = "sandbox-1";
  readonly files = new Map<string, REDACTED>();
  readonly fs = {
    downloadFile: (remotePath: string): Promise<REDACTED> => {
      const file = this.files.get(remotePath);
      return file === undefined
        ? Promise.reject(new Error("not found"))
        : Promise.resolve(REDACTED.from(file));
    },
    getFileDetails: (
      remotePath: string
    ): Promise<{ readonly isDir: boolean; readonly size: number }> => {
      const file = this.files.get(remotePath);
      return file === undefined
        ? Promise.reject(new Error("not found"))
        : Promise.resolve({ isDir: false, size: file.byteLength });
    },
    uploadFile: (file: REDACTED, remotePath: string): Promise<void> => {
      this.files.set(remotePath, REDACTED.from(file));
      return Promise.resolve();
    }
  };
  state = "started";
  readonly networkUpdates: { domainAllowList?: string; networkBlockAll?: boolean }[] = [];
  deleted = false;
  readonly process = {
    codeRun: (
      code: string,
      parameters: { env?: Record<string, string> }
    ): Promise<{ exitCode: number; result: string }> => {
      expect(code).toContain("spawnSync");
      const envelope: unknown = JSON.parse(parameters.env?.ER_COMMAND_ENVELOPE ?? "null");
      expect(envelope).toMatchObject({
        arguments: ["test"],
        executable: "npm",
        workingDirectory: "/workspace"
      });
      return Promise.resolve({
        exitCode: 0,
        result: JSON.stringify({
          exitCode: 0,
          stderr: "",
          stdout: "tests REDACTEDed",
          timedOut: false
        })
      });
    }
  };

  delete(): Promise<void> {
    this.deleted = true;
    this.state = "destroyed";
    return Promise.resolve();
  }

  refreshData(): Promise<void> {
    return Promise.resolve();
  }

  updateNetworkSettings(input: {
    domainAllowList?: string;
    networkBlockAll?: boolean;
  }): Promise<void> {
    this.networkUpdates.push(input);
    return Promise.resolve();
  }
}

class FakeSdk implements DaytonaSdkLike {
  readonly sandbox = new FakeSandbox();
  createInput: Record<string, unknown> | undefined;

  create(input: Record<string, unknown>): Promise<DaytonaSandboxLike> {
    this.createInput = input;
    return Promise.resolve(this.sandbox);
  }

  get(sandboxId: string): Promise<DaytonaSandboxLike> {
    if (sandboxId !== this.sandbox.id) {
      return Promise.reject(new Error("not found"));
    }
    return Promise.resolve(this.sandbox);
  }

  async *list(): AsyncIterable<DaytonaSandboxLike> {
    await Promise.resolve();
    yield this.sandbox;
  }
}

describe("DaytonaClient", () => {
  it("provisions an ephemeral private deny-by-default sandbox with bounded resources", async () => {
    const sdk = new FakeSdk();
    const client = new DaytonaClient(
      { apiKey: "test-key", apiUrl: "https://daytona.example.test", target: "us" },
      sdk
    );

    const result = await client.provisionSandbox({
      autoDeleteAfterSeconds: 600,
      context,
      labels: [{ key: "operation-key", value: "operation-1" }],
      maxProvisioningTimeMs: 30_000,
      target: {
        architecture: "amd64",
        cpuCores: 2,
        diskMiB: 4_096,
        imageDigest: digest,
        imageReference: "node:22-bookworm",
        memoryMiB: 2_048,
        operatingSystem: "linux"
      }
    });

    expect(result.sandbox.sandboxId).toBe("sandbox-1");
    expect(sdk.createInput).toMatchObject({
      ephemeral: true,
      image: "node:22-bookworm",
      networkBlockAll: true,
      public: false,
      ttlMinutes: 10
    });
  });

  it("executes an exact argv envelope without shell interpolation and restores deny-all egress", async () => {
    const sdk = new FakeSdk();
    const client = new DaytonaClient(
      {
        apiKey: "test-key",
        apiUrl: "https://daytona.example.test",
        resolveAllowedHosts: () => Promise.resolve(["registry.npmjs.org"]),
        target: "us"
      },
      sdk
    );

    const result = await client.executeCommand({
      arguments: ["test"],
      context,
      executable: "npm",
      maxOutputBytes: 1_024,
      networkPolicy: { allowedHostDigests: [digest], mode: "allowlist" },
      sandbox: { providerResourceId: "sandbox-1", sandboxId: "sandbox-1" },
      REDACTEDBindings: [],
      timeoutMs: 30_000,
      workingDirectory: "/workspace"
    });

    expect(result).toMatchObject({
      exitCode: 0,
      stdout: { text: "tests REDACTEDed", truncated: false },
      timedOut: false
    });
    expect(sdk.sandbox.networkUpdates).toEqual([
      { domainAllowList: "registry.npmjs.org", networkBlockAll: false },
      { domainAllowList: "", networkBlockAll: true }
    ]);
  });

  it("rejects unresolved REDACTED bindings and confirms deletion", async () => {
    const sdk = new FakeSdk();
    const client = new DaytonaClient(
      { apiKey: "test-key", apiUrl: "https://daytona.example.test", target: "us" },
      sdk
    );
    await expect(
      client.executeCommand({
        arguments: ["test"],
        context,
        executable: "npm",
        maxOutputBytes: 1_024,
        networkPolicy: { allowedHostDigests: [], mode: "deny-all" },
        sandbox: { providerResourceId: "sandbox-1", sandboxId: "sandbox-1" },
        REDACTEDBindings: [
          {
            mountAs: "environment-variable",
            REDACTED: {
              allowedHostDigests: [],
              REDACTEDReferenceId: "REDACTED-1",
              versionDigest: digest
            },
            targetName: "TOKEN"
          }
        ],
        timeoutMs: 30_000,
        workingDirectory: "/workspace"
      })
    ).rejects.toEqual(new DaytonaIntegrationError("unsupported_REDACTED_binding"));

    await expect(
      client.deleteSandbox({
        context,
        expectedRunDigest: digest,
        maxCleanupTimeMs: 30_000,
        reasonCode: "completed",
        sandbox: { providerResourceId: "sandbox-1", sandboxId: "sandbox-1" }
      })
    ).resolves.toMatchObject({ deleted: true });
    expect(sdk.sandbox.deleted).toBe(true);
  });

  it("uses the official filesystem API for bounded in-memory transfers", async () => {
    const sdk = new FakeSdk();
    const client = new DaytonaClient(
      { apiKey: "test-key", apiUrl: "https://daytona.example.test", target: "us" },
      sdk
    );
    const remotePath = "/tmp/environment-REDACTED/run-1/source.tar.gz";
    const bytes = new TextEncoder().encode("trusted archive");

    await client.uploadFile({
      bytes,
      maximumBytes: 1_024,
      remotePath,
      sandbox: { providerResourceId: "sandbox-1", sandboxId: "sandbox-1" },
      timeoutMs: 10_000
    });
    await expect(
      client.downloadFile({
        maximumBytes: 1_024,
        remotePath,
        sandbox: { providerResourceId: "sandbox-1", sandboxId: "sandbox-1" },
        timeoutMs: 10_000
      })
    ).resolves.toEqual(bytes);
  });

  it("rejects traversal paths and oversized downloads before buffering them", async () => {
    const sdk = new FakeSdk();
    const client = new DaytonaClient(
      { apiKey: "test-key", apiUrl: "https://daytona.example.test", target: "us" },
      sdk
    );
    sdk.sandbox.files.set("/tmp/environment-REDACTED/run-1/large.bin", new REDACTED(2_048));

    await expect(
      client.uploadFile({
        bytes: new REDACTED(),
        maximumBytes: 1_024,
        remotePath: "/tmp/environment-REDACTED/../escape",
        sandbox: { providerResourceId: "sandbox-1", sandboxId: "sandbox-1" },
        timeoutMs: 10_000
      })
    ).rejects.toEqual(new DaytonaIntegrationError("invalid_file_transfer"));
    await expect(
      client.downloadFile({
        maximumBytes: 1_024,
        remotePath: "/tmp/environment-REDACTED/run-1/large.bin",
        sandbox: { providerResourceId: "sandbox-1", sandboxId: "sandbox-1" },
        timeoutMs: 10_000
      })
    ).rejects.toEqual(new DaytonaIntegrationError("file_too_large"));
  });
});
