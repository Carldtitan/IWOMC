import { describe, expect, it } from "vitest";

import type { Sha256Digest } from "../ports/index.js";
import {
  buildCandidateReasoningPacket,
  createDeterministicNpmQuickFix,
  type CandidateReasoningPacketInput
} from "./candidate.js";

const projectPseudonym: Sha256Digest = `sha256:${"a".repeat(64)}`;
const fragmentDigest: Sha256Digest = `sha256:${"b".repeat(64)}`;

function packetInput(): CandidateReasoningPacketInput {
  return {
    behaviorContractSummary: {
      contractVersion: "contract-v1",
      requiredProbeKinds: ["install", "test"],
      requiredTargetIds: ["linux-node-22"],
      summary: "Install dependencies and run the repository test suite."
    },
    capabilitySummary: {
      adapterId: "npm-native",
      adapterVersion: "1.0.0",
      knownFiles: ["package.json", "package-lock.json", "src/index.ts"],
      lockfiles: ["package-lock.json"],
      packageManager: "npm",
      supportedOperations: ["package_add"],
      toolName: "npm",
      toolVersion: "11.4.2",
      writableManifestFiles: ["package.json"]
    },
    effectivePolicy: {
      allowPackageManagerSwitch: false,
      allowedPackageNames: ["zod"],
      deniedPackageNames: [],
      maximumOperations: 1,
      policyVersion: "policy-v1"
    },
    finding: {
      category: "possible-dynamic-dependency",
      dependencySection: "dependencies",
      evidenceReferenceIds: ["evidence-zod"],
      expectedPackageName: "zod",
      id: "finding-zod",
      recommendedVersionRange: "^4.0.0",
      ruleId: "dependency-evidence-v1",
      ruleVersion: "1.0.0",
      summary: "The repository may use zod, but ownership and necessity still require proof."
    },
    permittedOperations: ["package_add"],
    priorValidationSummaries: [{ summaryClass: "not-run", targetId: "linux-node-22" }],
    projectGoal: "Keep clean Node.js 22 reconstruction reproducible.",
    projectPseudonym,
    relevantGraphSlice: [
      {
        declared: false,
        evidenceReferenceIds: ["evidence-zod"],
        observed: true,
        packageName: "zod"
      }
    ],
    repositoryConventions: [],
    semanticFileFragments: [
      {
        evidenceReferenceIds: ["evidence-zod"],
        filePath: "src/index.ts",
        fragmentKind: "source-ast",
        semanticDigest: fragmentDigest,
        summary: "The dependency reference is present but not conclusively attributable."
      }
    ]
  };
}

describe("candidate uncertainty evaluation cases", () => {
  it("refuses an automatic quick fix when multiple manifests could own the dependency", () => {
    const input = packetInput();
    const ambiguous = buildCandidateReasoningPacket({
      ...input,
      capabilitySummary: {
        ...input.capabilitySummary,
        knownFiles: [...input.capabilitySummary.knownFiles, "packages/application/package.json"],
        writableManifestFiles: ["package.json", "packages/application/package.json"]
      }
    });

    expect(() => createDeterministicNpmQuickFix(ambiguous)).toThrowError("ambiguous_evidence");
  });

  it("refuses a mutation when dynamic-only evidence has no permitted native operation", () => {
    const input = packetInput();
    const dynamicOnly = buildCandidateReasoningPacket({
      ...input,
      finding: {
        ...input.finding,
        evidenceReferenceIds: ["evidence-dynamic-zod"],
        summary:
          "A computed dynamic import may resolve to zod, but the runtime target is uncertain."
      },
      permittedOperations: [],
      relevantGraphSlice: [
        {
          declared: false,
          evidenceReferenceIds: ["evidence-dynamic-zod"],
          observed: true,
          packageName: "zod"
        }
      ],
      semanticFileFragments: [
        {
          evidenceReferenceIds: ["evidence-dynamic-zod"],
          filePath: "src/index.ts",
          fragmentKind: "source-ast",
          semanticDigest: fragmentDigest,
          summary: "A computed dynamic import has multiple possible runtime targets."
        }
      ]
    });

    expect(() => createDeterministicNpmQuickFix(dynamicOnly)).toThrowError("unsupported_operation");
  });
});
