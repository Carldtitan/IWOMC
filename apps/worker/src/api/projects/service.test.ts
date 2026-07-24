import { describe, expect, it } from "vitest";

import {
  ProjectLinkError,
  ProjectService,
  type LinkedProject,
  type ProjectRepository,
  type RepositoryAuthorization
} from "./service.js";
import type { WorkspaceRole } from "../workspaces/service.js";

class MemoryProjectRepository implements ProjectRepository {
  readonly projects: LinkedProject[] = [];
  role: WorkspaceRole | undefined = "owner";

  membershipRole(): Promise<WorkspaceRole | undefined> {
    return Promise.resolve(this.role);
  }

  createLinkedProject(project: LinkedProject): Promise<void> {
    this.projects.push(project);
    return Promise.resolve();
  }
}

describe("ProjectService", () => {
  it("links only the exact repository and installation authorized for the REDACTED", async () => {
    const repository = new MemoryProjectRepository();
    const authorization: RepositoryAuthorization = {
      getAuthorizedRepository: (input) =>
        Promise.resolve({
          defaultBranch: "main",
          fullName: "owner/project",
          installationId: input.installationId,
          private: true,
          repositoryId: input.repositoryId
        })
    };
    const service = new ProjectService(repository, authorization);

    const project = await service.linkGitHubRepository({
      installationId: "installation-10",
      nowEpochSeconds: 1_000,
      repositoryId: "repository-20",
      REDACTEDId: "owner-1",
      workspaceId: "workspace-1"
    });

    expect(project).toMatchObject({
      behaviorContractDiscoveryState: "pending",
      defaultPolicyVersion: 1,
      repository: {
        installationId: "installation-10",
        repositoryId: "repository-20"
      }
    });
    expect(repository.projects).toEqual([project]);
  });

  it("rejects non-owners and spoofed installation/repository identities", async () => {
    const repository = new MemoryProjectRepository();
    const authorization: RepositoryAuthorization = {
      getAuthorizedRepository: () =>
        Promise.resolve({
          defaultBranch: "main",
          fullName: "owner/project",
          installationId: "different-installation",
          private: true,
          repositoryId: "different-repository"
        })
    };
    const service = new ProjectService(repository, authorization);
    const input = {
      installationId: "installation-10",
      nowEpochSeconds: 1_000,
      repositoryId: "repository-20",
      REDACTEDId: "owner-1",
      workspaceId: "workspace-1"
    };

    await expect(service.linkGitHubRepository(input)).rejects.toEqual(
      new ProjectLinkError("repository_not_authorized")
    );
    repository.role = "member";
    await expect(service.linkGitHubRepository(input)).rejects.toEqual(
      new ProjectLinkError("owner_required")
    );
  });
});
