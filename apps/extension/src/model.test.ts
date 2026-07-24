import { describe, expect, it } from "vitest";

import { statusForState } from "./model.js";
import type { CaptureCoverage } from "./coverage.js";

function completeCoverage(): CaptureCoverage {
  return {
    adapters: [
      {
        adapterId: "npm-native",
        condition: "covered",
        ecosystem: "javascript",
        gaps: [],
        supportLevel: "native_validation"
      }
    ],
    generatedAtEpochSeconds: 100,
    permission: {
      condition: "covered",
      gaps: [],
      grantedCapabilities: ["repository_files"],
      profile: "repository_scoped"
    },
    provider: {
      capabilities: ["tool_calls"],
      condition: "covered",
      gaps: [],
      providerId: "codex",
      sessionBoundary: "automatic",
      surface: "Codex local hook"
    },
    realms: [
      {
        condition: "covered",
        gaps: [],
        label: "host",
        realmId: "host-1",
        realmKind: "host"
      }
    ],
    upload: { gaps: [], pendingBatches: 0, state: "online" }
  };
}

describe("statusForState", () => {
  it("reports expiry and paused capture honestly", () => {
    const connected = {
      schemaVersion: 1 as const,
      connection: {
        deviceId: "device-1",
        expiresAtEpochSeconds: 200,
        workspaceId: "workspace-1"
      },
      project: {
        projectId: "project-1",
        projectName: "Fixture",
        repositoryPath: "/fixture"
      }
    };

    expect(statusForState(connected, 100)).toBe("capture_gap");
    expect(statusForState(connected, 200)).toBe("error");
    const legacyCapture = {
      ...connected,
      capture: {
        providerSurface: "Codex local hook",
        sessionId: "session-1",
        startedAtEpochSeconds: 100
      }
    };
    expect(statusForState(legacyCapture, 100)).toBe("capture_gap");
    expect(
      statusForState(
        {
          ...legacyCapture,
          capture: {
            ...legacyCapture.capture,
            coverage: completeCoverage()
          }
        },
        100
      )
    ).toBe("observing");
  });

  it("reports offline buffering and returns to named observing coverage after upload recovery", () => {
    const coverage = completeCoverage();
    const state = {
      schemaVersion: 1 as const,
      connection: {
        deviceId: "device-1",
        expiresAtEpochSeconds: 200,
        workspaceId: "workspace-1"
      },
      project: {
        projectId: "project-1",
        projectName: "Fixture",
        repositoryPath: "/fixture"
      },
      capture: {
        coverage: {
          ...coverage,
          upload: {
            gaps: [],
            pendingBatches: 2,
            state: "offline_buffering" as const
          }
        },
        providerSurface: "Codex local hook",
        sessionId: "session-1",
        startedAtEpochSeconds: 100
      }
    };

    expect(statusForState(state, 100)).toBe("offline_buffering");
    expect(
      statusForState(
        {
          ...state,
          capture: {
            ...state.capture,
            coverage
          }
        },
        100
      )
    ).toBe("observing");
  });
});
