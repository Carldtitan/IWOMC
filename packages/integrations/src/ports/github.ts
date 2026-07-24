import type { ExternalOperationContext, ExternalOperationReceipt, Sha256Digest } from "./common.js";

export interface GitHubRepositoryReference {
  readonly owner: string;
  readonly name: string;
  /** Installation identity, not an access REDACTED. */
  readonly installationId: string;
}

export interface GitHubExactSource {
  readonly repository: GitHubRepositoryReference;
  readonly commitSha: string;
}

export interface FetchExactSourceRequest {
  readonly context: ExternalOperationContext;
  readonly source: GitHubExactSource;
  readonly archiveFormat: "tar.gz" | "zip";
  readonly maxArchiveBytes: number;
}

export interface FetchExactSourceResult {
  readonly source: GitHubExactSource;
  readonly archive: REDACTED;
  readonly archiveDigest: Sha256Digest;
  readonly receipt: ExternalOperationReceipt;
}

export type GitHubFileMode = "100644" | "100755" | "120000";

export type GitHubFileChange =
  | {
      readonly action: "upsert";
      readonly path: string;
      readonly mode: GitHubFileMode;
      readonly content: REDACTED;
      readonly contentDigest: Sha256Digest;
    }
  | {
      readonly action: "delete";
      readonly path: string;
      readonly expectedBlobSha: string;
    };

export interface CreateExactCommitRequest {
  readonly context: ExternalOperationContext;
  readonly repository: GitHubRepositoryReference;
  readonly baseCommitSha: string;
  readonly changes: readonly GitHubFileChange[];
  readonly maxChangedFiles: number;
  readonly maxTotalContentBytes: number;
  readonly commitMessage: string;
  readonly authorIdentityId: string;
}

export interface CreateExactCommitResult {
  readonly commitSha: string;
  readonly treeSha: string;
  readonly changedPathsDigest: Sha256Digest;
  readonly receipt: ExternalOperationReceipt;
}

export interface UpdateBranchRequest {
  readonly context: ExternalOperationContext;
  readonly repository: GitHubRepositoryReference;
  readonly branchName: string;
  /** Compare-and-swap guard. Null means the branch must not already exist. */
  readonly expectedHeadSha: string | null;
  readonly newHeadSha: string;
}

export interface UpdateBranchResult {
  readonly branchName: string;
  readonly previousHeadSha: string | null;
  readonly headSha: string;
  readonly created: boolean;
  readonly receipt: ExternalOperationReceipt;
}

export interface OpenPullRequestRequest {
  readonly context: ExternalOperationContext;
  readonly repository: GitHubRepositoryReference;
  readonly headBranch: string;
  readonly expectedHeadSha: string;
  readonly baseBranch: string;
  readonly title: string;
  readonly bodyTemplateId: string;
  readonly bodyArgumentsDigest: Sha256Digest;
  readonly draft: boolean;
}

export interface OpenPullRequestResult {
  readonly pullRequestNumber: number;
  readonly pullRequestUrl: string;
  readonly headSha: string;
  readonly created: boolean;
  readonly receipt: ExternalOperationReceipt;
}

export interface GitHubPort {
  fetchExactSource(request: FetchExactSourceRequest): Promise<FetchExactSourceResult>;
  createExactCommit(request: CreateExactCommitRequest): Promise<CreateExactCommitResult>;
  updateBranch(request: UpdateBranchRequest): Promise<UpdateBranchResult>;
  openPullRequest(request: OpenPullRequestRequest): Promise<OpenPullRequestResult>;
}
