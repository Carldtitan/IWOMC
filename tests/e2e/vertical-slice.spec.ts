import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { parseNpmRepository, type RepositoryFile } from "../../packages/adapters/src/index.js";
import {
  buildNpmEvidenceGraphSet,
  reconcileNpmUndeclaredDependencies,
  type NpmCheckpointInput
} from "../../packages/reconciler/src/index.js";
import { describe, expect, it } from "vitest";

const fixtureRoot = path.resolve("fixtures/e2e/npm-undeclared-used");
const repositoryRoot = path.join(fixtureRoot, "repository");
const hiddenPackage = "@fixture/hidden-runtime";

async function repositoryFiles(
  directory = repositoryRoot,
  root = repositoryRoot
): Promise<RepositoryFile[]> {
  const output: RepositoryFile[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      output.push(...(await repositoryFiles(absolute, root)));
    } else {
      output.push({
        content: await readFile(absolute, "utf8"),
        path: path.relative(root, absolute).replaceAll("\\", "/")
      });
    }
  }
  return output.sort((left, right) => left.path.localeCompare(right.path, "en"));
}

async function checkpoint(
  overrides: Partial<Omit<NpmCheckpointInput, "repository">> = {}
): Promise<NpmCheckpointInput> {
  const repository = parseNpmRepository(await repositoryFiles(), "fixture-source");
  return {
    installed: [
      {
        adapter: repository.adapter,
        evidenceId: "evidence-installed-delta",
        name: hiddenPackage,
        projectRoot: "",
        stateEffect: "present",
        targetIds: ["local-windows", "linux-node-22"],
        version: "1.0.0"
      }
    ],
    observedActions: [
      {
        action: "install",
        adapter: repository.adapter,
        attribution: {
          actorId: "codex-session-1",
          actorType: "agent",
          confidence: 0.98
        },
        evidenceId: "evidence-codex-install",
        name: hiddenPackage,
        outcome: "succeeded",
        projectRoot: "",
        stateEffect: "present",
        targetIds: ["local-windows"]
      }
    ],
    repository,
    ...overrides
  };
}

describe("npm undeclared-used first vertical slice", () => {
  it("keeps every proof separate and deterministically creates one finding without an LLM", async () => {
    const input = await checkpoint();
    const firstGraphs = buildNpmEvidenceGraphSet(input);
    const secondGraphs = buildNpmEvidenceGraphSet(input);
    const first = reconcileNpmUndeclaredDependencies(firstGraphs);
    const second = reconcileNpmUndeclaredDependencies(secondGraphs);

    expect(first).toEqual(second);
    expect(first.findings).toHaveLength(1);
    expect(first.findings[0]).toMatchObject({
      affectedIdentities: [{ ecosystem: "npm", normalizedName: hiddenPackage }],
      category: "dependency.used_but_undeclared",
      confidence: {
        attribution: 0.98,
        observation: 0.95,
        semantics: 0.95
      },
      ruleId: "npm.used-installed-observed-undeclared",
      severity: "error"
    });

    expect(firstGraphs.used.nodes[0]?.evidence[0]?.kind).toBe("source_use");
    expect(firstGraphs.installed.nodes[0]?.evidence[0]?.kind).toBe("installed_inventory");
    expect(firstGraphs.observedAction.nodes[0]?.evidence[0]?.kind).toBe("observed_install_action");
    expect(firstGraphs.declared.nodes).toHaveLength(0);
    expect(firstGraphs.locked.nodes).toHaveLength(0);
    expect(first.findings[0]?.supportingEvidence.map((item) => item.evidenceId)).toEqual(
      expect.arrayContaining(["evidence-codex-install", "evidence-installed-delta"])
    );
  });

  it("does not infer a recommendation from installed state, failed intent, or use alone", async () => {
    const installedOnly = reconcileNpmUndeclaredDependencies(
      buildNpmEvidenceGraphSet(await checkpoint({ observedActions: [] }))
    );
    const failedIntent = reconcileNpmUndeclaredDependencies(
      buildNpmEvidenceGraphSet(
        await checkpoint({
          installed: [],
          observedActions: [
            {
              action: "install",
              adapter: (await checkpoint()).repository.adapter,
              attribution: { actorType: "agent", confidence: 0.9 },
              evidenceId: "failed-install",
              name: hiddenPackage,
              outcome: "failed",
              projectRoot: "",
              stateEffect: "none"
            }
          ]
        })
      )
    );
    const useOnly = reconcileNpmUndeclaredDependencies(
      buildNpmEvidenceGraphSet(await checkpoint({ installed: [], observedActions: [] }))
    );

    expect(installedOnly.findings).toHaveLength(0);
    expect(installedOnly.uncertainties.map((item) => item.code)).toContain("incomplete_capture");
    expect(failedIntent.findings).toHaveLength(0);
    expect(failedIntent.uncertainties.map((item) => item.code)).toContain(
      "use_without_installed_effect"
    );
    expect(useOnly.findings).toHaveLength(0);
    expect(useOnly.uncertainties.map((item) => item.code)).toContain(
      "use_without_installed_effect"
    );
  });
});
