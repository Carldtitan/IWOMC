import { DaytonaClient } from "../packages/integrations/src/daytona/client.js";
import type {
  DaytonaSandboxReference,
  ExternalOperationContext,
  Sha256Digest
} from "../packages/integrations/src/ports/index.js";

const digest = (character: string): Sha256Digest =>
  `sha256:${character.repeat(64)}` as Sha256Digest;
const runDigest = digest("a");
const context = (operationKey: string): ExternalOperationContext => ({
  attemptNumber: 1,
  budget: { maxAttempts: 1, timeoutMs: 180_000 },
  operationKey,
  requestDigest: digest("b")
});
const client = new DaytonaClient({
  apiKey: process.env.DAYTONA_API_KEY ?? "",
  apiUrl: process.env.DAYTONA_API_URL ?? "",
  target: process.env.DAYTONA_TARGET ?? ""
});

let sandbox: DaytonaSandboxReference | undefined;
let executed = false;
let outputBounded = false;
let deleted = false;
try {
  const provisioned = await client.provisionSandbox({
    autoDeleteAfterSeconds: 600,
    context: context("live-smoke:provision"),
    labels: [
      { key: "operation-key", value: "live-smoke:provision" },
      { key: "organization-pseudonym", value: digest("c") },
      { key: "project-pseudonym", value: digest("d") },
      { key: "run-pseudonym", value: runDigest },
      { key: "target-digest", value: digest("e") }
    ],
    maxProvisioningTimeMs: 120_000,
    target: {
      architecture: "amd64",
      cpuCores: 1,
      diskMiB: 3_072,
      imageReference: "daytona-default",
      memoryMiB: 1_024,
      operatingSystem: "linux"
    }
  });
  sandbox = provisioned.sandbox;
  const result = await client.executeCommand({
    arguments: ["--version"],
    context: context("live-smoke:execute"),
    executable: "node",
    maxOutputBytes: 1_024,
    networkPolicy: { allowedHostDigests: [], mode: "deny-all" },
    sandbox,
    REDACTEDBindings: [],
    timeoutMs: 90_000,
    workingDirectory: "/home/daytona"
  });
  executed = result.exitCode === 0 && result.stdout.text.startsWith("v");
  outputBounded = result.stdout.byteLength <= 1_024 && result.stderr.byteLength <= 1_024;
} finally {
  if (sandbox !== undefined) {
    const cleanup = await client.deleteSandbox({
      context: context("live-smoke:cleanup"),
      expectedRunDigest: runDigest,
      maxCleanupTimeMs: 120_000,
      reasonCode: "completed",
      sandbox
    });
    deleted = cleanup.deleted;
  }
}

const ok = executed && outputBounded && deleted;
console.log(
  JSON.stringify({ ok, provisioned: sandbox !== undefined, executed, outputBounded, deleted })
);
if (!ok) {
  process.exit(1);
}
