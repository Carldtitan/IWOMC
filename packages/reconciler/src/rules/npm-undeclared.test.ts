import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { buildEvidenceGraphSet } from "../graphs/build.js";
import type { AdapterInputIdentity, Attribution, EvidenceNodeInput } from "../graphs/types.js";
import {
  buildNpmEvidenceGraphSet,
  type NpmCheckpointInput,
  type NpmRepositorySnapshotLike
} from "../npm-checkpoint.js";
import { reconcileNpmUndeclaredDependencies } from "./npm-undeclared.js";

const packageName = "@fixture/hidden-runtime";
const repositoryAdapter: AdapterInputIdentity = Object.freeze({
  adapterId: "node/npm",
  adapterVersion: "1.0.0",
  inputSourceId: "fixture-commit",
  supportLevel: "native_validation"
});
const inventoryAdapter: AdapterInputIdentity = Object.freeze({
  adapterId: "companion/node/npm",
  adapterVersion: "1.0.0",
  inputSourceId: "inventory-after-session",
  supportLevel: "full_native"
});

describe("npm used, installed, observed, but undeclared rule", () => {
  it("produces exactly one evidence-backed stable finding for the vertical fixture", () => {
    const input = positiveCheckpoint();
    const graphs = buildNpmEvidenceGraphSet(input);
    const first = reconcileNpmUndeclaredDependencies(graphs);
    const second = reconcileNpmUndeclaredDependencies(buildNpmEvidenceGraphSet(input));

    expect(graphs.all.map(({ kind }) => kind)).toEqual([
      "declared",
      "locked",
      "resolved",
      "installed",
      "used",
      "observed_action",
      "validated"
    ]);
    expect(first).toEqual(second);
    expect(first.findings).toHaveLength(1);
    expect(first.findings[0]?.affectedIdentities[0]).toMatchObject({
      ecosystem: "npm",
      normalizedName: packageName,
      scope: ""
    });
    expect(first.findings[0]?.category).toBe("dependency.used_but_undeclared");
    expect(first.findings[0]?.confidence).toMatchObject({
      attribution: 0.94,
      observation: 0.95,
      semantics: 0.95,
      validation: 1
    });
    expect(first.findings[0]?.gapIds).toEqual([]);
    expect(first.findings[0]?.ruleId).toBe("npm.used-installed-observed-undeclared");
    expect(first.findings[0]?.supportLevel).toBe("native_validation");
    const supportingEvidenceIds =
      first.findings[0]?.supportingEvidence.map(({ evidenceId }) => evidenceId) ?? [];
    expect(supportingEvidenceIds).toContain("installed-1");
    expect(supportingEvidenceIds).toContain("install-action-1");
    expect(first.uncertainties).toEqual([]);
    expect(Object.isFrozen(graphs)).toBe(true);
    expect(Object.isFrozen(graphs.used.nodes)).toBe(true);
    expect(Object.isFrozen(first.findings[0])).toBe(true);
  });

  it.each([
    {
      label: "installed-only evidence",
      mutate: (input: NpmCheckpointInput): NpmCheckpointInput => ({
        ...input,
        observedActions: [],
        repository: repositorySnapshot({ usage: [] }),
        validated: []
      }),
      uncertainty: "installed_without_use"
    },
    {
      label: "failed installation without installed effect",
      mutate: (input: NpmCheckpointInput): NpmCheckpointInput => ({
        ...input,
        installed: [],
        observedActions: [
          {
            ...observedInstall(),
            outcome: "failed",
            stateEffect: "none"
          }
        ],
        repository: repositorySnapshot({ usage: [] }),
        validated: []
      }),
      uncertainty: "failed_install_without_effect"
    },
    {
      label: "static use without installed-state evidence",
      mutate: (input: NpmCheckpointInput): NpmCheckpointInput => ({
        ...input,
        installed: [],
        observedActions: [],
        validated: []
      }),
      uncertainty: "use_without_installed_effect"
    },
    {
      label: "dynamic use",
      mutate: (input: NpmCheckpointInput): NpmCheckpointInput => ({
        ...input,
        repository: repositorySnapshot({
          certainty: "uncertain",
          executable: false,
          usageKind: "dynamic_import"
        }),
        validated: []
      }),
      uncertainty: "installed_without_use"
    }
  ])("does not overclaim for $label", ({ mutate, uncertainty }) => {
    const result = reconcileNpmUndeclaredDependencies(
      buildNpmEvidenceGraphSet(mutate(positiveCheckpoint()))
    );

    expect(result.findings).toEqual([]);
    expect(result.uncertainties).toEqual([expect.objectContaining({ code: uncertainty })]);
  });

  it("does not report a dependency that the manifest already declares", () => {
    const input = positiveCheckpoint();
    const result = reconcileNpmUndeclaredDependencies(
      buildNpmEvidenceGraphSet({
        ...input,
        repository: repositorySnapshot({ declared: true })
      })
    );

    expect(result.findings).toEqual([]);
    expect(result.uncertainties).toEqual([]);
  });

  it("keeps unsupported evidence and capture gaps as uncertainty, never a finding", () => {
    const unsupported = {
      ...inventoryAdapter,
      supportLevel: "unsupported" as const
    };
    const input = positiveCheckpoint();
    const graphs = buildNpmEvidenceGraphSet({
      ...input,
      additionalGaps: [
        {
          adapter: unsupported,
          code: "unsupported_hosted_execution",
          message: "No terminal inventory was available"
        }
      ],
      installed: (input.installed ?? []).map((item) => ({
        ...item,
        adapter: unsupported
      })),
      observedActions: (input.observedActions ?? []).map((item) => ({
        ...item,
        adapter: unsupported
      }))
    });
    const result = reconcileNpmUndeclaredDependencies(graphs);

    expect(result.findings).toEqual([]);
    expect(result.uncertainties).toEqual([
      expect.objectContaining({ code: "unsupported_evidence" })
    ]);
    expect(result.gaps).toEqual([
      expect.objectContaining({
        code: "unsupported_hosted_execution",
        message: "No terminal inventory was available"
      })
    ]);
  });

  it("isolates ecosystem identities", () => {
    const npmUse = node("npm", "used", {
      certainty: "certain",
      executable: true
    });
    const pipInstalled = node("pip", "installed", { stateEffect: "present" });
    const pipAction = node("pip", "action", {
      action: "install",
      outcome: "succeeded",
      stateEffect: "present"
    });
    const result = reconcileNpmUndeclaredDependencies(
      buildEvidenceGraphSet({
        installed: [pipInstalled],
        observedAction: [pipAction],
        used: [npmUse]
      })
    );

    expect(result.findings).toEqual([]);
    expect(result.uncertainties).toEqual([
      expect.objectContaining({ code: "use_without_installed_effect" })
    ]);
  });

  it("keeps actor attribution separate from effect and necessity", () => {
    const agent = reconcileNpmUndeclaredDependencies(
      buildNpmEvidenceGraphSet(positiveCheckpoint())
    );
    const human = reconcileNpmUndeclaredDependencies(
      buildNpmEvidenceGraphSet(positiveCheckpoint({ actorType: "human", confidence: 0.55 }))
    );

    expect(human.findings[0]?.category).toBe(agent.findings[0]?.category);
    expect(human.findings[0]?.confidence.necessity).toBe(agent.findings[0]?.confidence.necessity);
    expect(human.findings[0]?.confidence.attribution).toBe(0.55);
  });

  it("is byte-deterministic for every permutation of equivalent evidence", () => {
    const base = positiveCheckpoint();
    const installed = [
      ...(base.installed ?? []),
      { ...(base.installed?.[0] ?? installedPackage()), evidenceId: "installed-2" }
    ];
    const actions = [
      ...(base.observedActions ?? []),
      { ...(base.observedActions?.[0] ?? observedInstall()), evidenceId: "action-2" }
    ];
    const validated = [
      ...(base.validated ?? []),
      { ...(base.validated?.[0] ?? validatedPackage()), evidenceId: "validation-2" }
    ];
    const expected = JSON.stringify(
      reconcileNpmUndeclaredDependencies(
        buildNpmEvidenceGraphSet({
          ...base,
          installed,
          observedActions: actions,
          validated
        })
      )
    );

    fc.assert(
      fc.property(
        fc.shuffledSubarray(installed, {
          minLength: installed.length,
          maxLength: installed.length
        }),
        fc.shuffledSubarray(actions, {
          minLength: actions.length,
          maxLength: actions.length
        }),
        fc.shuffledSubarray(validated, {
          minLength: validated.length,
          maxLength: validated.length
        }),
        (installedPermutation, actionPermutation, validationPermutation) => {
          const actual = JSON.stringify(
            reconcileNpmUndeclaredDependencies(
              buildNpmEvidenceGraphSet({
                ...base,
                installed: installedPermutation,
                observedActions: actionPermutation,
                validated: validationPermutation
              })
            )
          );
          expect(actual).toBe(expected);
        }
      )
    );
  });
});

function positiveCheckpoint(attribution: Attribution = agentAttribution()): NpmCheckpointInput {
  return {
    installed: [installedPackage()],
    observedActions: [observedInstall(attribution)],
    repository: repositorySnapshot(),
    validated: [validatedPackage()]
  };
}

function repositorySnapshot(
  options: {
    readonly certainty?: "certain" | "uncertain";
    readonly declared?: boolean;
    readonly executable?: boolean;
    readonly usage?: readonly never[];
    readonly usageKind?: string;
  } = {}
): NpmRepositorySnapshotLike {
  const location = { line: 1, path: "src/message.mjs" };
  const usage = options.usage ?? [
    {
      adapter: repositoryAdapter,
      certainty: options.certainty ?? "certain",
      executable: options.executable ?? true,
      kind: options.usageKind ?? "static_import",
      normalizedName: packageName,
      projectRoot: "",
      sourceLocation: location
    }
  ];
  return {
    adapter: repositoryAdapter,
    projects: [
      {
        declared:
          options.declared === true
            ? [
                {
                  adapter: repositoryAdapter,
                  kind: "production",
                  normalizedName: packageName,
                  projectRoot: "",
                  sourceLocation: { line: 3, path: "package.json" },
                  specifier: "file:./vendor/hidden-runtime"
                }
              ]
            : [],
        gaps:
          options.certainty === "uncertain"
            ? [
                {
                  code: "uncertain_dynamic_use",
                  message: "Dynamic use is uncertain",
                  sourceLocation: location
                }
              ]
            : [],
        locked: [],
        projectRoot: "",
        usage
      }
    ]
  };
}

function installedPackage() {
  return {
    adapter: inventoryAdapter,
    evidenceId: "installed-1",
    name: packageName,
    projectRoot: "",
    stateEffect: "present" as const,
    targetIds: ["local-node-22"],
    version: "1.0.0"
  };
}

function observedInstall(attribution: Attribution = agentAttribution()) {
  return {
    action: "install" as const,
    adapter: inventoryAdapter,
    attribution,
    evidenceId: "install-action-1",
    name: packageName,
    outcome: "succeeded" as const,
    projectRoot: "",
    stateEffect: "present" as const,
    targetIds: ["local-node-22"]
  };
}

function validatedPackage() {
  return {
    adapter: inventoryAdapter,
    evidenceId: "validation-1",
    name: packageName,
    outcome: "passed" as const,
    projectRoot: "",
    targetIds: ["local-node-22"]
  };
}

function agentAttribution(): Attribution {
  return { actorId: "codex-session-1", actorType: "agent", confidence: 0.94 };
}

function node(
  ecosystem: string,
  evidenceId: string,
  attributes: Readonly<Record<string, boolean | string>>
): EvidenceNodeInput {
  return {
    adapter: inventoryAdapter,
    attributes,
    confidence: 1,
    evidence: [
      {
        evidenceId,
        inputSourceId: inventoryAdapter.inputSourceId,
        kind: "test",
        summary: evidenceId
      }
    ],
    identity: {
      ecosystem,
      normalizedName: packageName,
      scope: ""
    }
  };
}
