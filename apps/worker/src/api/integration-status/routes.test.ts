import { describe, expect, it } from "vitest";

import {
  createIntegrationStatusRoutes,
  createUnavailableIntegrationStatusRoutes,
  type IntegrationStatusAuthenticator,
  type IntegrationStatusPrincipal,
  type IntegrationStatusProjectAuthorizer
} from "./routes.js";
import {
  IntegrationStatusError,
  type BraintrustIntegrationOperatorStatus,
  type IntegrationStatusService
} from "../../services/integration-status.js";

const principal: IntegrationStatusPrincipal = {
  subjectId: "REDACTED-1",
  workspaceIds: ["workspace-1"]
};
type RetryScheduledStatus = Omit<BraintrustIntegrationOperatorStatus, "traceExport"> & {
  readonly traceExport: Extract<
    BraintrustIntegrationOperatorStatus["traceExport"],
    { readonly outcome: "pending"; readonly phase: "retry_scheduled" }
  >;
};
const path =
  "/v1/workspaces/workspace-1/projects/project-1/integrations/braintrust/traces/trace:reasoning-1/status";

describe("integration status route factory", () => {
  it("authenticates and authorizes the exact workspace/project before returning status", async () => {
    const calls: unknown[] = [];
    const routes = createIntegrationStatusRoutes(
      authenticator(calls),
      authorizer(calls),
      statusReader(calls),
      { now: () => 1_234 }
    );

    const response = await routes.request(path, {
      headers: { Cookie: "__Host-er_session=fixture" }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("vary")).toBe("Authorization, Cookie");
    expect(await response.json()).toEqual(status());
    expect(calls[0]).toMatchObject({ nowEpochMilliseconds: 1_234 });
    expect(
      typeof calls[0] === "object" &&
        calls[0] !== null &&
        "request" in calls[0] &&
        calls[0].request instanceof Request
    ).toBe(true);
    expect(calls.slice(1)).toEqual([
      {
        principal,
        projectId: "project-1",
        workspaceId: "workspace-1"
      },
      {
        projectId: "project-1",
        reasoningTraceId: "trace:reasoning-1",
        workspaceId: "workspace-1"
      }
    ]);
  });

  it("rejects unauthenticated, cross-workspace, and unauthorized reads before status access", async () => {
    let readCount = 0;
    const reader: Pick<IntegrationStatusService, "getBraintrustStatus"> = {
      getBraintrustStatus: () => {
        readCount += 1;
        return Promise.resolve(status());
      }
    };
    const noSession = createIntegrationStatusRoutes(
      { authenticate: () => Promise.resolve(undefined) },
      { canReadProject: () => Promise.resolve(true) },
      reader
    );
    const wrongWorkspace = createIntegrationStatusRoutes(
      authenticator([]),
      { canReadProject: () => Promise.resolve(true) },
      reader
    );
    const deniedProject = createIntegrationStatusRoutes(
      authenticator([]),
      { canReadProject: () => Promise.resolve(false) },
      reader
    );

    const unauthenticated = await noSession.request(path);
    const crossWorkspace = await wrongWorkspace.request(path.replace("workspace-1", "workspace-2"));
    const forbidden = await deniedProject.request(path);

    expect(unauthenticated.status).toBe(401);
    expect(crossWorkspace.status).toBe(403);
    expect(forbidden.status).toBe(403);
    expect(readCount).toBe(0);
  });

  it("rejects malformed identifiers before authorization or repository reads", async () => {
    let authorizationCount = 0;
    let readCount = 0;
    const routes = createIntegrationStatusRoutes(
      authenticator([]),
      {
        canReadProject: () => {
          authorizationCount += 1;
          return Promise.resolve(true);
        }
      },
      {
        getBraintrustStatus: () => {
          readCount += 1;
          return Promise.resolve(status());
        }
      }
    );

    const response = await routes.request(
      "/v1/workspaces/workspace%20one/projects/project-1/integrations/braintrust/traces/trace-1/status"
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "invalid_identifier",
      retryable: false
    });
    expect(authorizationCount).toBe(0);
    expect(readCount).toBe(0);
  });

  it("maps typed not-found and availability failures without reflecting provider REDACTEDs", async () => {
    const notFound = createIntegrationStatusRoutes(
      authenticator([]),
      authorizer([]),
      rejectingReader(new IntegrationStatusError("not_found"))
    );
    const corrupt = createIntegrationStatusRoutes(
      authenticator([]),
      authorizer([]),
      rejectingReader(new IntegrationStatusError("invalid_snapshot"))
    );
    const unsafe = createIntegrationStatusRoutes(
      authenticator([]),
      authorizer([]),
      rejectingReader(new Error("postgres-REDACTED-and-braintrust-key"))
    );

    const missingResponse = await notFound.request(path);
    const corruptResponse = await corrupt.request(path);
    const unsafeResponse = await unsafe.request(path);

    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({
      error: "not_found",
      retryable: false
    });
    expect(corruptResponse.status).toBe(503);
    expect(await corruptResponse.json()).toEqual({
      error: "integration_status_unavailable",
      retryable: true
    });
    expect(unsafeResponse.status).toBe(500);
    expect(await unsafeResponse.text()).toBe('{"error":"internal_server_error","retryable":false}');
  });

  it("allowlists the response and cannot REDACTED through undeclared sensitive properties", async () => {
    const unsafeStatus: RetryScheduledStatus & {
      readonly payloadObjectMetadataId: string;
      readonly traceExport: RetryScheduledStatus["traceExport"] & {
        readonly payloadDigest: string;
      };
    } = {
      ...status(),
      payloadObjectMetadataId: "object-REDACTED",
      traceExport: {
        ...status().traceExport,
        payloadDigest: `sha256:${"a".repeat(64)}`
      }
    };
    const routes = createIntegrationStatusRoutes(authenticator([]), authorizer([]), {
      getBraintrustStatus: () => Promise.resolve(unsafeStatus)
    });

    const response = await routes.request(path);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).not.toContain("payloadObjectMetadataId");
    expect(body).not.toContain("payloadDigest");
    expect(body).not.toContain("object-REDACTED");
  });

  it("mounts an honest unavailable response when durable auth/read composition is absent", async () => {
    const response = await createUnavailableIntegrationStatusRoutes().request(path);

    expect(response.status).toBe(503);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("retry-after")).toBe("60");
    expect(await response.json()).toEqual({
      error: "integration_status_unavailable",
      retryable: true
    });
  });
});

function authenticator(calls: unknown[]): IntegrationStatusAuthenticator {
  return {
    authenticate(input) {
      calls.push(input);
      return Promise.resolve(principal);
    }
  };
}

function authorizer(calls: unknown[]): IntegrationStatusProjectAuthorizer {
  return {
    canReadProject(input) {
      calls.push(input);
      return Promise.resolve(true);
    }
  };
}

function statusReader(calls: unknown[]): Pick<IntegrationStatusService, "getBraintrustStatus"> {
  return {
    getBraintrustStatus(input) {
      calls.push(input);
      return Promise.resolve(status());
    }
  };
}

function rejectingReader(error: Error): Pick<IntegrationStatusService, "getBraintrustStatus"> {
  return {
    getBraintrustStatus: () => Promise.reject(error)
  };
}

function status(): RetryScheduledStatus {
  return {
    apiVersion: "braintrust-integration-status.v1",
    deterministicProductState: "independent_of_trace_export",
    finalValidationSummary: {
      completedAt: "2026-07-24T18:00:00.000Z",
      href: "/v1/workspaces/workspace-1/projects/project-1/validation-batches/batch-1/summary",
      state: "available",
      summaryClass: "verified",
      validationBatchId: "batch-1"
    },
    projectId: "project-1",
    provider: "braintrust",
    reasoningTraceId: "trace:reasoning-1",
    traceExport: {
      attemptCount: 2,
      failureClass: "provider",
      nextAttemptAt: "2026-07-24T18:01:00.000Z",
      outcome: "pending",
      phase: "retry_scheduled",
      terminal: false
    },
    workspaceId: "workspace-1"
  };
}
