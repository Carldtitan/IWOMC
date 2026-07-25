import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

const fixtureRoot = resolve("fixtures/e2e/npm-undeclared-used");
let temporaryRoot = "";

function npm(cwd: string, arguments_: readonly string[]) {
  const npmArguments =
    process.platform === "win32"
      ? [join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")]
      : [];

  return spawnSync(
    process.platform === "win32" ? process.execPath : "npm",
    [...npmArguments, ...arguments_],
    {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 90_000
    }
  );
}

beforeAll(async () => {
  temporaryRoot = await mkdtemp(join(tmpdir(), "environment-reconciler-npm-fixture-"));
});

afterAll(async () => {
  if (temporaryRoot !== "") {
    await rm(temporaryRoot, { force: true, recursive: true });
  }
});

async function copyRepository(name: string): Promise<string> {
  const destination = join(temporaryRoot, name);
  await cp(join(fixtureRoot, "repository"), destination, { recursive: true });
  return destination;
}

function cleanInstall(cwd: string) {
  return npm(cwd, ["ci", "--offline", "--ignore-scripts", "--no-audit", "--no-fund"]);
}

describe("npm undeclared-used corpus fixture", () => {
  it("fails from the unchanged clean declaration", async () => {
    const repository = await copyRepository("baseline");

    expect(cleanInstall(repository).status).toBe(0);
    const behavior = npm(repository, ["test"]);

    expect(behavior.status).not.toBe(0);
    expect(`${behavior.stdout}${behavior.stderr}`).toContain("ERR_MODULE_NOT_FOUND");
  }, 120_000);

  it("passes only in the mutable environment after a no-save install", async () => {
    const repository = await copyRepository("mutable");

    const setup = spawnSync(process.execPath, [join(repository, "mutable-local-setup.mjs")], {
      cwd: repository,
      encoding: "utf8",
      stdio: "pipe",
      timeout: 30_000
    });

    expect(setup.status).toBe(0);
    expect(npm(repository, ["test"]).status).toBe(0);
  }, 120_000);

  it("passes cleanly after applying the native package and lock changes", async () => {
    const repository = await copyRepository("candidate");
    const [packageJson, packageLock] = await Promise.all([
      readFile(join(fixtureRoot, "expected", "package.json"), "utf8"),
      readFile(join(fixtureRoot, "expected", "package-lock.json"), "utf8")
    ]);
    await Promise.all([
      writeFile(join(repository, "package.json"), packageJson, "utf8"),
      writeFile(join(repository, "package-lock.json"), packageLock, "utf8")
    ]);

    expect(cleanInstall(repository).status).toBe(0);
    expect(npm(repository, ["test"]).status).toBe(0);
  }, 120_000);
});
