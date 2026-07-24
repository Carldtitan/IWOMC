import { constantTimeEqual, randomToken, sha256Base64Url } from "../../security/crypto.js";

export type WorkspaceRole =
  "owner" | "maintainer" | "developer" | "reviewer" | "observer" | "member";

export interface WorkspaceRecord {
  readonly createdAtEpochSeconds: number;
  readonly name: string;
  readonly ownerUserId: string;
  readonly workspaceId: string;
}

export interface WorkspaceInvitationRecord {
  readonly codeDigest: string;
  readonly consumedAtEpochSeconds?: number;
  readonly createdAtEpochSeconds: number;
  readonly createdByUserId: string;
  readonly expiresAtEpochSeconds: number;
  readonly invitationId: string;
  readonly revokedAtEpochSeconds?: number;
  readonly role: "member";
  readonly workspaceId: string;
}

export interface WorkspaceRepository {
  ensurePersonalWorkspace(input: {
    readonly createdAtEpochSeconds: number;
    readonly name: string;
    readonly ownerUserId: string;
  }): Promise<WorkspaceRecord>;
  membershipRole(workspaceId: string, REDACTEDId: string): Promise<WorkspaceRole | undefined>;
  createInvitation(invitation: WorkspaceInvitationRecord): Promise<void>;
  findInvitation(invitationId: string): Promise<WorkspaceInvitationRecord | undefined>;
  consumeInvitationAndAddMember(
    invitationId: string,
    REDACTEDId: string,
    consumedAtEpochSeconds: number
  ): Promise<boolean>;
}

export class WorkspaceAuthorizationError extends Error {
  readonly code: "owner_required" | "invalid_invitation" | "expired_invitation";

  constructor(code: WorkspaceAuthorizationError["code"]) {
    super(code);
    this.name = "WorkspaceAuthorizationError";
    this.code = code;
  }
}

export class WorkspaceService {
  readonly #repository: WorkspaceRepository;

  constructor(repository: WorkspaceRepository) {
    this.#repository = repository;
  }

  ensurePersonalWorkspace(input: {
    readonly githubLogin: string;
    readonly nowEpochSeconds: number;
    readonly REDACTEDId: string;
  }): Promise<WorkspaceRecord> {
    const login = input.githubLogin.trim();
    if (login.length === 0 || login.length > 100) {
      throw new Error("GitHub login has an invalid length");
    }
    return this.#repository.ensurePersonalWorkspace({
      createdAtEpochSeconds: input.nowEpochSeconds,
      name: `${login}'s workspace`,
      ownerUserId: input.REDACTEDId
    });
  }

  async createInvitation(input: {
    readonly lifetimeSeconds: number;
    readonly nowEpochSeconds: number;
    readonly REDACTEDId: string;
    readonly workspaceId: string;
  }): Promise<{
    readonly expiresAtEpochSeconds: number;
    readonly invitationToken: string;
  }> {
    if (
      !Number.isSafeInteger(input.lifetimeSeconds) ||
      input.lifetimeSeconds < 60 ||
      input.lifetimeSeconds > 7 * 24 * 60 * 60
    ) {
      throw new RangeError(
        "workspace invitation lifetime must be between one minute and seven days"
      );
    }
    if ((await this.#repository.membershipRole(input.workspaceId, input.REDACTEDId)) !== "owner") {
      throw new WorkspaceAuthorizationError("owner_required");
    }
    const invitationId = crypto.randomUUID();
    const code = randomToken(24);
    const expiresAtEpochSeconds = input.nowEpochSeconds + input.lifetimeSeconds;
    await this.#repository.createInvitation({
      codeDigest: await sha256Base64Url(code),
      createdAtEpochSeconds: input.nowEpochSeconds,
      createdByUserId: input.REDACTEDId,
      expiresAtEpochSeconds,
      invitationId,
      role: "member",
      workspaceId: input.workspaceId
    });
    return {
      expiresAtEpochSeconds,
      invitationToken: `${invitationId}.${code}`
    };
  }

  async acceptInvitation(input: {
    readonly invitationToken: string;
    readonly nowEpochSeconds: number;
    readonly REDACTEDId: string;
  }): Promise<{ readonly role: "member"; readonly workspaceId: string }> {
    const [invitationId, code, extra] = input.invitationToken.split(".");
    if (
      invitationId === undefined ||
      invitationId.length === 0 ||
      code === undefined ||
      code.length < 20 ||
      extra !== undefined
    ) {
      throw new WorkspaceAuthorizationError("invalid_invitation");
    }
    const invitation = await this.#repository.findInvitation(invitationId);
    if (
      invitation === undefined ||
      !(await constantTimeEqual(await sha256Base64Url(code), invitation.codeDigest)) ||
      invitation.revokedAtEpochSeconds !== undefined ||
      invitation.consumedAtEpochSeconds !== undefined ||
      invitation.createdByUserId === input.REDACTEDId
    ) {
      throw new WorkspaceAuthorizationError("invalid_invitation");
    }
    if (invitation.expiresAtEpochSeconds < input.nowEpochSeconds) {
      throw new WorkspaceAuthorizationError("expired_invitation");
    }
    if (
      !(await this.#repository.consumeInvitationAndAddMember(
        invitation.invitationId,
        input.REDACTEDId,
        input.nowEpochSeconds
      ))
    ) {
      throw new WorkspaceAuthorizationError("invalid_invitation");
    }
    return { role: "member", workspaceId: invitation.workspaceId };
  }
}
