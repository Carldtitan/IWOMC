import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const extensionRoot = join(repositoryRoot, "apps", "extension");
const platform = process.platform;
const architecture = process.arch;

if (!["win32", "linux"].includes(platform)) {
  throw new Error(`Companion packaging is unsupported on ${platform}.`);
}
if (!["x64", "arm64"].includes(architecture)) {
  throw new Error(`Companion packaging is unsupported on ${architecture}.`);
}

const build = spawnSync(
  platform === "win32" ? "cargo.exe" : "cargo",
  ["build", "--locked", "--release", "--package", "environment-REDACTED-companion"],
  {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: "inherit",
    windowsHide: true
  }
);
if (build.status !== 0) {
  throw new Error(`Companion release build failed with status ${String(build.status)}.`);
}

const binaryName =
  platform === "win32"
    ? "environment-REDACTED-companion.exe"
    : "environment-REDACTED-companion";
const builtBinary = join(repositoryRoot, "target", "release", binaryName);
const packagedBinary = join(extensionRoot, "bin", platform, architecture, binaryName);
mkdirSync(dirname(packagedBinary), { recursive: true });
copyFileSync(builtBinary, packagedBinary);

const relativePath = relative(extensionRoot, packagedBinary).split(sep).join("/");
const sha256 = createHash("sha256").update(readFileSync(packagedBinary)).digest("hex");
const manifest = {
  entries: [
    {
      architecture,
      platform,
      relativePath,
      sha256
    }
  ],
  schemaVersion: 1
};
writeFileSync(
  join(extensionRoot, "bin", "companion-manifest.json"),
  `${JSON.stringify(manifest, null, 2)}\n`,
  "utf8"
);

console.log(
  JSON.stringify({
    architecture,
    binary: relativePath,
    platform,
    sha256
  })
);
