import { describe, expect, it } from "vitest";

import { statusForState } from "./model.js";

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
    expect(
      statusForState(
        {
          ...connected,
          capture: {
            providerSurface: "Codex local hook",
            sessionId: "session-1",
            startedAtEpochSeconds: 100
          }
        },
        100
      )
    ).toBe("observing");
  });
});
