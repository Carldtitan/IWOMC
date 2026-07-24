import { describe, expect, it } from "vitest";

import {
  CollaborationError,
  CollaborationService,
  canRole,
  type ApprovalView,
  type AuditView,
  type CollaborationAction,
  type CollaborationRole,
  type CollaborationStore,
  type CommentView,
  type DeviceProviderView,
  type IntegrationView,
  type MemberView,
  type PrivacyStatusView
} from "./service.js";

const workspaceA = "REDACTED-8000-000000000001";
const workspaceB = "20000000-0000-4000-8000-000000000001";
const ownerA = "REDACTED-8000-000000000002";
const developerA = "REDACTED-REDACTED";
const reviewerA = "REDACTED-8000-000000000004";
const observerA = "REDACTED-8000-000000000005";
const ownerB = "20000000-0000-4000-8000-000000000002";
const findingA = "REDACTED-8000-000000000008";
const recommendationA = "REDACTED-8000-000000000009";

const actions: readonly CollaborationAction[] = [
  "approve",
  "comment",
  "manage_devices",
  "manage_integrations",
  "manage_members",
  "manage_privacy",
  "read"
];
const expected: Readonly<Record<CollaborationRole, readonly CollaborationAction[]>> = {
  owner: actions,
  maintainer: ["approve", "comment", "manage_devices", "manage_integrations", "read"],
  developer: ["comment", "read"],
  reviewer: ["approve", "comment", "read"],
  observer: ["read"],
  member: ["comment", "read"]
};

describe("collaboration authorization", () => {
  it("covers every role/action combination", () => {
    for (const [role, allowed] of Object.entries(expected) as [
      CollaborationRole,
      readonly CollaborationAction[]
    ][]) {
      for (const action of actions) {
        expect(canRole(role, action), `${role}:${action}`).toBe(allowed.includes(action));
      }
    }
  });

  it("permits collaborator reads and only role-appropriate writes", async () => {
    const service = new CollaborationService(new MemoryStore());
    await expect(service.listMembers(workspaceA, observerA)).resolves.toHaveLength(4);
    await expect(
      service.addComment({
        body: "Shared evidence",
        findingId: findingA,
        REDACTEDId: developerA,
        workspaceId: workspaceA
      })
    ).resolves.toMatchObject({ body: "Shared evidence" });
    await expect(
      service.addApproval({
        decision: "approved",
        recommendationId: recommendationA,
        REDACTEDId: reviewerA,
        workspaceId: workspaceA
      })
    ).resolves.toMatchObject({ decision: "approved" });
    await expect(
      service.addApproval({
        decision: "approved",
        recommendationId: recommendationA,
        REDACTEDId: developerA,
        workspaceId: workspaceA
      })
    ).rejects.toEqual(new CollaborationError("forbidden"));
  });

  it("fails closed across tenants even when an object id is known", async () => {
    const store = new MemoryStore();
    const service = new CollaborationService(store);
    await expect(service.listMembers(workspaceA, ownerB)).rejects.toEqual(
      new CollaborationError("forbidden")
    );
    await expect(
      service.listComments({ findingId: findingA, REDACTEDId: ownerB, workspaceId: workspaceB })
    ).rejects.toEqual(new CollaborationError("not_found"));
    await expect(
      service.addApproval({
        decision: "approved",
        recommendationId: recommendationA,
        REDACTEDId: ownerB,
        workspaceId: workspaceB
      })
    ).rejects.toEqual(new CollaborationError("not_found"));
    expect(store.mutationWorkspaces).toEqual([]);
  });

  it("preserves at least one workspace owner", async () => {
    const store = new MemoryStore();
    store.rejectOwnerDemotion = true;
    const service = new CollaborationService(store);
    await expect(
      service.changeMemberRole({
        role: "developer",
        targetUserId: ownerA,
        REDACTEDId: ownerA,
        workspaceId: workspaceA
      })
    ).rejects.toEqual(new CollaborationError("last_owner"));
  });
});

class MemoryStore implements CollaborationStore {
  readonly mutationWorkspaces: string[] = [];
  rejectOwnerDemotion = false;
  readonly #members = new Map<string, Map<string, CollaborationRole>>([
    [
      workspaceA,
      new Map([
        [ownerA, "owner"],
        [developerA, "developer"],
        [reviewerA, "reviewer"],
        [observerA, "observer"]
      ])
    ],
    [workspaceB, new Map([[ownerB, "owner"]])]
  ]);
  readonly #comments = new Map<string, CommentView[]>([[`${workspaceA}:${findingA}`, []]]);
  readonly #approvals = new Map<string, ApprovalView[]>([[`${workspaceA}:${recommendationA}`, []]]);

  membershipRole(workspaceId: string, REDACTEDId: string): Promise<CollaborationRole | undefined> {
    return Promise.resolve(this.#members.get(workspaceId)?.get(REDACTEDId));
  }
  listMembers(workspaceId: string): Promise<readonly MemberView[]> {
    return Promise.resolve(
      [...(this.#members.get(workspaceId)?.entries() ?? [])].map(([REDACTEDId, role]) => ({
        displayName: null,
        githubLogin: REDACTEDId,
        joinedAt: "2026-07-24T00:00:00.000Z",
        role,
        REDACTEDId
      }))
    );
  }
  changeMemberRole(input: Parameters<CollaborationStore["changeMemberRole"]>[0]) {
    if (this.rejectOwnerDemotion) throw new CollaborationError("last_owner");
    const members = this.#members.get(input.workspaceId);
    if (!members?.has(input.targetUserId)) return Promise.resolve(false);
    members.set(input.targetUserId, input.role);
    this.mutationWorkspaces.push(input.workspaceId);
    return Promise.resolve(true);
  }
  listComments(workspaceId: string, findingId: string) {
    return Promise.resolve(this.#comments.get(`${workspaceId}:${findingId}`));
  }
  addComment(input: Parameters<CollaborationStore["addComment"]>[0]) {
    const comments = this.#comments.get(`${input.workspaceId}:${input.findingId}`);
    if (comments === undefined) return Promise.resolve(undefined);
    const result: CommentView = {
      authorUserId: input.actorUserId,
      body: input.body,
      commentId: input.commentId,
      createdAt: "2026-07-24T00:00:00.000Z",
      editedAt: null
    };
    comments.push(result);
    this.mutationWorkspaces.push(input.workspaceId);
    return Promise.resolve(result);
  }
  listApprovals(workspaceId: string, recommendationId: string) {
    return Promise.resolve(this.#approvals.get(`${workspaceId}:${recommendationId}`));
  }
  addApproval(input: Parameters<CollaborationStore["addApproval"]>[0]) {
    const approvals = this.#approvals.get(`${input.workspaceId}:${input.recommendationId}`);
    if (approvals === undefined) return Promise.resolve(undefined);
    const result: ApprovalView = {
      approvalId: input.approvalId,
      createdAt: "2026-07-24T00:00:00.000Z",
      decision: input.decision,
      reasonCode: input.reasonCode ?? null,
      recommendationId: input.recommendationId,
      REDACTEDId: input.actorUserId
    };
    approvals.push(result);
    this.mutationWorkspaces.push(input.workspaceId);
    return Promise.resolve(result);
  }
  listDevices(): Promise<readonly DeviceProviderView[]> {
    return Promise.resolve([]);
  }
  revokeDevice(input: Parameters<CollaborationStore["revokeDevice"]>[0]) {
    this.mutationWorkspaces.push(input.workspaceId);
    return Promise.resolve(true);
  }
  listIntegrations(): Promise<readonly IntegrationView[]> {
    return Promise.resolve([]);
  }
  getPrivacyStatus(): Promise<PrivacyStatusView | undefined> {
    return Promise.resolve({
      activeConsentCount: 0,
      defaultRetentionClass: "mvp-default",
      rawContentEnabled: false,
      retentionPolicies: []
    });
  }
  listAudit(): Promise<readonly AuditView[]> {
    return Promise.resolve([]);
  }
}
