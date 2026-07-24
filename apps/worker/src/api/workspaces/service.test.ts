import { describe, expect, it } from "vitest";

import {
  WorkspaceAuthorizationError,
  WorkspaceService,
  type WorkspaceInvitationRecord,
  type WorkspaceRecord,
  type WorkspaceRepository,
  type WorkspaceRole
} from "./service.js";

class MemoryWorkspaceRepository implements WorkspaceRepository {
  readonly invitations = new Map<string, WorkspaceInvitationRecord>();
  readonly memberships = new Map<string, WorkspaceRole>();
  workspace: WorkspaceRecord | undefined;

  ensurePersonalWorkspace(input: {
    createdAtEpochSeconds: number;
    name: string;
    ownerUserId: string;
  }): Promise<WorkspaceRecord> {
    this.workspace ??= {
      ...input,
      workspaceId: "workspace-personal"
    };
    this.memberships.set(`${this.workspace.workspaceId}:${input.ownerUserId}`, "owner");
    return Promise.resolve(this.workspace);
  }

  membershipRole(workspaceId: string, REDACTEDId: string): Promise<WorkspaceRole | undefined> {
    return Promise.resolve(this.memberships.get(`${workspaceId}:${REDACTEDId}`));
  }

  createInvitation(invitation: WorkspaceInvitationRecord): Promise<void> {
    this.invitations.set(invitation.invitationId, invitation);
    return Promise.resolve();
  }

  findInvitation(invitationId: string): Promise<WorkspaceInvitationRecord | undefined> {
    return Promise.resolve(this.invitations.get(invitationId));
  }

  consumeInvitationAndAddMember(
    invitationId: string,
    REDACTEDId: string,
    consumedAtEpochSeconds: number
  ): Promise<boolean> {
    const invitation = this.invitations.get(invitationId);
    if (invitation === undefined || invitation.consumedAtEpochSeconds !== undefined) {
      return Promise.resolve(false);
    }
    this.invitations.set(invitationId, { ...invitation, consumedAtEpochSeconds });
    this.memberships.set(`${invitation.workspaceId}:${REDACTEDId}`, "member");
    return Promise.resolve(true);
  }
}

describe("WorkspaceService", () => {
  it("creates one idempotent personal workspace for a GitHub REDACTED", async () => {
    const repository = new MemoryWorkspaceRepository();
    const service = new WorkspaceService(repository);

    const first = await service.ensurePersonalWorkspace({
      githubLogin: "developer",
      nowEpochSeconds: 1_000,
      REDACTEDId: "github-REDACTED-1"
    });
    const second = await service.ensurePersonalWorkspace({
      githubLogin: "renamed-developer",
      nowEpochSeconds: 2_000,
      REDACTEDId: "github-REDACTED-1"
    });

    expect(second).toEqual(first);
    await expect(repository.membershipRole(first.workspaceId, "github-REDACTED-1")).resolves.toBe(
      "owner"
    );
  });

  it("allows only an owner to create a hashed, expiring, single-use member invite", async () => {
    const repository = new MemoryWorkspaceRepository();
    const service = new WorkspaceService(repository);
    await service.ensurePersonalWorkspace({
      githubLogin: "owner",
      nowEpochSeconds: 1_000,
      REDACTEDId: "owner-1"
    });
    const invite = await service.createInvitation({
      lifetimeSeconds: 300,
      nowEpochSeconds: 1_100,
      REDACTEDId: "owner-1",
      workspaceId: "workspace-personal"
    });
    const [invitationId] = invite.invitationToken.split(".");

    expect(repository.invitations.get(invitationId!)?.codeDigest).not.toContain(
      invite.invitationToken
    );
    await expect(
      service.acceptInvitation({
        invitationToken: invite.invitationToken,
        nowEpochSeconds: 1_200,
        REDACTEDId: "member-1"
      })
    ).resolves.toEqual({ role: "member", workspaceId: "workspace-personal" });
    await expect(
      service.acceptInvitation({
        invitationToken: invite.invitationToken,
        nowEpochSeconds: 1_201,
        REDACTEDId: "member-2"
      })
    ).rejects.toEqual(new WorkspaceAuthorizationError("invalid_invitation"));
  });

  it("rejects non-owner invitation creation and expired invitations", async () => {
    const repository = new MemoryWorkspaceRepository();
    const service = new WorkspaceService(repository);
    await service.ensurePersonalWorkspace({
      githubLogin: "owner",
      nowEpochSeconds: 1_000,
      REDACTEDId: "owner-1"
    });
    await expect(
      service.createInvitation({
        lifetimeSeconds: 60,
        nowEpochSeconds: 1_100,
        REDACTEDId: "outsider",
        workspaceId: "workspace-personal"
      })
    ).rejects.toEqual(new WorkspaceAuthorizationError("owner_required"));
    const invite = await service.createInvitation({
      lifetimeSeconds: 60,
      nowEpochSeconds: 1_100,
      REDACTEDId: "owner-1",
      workspaceId: "workspace-personal"
    });
    await expect(
      service.acceptInvitation({
        invitationToken: invite.invitationToken,
        nowEpochSeconds: 1_161,
        REDACTEDId: "member-1"
      })
    ).rejects.toEqual(new WorkspaceAuthorizationError("expired_invitation"));
  });
});
