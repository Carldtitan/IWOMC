import { describe, expect, it, vi } from "vitest";

import { ConfigurationError, createConfigurationRoutes, type ConfigurationApi } from "./index.js";
import type { EditableProjectGoal } from "@environment-reconciler/reconciler";

const projectId = "20000000-0000-4000-8000-000000000002";
const userId = "20000000-0000-4000-8000-000000000003";

describe("configuration routes", () => {
  it("requires an authenticated product session for reads", async () => {
    const routes = createConfigurationRoutes(
      { authenticate: () => Promise.resolve(undefined) },
      api()
    );

    const response = await routes.request(`/v1/projects/${projectId}/project-goal`);

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "unauthorized" });
  });

  it("passes the authenticated actor and optimistic version to mutations", async () => {
    const editProjectGoal = vi.fn(() => Promise.resolve(goal(2)));
    const routes = createConfigurationRoutes(
      {
        authenticate: ({ mutation, request }) =>
          Promise.resolve(
            mutation && request.headers.get("x-csrf-token") !== "csrf-token"
              ? undefined
              : { userId }
          )
      },
      api({ editProjectGoal })
    );

    const response = await routes.request(`/v1/projects/${projectId}/project-goal`, {
      body: JSON.stringify({ expectedVersion: 1, statement: "Prefer fast clean installs." }),
      headers: {
        "content-type": "application/json",
        "x-csrf-token": "csrf-token"
      },
      method: "PATCH"
    });

    expect(response.status).toBe(200);
    expect(editProjectGoal).toHaveBeenCalledWith({
      actorUserId: userId,
      expectedVersion: 1,
      projectId,
      statement: "Prefer fast clean installs."
    });
  });

  it("maps a concurrent optimistic update to HTTP 409", async () => {
    const routes = createConfigurationRoutes(
      { authenticate: () => Promise.resolve({ userId }) },
      api({
        editProjectGoal: () => Promise.reject(new ConfigurationError("version_conflict"))
      })
    );

    const response = await routes.request(`/v1/projects/${projectId}/project-goal`, {
      body: JSON.stringify({ expectedVersion: 1, statement: "Concurrent edit." }),
      headers: { "content-type": "application/json" },
      method: "PATCH"
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({ error: "version_conflict" });
  });
});

function api(overrides: Partial<ConfigurationApi> = {}): ConfigurationApi {
  const unsupported = () => Promise.reject(new Error("unexpected API call"));
  return {
    acceptBehaviorContract: unsupported,
    editBehaviorContract: unsupported,
    editOptimalityPolicy: unsupported,
    editProjectGoal: () => Promise.resolve(goal(2)),
    getBehaviorContract: unsupported,
    getOptimalityPolicy: unsupported,
    getProjectGoal: () => Promise.resolve(goal(1)),
    reorderBehaviorSteps: unsupported,
    setBehaviorStepEnabled: unsupported,
    ...overrides
  };
}

function goal(version: number): EditableProjectGoal {
  return {
    authoredBy: userId,
    contextOnly: true,
    createdAt: "2026-07-24T17:00:00.000Z",
    goalId: "goal:project",
    kind: "project_goal",
    nonFunctionalPriorities: [],
    projectId,
    schemaVersion: 1,
    statement: "Keep clean installs reproducible.",
    updatedAt: "2026-07-24T17:00:00.000Z",
    updatedBy: userId,
    version,
    workspaceId: "20000000-0000-4000-8000-000000000001"
  };
}
