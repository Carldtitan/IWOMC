import type { Sha256Digest } from "@environment-reconciler/integrations/ports";
import { describe, expect, it } from "vitest";

import {
  deriveMvpValidationTarget,
  type ImmutableMvpTargetCapability,
  type ValidationTargetDerivationInput
} from "./derive-validation-target.js";

const snapshotDigest: Sha256Digest = `sha256:${"1".repeat(64)}`;
const inventoryDigest: Sha256Digest = `sha256:${"2".repeat(64)}`;
const capabilityReportDigest: Sha256Digest = `sha256:${"3".repeat(64)}`;
const resourceCapabilityDigest: Sha256Digest = `sha256:${"4".repeat(64)}`;
const egressCapabilityDigest: Sha256Digest = `sha256:${"5".repeat(64)}`;

function capability(): ImmutableMvpTargetCapability {
  return {
    architecture: "amd64",
    baseIdentity: {
      baselineInventoryDigest: inventoryDigest,
      capabilityReportDigest,
      capabilityReportId: "capability-report-1",
      createdAt: "2026-07-24T12:00:00.000Z",
      snapshotDigest,
      snapshotId: "daytona-node22-snapshot-1"
    },
    egress: {
      capabilityDigest: egressCapabilityDigest,
      registryHosts: ["registry.npmjs.org"],
      supportsDenyAll: true,
      supportsDomainAllowlist: true
    },
    imageReference: "node:22.14.0-bookworm",
    nodeVersion: "22.14.0",
    npmVersion: "11.4.2",
    operatingSystem: "linux",
    providedCapabilities: ["node", "npm", "domain-allowlist", "private-sandbox"],
    resources: {
      capabilityDigest: resourceCapabilityDigest,
      maximumCpuCores: 4,
      maximumDiskMiB: 8_192,
      maximumMemoryMiB: 4_096
    },
    targetId: "linux-amd64-node22-npm11"
  };
}

function input(): ValidationTargetDerivationInput {
  return {
    availableMvpTarget: capability(),
    ciMatrixTargets: [
      {
        nodeVersion: "22.14.0",
        source: "ci",
        sourceReference: ".github/workflows/ci.yml#node"
      }
    ],
    repositorySelectors: [
      {
        npmVersion: "11.4.2",
        source: "repository",
        sourceReference: "package.json#packageManager"
      }
    ],
    userConfirmedTargets: [
      {
        architecture: "amd64",
        source: "user",
        sourceReference: "confirmation-1"
      }
    ],
    workspacePolicy: {
      allowMvpDefaultWhenUnspecified: false,
      egress: {
        allowedRegistryHosts: ["registry.npmjs.org"],
        mode: "registry-allowlist"
      },
      policyVersion: "policy-v1",
      requiredTargets: [
        {
          operatingSystem: "linux",
          requiredCapabilities: ["private-sandbox", "domain-allowlist"],
          source: "workspace-policy",
          sourceReference: "policy-v1"
        }
      ],
      resources: { cpuCores: 2, diskMiB: 4_096, memoryMiB: 2_048 }
    }
  };
}

describe("deriveMvpValidationTarget", () => {
  it("derives one immutable Linux/Node/npm target from every requirement source", async () => {
    const result = await deriveMvpValidationTarget(input());

    expect(result.status).toBe("supported");
    if (result.status !== "supported") {
      return;
    }
    expect(result.target).toMatchObject({
      architecture: "amd64",
      baseIdentity: {
        baselineInventoryDigest: inventoryDigest,
        capabilityReportDigest,
        snapshotDigest,
        snapshotId: "daytona-node22-snapshot-1"
      },
      capabilityIdentity: {
        egressCapabilityDigest,
        resourceCapabilityDigest
      },
      managerSelections: { npm: "11.4.2" },
      networkPolicy: {
        allowedHosts: ["registry.npmjs.org"],
        enforcement: "provider-enforced",
        mode: "registry-allowlist"
      },
      operatingSystem: "linux",
      resourcePolicy: { cpuCores: 2, diskMiB: 4_096, memoryMiB: 2_048 },
      runtimeSelections: { node: "22.14.0" },
      sandboxTarget: {
        architecture: "amd64",
        imageDigest: snapshotDigest,
        imageReference: "node:22.14.0-bookworm",
        operatingSystem: "linux"
      },
      targetId: "linux-amd64-node22-npm11"
    });
    expect(result.target.sourceRequirements).toHaveLength(4);
    expect(result.target.targetDigest).toMatch(/^sha256:[a-f0-9]{64}$/u);
  });

  it("rejects an additional CI target instead of silently omitting it", async () => {
    const request = input();
    const result = await deriveMvpValidationTarget({
      ...request,
      ciMatrixTargets: [
        ...request.ciMatrixTargets,
        {
          nodeVersion: "20.19.0",
          source: "ci",
          sourceReference: ".github/workflows/ci.yml#node-20"
        }
      ]
    });

    expect(result).toEqual({
      status: "unsupported_target_or_capability",
      unsupported: [
        {
          reason: "target_unavailable",
          source: "ci",
          sourceReference: ".github/workflows/ci.yml#node-20"
        }
      ]
    });
    expect(result).not.toHaveProperty("target");
  });

  it("returns unsupported for unavailable resource, egress, or required capability", async () => {
    const resourceRequest = input();
    const egressRequest = input();
    const capabilityRequest = input();

    const [resourceResult, egressResult, capabilityResult] = await Promise.all([
      deriveMvpValidationTarget({
        ...resourceRequest,
        workspacePolicy: {
          ...resourceRequest.workspacePolicy,
          resources: {
            ...resourceRequest.workspacePolicy.resources,
            memoryMiB: 16_384
          }
        }
      }),
      deriveMvpValidationTarget({
        ...egressRequest,
        workspacePolicy: {
          ...egressRequest.workspacePolicy,
          egress: {
            allowedRegistryHosts: ["private.registry.example"],
            mode: "registry-allowlist"
          }
        }
      }),
      deriveMvpValidationTarget({
        ...capabilityRequest,
        userConfirmedTargets: [
          {
            requiredCapabilities: ["gpu"],
            source: "user",
            sourceReference: "confirmation-gpu"
          }
        ]
      })
    ]);

    expect(resourceResult).toMatchObject({
      status: "unsupported_target_or_capability",
      unsupported: [{ reason: "resource_unavailable" }]
    });
    expect(egressResult).toMatchObject({
      status: "unsupported_target_or_capability",
      unsupported: [{ reason: "egress_unavailable" }]
    });
    expect(capabilityResult).toMatchObject({
      status: "unsupported_target_or_capability",
      unsupported: [{ reason: "capability_unavailable" }]
    });
  });

  it("does not invent a required target when policy disallows the MVP default", async () => {
    const request = input();
    const result = await deriveMvpValidationTarget({
      ...request,
      ciMatrixTargets: [],
      repositorySelectors: [],
      userConfirmedTargets: [],
      workspacePolicy: {
        ...request.workspacePolicy,
        requiredTargets: []
      }
    });

    expect(result).toEqual({
      status: "unsupported_target_or_capability",
      unsupported: [
        {
          reason: "invalid_or_missing_requirement",
          source: "planner",
          sourceReference: "no-required-target"
        }
      ]
    });
  });
});
