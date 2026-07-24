import { describe, expect, it, vi } from "vitest";

import type {
  DaytonaPort,
  ExternalOperationReceipt,
  Sha256Digest
} from "@environment-reconciler/integrations/ports";

import {
  createDemoSponsorRunRoutes,
  type DemoSponsorRunExecutor,
  type DemoSponsorRunEnvironment,
  type DemoSponsorRunResponse
} from "./routes.js";
import { RuntimeDemoSponsorRunExecutor } from "./executor.js";

const digest: Sha256Digest = `sha256:${"a".repeat(64)}`;
const receipt: ExternalOperationReceipt = {
  attemptDigest: digest,
  attemptNumber: 1,
  operationKey: "test-operation",
  requestDigest: digest,
  resultDigest: digest
};

function successfulResponse(): DemoSponsorRunResponse {
  return {
    braintrust: { status: "exported", traceId: "trace-1" },
    daytona: {
      cleanupConfirmed: true,
      commandPassed: true,
      durationMs: 123,
      sandboxCreated: true,
      status: "succeeded"
    },
    fireworks: {
      reason: "live_generation_not_required_for_probe",
      status: "unavailable"
    },
    overall: "succeeded",
    runId: "run-1"
  };
}

describe("demo sponsor run route", () => {
  it("allows only the two local UI origins and same-origin production requests", async () => {
    let calls = 0;
    const executor: DemoSponsorRunExecutor = {
      run: () => {
        calls += 1;
        return Promise.resolve(successfulResponse());
      }
    };
    const routes = createDemoSponsorRunRoutes(() => executor);

    const preflight = await routes.request("http://worker.test/v1/demo/sponsor-run", {
      headers: { Origin: "http://localhost:5173" },
      method: "OPTIONS"
    });
    const local = await routes.request("http://worker.test/v1/demo/sponsor-run", {
      body: "{}",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://127.0.0.1:5173"
      },
      method: "POST"
    });
    const rejected = await routes.request("http://worker.test/v1/demo/sponsor-run", {
      body: "{}",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://attacker.example"
      },
      method: "POST"
    });

    expect(preflight.status).toBe(204);
    expect(preflight.headers.get("access-control-allow-methods")).toBe("POST, OPTIONS");
    expect(local.status).toBe(200);
    expect(local.headers.get("access-control-allow-origin")).toBe("http://127.0.0.1:5173");
    expect(await local.json()).toEqual(successfulResponse());
    expect(rejected.status).toBe(403);
    expect(calls).toBe(1);
  });

  it("rejects oversized or non-empty request bodies before sponsor execution", async () => {
    let calls = 0;
    const routes = createDemoSponsorRunRoutes(() => ({
      run: () => {
        calls += 1;
        return Promise.resolve(successfulResponse());
      }
    }));

    const oversized = await routes.request("http://worker.test/v1/demo/sponsor-run", {
      body: JSON.stringify({ value: "x".repeat(1_100) }),
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });
    const unexpected = await routes.request("http://worker.test/v1/demo/sponsor-run", {
      body: '{"command":"cat /etc/passwd"}',
      headers: { "Content-Type": "application/json" },
      method: "POST"
    });

    expect(oversized.status).toBe(400);
    expect(unexpected.status).toBe(400);
    expect(calls).toBe(0);
  });

  it("rejects concurrent sponsor runs within the active Worker isolate", async () => {
    let finish: ((value: DemoSponsorRunResponse) => void) | undefined;
    let calls = 0;
    const routes = createDemoSponsorRunRoutes(() => ({
      run: () => {
        calls += 1;
        if (calls > 1) {
          return Promise.resolve(successfulResponse());
        }
        return new Promise<DemoSponsorRunResponse>((resolve) => {
          finish = resolve;
        });
      }
    }));
    const request = (): Promise<Response> =>
      Promise.resolve(
        routes.request("http://worker.test/v1/demo/sponsor-run", {
          body: "{}",
          headers: { "Content-Type": "application/json" },
          method: "POST"
        })
      );

    const first = request();
    await vi.waitFor(() => expect(calls).toBe(1));
    const concurrent = await request();

    expect(concurrent.status).toBe(409);
    expect(await concurrent.json()).toEqual({ error: "sponsor_run_already_active" });
    finish?.(successfulResponse());
    expect((await first).status).toBe(200);
    expect((await request()).status).toBe(200);
    expect(calls).toBe(2);
  });

  it("honors the production rate-limit binding before sponsor execution", async () => {
    let calls = 0;
    const routes = createDemoSponsorRunRoutes(() => ({
      run: () => {
        calls += 1;
        return Promise.resolve(successfulResponse());
      }
    }));
    const environment = {
      BRAINTRUST_API_KEY: "",
      BRAINTRUST_API_URL: "",
      BRAINTRUST_ENABLED: "false",
      BRAINTRUST_PROJECT_NAME: "",
      DAYTONA_API_KEY: "",
      DAYTONA_API_URL: "",
      DAYTONA_TARGET: "",
      FIREWORKS_API_KEY: "",
      SPONSOR_PROOF_RATE_LIMITER: {
        limit: () => Promise.resolve({ success: false })
      } as unknown as RateLimit
    } satisfies DemoSponsorRunEnvironment;

    const response = await routes.fetch(
      new Request("http://worker.test/v1/demo/sponsor-run", {
        body: "{}",
        headers: { "Content-Type": "application/json" },
        method: "POST"
      }),
      environment
    );

    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({ error: "sponsor_run_rate_limited" });
    expect(calls).toBe(0);
  });
});

describe("RuntimeDemoSponsorRunExecutor", () => {
  it("creates, executes with structured argv, and confirms cleanup without exposing output", async () => {
    const calls: string[] = [];
    const daytona = fakeDaytona(calls);
    const executor = new RuntimeDemoSponsorRunExecutor(
      daytona,
      { export: () => Promise.resolve("deferred") },
      false,
      advancingClock()
    );

    const result = await executor.run({
      signal: new AbortController().signal
    });

    expect(calls).toEqual(["provision", "execute", "delete"]);
    expect(result).toMatchObject({
      braintrust: { status: "deferred" },
      daytona: {
        cleanupConfirmed: true,
        commandPassed: true,
        sandboxCreated: true,
        status: "succeeded"
      },
      fireworks: {
        reason: "credential_unavailable",
        status: "unavailable"
      },
      overall: "partial"
    });
    expect(JSON.stringify(result)).not.toMatch(/sandbox-id|stdout-secret|stderr-secret|api-key/iu);
  });

  it("always attempts deletion after command failure and reports cleanup independently", async () => {
    const calls: string[] = [];
    const daytona = fakeDaytona(calls, true);
    const result = await new RuntimeDemoSponsorRunExecutor(
      daytona,
      { export: () => Promise.resolve("deferred") },
      false,
      advancingClock()
    ).run({ signal: new AbortController().signal });

    expect(calls).toEqual(["provision", "execute", "delete"]);
    expect(result).toMatchObject({
      daytona: {
        cleanupConfirmed: true,
        commandPassed: false,
        sandboxCreated: true,
        status: "failed"
      },
      overall: "failed"
    });
  });
});

function fakeDaytona(
  calls: string[],
  failCommand = false
): Pick<DaytonaPort, "deleteSandbox" | "executeCommand" | "provisionSandbox"> {
  return {
    deleteSandbox: () => {
      calls.push("delete");
      return Promise.resolve({
        confirmedAt: "2026-07-24T20:00:00.000Z",
        deleted: true,
        receipt
      });
    },
    executeCommand: (request) => {
      calls.push("execute");
      expect(request).toMatchObject({
        arguments: ["--version"],
        executable: "node",
        maxOutputBytes: 256,
        networkPolicy: { allowedHostDigests: [], mode: "deny-all" },
        secretBindings: []
      });
      if (failCommand) return Promise.reject(new Error("provider failure with secret"));
      return Promise.resolve({
        commandId: "command-1",
        exitCode: 0,
        receipt,
        resourceUsage: { wallTimeMs: 1 },
        stderr: {
          byteLength: 13,
          contentDigest: digest,
          redactionPolicyVersion: "test",
          text: "stderr-secret",
          truncated: false
        },
        stdout: {
          byteLength: 13,
          contentDigest: digest,
          redactionPolicyVersion: "test",
          text: "stdout-secret",
          truncated: false
        },
        timedOut: false
      });
    },
    provisionSandbox: () => {
      calls.push("provision");
      return Promise.resolve({
        created: true,
        receipt,
        sandbox: {
          providerResourceId: "sandbox-id-secret",
          sandboxId: "sandbox-id-secret"
        },
        status: "ready"
      });
    }
  };
}

function advancingClock(): () => number {
  let now = 1_000;
  return () => {
    now += 10;
    return now;
  };
}
