import { Hono } from "hono";

import {
  IntegrationStatusError,
  type BraintrustIntegrationOperatorStatus,
  type IntegrationStatusService
} from "../../services/integration-status.js";

interface IntegrationStatusBindings {
  Bindings: Env;
}

export interface IntegrationStatusPrincipal {
  readonly subjectId: string;
  readonly workspaceIds: readonly string[];
}

export interface IntegrationStatusAuthenticator {
  authenticate(input: {
    readonly nowEpochMilliseconds: number;
    readonly request: Request;
  }): Promise<IntegrationStatusPrincipal | undefined>;
}

export interface IntegrationStatusProjectAuthorizer {
  canReadProject(input: {
    readonly principal: IntegrationStatusPrincipal;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<boolean>;
}

export interface IntegrationStatusRouteOptions {
  readonly now?: () => number;
}

type IntegrationStatusReader = Pick<IntegrationStatusService, "getBraintrustStatus">;

type IntegrationStatusRouteErrorCode =
  | "forbidden"
  | "integration_status_unavailable"
  | "invalid_identifier"
  | "not_found"
  | "unauthorized";

export class IntegrationStatusRouteError extends Error {
  readonly code: IntegrationStatusRouteErrorCode;
  readonly retryable: boolean;
  readonly status: 400 | 401 | 403 | 404 | 503;

  constructor(
    code: IntegrationStatusRouteErrorCode,
    status: IntegrationStatusRouteError["status"],
    retryable = false
  ) {
    super(code);
    this.name = "IntegrationStatusRouteError";
    this.code = code;
    this.retryable = retryable;
    this.status = status;
  }
}

export function createIntegrationStatusRoutes(
  authenticator: IntegrationStatusAuthenticator,
  authorizer: IntegrationStatusProjectAuthorizer,
  statusReader: IntegrationStatusReader,
  options: IntegrationStatusRouteOptions = {}
): Hono<IntegrationStatusBindings> {
  const routes = new Hono<IntegrationStatusBindings>();
  const now = options.now ?? Date.now;

  routes.get(
    "/v1/workspaces/:workspace/projects/:project/integrations/braintrust/traces/:trace/status",
    async (context) => {
      const principal = await authenticator.authenticate({
        nowEpochMilliseconds: now(),
        request: context.req.raw
      });
      if (principal === undefined) {
        throw new IntegrationStatusRouteError("unauthorized", 401);
      }

      const workspaceId = requiredIdentifier(context.req.param("workspace"));
      const projectId = requiredIdentifier(context.req.param("project"));
      const reasoningTraceId = requiredIdentifier(context.req.param("trace"));
      if (
        !principal.workspaceIds.includes(workspaceId) ||
        !(await authorizer.canReadProject({
          principal,
          projectId,
          workspaceId
        }))
      ) {
        throw new IntegrationStatusRouteError("forbidden", 403);
      }

      const status = await statusReader.getBraintrustStatus({
        projectId,
        reasoningTraceId,
        workspaceId
      });
      return context.json(
        allowlistedStatus(status, { projectId, reasoningTraceId, workspaceId }),
        200,
        {
          "cache-control": "private, no-store",
          vary: "Authorization, Cookie"
        }
      );
    }
  );

  routes.onError((error, context) => {
    const mapped = mapIntegrationStatusRouteError(error);
    return context.json(
      {
        error: mapped.code,
        retryable: mapped.retryable
      },
      mapped.status
    );
  });

  return routes;
}

/**
 * Runtime fallback used until durable product-session and integration-status
 * repositories are composed. It intentionally returns no status fields.
 */
export function createUnavailableIntegrationStatusRoutes(): Hono<IntegrationStatusBindings> {
  const routes = new Hono<IntegrationStatusBindings>();
  routes.get(
    "/v1/workspaces/:workspace/projects/:project/integrations/braintrust/traces/:trace/status",
    (context) =>
      context.json(
        {
          error: "integration_status_unavailable",
          retryable: true
        },
        503,
        {
          "cache-control": "no-store",
          "retry-after": "60"
        }
      )
  );
  return routes;
}

export function mapIntegrationStatusRouteError(error: unknown): {
  readonly code: string;
  readonly retryable: boolean;
  readonly status: 400 | 401 | 403 | 404 | 500 | 503;
} {
  if (error instanceof IntegrationStatusRouteError) {
    return {
      code: error.code,
      retryable: error.retryable,
      status: error.status
    };
  }
  if (error instanceof IntegrationStatusError) {
    switch (error.code) {
      case "invalid_input":
        return { code: "invalid_identifier", retryable: false, status: 400 };
      case "not_found":
        return { code: "not_found", retryable: false, status: 404 };
      case "invalid_snapshot":
        return {
          code: "integration_status_unavailable",
          retryable: true,
          status: 503
        };
    }
  }
  return { code: "internal_server_error", retryable: false, status: 500 };
}

function allowlistedStatus(
  status: BraintrustIntegrationOperatorStatus,
  expectedIdentity: {
    readonly projectId: string;
    readonly reasoningTraceId: string;
    readonly workspaceId: string;
  }
): BraintrustIntegrationOperatorStatus {
  if (
    status.projectId !== expectedIdentity.projectId ||
    status.reasoningTraceId !== expectedIdentity.reasoningTraceId ||
    status.workspaceId !== expectedIdentity.workspaceId
  ) {
    throw new IntegrationStatusRouteError("integration_status_unavailable", 503, true);
  }
  return {
    apiVersion: "braintrust-integration-status.v1",
    deterministicProductState: "independent_of_trace_export",
    finalValidationSummary: allowlistedSummary(status.finalValidationSummary),
    projectId: status.projectId,
    provider: "braintrust",
    reasoningTraceId: status.reasoningTraceId,
    traceExport: allowlistedTraceExport(status.traceExport),
    workspaceId: status.workspaceId
  };
}

function allowlistedSummary(
  summary: BraintrustIntegrationOperatorStatus["finalValidationSummary"]
): BraintrustIntegrationOperatorStatus["finalValidationSummary"] {
  if (summary.state === "pending") {
    return { state: "pending" };
  }
  return {
    completedAt: summary.completedAt,
    href: summary.href,
    state: "available",
    summaryClass: summary.summaryClass,
    validationBatchId: summary.validationBatchId
  };
}

function allowlistedTraceExport(
  traceExport: BraintrustIntegrationOperatorStatus["traceExport"]
): BraintrustIntegrationOperatorStatus["traceExport"] {
  if (traceExport.outcome === "exported") {
    return {
      attemptCount: traceExport.attemptCount,
      outcome: "exported",
      terminal: true
    };
  }
  if (traceExport.outcome === "terminal_failure") {
    return {
      attemptCount: traceExport.attemptCount,
      failureClass: traceExport.failureClass,
      operatorAction: "inspect_braintrust_integration",
      outcome: "terminal_failure",
      terminal: true
    };
  }
  switch (traceExport.phase) {
    case "not_queued":
      return {
        attemptCount: 0,
        outcome: "pending",
        phase: "not_queued",
        terminal: false
      };
    case "queued":
      return {
        attemptCount: traceExport.attemptCount,
        nextAttemptAt: traceExport.nextAttemptAt,
        outcome: "pending",
        phase: "queued",
        terminal: false
      };
    case "exporting":
      return {
        attemptCount: traceExport.attemptCount,
        outcome: "pending",
        phase: "exporting",
        terminal: false
      };
    case "retry_scheduled":
      return {
        attemptCount: traceExport.attemptCount,
        failureClass: traceExport.failureClass,
        nextAttemptAt: traceExport.nextAttemptAt,
        outcome: "pending",
        phase: "retry_scheduled",
        terminal: false
      };
  }
}

function requiredIdentifier(value: string | undefined): string {
  if (value === undefined || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,255}$/u.test(value)) {
    throw new IntegrationStatusRouteError("invalid_identifier", 400);
  }
  return value;
}
