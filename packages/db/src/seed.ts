import type { PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { ReconcilerDatabase } from "./database.js";
import {
  devices,
  githubInstallations,
  projects,
  repositories,
  users,
  workspaceMembers,
  workspaces
} from "./schema/index.js";

export const developmentSeed = {
  userId: "10000000-0000-4000-8000-000000000001",
  workspaceId: "10000000-0000-4000-8000-000000000002",
  installationId: "10000000-0000-4000-8000-000000000003",
  projectId: "10000000-0000-4000-8000-000000000004",
  repositoryId: "10000000-0000-4000-8000-000000000005",
  deviceId: "10000000-0000-4000-8000-000000000006"
} as const;

/**
 * A deterministic, idempotent development seed. It intentionally creates no
 * findings, candidates, validations, attestations, or recommendations.
 */
export async function seedDevelopmentDatabase<TQueryResult extends PgQueryResultHKT>(
  database: ReconcilerDatabase<TQueryResult>
): Promise<typeof developmentSeed> {
  await database.transaction(async (transaction) => {
    await transaction
      .insert(users)
      .values({
        id: developmentSeed.userId,
        githubUserId: "development-github-user",
        githubLogin: "development-user",
        displayName: "Development User"
      })
      .onConflictDoNothing();
    await transaction
      .insert(workspaces)
      .values({
        id: developmentSeed.workspaceId,
        ownerUserId: developmentSeed.userId,
        slug: "development-workspace",
        name: "Development Workspace"
      })
      .onConflictDoNothing();
    await transaction
      .insert(workspaceMembers)
      .values({
        workspaceId: developmentSeed.workspaceId,
        userId: developmentSeed.userId,
        role: "owner"
      })
      .onConflictDoNothing();
    await transaction
      .insert(githubInstallations)
      .values({
        id: developmentSeed.installationId,
        workspaceId: developmentSeed.workspaceId,
        installedByUserId: developmentSeed.userId,
        githubInstallationId: "development-installation",
        accountId: "development-account",
        accountLogin: "development-user",
        permissionsDigest: `sha256:${"1".repeat(64)}`
      })
      .onConflictDoNothing();
    await transaction
      .insert(projects)
      .values({
        id: developmentSeed.projectId,
        workspaceId: developmentSeed.workspaceId,
        name: "Development Project",
        slug: "development-project",
        createdByUserId: developmentSeed.userId
      })
      .onConflictDoNothing();
    await transaction
      .insert(repositories)
      .values({
        id: developmentSeed.repositoryId,
        workspaceId: developmentSeed.workspaceId,
        projectId: developmentSeed.projectId,
        githubInstallationId: developmentSeed.installationId,
        providerRepositoryId: "development-repository",
        owner: "development-user",
        name: "environment-reconciler",
        defaultBranch: "main",
        visibility: "private"
      })
      .onConflictDoNothing();
    await transaction
      .insert(devices)
      .values({
        id: developmentSeed.deviceId,
        workspaceId: developmentSeed.workspaceId,
        enrolledByUserId: developmentSeed.userId,
        displayName: "Development Device",
        platform: "linux-amd64",
        companionVersion: "development",
        state: "paired"
      })
      .onConflictDoNothing();
  });

  return developmentSeed;
}
