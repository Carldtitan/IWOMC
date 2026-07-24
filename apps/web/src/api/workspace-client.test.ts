import { describe, expect, it, vi } from "vitest";

import { HttpWorkspaceApiClient, type WorkspaceApiError } from "./workspace-client.js";

describe("HttpWorkspaceApiClient", () => {
  it("sends the cursor and ETag and returns the next typed page", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(() =>
      Promise.resolve(
        Response.json(
          {
            cursor: "cursor-2",
            partial: false,
            systemStatus: {
              health: "operational",
              summary: "Operational within current coverage",
              updatedAt: "2026-07-24T20:00:00Z"
            },
            updates: [
              {
                id: "update-1",
                kind: "finding",
                occurredAt: "2026-07-24T20:00:00Z"
              }
            ]
          },
          { headers: { etag: '"revision-2"' } }
        )
      )
    );
    const client = new HttpWorkspaceApiClient("https://example.test", fetchImplementation);
    const result = await client.poll({
      cursor: "cursor-1",
      etag: '"revision-1"',
      projectId: "project/1",
      signal: new AbortController().signal,
      workspaceId: "workspace 1"
    });

    expect(result).toMatchObject({
      etag: '"revision-2"',
      kind: "updated",
      page: { cursor: "cursor-2", partial: false }
    });
    const [url, init] = fetchImplementation.mock.calls[0]!;
    const urlText = url instanceof URL ? url.href : typeof url === "string" ? url : url.url;
    expect(urlText).toContain(
      "/api/workspaces/workspace%201/projects/project%2F1/updates?cursor=cursor-1"
    );
    expect(new Headers(init?.headers).get("if-none-match")).toBe('"revision-1"');
  });

  it("handles 304 without trying to parse a response body", async () => {
    const client = new HttpWorkspaceApiClient("https://example.test", () =>
      Promise.resolve(new Response(null, { headers: { etag: '"same"' }, status: 304 }))
    );

    await expect(
      client.poll({
        projectId: "project-1",
        signal: new AbortController().signal,
        workspaceId: "workspace-1"
      })
    ).resolves.toEqual({ etag: '"same"', kind: "not_modified" });
  });

  it("rejects malformed pages as retryable protocol failures", async () => {
    const client = new HttpWorkspaceApiClient("https://example.test", () =>
      Promise.resolve(Response.json({ cursor: "", partial: "yes", updates: [] }))
    );

    await expect(
      client.poll({
        projectId: "project-1",
        signal: new AbortController().signal,
        workspaceId: "workspace-1"
      })
    ).rejects.toEqual(
      expect.objectContaining<Partial<WorkspaceApiError>>({
        code: "invalid_response",
        retryable: true
      })
    );
  });
});
