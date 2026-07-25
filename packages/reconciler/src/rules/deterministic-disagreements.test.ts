import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { buildEvidenceGraphSet } from "../graphs/build.js";
import type {
  AdapterInputIdentity,
  EvidenceGraphSetInput,
  EvidenceNodeInput,
  ResourceIdentity
} from "../graphs/types.js";
import { reconcileDeterministicDisagreements } from "./deterministic-disagreements.js";

const adapter = Object.freeze({
  adapterId: "test/native",
  adapterVersion: "1.0.0",
  inputSourceId: "immutable-input",
  supportLevel: "full_native" as const
});

describe("deterministic disagreement rules", () => {
  it.each([
    expected("dependency.used_but_undeclared", {
      installed: [node("installed", { stateEffect: "present" })],
      used: [certainUse()]
    }),
    expected("dependency.observed_install_without_declaration", {
      installed: [node("installed", { stateEffect: "present" })],
      observedAction: [
        node("action", {
          action: "install",
          outcome: "succeeded",
          stateEffect: "present"
        })
      ]
    }),
    expected("environment.hidden_dependency", {
      installed: [node("installed", { layerKind: "base_image", stateEffect: "present" })],
      used: [certainUse()]
    }),
    expected("dependency.resolution_disagreement", {
      declared: [node("manifest", { exactVersion: true }, { versionOrConstraint: "1.0.0" })],
      locked: [node("lock", { exactVersion: true }, { versionOrConstraint: "2.0.0" })]
    }),
    expected("dependency.declared_absent_from_clean_resolution", {
      declared: [node("manifest")],
      resolved: [node("resolution", { cleanResolution: true, stateEffect: "absent" })]
    }),
    ...mismatchCases(),
    expected("repository.required_setup_absent", {
      used: [
        node("use", {
          certainty: "certain",
          executable: true,
          required: true,
          resourceKind: "system_package"
        })
      ]
    }),
    expected("repository.intent_contradicted", {
      declared: [
        node("intent", {
          configurationKey: "node-version",
          configurationKind: "ci",
          configurationRole: "repository_intent",
          configurationValue: "20"
        })
      ],
      resolved: [
        node("actual", {
          configurationKey: "node-version",
          configurationKind: "ci",
          configurationRole: "observed_configuration",
          configurationValue: "22"
        })
      ]
    }),
    ...["redundant", "stale", "shadowed", "apparently_unused"].map((status) =>
      expected(`dependency.${status}`, {
        declared: [
          node("manifest", {
            dependencyStatus: status,
            necessityEvidenceComplete: status !== "apparently_unused"
          })
        ]
      })
    )
  ])("emits $category only from conclusive facts", ({ category, input }) => {
    const result = reconcileDeterministicDisagreements(buildEvidenceGraphSet(input));

    expect(result.findings.map((finding) => finding.category)).toEqual([category]);
    expect(result.findings[0]).toMatchObject({
      ruleId: "core.deterministic-disagreements",
      supportLevel: "full_native"
    });
    expect(result.findings[0]?.supportingEvidence.length).toBeGreaterThan(0);
  });

  it("keeps failed installation and capture gaps as uncertainty", () => {
    const result = reconcileDeterministicDisagreements(
      buildEvidenceGraphSet({
        gaps: [
          { adapter, code: "inventory_incomplete", message: "Inventory ended early" },
          {
            adapter: { ...adapter, supportLevel: "unsupported" },
            code: "unsupported_manager",
            message: "Manager is not supported"
          }
        ],
        observedAction: [
          node("failed", {
            action: "install",
            outcome: "failed",
            stateEffect: "none"
          })
        ]
      })
    );

    expect(result.findings).toEqual([]);
    expect(result.uncertainties.map(({ code }) => code).sort()).toEqual([
      "failed_install_without_effect",
      "incomplete_capture",
      "unsupported_capture"
    ]);
  });

  it.each([
    negative("installed state alone", {
      installed: [node("installed", { stateEffect: "present" })]
    }),
    negative("static use alone", { used: [certainUse()] }),
    negative("compatible range and resolved version", {
      declared: [node("manifest", {}, { versionOrConstraint: "^1.0.0" })],
      locked: [node("lock", {}, { versionOrConstraint: "1.4.0" })]
    }),
    negative("absence without completed clean resolution", {
      declared: [node("manifest")],
      resolved: [node("resolution", { stateEffect: "absent" })]
    }),
    negative("apparently unused contradicted by use", {
      declared: [
        node("manifest", {
          dependencyStatus: "apparently_unused",
          necessityEvidenceComplete: true
        })
      ],
      used: [certainUse()]
    })
  ])("does not overclaim for $label", ({ input }) => {
    expect(reconcileDeterministicDisagreements(buildEvidenceGraphSet(input)).findings).toEqual([]);
  });

  it("does not let observed-only evidence drive a finding", () => {
    const observed = { ...adapter, supportLevel: "observed_only" as const };
    const result = reconcileDeterministicDisagreements(
      buildEvidenceGraphSet({
        installed: [node("installed", { stateEffect: "present" }, {}, observed)],
        used: [node("used", { certainty: "certain", executable: true }, {}, observed)]
      })
    );

    expect(result.findings).toEqual([]);
    expect(result.uncertainties).toEqual([
      expect.objectContaining({ code: "unsupported_evidence" })
    ]);
  });

  it("is byte deterministic under arbitrary graph-node permutations", () => {
    const input: EvidenceGraphSetInput = {
      declared: [
        node("a", { exactVersion: true }, { versionOrConstraint: "1.0.0" }),
        node("b", { exactVersion: true }, { versionOrConstraint: "1.0.0" })
      ],
      locked: [
        node("c", { exactVersion: true }, { versionOrConstraint: "2.0.0" }),
        node("d", { exactVersion: true }, { versionOrConstraint: "2.0.0" })
      ]
    };
    const expectedJson = JSON.stringify(
      reconcileDeterministicDisagreements(buildEvidenceGraphSet(input))
    );

    fc.assert(
      fc.property(
        fc.shuffledSubarray([...(input.declared ?? [])], {
          minLength: 2,
          maxLength: 2
        }),
        fc.shuffledSubarray([...(input.locked ?? [])], {
          minLength: 2,
          maxLength: 2
        }),
        (declared, locked) => {
          expect(
            JSON.stringify(
              reconcileDeterministicDisagreements(buildEvidenceGraphSet({ declared, locked }))
            )
          ).toBe(expectedJson);
        }
      )
    );
  });
});

function mismatchCases() {
  const cases: readonly {
    readonly actualAttributes: Readonly<Record<string, string>>;
    readonly actualIdentity?: Partial<ResourceIdentity>;
    readonly dimension: string;
    readonly expectedAttributes: Readonly<Record<string, string>>;
    readonly expectedIdentity?: Partial<ResourceIdentity>;
  }[] = [
    {
      actualAttributes: { runtime: "node-22" },
      dimension: "runtime",
      expectedAttributes: { runtime: "node-20" }
    },
    {
      actualAttributes: { toolchain: "nightly" },
      dimension: "toolchain",
      expectedAttributes: { toolchain: "stable" }
    },
    {
      actualAttributes: {},
      actualIdentity: { architecture: "arm64" },
      dimension: "architecture",
      expectedAttributes: {},
      expectedIdentity: { architecture: "x64" }
    },
    {
      actualAttributes: {},
      actualIdentity: { realmId: "container" },
      dimension: "realm",
      expectedAttributes: {},
      expectedIdentity: { realmId: "host" }
    },
    {
      actualAttributes: {},
      actualIdentity: { layerId: "global" },
      dimension: "dependency_layer",
      expectedAttributes: {},
      expectedIdentity: { layerId: "project" }
    }
  ];
  return cases.map(
    ({ dimension, expectedAttributes, actualAttributes, expectedIdentity, actualIdentity }) =>
      expected(`environment.${dimension}_mismatch`, {
        declared: [node("manifest", expectedAttributes, expectedIdentity ?? {})],
        installed: [
          node("inventory", { ...actualAttributes, stateEffect: "present" }, actualIdentity ?? {})
        ]
      })
  );
}

function expected(category: string, input: EvidenceGraphSetInput) {
  return { category, input };
}

function negative(label: string, input: EvidenceGraphSetInput) {
  return { input, label };
}

function certainUse(): EvidenceNodeInput {
  return node("used", { certainty: "certain", executable: true });
}

function node(
  evidenceId: string,
  attributes: Readonly<Record<string, boolean | string>> = {},
  identityOverrides: Partial<ResourceIdentity> = {},
  nodeAdapter: AdapterInputIdentity = adapter
): EvidenceNodeInput {
  return {
    adapter: nodeAdapter,
    attributes,
    confidence: 0.95,
    evidence: [
      {
        evidenceId,
        inputSourceId: nodeAdapter.inputSourceId,
        kind: "fixture",
        summary: evidenceId
      }
    ],
    identity: {
      ecosystem: "generic",
      normalizedName: "fixture-resource",
      scope: "project",
      ...identityOverrides
    },
    targetIds: ["linux-x64"]
  };
}
