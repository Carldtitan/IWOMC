import { describe, expect, it } from "vitest";

import {
  WorkspaceUpdateRouteError,
  createWorkspaceUpdateRoutes
} from "./routes.js";
import type {
  WorkspaceUpdatePage,
  WorkspaceUpdatesAuthenticator,
  WorkspaceUpdatesService
} from "./types.js";

const principal = {
  subjectId: "user-1",
  workspaceIds: ["workspace-1", "workspace-2"]
};

describe("workspace update route factory", () => {
  it("authenticates, authorizes the exact workspace/project, and forwards a valid cursor", async () => {
    const calls: unknown[] = [];
    const app = createWorkspaceUpdateRoutes(authenticator(calls), service(calls), {
      now: () => 1_234
    });

    const response = await app.request(
      "/api/workspaces/workspace-1/projects/project-1/updates?cursor=cursor_1",
      { headers: { Cookie: "session=fixture" } }
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("etag")).toMatch(/^"sha256-[a-f0-9]{64}"$/u);
    expect(response.headers.get("cache-control")).toBe("private, no-cache");
    expect(await response.json()).toMatchObject({
      cursor: "cursor_2",
      partial: false,
      stale: false,
      updates: [{ id: "finding-1", kind: "finding" }]
    });
    expect(calls).toEqual([
      expect.objectContaining({
        nowEpochMilliseconds: 1_234,
        request: expect.any(Request)
      }),
      {
        principal,
        projectId: "project-1",
        workspaceId: "workspace-1"
      },
      {
        cursor: "cursor_1",
        nowEpochMilliseconds: 1_234,
        principal,
        projectId: "project-1",
        workspaceId: "workspace-1"
      }
    ]);
  });

  it("returns 304 for matching strong or weak If-None-Match only after authorization", async () => {
    const calls: unknown[] = [];
    const app = createWorkspaceUpdateRoutes(authenticator(calls), service(calls));
    const first = await app.request(
      "/api/workspaces/workspace-1/projects/project-1/updates"
    );
    const etag = first.headers.get("etag");
    expect(etag).not.toBeNull();

    const response = await app.request(
      "/api/workspaces/workspace-1/projects/project-1/updates",
      { headers: { "If-None-Match": `W/${etag}` } }
    );

    expect(response.status).toBe(304);
    expect(await response.text()).toBe("");
    expect(response.headers.get("etag")).toBe(etag);
    expect(calls.filter((call) => isReadCall(call))).toHaveLength(2);
  });

  it("preserves explicit partial and stale states in body and headers", async () => {
    const app = createWorkspaceUpdateRoutes(authenticator([]), {
      canReadProject: () => Promise.resolve(true),
      readUpdates: () =>
        Promise.resolve({
          ...page(),
          partial: true,
          stale: true,
          systemStatus: {
            health: "unknown",
            summary: "Last persisted update is stale and capture is partial",
            updatedAt: "2026-07-24T20:00:00Z"
          }
        })
    });

    const response = await app.request(
      "/api/workspaces/workspace-1/projects/project-1/updates"
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-reconciler-data-state")).toBe("stale_partial");
    expect(await response.json()).toMatchObject({
      partial: true,
      stale: true,
      systemStatus: { health: "unknown" }
    });
  });

  it("rejects unauthenticated, cross-workspace, and unauthorized project access before reads", async () => {
    let readCount = 0;
    const guardedService: WorkspaceUpdatesService = {
      canReadProject: ({ projectId, workspaceId }) =>
        Promise.resolve(workspaceId === "workspace-1" && projectId === "project-1"),
      readUpdates: () => {
        readCount += 1;
        return Promise.resolve(page());
      }
    };
    const unauthenticated = createWorkspaceUpdateRoutes(
      { authenticate: () => Promise.resolve(undefined) },
      guardedService
    );
    const authenticated = createWorkspaceUpdateRoutes(authenticator([]), guardedService);

    const noSession = await unauthenticated.request(
      "/api/workspaces/workspace-1/projects/project-1/updates"
    );
    const wrongWorkspace = await authenticated.request(
      "/api/workspaces/workspace-3/projects/project-1/updates"
    );
    const wrongProject = await authenticated.request(
      "/api/workspaces/workspace-1/projects/project-2/updates"
    );

    expect(noSession.status).toBe(401);
    expect(wrongWorkspace.status).toBe(403);
    expect(wrongProject.status).toBe(403);
    expect(readCount).toBe(0);
  });

  it("rejects malformed cursors before authorization service calls", async () => {
    let authorizationCalls = 0;
    const app = createWorkspaceUpdateRoutes(authenticator([]), {
      canReadProject: () => {
        authorizationCalls += 1;
        return Promise.resolve(true);
      },
      readUpdates: () => Promise.resolve(page())
    });

    const response = await app.request(
      "/api/workspaces/workspace-1/projects/project-1/updates?cursor=bad%20cursor"
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_cursor",
      retryable: false
    });
    expect(authorizationCalls).toBe(0);
  });

  it("maps typed availability errors and never reflects unexpected secrets", async () => {
    const unavailable = createWorkspaceUpdateRoutes(authenticator([]), {
      canReadProject: () =>
        Promise.reject(new WorkspaceUpdateRouteError("service_unavailable", 503, true)),
      readUpdates: () => Promise.resolve(page())
    });
    const unsafe = createWorkspaceUpdateRoutes(authenticator([]), {
      canReadProject: () => Promise.reject(new Error("database-password-super-secret")),
      readUpdates: () => Promise.resolve(page())
    });

    const unavailableResponse = await unavailable.request(
      "/api/workspaces/workspace-1/projects/project-1/updates"
    );
    const unsafeResponse = await unsafe.request(
      "/api/workspaces/workspace-1/projects/project-1/updates"
    );

    expect(unavailableResponse.status).toBe(503);
    expect(await unavailableResponse.json()).toEqual({
      error: "service_unavailable",
      retryable: true
    });
    expect(unsafeResponse.status).toBe(500);
    expect(await unsafeResponse.text()).toBe(
      '{"error":"internal_server_error","retryable":false}'
    );
  });
});

function authenticator(calls: unknown[]): WorkspaceUpdatesAuthenticator {
  return {
    authenticate(input) {
      calls.push(input);
      return Promise.resolve(principal);
    }
  };
}

function service(calls: unknown[]): WorkspaceUpdatesService {
  return {
    canReadProject(input) {
      calls.push(input);
      return Promise.resolve(true);
    },
    readUpdates(input) {
      calls.push(input);
      return Promise.resolve(page());
    }
  };
}

function page(): WorkspaceUpdatePage {
  return {
    cursor: "cursor_2",
    partial: false,
    stale: false,
    systemStatus: {
      health: "operational",
      summary: "Operational within current coverage",
      updatedAt: "2026-07-24T20:00:00Z"
    },
    updates: [
      {
        id: "finding-1",
        kind: "finding",
        occurredAt: "2026-07-24T20:00:00Z"
      }
    ]
  };
}

function isReadCall(value: unknown): boolean {
  return (
    typeof value === "object" &&
    value !== null &&
    "nowEpochMilliseconds" in value &&
    "projectId" in value
  );
}
