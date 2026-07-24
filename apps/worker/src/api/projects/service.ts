import type { WorkspaceRole } from "../workspaces/service.js";

export interface AuthorizedGitHubRepository {
  readonly defaultBranch: string;
  readonly fullName: string;
  readonly installationId: string;
  readonly private: boolean;
  readonly repositoryId: string;
}

export interface RepositoryAuthorization {
  getAuthorizedRepository(input: {
    readonly installationId: string;
    readonly repositoryId: string;
    readonly REDACTEDId: string;
  }): Promise<AuthorizedGitHubRepository | undefined>;
}

export interface LinkedProject {
  readonly behaviorContractDiscoveryState: "pending";
  readonly createdAtEpochSeconds: number;
  readonly defaultPolicyVersion: 1;
  readonly projectId: string;
  readonly repository: AuthorizedGitHubRepository;
  readonly workspaceId: string;
}

export interface ProjectRepository {
  membershipRole(workspaceId: string, REDACTEDId: string): Promise<WorkspaceRole | undefined>;
  createLinkedProject(project: LinkedProject): Promise<void>;
}

export class ProjectLinkError extends Error {
  readonly code: "owner_required" | "repository_not_authorized";

  constructor(code: ProjectLinkError["code"]) {
    super(code);
    this.name = "ProjectLinkError";
    this.code = code;
  }
}

export class ProjectService {
  readonly #authorization: RepositoryAuthorization;
  readonly #repository: ProjectRepository;

  constructor(repository: ProjectRepository, authorization: RepositoryAuthorization) {
    this.#repository = repository;
    this.#authorization = authorization;
  }

  async linkGitHubRepository(input: {
    readonly installationId: string;
    readonly nowEpochSeconds: number;
    readonly repositoryId: string;
    readonly REDACTEDId: string;
    readonly workspaceId: string;
  }): Promise<LinkedProject> {
    if ((await this.#repository.membershipRole(input.workspaceId, input.REDACTEDId)) !== "owner") {
      throw new ProjectLinkError("owner_required");
    }
    const authorized = await this.#authorization.getAuthorizedRepository({
      installationId: input.installationId,
      repositoryId: input.repositoryId,
      REDACTEDId: input.REDACTEDId
    });
    if (
      authorized?.installationId !== input.installationId ||
      authorized?.repositoryId !== input.repositoryId
    ) {
      throw new ProjectLinkError("repository_not_authorized");
    }
    const project: LinkedProject = {
      behaviorContractDiscoveryState: "pending",
      createdAtEpochSeconds: input.nowEpochSeconds,
      defaultPolicyVersion: 1,
      projectId: crypto.randomUUID(),
      repository: authorized,
      workspaceId: input.workspaceId
    };
    await this.#repository.createLinkedProject(project);
    return project;
  }
}
