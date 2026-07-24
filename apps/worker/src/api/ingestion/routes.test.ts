import { describe, expect, it } from "vitest";

import { IngestionError } from "../../domain/ingestion/index.js";
import { createIngestionRoutes } from "./routes.js";
import type { DeviceIngestionApi } from "./types.js";

const authorization = { Authorization: `Bearer ${"c".repeat(32)}` };

describe("ingestion route factory", () => {
  it("binds the event route to project, stream, credential, body, and clock", async () => {
    const calls: unknown[] = [];
    const app = createIngestionRoutes(api(calls), { now: () => 1234 });

    const response = await app.request("/v1/projects/project-1/events/batches", {
      body: '{"batch":true}',
      headers: { ...authorization, "X-Ingest-Stream-Id": "stream-1" },
      method: "POST"
    });

    expect(response.status).toBe(202);
    expect(calls).toEqual([
      {
        credential: "c".repeat(32),
        nowEpochMilliseconds: 1234,
        projectId: "project-1",
        rawBody: new TextEncoder().encode('{"batch":true}'),
        streamId: "stream-1"
      }
    ]);
  });

  it.each([
    ["snapshots", "snapshot"],
    ["capabilities", "capability"],
    ["chain-anchors", "chain_anchor"]
  ] as const)("exposes POST /%s", async (path, kind) => {
    const calls: unknown[] = [];
    const app = createIngestionRoutes(api(calls), { now: () => 55 });

    const response = await app.request(`/v1/projects/project-1/${path}`, {
      body: "{}",
      headers: authorization,
      method: "POST"
    });

    expect(response.status).toBe(202);
    expect(calls).toEqual([
      expect.objectContaining({
        kind,
        nowEpochMilliseconds: 55,
        projectId: "project-1"
      })
    ]);
  });

  it("exposes authenticated device status", async () => {
    const calls: unknown[] = [];
    const app = createIngestionRoutes(api(calls), { now: () => 99 });

    const response = await app.request("/v1/devices/device-1/status", {
      headers: authorization
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ deviceId: "device-1", state: "active" });
  });

  it("maps only safe typed errors and never reflects thrown details", async () => {
    const service = api([]);
    service.ingestResource = () => Promise.reject(new Error("database password super-secret"));
    const app = createIngestionRoutes(service);

    const response = await app.request("/v1/projects/project-1/snapshots", {
      body: "{}",
      headers: authorization,
      method: "POST"
    });

    expect(response.status).toBe(500);
    expect(await response.text()).toBe('{"error":"internal_server_error","retryable":false}');
  });

  it("rejects missing credentials and oversized declared bodies before service calls", async () => {
    const calls: unknown[] = [];
    const app = createIngestionRoutes(api(calls), { maximumBodyBytes: 2 });

    const unauthorized = await app.request("/v1/projects/project-1/snapshots", {
      body: "{}",
      method: "POST"
    });
    const oversized = await app.request("/v1/projects/project-1/snapshots", {
      body: "123",
      headers: authorization,
      method: "POST"
    });

    expect(unauthorized.status).toBe(401);
    expect(oversized.status).toBe(413);
    expect(calls).toEqual([]);
  });
});

function api(calls: unknown[]): DeviceIngestionApi {
  return {
    getDeviceStatus(input) {
      calls.push(input);
      return Promise.resolve({
        deviceId: input.deviceId,
        pendingStoredBatches: 0,
        state: "active"
      });
    },
    ingestEventBatch(input) {
      calls.push(input);
      return Promise.resolve({
        batchId: "batch-1",
        deduplicated: false,
        receipt: {
          acceptedAtEpochMilliseconds: 1,
          batchId: "batch-1",
          chainHead: `sha256:${"0".repeat(64)}`,
          lastSequence: 1,
          receiptId: "receipt-1",
          signature: "signature"
        }
      });
    },
    ingestResource(input) {
      calls.push(input);
      if (input.projectId === "forbidden") {
        return Promise.reject(new IngestionError("project_forbidden", 403));
      }
      return Promise.resolve({ deduplicated: false, resourceId: "resource-1" });
    }
  };
}
