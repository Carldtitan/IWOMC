import { sha256Base64Url } from "../../security/crypto.js";

export type CollaborationRole =
  "owner" | "maintainer" | "developer" | "reviewer" | "observer" | "member";

export interface MemberView {
  readonly joinedAt: string;
  readonly role: CollaborationRole;
  readonly userId: string;
  readonly displayName: string | null;
  readonly githubLogin: string;
}

export interface CommentView {
  readonly authorUserId: string;
  readonly body: string;
  readonly commentId: string;
  readonly createdAt: string;
  readonly editedAt: string | null;
}

export interface ApprovalView {
  readonly approvalId: string;
  readonly createdAt: string;
  readonly decision: "approved" | "rejected";
  readonly reasonCode: string | null;
  readonly recommendationId: string;
  readonly userId: string;
}

export interface DeviceProviderView {
  readonly companionVersion: string | null;
  readonly deviceId: string;
  readonly displayName: string;
  readonly lastSeenAt: string | null;
  readonly platform: string;
  readonly providers: readonly string[];
  readonly state: string;
}

export interface IntegrationView {
  readonly accountLogin: string;
  readonly integrationId: string;
  readonly installedAt: string;
  readonly provider: "github";
  readonly state: "active" | "suspended";
}

export interface PrivacyStatusView {
  readonly activeConsentCount: number;
  readonly defaultRetentionClass: string;
  readonly rawContentEnabled: boolean;
  readonly retentionPolicies: readonly {
    readonly durationSeconds: number;
    readonly objectType: string;
    readonly retentionClass: string;
    readonly version: number;
  }[];
}

export interface AuditView {
  readonly action: string;
  readonly actorType: string;
  readonly actorUserId: string | null;
  readonly auditId: string;
  readonly category: string;
  readonly objectId: string;
  readonly objectType: string;
  readonly occurredAt: string;
  readonly outcome: string;
}

export interface CollaborationStore {
  membershipRole(workspaceId: string, userId: string): Promise<CollaborationRole | undefined>;
  listMembers(workspaceId: string): Promise<readonly MemberView[]>;
  changeMemberRole(input: {
    readonly actorUserId: string;
    readonly auditId: string;
    readonly idempotencyKey: string;
    readonly role: Exclude<CollaborationRole, "member">;
    readonly targetUserId: string;
    readonly workspaceId: string;
  }): Promise<boolean>;
  listComments(workspaceId: string, findingId: string): Promise<readonly CommentView[] | undefined>;
  addComment(input: {
    readonly actorUserId: string;
    readonly auditId: string;
    readonly body: string;
    readonly bodyDigest: string;
    readonly commentId: string;
    readonly findingId: string;
    readonly idempotencyKey: string;
    readonly workspaceId: string;
  }): Promise<CommentView | undefined>;
  listApprovals(
    workspaceId: string,
    recommendationId: string
  ): Promise<readonly ApprovalView[] | undefined>;
  addApproval(input: {
    readonly actorUserId: string;
    readonly approvalId: string;
    readonly auditId: string;
    readonly decision: "approved" | "rejected";
    readonly idempotencyKey: string;
    readonly objectDigest: string;
    readonly reasonCode?: string;
    readonly recommendationId: string;
    readonly workspaceId: string;
  }): Promise<ApprovalView | "conflict" | undefined>;
  listDevices(workspaceId: string): Promise<readonly DeviceProviderView[]>;
  revokeDevice(input: {
    readonly actorUserId: string;
    readonly auditId: string;
    readonly deviceId: string;
    readonly idempotencyKey: string;
    readonly workspaceId: string;
  }): Promise<boolean>;
  listIntegrations(workspaceId: string): Promise<readonly IntegrationView[]>;
  getPrivacyStatus(workspaceId: string): Promise<PrivacyStatusView | undefined>;
  listAudit(workspaceId: string, limit: number): Promise<readonly AuditView[]>;
}

export type CollaborationAction =
  | "approve"
  | "comment"
  | "manage_devices"
  | "manage_integrations"
  | "manage_members"
  | "manage_privacy"
  | "read";

const rolePermissions: Readonly<Record<CollaborationRole, ReadonlySet<CollaborationAction>>> = {
  owner: new Set([
    "approve",
    "comment",
    "manage_devices",
    "manage_integrations",
    "manage_members",
    "manage_privacy",
    "read"
  ]),
  maintainer: new Set(["approve", "comment", "manage_devices", "manage_integrations", "read"]),
  developer: new Set(["comment", "read"]),
  reviewer: new Set(["approve", "comment", "read"]),
  observer: new Set(["read"]),
  member: new Set(["comment", "read"])
};

export class CollaborationError extends Error {
  readonly code: "approval_conflict" | "forbidden" | "invalid_body" | "last_owner" | "not_found";

  constructor(code: CollaborationError["code"]) {
    super(code);
    this.name = "CollaborationError";
    this.code = code;
  }
}

export class CollaborationService {
  readonly #store: CollaborationStore;

  constructor(store: CollaborationStore) {
    this.#store = store;
  }

  async listMembers(workspaceId: string, userId: string): Promise<readonly MemberView[]> {
    await this.#authorize(workspaceId, userId, "read");
    return this.#store.listMembers(workspaceId);
  }

  async changeMemberRole(input: {
    readonly role: Exclude<CollaborationRole, "member">;
    readonly targetUserId: string;
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<void> {
    await this.#authorize(input.workspaceId, input.userId, "manage_members");
    if (
      !(await this.#store.changeMemberRole({
        actorUserId: input.userId,
        auditId: crypto.randomUUID(),
        idempotencyKey: `member-role:${crypto.randomUUID()}`,
        role: input.role,
        targetUserId: input.targetUserId,
        workspaceId: input.workspaceId
      }))
    ) {
      throw new CollaborationError("not_found");
    }
  }

  async listComments(input: {
    readonly findingId: string;
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<readonly CommentView[]> {
    await this.#authorize(input.workspaceId, input.userId, "read");
    const comments = await this.#store.listComments(input.workspaceId, input.findingId);
    if (comments === undefined) {
      throw new CollaborationError("not_found");
    }
    return comments;
  }

  async addComment(input: {
    readonly body: string;
    readonly findingId: string;
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<CommentView> {
    await this.#authorize(input.workspaceId, input.userId, "comment");
    const body = input.body.trim();
    if (body.length < 1 || body.length > 10_000) {
      throw new CollaborationError("invalid_body");
    }
    const commentId = crypto.randomUUID();
    const comment = await this.#store.addComment({
      actorUserId: input.userId,
      auditId: crypto.randomUUID(),
      body,
      bodyDigest: await sha256Base64Url(body),
      commentId,
      findingId: input.findingId,
      idempotencyKey: `finding-comment:${commentId}`,
      workspaceId: input.workspaceId
    });
    if (comment === undefined) {
      throw new CollaborationError("not_found");
    }
    return comment;
  }

  async listApprovals(input: {
    readonly recommendationId: string;
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<readonly ApprovalView[]> {
    await this.#authorize(input.workspaceId, input.userId, "read");
    const approvals = await this.#store.listApprovals(input.workspaceId, input.recommendationId);
    if (approvals === undefined) {
      throw new CollaborationError("not_found");
    }
    return approvals;
  }

  async addApproval(input: {
    readonly decision: "approved" | "rejected";
    readonly reasonCode?: string;
    readonly recommendationId: string;
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<ApprovalView> {
    await this.#authorize(input.workspaceId, input.userId, "approve");
    const reasonCode = input.reasonCode?.trim();
    if (reasonCode !== undefined && (reasonCode.length < 1 || reasonCode.length > 200)) {
      throw new CollaborationError("invalid_body");
    }
    const approvalId = crypto.randomUUID();
    const binding = JSON.stringify({
      decision: input.decision,
      reasonCode: reasonCode ?? null,
      recommendationId: input.recommendationId
    });
    const approval = await this.#store.addApproval({
      actorUserId: input.userId,
      approvalId,
      auditId: crypto.randomUUID(),
      decision: input.decision,
      idempotencyKey: `recommendation-approval:${approvalId}`,
      objectDigest: await sha256Base64Url(binding),
      ...(reasonCode === undefined ? {} : { reasonCode }),
      recommendationId: input.recommendationId,
      workspaceId: input.workspaceId
    });
    if (approval === "conflict") {
      throw new CollaborationError("approval_conflict");
    }
    if (approval === undefined) {
      throw new CollaborationError("not_found");
    }
    return approval;
  }

  async listDevices(workspaceId: string, userId: string): Promise<readonly DeviceProviderView[]> {
    await this.#authorize(workspaceId, userId, "read");
    return this.#store.listDevices(workspaceId);
  }

  async revokeDevice(input: {
    readonly deviceId: string;
    readonly userId: string;
    readonly workspaceId: string;
  }): Promise<void> {
    await this.#authorize(input.workspaceId, input.userId, "manage_devices");
    if (
      !(await this.#store.revokeDevice({
        actorUserId: input.userId,
        auditId: crypto.randomUUID(),
        deviceId: input.deviceId,
        idempotencyKey: `device-revoke:${crypto.randomUUID()}`,
        workspaceId: input.workspaceId
      }))
    ) {
      throw new CollaborationError("not_found");
    }
  }

  async listIntegrations(workspaceId: string, userId: string): Promise<readonly IntegrationView[]> {
    await this.#authorize(workspaceId, userId, "read");
    return this.#store.listIntegrations(workspaceId);
  }

  async getPrivacyStatus(workspaceId: string, userId: string): Promise<PrivacyStatusView> {
    await this.#authorize(workspaceId, userId, "read");
    const status = await this.#store.getPrivacyStatus(workspaceId);
    if (status === undefined) {
      throw new CollaborationError("not_found");
    }
    return status;
  }

  async listAudit(workspaceId: string, userId: string, limit = 100): Promise<readonly AuditView[]> {
    await this.#authorize(workspaceId, userId, "read");
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 200) {
      throw new CollaborationError("invalid_body");
    }
    return this.#store.listAudit(workspaceId, limit);
  }

  async #authorize(
    workspaceId: string,
    userId: string,
    action: CollaborationAction
  ): Promise<CollaborationRole> {
    const role = await this.#store.membershipRole(workspaceId, userId);
    if (role === undefined || !rolePermissions[role].has(action)) {
      throw new CollaborationError("forbidden");
    }
    return role;
  }
}

export function canRole(role: CollaborationRole, action: CollaborationAction): boolean {
  return rolePermissions[role].has(action);
}
