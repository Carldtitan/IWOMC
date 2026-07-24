import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { NpmAdapterError, parseNpmRepository } from "./npm.js";
import type { RepositoryFile } from "../types.js";

const fixtureRepository = resolve(
  import.meta.dirname,
  "../../../../fixtures/e2e/npm-undeclared-used/repository"
);

describe("npm repository adapter", () => {
  it("semantically parses the vertical fixture and proves executable static use", () => {
    const snapshot = parseNpmRepository(
      fixtureFiles([
        "package.json",
        "package-lock.json",
        "src/message.mjs",
        "mutable-local-setup.mjs"
      ]),
      "fixture-commit"
    );

    expect(snapshot.projects).toHaveLength(1);
    expect(snapshot.projects[0]).toMatchObject({
      declared: [],
      gaps: [],
      lockfileVersion: 3,
      locked: [],
      projectRoot: ""
    });
    expect(snapshot.projects[0]?.usage).toHaveLength(1);
    expect(snapshot.projects[0]?.usage[0]).toMatchObject({
      certainty: "certain",
      executable: true,
      kind: "static_import",
      normalizedName: "@fixture/hidden-runtime"
    });
    expect(snapshot.projects[0]?.usage[0]?.sourceLocation.path).toBe("src/message.mjs");
  });

  it("preserves direct/transitive, group, engine, platform, and scoped identity semantics", () => {
    const snapshot = parseNpmRepository(
      [
        file(
          "package.json",
          JSON.stringify({
            dependencies: { "@scope/direct": "^2.0.0" },
            devDependencies: { testkit: "1.0.0" }
          })
        ),
        file(
          "package-lock.json",
          JSON.stringify({
            lockfileVersion: 2,
            packages: {
              "": {},
              "node_modules/@scope/direct": {
                cpu: ["x64"],
                engines: { node: ">=22" },
                integrity: "sha512-safe",
                os: ["linux"],
                resolved: "https://registry.example/direct.tgz",
                version: "2.1.0"
              },
              "node_modules/@scope/direct/node_modules/transitive": {
                optional: true,
                version: "3.0.0"
              },
              "node_modules/testkit": { dev: true, version: "1.0.0" }
            }
          })
        )
      ],
      "commit-a"
    );

    expect(snapshot.projects[0]?.locked).toEqual([
      expect.objectContaining({
        architecture: ["x64"],
        dependencyKind: "production",
        direct: true,
        engines: { node: ">=22" },
        normalizedName: "@scope/direct",
        platform: ["linux"],
        transitive: false
      }),
      expect.objectContaining({
        dependencyKind: "optional",
        direct: false,
        normalizedName: "transitive",
        optional: true,
        transitive: true
      }),
      expect.objectContaining({
        dependencyKind: "development",
        direct: true,
        normalizedName: "testkit"
      })
    ]);
  });

  it("marks dynamic and unreferenced imports uncertain and ignores Node built-ins", () => {
    const snapshot = parseNpmRepository(
      [
        file("package.json", "{}"),
        file(
          "src/index.ts",
          [
            'import { unused } from "not-executed";',
            'import { readFile } from "node:fs";',
            'const loaded = import("maybe-runtime");',
            "void loaded;"
          ].join("\n")
        )
      ],
      "commit-b"
    );

    expect(
      snapshot.projects[0]?.usage.map(({ certainty, normalizedName }) => ({
        certainty,
        normalizedName
      }))
    ).toEqual([
      { certainty: "uncertain", normalizedName: "not-executed" },
      { certainty: "uncertain", normalizedName: "maybe-runtime" }
    ]);
    expect(snapshot.projects[0]?.gaps.map(({ code }) => code)).toEqual([
      "uncertain_dynamic_use",
      "uncertain_static_use"
    ]);
  });

  it("reports unsupported locks without treating text as a resolved graph", () => {
    const snapshot = parseNpmRepository(
      [
        file("package.json", '{"dependencies":{"left-pad":"1.3.0"}}'),
        file(
          "package-lock.json",
          '{"lockfileVersion":1,"dependencies":{"left-pad":{"version":"1.3.0"}}}'
        )
      ],
      "commit-c"
    );

    expect(snapshot.projects[0]?.declared).toHaveLength(1);
    expect(snapshot.projects[0]?.locked).toEqual([]);
    expect(snapshot.projects[0]?.gaps).toEqual([
      expect.objectContaining({ code: "unsupported_lockfile_version" })
    ]);
  });

  it("rejects paths that could cross the repository boundary", () => {
    expect(() => parseNpmRepository([file("../package.json", "{}")], "commit-d")).toThrowError(
      NpmAdapterError
    );
  });
});

function fixtureFiles(paths: readonly string[]): readonly RepositoryFile[] {
  return paths.map((path) => file(path, readFileSync(resolve(fixtureRepository, path), "utf8")));
}

function file(path: string, content: string): RepositoryFile {
  return { content, path };
}
