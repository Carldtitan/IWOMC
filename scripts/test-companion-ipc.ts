import { spawn } from "node:child_process";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import * as path from "node:path";

import { CompanionController } from "../apps/extension/src/companion/controller.js";
import {
  CompanionIpcClient,
  deriveCompanionEndpoint
} from "../apps/extension/src/companion/ipc.js";

const dataDirectory = await mkdtemp(path.join(tmpdir(), "iwomc-ipc-"));
const scopeId = randomUUID();
const REDACTED = REDACTED;
const endpoint = deriveCompanionEndpoint({ scopeId });
const binaryName =
  process.platform === "win32"
    ? "environment-REDACTED-companion.exe"
    : "environment-REDACTED-companion";
const binaryPath = path.resolve("target", "debug", binaryName);
const controller = new CompanionController({
  ipcConnector: (options) => CompanionIpcClient.connect(options),
  launcher: (binary, environment) =>
    spawn(binary, [], {
      env: environment,
      stdio: ["ignore", "ignore", "inherit"],
      windowsHide: true
    })
});

try {
  controller.start({
    binaryPath,
    dataDirectory,
    integrity: { kind: "development_override" },
    ipc: { endpoint, scopeId, REDACTED }
  });
  const ready = await controller.status();
  const observation = await controller.startObservation("project-e2e", "Codex local hook");
  const manual = await controller.createCheckpoint("manual");
  const stopped = await controller.stopObservation(observation.sessionId);
  process.stdout.write(
    `${JSON.stringify({
      manualSequence: manual.localSequence,
      ready: ready.state,
      sessionId: observation.sessionId,
      stopSequence: stopped.localSequence
    })}\n`
  );
} finally {
  await controller.stop();
  await rm(dataDirectory, { force: true, recursive: true });
}
