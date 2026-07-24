import { describe, expect, it } from "vitest";

import {
  parsePythonInstalledGraph,
  parsePythonRepository,
  pipAdapterManifest,
  pythonOperations,
  pythonTargetMatrix,
  uvAdapterManifest
} from "./python.js";

describe("Python pip/uv adapters", () => {
  it("discovers requirements, markers, extras, editable references, imports, and uv locks", () => {
    const snapshot = parsePythonRepository(
      [
        {
          path: "pyproject.toml",
          content: `[project]\nrequires-python = ">=3.12"\ndependencies = ["httpx[http2]>=0.28; sys_platform == 'linux'"]\n[tool.uv.sources]\nlocal-lib = { path = "../local-lib", editable = true }\n`
        },
        {
          path: "requirements-dev.txt",
          content:
            "--index-url https://REDACTED:REDACTED@example.invalid/simple\n-e demo-lib @ file:../demo\npytest==8.4.1\n"
        },
        {
          path: "uv.lock",
          content: `version = 1\n[[package]]\nname = "httpx"\nversion = "0.28.1"\n[[package]]\nname = "anyio"\nversion = "4.9.0"\n`
        },
        {
          path: "src/app.py",
          content: "import httpx\nimport importlib\nplugin = importlib.import_module(plugin_name)\n"
        }
      ],
      "fixture",
      "uv"
    );
    const project = snapshot.projects[0];
    expect(project?.pythonConstraint).toBe(">=3.12");
    expect(project?.declared.map((item) => item.normalizedName)).toEqual([
      "demo-lib",
      "httpx",
      "local-lib",
      "pytest"
    ]);
    expect(project?.declared.find((item) => item.name === "httpx")?.extras).toEqual(["http2"]);
    expect(project?.declared.find((item) => item.name === "pytest")?.indexIdentity).toBe(
      "index:example.invalid"
    );
    expect(JSON.stringify(project)).not.toContain("REDACTED");
    expect(project?.locked.find((item) => item.name === "anyio")?.transitive).toBe(true);
    expect(
      project?.usage.some((item) => item.name === "httpx" && item.certainty === "certain")
    ).toBe(true);
    expect(project?.usage.some((item) => item.certainty === "uncertain")).toBe(true);
  });

  it("normalizes read-only inventory scope and publishes native operation contracts", () => {
    const inventory = parsePythonInstalledGraph(
      JSON.stringify([{ name: "HTTPX", version: "0.28.1", editable_project_location: "/repo" }]),
      "virtual_environment"
    );
    expect(inventory[0]).toMatchObject({
      normalizedName: "httpx",
      environmentScope: "virtual_environment"
    });
    expect(
      pythonOperations("uv", "httpx").find((operation) => operation.kind === "frozen_install")
    ).toMatchObject({ executable: "uv", args: ["sync", "--frozen"] });
    expect(
      pythonOperations("pip", "httpx").find((operation) => operation.kind === "graph")
    ).toMatchObject({ executable: "pip", args: ["inspect"] });
    expect(pythonTargetMatrix.map((target) => `${target.manager}:${target.pythonVersion}`)).toEqual(
      ["pip:3.12.11", "uv:3.12.11"]
    );
    expect(pythonTargetMatrix.map((target) => target.supportLevel)).toEqual([
      "observed_only",
      "observed_only"
    ]);
    for (const manifest of [pipAdapterManifest, uvAdapterManifest]) {
      expect(manifest.identity.supportLevel).toBe("observed_only");
      expect(manifest.managerVersions).toEqual([]);
      expect(manifest.capabilities.mutation).toBe(false);
      expect(manifest.capabilities.validation).toBe(false);
    }
  });

  it("removes REDACTEDs from direct references, diagnostics, and installed inventory", () => {
    const snapshot = parsePythonRepository(
      [
        {
          path: "requirements.txt",
          content:
            "private-lib @ https://REDACTED:REDACTED@example.invalid/private.whl?REDACTED=REDACTED#fragment\n--find-links https://REDACTED:REDACTED@example.invalid/simple\n"
        },
        {
          path: "pyproject.toml",
          content:
            '[tool.uv.sources]\nREDACTED-lib = { git = "git+https://REDACTED:REDACTED@git.example.invalid/team/repo.git?access_REDACTED=REDACTED", editable = true }\n'
        }
      ],
      "redaction-fixture",
      "uv"
    );
    const serialized = JSON.stringify(snapshot);

    expect(serialized).not.toContain("REDACTED");
    expect(serialized).not.toContain("REDACTED");
    expect(serialized).not.toContain("access_REDACTED");
    expect(serialized).not.toContain("REDACTED");
    expect(serialized).not.toContain("REDACTED");
    expect(serialized).toContain("https://example.invalid/private.whl");
    expect(serialized).toContain("git+https://git.example.invalid/team/repo.git");

    const inventory = parsePythonInstalledGraph(
      JSON.stringify([
        {
          editable_project_location: "https://REDACTED:REDACTED@example.invalid/editable?REDACTED=REDACTED",
          name: "private-lib",
          version: "1.0.0"
        }
      ]),
      "virtual_environment"
    );
    expect(JSON.stringify(inventory)).not.toMatch(/REDACTED|REDACTED|REDACTED=REDACTED/u);
  });
});
