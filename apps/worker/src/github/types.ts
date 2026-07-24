export type Sha256Digest = `sha256:${string}`;

export interface GitHubRepositoryIdentity {
  /** Canonical immutable GitHub repository ID. */
  readonly repositoryId: string;
  readonly installationId: string;
  readonly owner: string;
  readonly name: string;
  readonly defaultBranch: string;
}

export interface GitHubRepositoryPermissions {
  readonly admin: boolean;
  readonly maintain: boolean;
  readonly pull: boolean;
  readonly push: boolean;
  readonly triage: boolean;
}

export interface GitHubAuthorizedRepository extends GitHubRepositoryIdentity {
  readonly fullName: string;
  readonly isPrivate: boolean;
  readonly permissions: GitHubRepositoryPermissions;
}

export interface GitHubUserInstallation {
  readonly installationId: string;
  readonly accountId: string;
  readonly accountLogin: string;
  readonly repositories: readonly GitHubAuthorizedRepository[];
}

export type GitHubRepositoryCredentialPurpose =
  "contents_read" | "contents_write" | "pull_requests_write";

export interface GitHubRepositoryCredential {
  readonly token: string;
  readonly expiresAt: string;
}

/**
 * The implementation must mint a just-in-time token scoped to exactly this
 * installation and repository. A credential is never returned by product APIs.
 */
export interface GitHubRepositoryCredentialBroker {
  issueRepositoryCredential(input: {
    readonly installationId: string;
    readonly repositoryId: string;
    readonly purpose: GitHubRepositoryCredentialPurpose;
  }): Promise<GitHubRepositoryCredential>;
}

export interface GitHubFileTreeEntry {
  readonly mode: string;
  readonly path: string;
  readonly sha: string;
  readonly type: "blob" | "commit" | "tree";
}

export type GitHubFileChange =
  | {
      readonly action: "upsert";
      readonly path: string;
      readonly mode: "100644" | "100755" | "120000";
      readonly content: Uint8Array;
      readonly contentDigest: Sha256Digest;
      /** Null means the path must not exist in the verified base tree. */
      readonly expectedBaseBlobSha: string | null;
    }
  | {
      readonly action: "delete";
      readonly path: string;
      readonly expectedBaseBlobSha: string;
    };

export interface BoundGitHubApproval {
  readonly approvalId: string;
  readonly approvedChangesDigest: Sha256Digest;
}

export interface WorkflowChangeApproval {
  readonly approvalId: string;
  readonly approved: true;
}

export interface FetchExactCommitArchiveRequest {
  readonly repository: GitHubRepositoryIdentity;
  readonly commitSha: string;
  readonly archiveFormat: "tar.gz" | "zip";
  readonly maxArchiveBytes: number;
}

export interface FetchExactCommitArchiveResult {
  readonly archive: Uint8Array;
  readonly archiveDigest: Sha256Digest;
  readonly commitSha: string;
}

export interface ApplyExactChangesRequest {
  readonly operationKey: string;
  readonly repository: GitHubRepositoryIdentity;
  readonly approval: BoundGitHubApproval;
  readonly workflowApproval?: WorkflowChangeApproval;
  readonly expectedBaseHeadSha: string;
  readonly expectedBaseTreeSha: string;
  readonly expectedResultTreeSha: string;
  readonly expectedResultTreeDigest: Sha256Digest;
  /** Null requires that the deterministic branch does not yet exist. */
  readonly expectedBranchHeadSha: string | null;
  readonly changes: readonly GitHubFileChange[];
  readonly maxChangedFiles: number;
  readonly maxTotalContentBytes: number;
  readonly commitMessage: string;
  readonly pullRequestTitle: string;
  readonly pullRequestBody: string;
  readonly draft: boolean;
}

export interface ApplyExactChangesResult {
  readonly branchName: string;
  readonly commitSha: string;
  readonly pullRequestCreated: boolean;
  readonly pullRequestNumber: number;
  readonly pullRequestUrl: string;
  readonly treeDigest: Sha256Digest;
  readonly treeSha: string;
}
