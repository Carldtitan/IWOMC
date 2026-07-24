import { Hono } from "hono";

import {
  CollaborationError,
  type CollaborationRole,
  type CollaborationService
} from "./service.js";

interface CollaborationBindings {
  Bindings: Env;
}

export interface CollaborationIdentity {
  readonly REDACTEDId: string;
}

export interface CollaborationAuthenticator {
  authenticate(input: {
    readonly mutation: boolean;
    readonly request: Request;
  }): Promise<CollaborationIdentity | undefined>;
}

export function createCollaborationRoutes(
  authenticator: CollaborationAuthenticator,
  service: CollaborationService
): Hono<CollaborationBindings> {
  const routes = new Hono<CollaborationBindings>();

  routes.get("/v1/workspaces/:workspace/members", async (context) => {
    const principal = await requireIdentity(authenticator, context.req.raw, false);
    const workspaceId = requiredUuid(context.req.param("workspace"));
    return context.json({ members: await service.listMembers(workspaceId, principal.REDACTEDId) });
  });

  routes.patch("/v1/workspaces/:workspace/members/:REDACTED/role", async (context) => {
    const principal = await requireIdentity(authenticator, context.req.raw, true);
    const workspaceId = requiredUuid(context.req.param("workspace"));
    const targetUserId = requiredUuid(context.req.param("REDACTED"));
    const body = await jsonObject(context.req.raw);
    const role = requiredRole(body.role);
    await service.changeMemberRole({
      role,
      targetUserId,
      REDACTEDId: principal.REDACTEDId,
      workspaceId
    });
    return context.json({ ok: true, role, REDACTEDId: targetUserId });
  });

  routes.get("/v1/workspaces/:workspace/findings/:finding/comments", async (context) => {
    const principal = await requireIdentity(authenticator, context.req.raw, false);
    const workspaceId = requiredUuid(context.req.param("workspace"));
    const findingId = requiredUuid(context.req.param("finding"));
    return context.json({
      comments: await service.listComments({
        findingId,
        REDACTEDId: principal.REDACTEDId,
        workspaceId
      })
    });
  });

  routes.post("/v1/workspaces/:workspace/findings/:finding/comments", async (context) => {
    const principal = await requireIdentity(authenticator, context.req.raw, true);
    const workspaceId = requiredUuid(context.req.param("workspace"));
    const findingId = requiredUuid(context.req.param("finding"));
    const body = await jsonObject(context.req.raw);
    if (typeof body.body !== "string") {
      throw new CollaborationRouteError("invalid_request", 400);
    }
    const comment = await service.addComment({
      body: body.body,
      findingId,
      REDACTEDId: principal.REDACTEDId,
      workspaceId
    });
    return context.json({ comment }, 201);
  });

  routes.get(
    "/v1/workspaces/:workspace/recommendations/:recommendation/approvals",
    async (context) => {
      const principal = await requireIdentity(authenticator, context.req.raw, false);
      const workspaceId = requiredUuid(context.req.param("workspace"));
      const recommendationId = requiredUuid(context.req.param("recommendation"));
      return context.json({
        approvals: await service.listApprovals({
          recommendationId,
          REDACTEDId: principal.REDACTEDId,
          workspaceId
        })
      });
    }
  );

  routes.post(
    "/v1/workspaces/:workspace/recommendations/:recommendation/approvals",
    async (context) => {
      const principal = await requireIdentity(authenticator, context.req.raw, true);
      const workspaceId = requiredUuid(context.req.param("workspace"));
      const recommendationId = requiredUuid(context.req.param("recommendation"));
      const body = await jsonObject(context.req.raw);
      if (body.decision !== "approved" && body.decision !== "rejected") {
        throw new CollaborationRouteError("invalid_request", 400);
      }
      if (body.reasonCode !== undefined && typeof body.reasonCode !== "string") {
        throw new CollaborationRouteError("invalid_request", 400);
      }
      const approval = await service.addApproval({
        decision: body.decision,
        ...(body.reasonCode === undefined ? {} : { reasonCode: body.reasonCode }),
        recommendationId,
        REDACTEDId: principal.REDACTEDId,
        workspaceId
      });
      return context.json({ approval }, 201);
    }
  );

  routes.get("/v1/workspaces/:workspace/devices", async (context) => {
    const principal = await requireIdentity(authenticator, context.req.raw, false);
    const workspaceId = requiredUuid(context.req.param("workspace"));
    return context.json({ devices: await service.listDevices(workspaceId, principal.REDACTEDId) });
  });

  routes.post("/v1/workspaces/:workspace/devices/:device/revoke", async (context) => {
    const principal = await requireIdentity(authenticator, context.req.raw, true);
    const workspaceId = requiredUuid(context.req.param("workspace"));
    const deviceId = requiredUuid(context.req.param("device"));
    await service.revokeDevice({ deviceId, REDACTEDId: principal.REDACTEDId, workspaceId });
    return context.json({ deviceId, ok: true });
  });

  routes.get("/v1/workspaces/:workspace/integrations", async (context) => {
    const principal = await requireIdentity(authenticator, context.req.raw, false);
    const workspaceId = requiredUuid(context.req.param("workspace"));
    return context.json({
      integrations: await service.listIntegrations(workspaceId, principal.REDACTEDId)
    });
  });

  routes.get("/v1/workspaces/:workspace/privacy", async (context) => {
    const principal = await requireIdentity(authenticator, context.req.raw, false);
    const workspaceId = requiredUuid(context.req.param("workspace"));
    return context.json({
      privacy: await service.getPrivacyStatus(workspaceId, principal.REDACTEDId)
    });
  });

  routes.get("/v1/workspaces/:workspace/audit", async (context) => {
    const principal = await requireIdentity(authenticator, context.req.raw, false);
    const workspaceId = requiredUuid(context.req.param("workspace"));
    const rawLimit = context.req.query("limit");
    const limit = rawLimit === undefined ? 100 : Number(rawLimit);
    return context.json({
      events: await service.listAudit(workspaceId, principal.REDACTEDId, limit)
    });
  });

  routes.onError((error, context) => {
    const mapped = mapCollaborationError(error);
    return context.json({ error: mapped.code }, mapped.status);
  });

  return routes;
}

class CollaborationRouteError extends Error {
  readonly code: "invalid_request" | "unauthorized";
  readonly status: 400 | 401;

  constructor(code: CollaborationRouteError["code"], status: CollaborationRouteError["status"]) {
    super(code);
    this.name = "CollaborationRouteError";
    this.code = code;
    this.status = status;
  }
}

async function requireIdentity(
  authenticator: CollaborationAuthenticator,
  request: Request,
  mutation: boolean
): Promise<CollaborationIdentity> {
  const identity = await authenticator.authenticate({ mutation, request });
  if (identity === undefined) {
    throw new CollaborationRouteError("unauthorized", 401);
  }
  return identity;
}

async function jsonObject(request: Request): Promise<Record<string, unknown>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new CollaborationRouteError("invalid_request", 400);
  }
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    throw new CollaborationRouteError("invalid_request", 400);
  }
  return body as Record<string, unknown>;
}

function requiredUuid(value: string | undefined): string {
  if (
    value === undefined ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
  ) {
    throw new CollaborationRouteError("invalid_request", 400);
  }
  return value;
}

function requiredRole(value: unknown): Exclude<CollaborationRole, "member"> {
  if (
    value !== "owner" &&
    value !== "maintainer" &&
    value !== "developer" &&
    value !== "reviewer" &&
    value !== "observer"
  ) {
    throw new CollaborationRouteError("invalid_request", 400);
  }
  return value;
}

function mapCollaborationError(error: unknown): {
  readonly code: string;
  readonly status: 400 | 401 | 403 | 404 | 409 | 500;
} {
  if (error instanceof CollaborationRouteError) {
    return { code: error.code, status: error.status };
  }
  if (error instanceof CollaborationError) {
    const statuses = {
      approval_conflict: 409,
      forbidden: 403,
      invalid_body: 400,
      last_owner: 409,
      not_found: 404
    } as const;
    return { code: error.code, status: statuses[error.code] };
  }
  return { code: "internal_server_error", status: 500 };
}
