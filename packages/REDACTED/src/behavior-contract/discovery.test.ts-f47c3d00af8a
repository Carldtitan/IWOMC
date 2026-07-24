import { describe, expect, it } from "vitest";

import {
  BehaviorDiscoveryError,
  discoverNpmBehaviorSteps,
  type DiscoverySource,
  type NpmBehaviorDiscoveryInput
} from "./discovery.js";

const digestA = `sha256:${"a".repeat(64)}`;
const digestB = `sha256:${"b".repeat(64)}`;
const digestC = `sha256:${"c".repeat(64)}`;

function source(
  sourceId: string,
  path: string,
  contentDigest: string,
  content: string,
  workingDirectory = "repository"
): DiscoverySource {
  return {
    sourceId,
    evidenceReferenceId: `evidence:${sourceId}`,
    path,
    contentDigest,
    content,
    workingDirectory
  };
}

function discoveryInput(ciSources: readonly DiscoverySource[]): NpmBehaviorDiscoveryInput {
  return {
    packageJson: source(
      "source:package-json",
      "repository/package.json",
      digestA,
      JSON.stringify({
        packageManager: "npm@11.0.0",
        scripts: {
          "test:smoke": "node smoke.js",
          lint: "eslint .",
          build: "tsc -p tsconfig.build.json",
          test: "vitest run",
          "type-check": "tsc --noEmit",
          bench: "node benchmark.js"
        }
      })
    ),
    packageLock: {
      sourceId: "source:package-lock",
      evidenceReferenceId: "evidence:package-lock",
      path: "repository/package-lock.json",
      contentDigest: digestB,
      workingDirectory: "repository"
    },
    ciSources,
    targetSelector: "linux-node-22",
    realmId: "realm:host-1"
  };
}

describe("npm behavior-command discovery", () => {
  it("discovers package scripts and common CI run forms with complete deterministic fields", async () => {
    const github = source(
      "source:github-ci",
      "repository/.github/workflows/ci.yml",
      digestC,
      [
        "jobs:",
        "  test:",
        "    steps:",
        "      - run: npm ci",
        "      - run: |",
        "          npm run build",
        "          cd packages/api && npm run test:integration"
      ].join("\n")
    );
    const gitlab = source(
      "source:gitlab-ci",
      "repository/.gitlab-ci.yml",
      `sha256:${"d".repeat(64)}`,
      ["test:", "  script:", "    - npm run lint -- --max-warnings=0"].join("\n")
    );

    const first = await discoverNpmBehaviorSteps(discoveryInput([gitlab, github]));
    const second = await discoverNpmBehaviorSteps(discoveryInput([github, gitlab]));

    expect(second).toEqual(first);
    expect(first.steps.map(({ kind }) => kind)).toEqual([
      "install",
      "build",
      "lint",
      "lint",
      "typecheck",
      "test",
      "test",
      "smoke",
      "benchmark"
    ]);
    expect(first.steps.map(({ order }) => order)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
    expect(first.steps.every(({ enabled }) => enabled)).toBe(true);
    expect(first.steps.every(({ executable }) => executable === "npm")).toBe(true);
    expect(first.steps.every(({ expectedExitStatuses }) => expectedExitStatuses[0] === 0)).toBe(
      true
    );
    expect(first.steps.every(({ assertions }) => assertions[0]?.kind === "exit_status")).toBe(true);
    expect(first.steps.every(({ targetSelector }) => targetSelector === "linux-node-22")).toBe(
      true
    );
    expect(first.steps.every(({ realmId }) => realmId === "realm:host-1")).toBe(true);
    expect(
      first.steps.every(({ discoveryFingerprint }) =>
        /^sha256:[a-f0-9]{64}$/u.test(discoveryFingerprint)
      )
    ).toBe(true);
    expect(
      first.steps.find(({ arguments: arguments_ }) => arguments_.includes("test:integration"))
        ?.workingDirectory
    ).toBe("repository/packages/api");
    expect(first.steps.at(-1)?.required).toBe(false);
    expect(first.invalidationSourceIds).toEqual([
      "source:github-ci",
      "source:gitlab-ci",
      "source:package-json",
      "source:package-lock"
    ]);
  });

  it("uses lock-aware native install discovery and rejects unsafe or mismatched sources", async () => {
    const result = await discoverNpmBehaviorSteps(discoveryInput([]));
    expect(result.steps[0]).toEqual(
      expect.objectContaining({ kind: "install", arguments: ["ci"], required: true })
    );

    await expect(
      discoverNpmBehaviorSteps({
        ...discoveryInput([]),
        packageJson: source(
          "source:package-json",
          "repository/package.json",
          digestA,
          JSON.stringify({ packageManager: "pnpm@10.0.0", scripts: { test: "vitest" } })
        )
      })
    ).rejects.toBeInstanceOf(BehaviorDiscoveryError);
    await expect(
      discoverNpmBehaviorSteps({
        ...discoveryInput([]),
        packageJson: {
          ...discoveryInput([]).packageJson,
          workingDirectory: "../repository"
        }
      })
    ).rejects.toBeInstanceOf(BehaviorDiscoveryError);
  });
});
