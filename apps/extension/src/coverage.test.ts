import { describe, expect, it } from "vitest";

import {
  assessCoverage,
  coverageGaps,
  formatCoverageReport,
  unconfirmedCaptureCoverage,
  type CaptureCoverage
} from "./coverage.js";

function fullyReportedCoverage(): CaptureCoverage {
  return {
    adapters: [
      {
        adapterId: "npm-native",
        adapterVersion: "1.0.0",
        condition: "covered",
        ecosystem: "javascript",
        gaps: [],
        managerVersion: "11.4.2",
        supportLevel: "native_validation"
      }
    ],
    generatedAtEpochSeconds: 100,
    permission: {
      condition: "covered",
      gaps: [],
      grantedCapabilities: ["repository_files", "descendant_processes"],
      profile: "repository_scoped"
    },
    provider: {
      capabilities: ["tool_calls", "command_results", "file_changes"],
      condition: "covered",
      gaps: [],
      providerId: "codex",
      providerVersion: "1.2.3",
      sessionBoundary: "automatic",
      surface: "Codex local hook"
    },
    realms: [
      {
        condition: "covered",
        gaps: [],
        label: "local extension host",
        realmId: "host-1",
        realmKind: "host"
      }
    ],
    upload: {
      gaps: [],
      pendingBatches: 0,
      state: "online"
    }
  };
}

describe("capture coverage", () => {
  it("starts incomplete when provider, realm, permissions, upload, and adapters are unreported", () => {
    const coverage = unconfirmedCaptureCoverage({
      generatedAtEpochSeconds: 100,
      providerSurface: "Codex local hook",
      realmKind: "host",
      realmLabel: "local extension host"
    });

    expect(assessCoverage(coverage)).toBe("incomplete");
    expect(coverage.provider.providerId).toBe("codex");
    expect(coverage.realms[0]).toMatchObject({
      condition: "unknown",
      realmKind: "host"
    });
    expect(coverage.permission.profile).toBe("unknown");
    expect(coverage.upload.state).toBe("unknown");
    expect(coverage.adapters[0]).toMatchObject({
      condition: "unknown",
      supportLevel: "unknown"
    });
    expect(formatCoverageReport(coverage)).toContain(
      "do not interpret missing findings as a clean environment"
    );
  });

  it("never turns complete when one named dimension is missing or reduced", () => {
    const complete = fullyReportedCoverage();

    expect(assessCoverage(complete)).toBe("within_reported_coverage");
    expect(assessCoverage({ ...complete, realms: [] })).toBe("incomplete");
    expect(
      assessCoverage({
        ...complete,
        permission: {
          ...complete.permission,
          condition: "partial",
          profile: "reduced"
        }
      })
    ).toBe("incomplete");
    expect(
      assessCoverage({
        ...complete,
        adapters: [
          {
            ...complete.adapters[0]!,
            condition: "partial",
            supportLevel: "observed_only"
          }
        ]
      })
    ).toBe("incomplete");
    expect(formatCoverageReport(complete)).toContain("this is not a global all-clear");
  });

  it("makes offline buffering and recovery explicit without dropping other gaps", () => {
    const complete = fullyReportedCoverage();
    const offline: CaptureCoverage = {
      ...complete,
      upload: {
        gaps: [],
        pendingBatches: 3,
        state: "offline_buffering"
      }
    };

    expect(assessCoverage(offline)).toBe("incomplete");
    expect(coverageGaps(offline)).toContain(
      "Cloud upload is offline; 3 redacted batch(es) are buffering locally."
    );
    expect(assessCoverage({ ...offline, upload: complete.upload })).toBe(
      "within_reported_coverage"
    );
  });

  it("marks a manual boundary as partial provider coverage", () => {
    const coverage = unconfirmedCaptureCoverage({
      generatedAtEpochSeconds: 100,
      providerSurface: "Manual boundary",
      realmKind: "remote_host",
      realmLabel: "SSH extension host"
    });

    expect(coverage.provider).toMatchObject({
      condition: "partial",
      providerId: "manual",
      sessionBoundary: "manual"
    });
    expect(coverageGaps(coverage)).toContain("No structured provider event surface is active.");
  });
});
