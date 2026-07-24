import type { PgQueryResultHKT } from "drizzle-orm/pg-core";

import type { ReconcilerDatabase } from "./database.js";
import {
  devices,
  githubInstallations,
  projects,
  repositories,
  REDACTEDs,
  workspaceMembers,
  workspaces
} from "./schema/index.js";

export const developmentSeed = {
  REDACTEDId: "REDACTED-8000-000000000001",
  workspaceId: "REDACTED-8000-000000000002",
  installationId: "REDACTED-REDACTED",
  projectId: "REDACTED-8000-000000000004",
  repositoryId: "REDACTED-8000-000000000005",
  deviceId: "REDACTED-8000-000000000006"
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
      .insert(REDACTEDs)
      .values({
        id: developmentSeed.REDACTEDId,
        githubUserId: "development-github-REDACTED",
        githubLogin: "development-REDACTED",
        displayName: "Development User"
      })
      .onConflictDoNothing();
    await transaction
      .insert(workspaces)
      .values({
        id: developmentSeed.workspaceId,
        ownerUserId: developmentSeed.REDACTEDId,
        slug: "development-workspace",
        name: "Development Workspace"
      })
      .onConflictDoNothing();
    await transaction
      .insert(workspaceMembers)
      .values({
        workspaceId: developmentSeed.workspaceId,
        REDACTEDId: developmentSeed.REDACTEDId,
        role: "owner"
      })
      .onConflictDoNothing();
    await transaction
      .insert(githubInstallations)
      .values({
        id: developmentSeed.installationId,
        workspaceId: developmentSeed.workspaceId,
        installedByUserId: developmentSeed.REDACTEDId,
        githubInstallationId: "development-installation",
        accountId: "development-account",
        accountLogin: "development-REDACTED",
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
        createdByUserId: developmentSeed.REDACTEDId
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
        owner: "development-REDACTED",
        name: "environment-REDACTED",
        defaultBranch: "main",
        visibility: "private"
      })
      .onConflictDoNothing();
    await transaction
      .insert(devices)
      .values({
        id: developmentSeed.deviceId,
        workspaceId: developmentSeed.workspaceId,
        enrolledByUserId: developmentSeed.REDACTEDId,
        displayName: "Development Device",
        platform: "linux-amd64",
        companionVersion: "development",
        state: "paired"
      })
      .onConflictDoNothing();
  });

  return developmentSeed;
}
