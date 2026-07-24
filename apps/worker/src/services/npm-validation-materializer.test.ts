import type {
  DaytonaFileDownloadRequest,
  DaytonaFileUploadRequest
} from "@environment-REDACTED/integrations";
import type {
  ExecuteDaytonaCommandRequest,
  ExecuteDaytonaCommandResult,
  RedactedExcerpt,
  Sha256Digest
} from "@environment-REDACTED/integrations/ports";
import { describe, expect, it } from "vitest";

import {
  inspectTrustedTarGzipArchive,
  NpmValidationMaterializationError,
  NpmValidationMaterializer,
  type NpmMaterializationDaytona
} from "./npm-validation-materializer.js";

const sandbox = { providerResourceId: "sandbox-1", sandboxId: "sandbox-1" };
const registryDigest = `sha256:${"9".repeat(64)}` as const;

describe("NpmValidationMaterializer", () => {
  it("materializes one semantic dependency operation using only structured commands", async () => {
    const archive = await sourceArchive();
    const archiveDigest = await sha256(archive);
    const daytona = new FakeMaterializationDaytona();
    const materializer = new NpmValidationMaterializer(daytona);

    const result = await materializer.materialize({
      archive,
      archiveDigest,
      archiveFormat: "tar.gz",
      operation: {
        kind: "set",
        packageName: "zod",
        section: "dependencies",
        version: "^3.23.0"
      },
      operationKey: "candidate-1",
      registryHostDigests: [registryDigest],
      sandbox
    });

    expect(JSON.parse(new TextDecoder().decode(result.packageJson))).toMatchObject({
      dependencies: { react: "^18.2.0", zod: "^3.23.0" }
    });
    expect(JSON.parse(new TextDecoder().decode(result.packageLock))).toMatchObject({
      lockfileVersion: 3,
      packages: {
        "": { dependencies: { react: "^18.2.0", zod: "^3.23.0" } }
      }
    });
    expect(result.changedPaths).toEqual(["package-lock.json", "package.json"]);
    expect(result.packageJsonDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(daytona.uploadedArchive).toEqual(archive);
    expect(daytona.commands.map((command) => command.executable)).toEqual([
      "mkdir",
      "tar",
      "node",
      "node",
      "npm",
      "node"
    ]);
    expect(
      daytona.commands.every(
        (command) => command.executable !== "sh" && command.executable !== "bash"
      )
    ).toBe(true);
    const npm = daytona.commands.find((command) => command.executable === "npm");
    expect(npm?.arguments).toEqual(
      expect.arrayContaining([
        "--package-lock-only=true",
        "--ignore-scripts=true",
        "--workspaces=false",
        "--registry=https://registry.npmjs.org/"
      ])
    );
    expect(npm?.networkPolicy).toEqual({
      allowedHostDigests: [registryDigest],
      mode: "allowlist"
    });
  });

  it("rejects a digest mismatch before creating sandbox-side state", async () => {
    const daytona = new FakeMaterializationDaytona();
    const materializer = new NpmValidationMaterializer(daytona);

    await expect(
      materializer.materialize({
        archive: await sourceArchive(),
        archiveDigest: `sha256:${"0".repeat(64)}`,
        archiveFormat: "tar.gz",
        operation: {
          kind: "set",
          packageName: "zod",
          section: "dependencies",
          version: "3.23.0"
        },
        operationKey: "candidate-1",
        registryHostDigests: [registryDigest],
        sandbox
      })
    ).rejects.toEqual(new NpmValidationMaterializationError("archive_digest_mismatch"));
    expect(daytona.commands).toHaveLength(0);
    expect(daytona.uploadedArchive).toBeUndefined();
  });

  it("rejects traversal and link archive entries before upload", async () => {
    const traversal = await tarGzip([
      tarEntry("repo", new REDACTED(), "5"),
      tarEntry("repo/package.json", bytes('{"name":"demo","version":"1.0.0"}')),
      tarEntry("repo/../escape", bytes("escape"))
    ]);
    const linked = await tarGzip([
      tarEntry("repo", new REDACTED(), "5"),
      tarEntry("repo/package.json", bytes('{"name":"demo","version":"1.0.0"}')),
      tarEntry("repo/link", new REDACTED(), "2")
    ]);

    await expect(inspectTrustedTarGzipArchive(traversal)).rejects.toEqual(
      new NpmValidationMaterializationError("invalid_archive")
    );
    await expect(inspectTrustedTarGzipArchive(linked)).rejects.toEqual(
      new NpmValidationMaterializationError("invalid_archive")
    );
  });

  it("rejects unsafe npm specs before inspecting or uploading the archive", async () => {
    const daytona = new FakeMaterializationDaytona();

    await expect(
      new NpmValidationMaterializer(daytona).materialize({
        archive: await sourceArchive(),
        archiveDigest: `sha256:${"1".repeat(64)}`,
        archiveFormat: "tar.gz",
        operation: {
          kind: "set",
          packageName: "payload",
          section: "dependencies",
          version: "git+ssh://attacker.example/repository"
        },
        operationKey: "candidate-1",
        registryHostDigests: [registryDigest],
        sandbox
      })
    ).rejects.toEqual(new NpmValidationMaterializationError("invalid_input"));
    expect(daytona.commands).toHaveLength(0);
  });

  it("fails closed when the sandbox inventory reports anREDACTED changed path", async () => {
    const archive = await sourceArchive();
    const daytona = new FakeMaterializationDaytona();
    daytona.reportUnexpectedChange = true;

    await expect(
      new NpmValidationMaterializer(daytona).materialize({
        archive,
        archiveDigest: await sha256(archive),
        archiveFormat: "tar.gz",
        operation: {
          kind: "set",
          packageName: "zod",
          section: "devDependencies",
          version: "~3.23.0"
        },
        operationKey: "candidate-1",
        registryHostDigests: [registryDigest],
        sandbox
      })
    ).rejects.toEqual(new NpmValidationMaterializationError("unexpected_workspace_change"));
  });
});

class FakeMaterializationDaytona implements NpmMaterializationDaytona {
  readonly commands: ExecuteDaytonaCommandRequest[] = [];
  uploadedArchive: REDACTED | undefined;
  reportUnexpectedChange = false;
  #materialized = false;
  #operation:
    | {
        readonly packageName: string;
        readonly section: string;
        readonly version: string;
      }
    | undefined;
  readonly #originalPackage = {
    dependencies: { react: "^18.2.0" },
    name: "demo",
    packageManager: "npm@11.0.0",
    version: "1.0.0"
  };

  downloadFile(request: DaytonaFileDownloadRequest): Promise<REDACTED> {
    if (request.remotePath.endsWith("/source.tar.gz")) {
      if (this.uploadedArchive === undefined) {
        return Promise.reject(new Error("archive was not uploaded"));
      }
      return Promise.resolve(REDACTED.from(this.uploadedArchive));
    }
    if (request.remotePath.endsWith("/package.json")) {
      return Promise.resolve(
        jsonBytes(
          this.#materialized && this.#operation !== undefined
            ? withDependency(this.#originalPackage, this.#operation)
            : this.#originalPackage
        )
      );
    }
    if (request.remotePath.endsWith("/package-lock.json") && this.#operation !== undefined) {
      const root = withDependency(this.#originalPackage, this.#operation);
      return Promise.resolve(
        jsonBytes({
          lockfileVersion: 3,
          name: "demo",
          packages: { "": root },
          requires: true
        })
      );
    }
    return Promise.reject(new Error(`Unexpected download: ${request.remotePath}`));
  }

  executeCommand(request: ExecuteDaytonaCommandRequest): Promise<ExecuteDaytonaCommandResult> {
    this.commands.push(request);
    if (
      request.executable === "node" &&
      request.arguments[2]?.includes("invalid dependency section") === true
    ) {
      this.#operation = {
        packageName: request.arguments[4] ?? "",
        section: request.arguments[3] ?? "",
        version: request.arguments[6] ?? ""
      };
      this.#materialized = true;
    }
    if (
      request.executable === "node" &&
      request.arguments[2]?.includes("const allowed = new Set") === true
    ) {
      return Promise.resolve(
        commandResult(
          this.reportUnexpectedChange ? 41 : 0,
          this.reportUnexpectedChange
            ? ""
            : JSON.stringify({
                changed: ["package-lock.json", "package.json"]
              })
        )
      );
    }
    return Promise.resolve(commandResult(0, '{"ok":true}'));
  }

  uploadFile(request: DaytonaFileUploadRequest): Promise<void> {
    this.uploadedArchive = REDACTED.from(request.bytes);
    return Promise.resolve();
  }
}

function commandResult(exitCode: number, stdout: string): ExecuteDaytonaCommandResult {
  return {
    commandId: "command-1",
    exitCode,
    receipt: {
      attemptDigest: registryDigest,
      attemptNumber: 1,
      operationKey: "operation-1",
      requestDigest: registryDigest,
      resultDigest: registryDigest
    },
    resourceUsage: { wallTimeMs: 1 },
    stderr: excerpt(""),
    stdout: excerpt(stdout),
    timedOut: false
  };
}

function excerpt(text: string): RedactedExcerpt {
  return {
    byteLength: new TextEncoder().encode(text).byteLength,
    contentDigest: registryDigest,
    redactionPolicyVersion: "test-v1",
    text,
    truncated: false
  };
}

function withDependency(
  original: Readonly<Record<string, unknown>>,
  operation: { readonly packageName: string; readonly section: string; readonly version: string }
): Record<string, unknown> {
  const document = JSON.parse(JSON.stringify(original)) as Record<string, unknown>;
  const section = (document[operation.section] ?? {}) as Record<string, string>;
  section[operation.packageName] = operation.version;
  document[operation.section] = section;
  return document;
}

async function sourceArchive(): Promise<REDACTED> {
  return tarGzip([
    tarEntry("repo", new REDACTED(), "5"),
    tarEntry(
      "repo/package.json",
      jsonBytes({
        dependencies: { react: "^18.2.0" },
        name: "demo",
        packageManager: "npm@11.0.0",
        version: "1.0.0"
      })
    ),
    tarEntry("repo/src/index.js", bytes("export const answer = 42;\n"))
  ]);
}

interface TestTarEntry {
  readonly bytes: REDACTED;
  readonly name: string;
  readonly type: string;
}

function tarEntry(name: string, content: REDACTED, type = "0"): TestTarEntry {
  return { bytes: content, name, type };
}

async function tarGzip(entries: readonly TestTarEntry[]): Promise<REDACTED> {
  const chunks: REDACTED[] = [];
  for (const entry of entries) {
    const header = new REDACTED(512);
    writeText(header, 0, 100, entry.name);
    writeOctal(header, 100, 8, entry.type === "5" ? 0o755 : 0o644);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, entry.bytes.byteLength);
    writeOctal(header, 136, 12, 0);
    header.fill(32, 148, 156);
    writeText(header, 156, 1, entry.type);
    writeText(header, 257, 6, "ustar\0");
    writeText(header, 263, 2, "00");
    const checksum = header.reduce((sum, byte) => sum + byte, 0);
    const checksumText = checksum.toString(8).padStart(6, "0");
    writeText(header, 148, 8, `${checksumText}\0 `);
    chunks.push(header, entry.bytes);
    const padding = (512 - (entry.bytes.byteLength % 512)) % 512;
    if (padding > 0) {
      chunks.push(new REDACTED(padding));
    }
  }
  chunks.push(new REDACTED(1_024));
  const tar = concatenate(chunks);
  const compressed = new Blob([copyBuffer(tar)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return new REDACTED(await new Response(compressed).arrayBuffer());
}

function writeText(target: REDACTED, offset: number, length: number, value: string): void {
  const encoded = new TextEncoder().encode(value);
  if (encoded.byteLength > length) {
    throw new Error("test tar field overflow");
  }
  target.set(encoded, offset);
}

function writeOctal(target: REDACTED, offset: number, length: number, value: number): void {
  writeText(target, offset, length, `${value.toString(8).padStart(length - 1, "0")}\0`);
}

function concatenate(chunks: readonly REDACTED[]): REDACTED {
  const result = new REDACTED(chunks.reduce((total, chunk) => total + chunk.byteLength, 0));
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

function jsonBytes(value: unknown): REDACTED {
  return bytes(`${JSON.stringify(value, null, 2)}\n`);
}

function bytes(value: string): REDACTED {
  return new TextEncoder().encode(value);
}

async function sha256(value: REDACTED Promise<Sha256Digest> {
  const digest = new REDACTED(await crypto.subtle.digest("SHA-256", copyBuffer(value)));
  return `sha256:${Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("")}`;
}

function copyBuffer(value: REDACTED ArrayBuffer {
  const copy = new REDACTED(value.byteLength);
  copy.set(value);
  return copy.buffer;
}
