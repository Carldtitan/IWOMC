import { Hono } from "hono";

import { ConfigurationError, type ConfigurationApi } from "./service.js";
import type {
  ProjectGoalPriorityInput,
  ProjectGoalPriorityKind
} from "@environment-REDACTED/REDACTED";

interface ConfigurationBindings {
  Bindings: Env;
}

export interface ConfigurationIdentity {
  readonly REDACTEDId: string;
}

export interface ConfigurationAuthenticator {
  authenticate(input: {
    readonly mutation: boolean;
    readonly request: Request;
  }): Promise<ConfigurationIdentity | undefined>;
}

export function createConfigurationRoutes(
  authenticator: ConfigurationAuthenticator,
  service: ConfigurationApi
): Hono<ConfigurationBindings> {
  const routes = new Hono<ConfigurationBindings>();

  routes.get("/v1/projects/:project/project-goal", async (context) => {
    const identity = await requireIdentity(authenticator, context.req.raw, false);
    const projectId = requiredEntityId(context.req.param("project"));
    return context.json({
      projectGoal: await service.getProjectGoal(projectId, identity.REDACTEDId)
    });
  });

  routes.patch("/v1/projects/:project/project-goal", async (context) => {
    const identity = await requireIdentity(authenticator, context.req.raw, true);
    const projectId = requiredEntityId(context.req.param("project"));
    const body = await jsonObject(context.req.raw);
    return context.json({
      projectGoal: await service.editProjectGoal({
        actorUserId: identity.REDACTEDId,
        expectedVersion: requiredVersion(body.expectedVersion),
        ...(body.nonFunctionalPriorities === undefined
          ? {}
          : {
              nonFunctionalPriorities: projectGoalPriorities(body.nonFunctionalPriorities)
            }),
        projectId,
        ...(body.statement === undefined ? {} : { statement: requiredString(body.statement) })
      })
    });
  });

  routes.get("/v1/projects/:project/behavior-contract", async (context) => {
    const identity = await requireIdentity(authenticator, context.req.raw, false);
    const projectId = requiredEntityId(context.req.param("project"));
    return context.json({
      behaviorContract: await service.getBehaviorContract(projectId, identity.REDACTEDId)
    });
  });

  routes.patch("/v1/projects/:project/behavior-contract", async (context) => {
    const identity = await requireIdentity(authenticator, context.req.raw, true);
    const projectId = requiredEntityId(context.req.param("project"));
    const body = await jsonObject(context.req.raw);
    if (body.steps === undefined) {
      throw new ConfigurationRouteError("invalid_request", 400);
    }
    return context.json({
      behaviorContract: await service.editBehaviorContract({
        actorUserId: identity.REDACTEDId,
        expectedVersion: requiredVersion(body.expectedVersion),
        projectId,
        ...(body.sourceInputDigest === undefined
          ? {}
          : { sourceInputDigest: requiredString(body.sourceInputDigest) }),
        steps: body.steps
      })
    });
  });

  routes.post("/v1/projects/:project/behavior-contract/reorder", async (context) => {
    const identity = await requireIdentity(authenticator, context.req.raw, true);
    const projectId = requiredEntityId(context.req.param("project"));
    const body = await jsonObject(context.req.raw);
    return context.json({
      behaviorContract: await service.reorderBehaviorSteps({
        actorUserId: identity.REDACTEDId,
        expectedVersion: requiredVersion(body.expectedVersion),
        orderedStepIds: stringArray(body.orderedStepIds),
        projectId
      })
    });
  });

  routes.patch("/v1/projects/:project/behavior-contract/steps/:step", async (context) => {
    const identity = await requireIdentity(authenticator, context.req.raw, true);
    const projectId = requiredEntityId(context.req.param("project"));
    const stepId = requiredEntityId(context.req.param("step"));
    const body = await jsonObject(context.req.raw);
    if (typeof body.enabled !== "boolean") {
      throw new ConfigurationRouteError("invalid_request", 400);
    }
    return context.json({
      behaviorContract: await service.setBehaviorStepEnabled({
        actorUserId: identity.REDACTEDId,
        enabled: body.enabled,
        expectedVersion: requiredVersion(body.expectedVersion),
        projectId,
        stepId
      })
    });
  });

  routes.post("/v1/projects/:project/behavior-contract/accept", async (context) => {
    const identity = await requireIdentity(authenticator, context.req.raw, true);
    const projectId = requiredEntityId(context.req.param("project"));
    const body = await jsonObject(context.req.raw);
    return context.json({
      behaviorContract: await service.acceptBehaviorContract({
        actorUserId: identity.REDACTEDId,
        expectedVersion: requiredVersion(body.expectedVersion),
        projectId
      })
    });
  });

  routes.get("/v1/projects/:project/policy", async (context) => {
    const identity = await requireIdentity(authenticator, context.req.raw, false);
    const projectId = requiredEntityId(context.req.param("project"));
    return context.json({
      policy: await service.getOptimalityPolicy(projectId, identity.REDACTEDId)
    });
  });

  routes.patch("/v1/projects/:project/policy", async (context) => {
    const identity = await requireIdentity(authenticator, context.req.raw, true);
    const projectId = requiredEntityId(context.req.param("project"));
    const body = await jsonObject(context.req.raw);
    return context.json({
      policy: await service.editOptimalityPolicy({
        actorUserId: identity.REDACTEDId,
        expectedVersion: requiredVersion(body.expectedVersion),
        patch: body.patch,
        projectId
      })
    });
  });

  routes.onError((error, context) => {
    const mapped = mapConfigurationError(error);
    return context.json({ error: mapped.code }, mapped.status);
  });

  return routes;
}

class ConfigurationRouteError extends Error {
  readonly code: "invalid_request" | "unauthorized";
  readonly status: 400 | 401;

  constructor(code: ConfigurationRouteError["code"], status: ConfigurationRouteError["status"]) {
    super(code);
    this.name = "ConfigurationRouteError";
    this.code = code;
    this.status = status;
  }
}

async function requireIdentity(
  authenticator: ConfigurationAuthenticator,
  request: Request,
  mutation: boolean
): Promise<ConfigurationIdentity> {
  const identity = await authenticator.authenticate({ mutation, request });
  if (identity === undefined) {
    throw new ConfigurationRouteError("unauthorized", 401);
  }
  return identity;
}

async function jsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ConfigurationRouteError("invalid_request", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new ConfigurationRouteError("invalid_request", 400);
  }
  return body as Record<string, unknown>;
}

function requiredEntityId(value: string | undefined): string {
  if (value === undefined || !/^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/u.test(value)) {
    throw new ConfigurationRouteError("invalid_request", 400);
  }
  return value;
}

function requiredVersion(value: unknown): number {
  if (!Number.isSafeInteger(value) || typeof value !== "number" || value < 1) {
    throw new ConfigurationRouteError("invalid_request", 400);
  }
  return value;
}

function requiredString(value: unknown): string {
  if (typeof value !== "string") {
    throw new ConfigurationRouteError("invalid_request", 400);
  }
  return value;
}

function stringArray(value: unknown): readonly string[] {
  if (!Array.isArray(value)) {
    throw new ConfigurationRouteError("invalid_request", 400);
  }
  const strings: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") {
      throw new ConfigurationRouteError("invalid_request", 400);
    }
    strings.push(item);
  }
  return strings;
}

function projectGoalPriorities(value: unknown): readonly ProjectGoalPriorityInput[] {
  if (!Array.isArray(value)) {
    throw new ConfigurationRouteError("invalid_request", 400);
  }
  return value.map((item) => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new ConfigurationRouteError("invalid_request", 400);
    }
    const priority = item as Readonly<Record<string, unknown>>;
    const kind = priorityKind(priority.kind);
    const statement = requiredString(priority.statement);
    return {
      kind,
      ...(priority.priorityId === undefined
        ? {}
        : { priorityId: requiredEntityId(requiredString(priority.priorityId)) }),
      statement
    };
  });
}

function priorityKind(value: unknown): ProjectGoalPriorityKind {
  const kinds: readonly ProjectGoalPriorityKind[] = [
    "install_time",
    "build_time",
    "runtime_latency",
    "memory",
    "disk",
    "image_size",
    "dependency_count",
    "version_freshness",
    "license",
    "security",
    "custom"
  ];
  if (typeof value !== "string" || !kinds.includes(value as ProjectGoalPriorityKind)) {
    throw new ConfigurationRouteError("invalid_request", 400);
  }
  return value as ProjectGoalPriorityKind;
}

function mapConfigurationError(error: unknown): {
  readonly code: string;
  readonly status: 400 | 401 | 403 | 404 | 409 | 500;
} {
  if (error instanceof ConfigurationRouteError) {
    return { code: error.code, status: error.status };
  }
  if (error instanceof ConfigurationError) {
    const statuses = {
      forbidden: 403,
      invalid_configuration: 400,
      not_found: 404,
      version_conflict: 409
    } as const;
    return { code: error.code, status: statuses[error.code] };
  }
  return { code: "internal_server_error", status: 500 };
}
