import type {
  CreateExactCommitRequest,
  CreateExactCommitResult,
  FetchExactSourceRequest,
  FetchExactSourceResult,
  GitHubFileMode,
  GitHubPort,
  GitHubRepositoryReference,
  OpenPullRequestRequest,
  OpenPullRequestResult,
  Sha256Digest,
  UpdateBranchRequest,
  UpdateBranchResult
} from "@environment-reconciler/integrations/ports";

import { cloneBytes, DeterministicScenario, ScenarioFailure } from "./scenario.js";

interface StoredGitHubFile {
  readonly mode: GitHubFileMode;
  readonly content: Uint8Array;
  readonly contentDigest: Sha256Digest;
  readonly blobSha: string;
}

interface StoredGitHubCommit {
  readonly commitSha: string;
  readonly files: Map<string, StoredGitHubFile>;
  readonly tarGzArchive?: Uint8Array;
  readonly zipArchive?: Uint8Array;
}

interface StoredPullRequest {
  readonly number: number;
  readonly url: string;
  readonly headBranch: string;
  readonly headSha: string;
  readonly baseBranch: string;
}

interface StoredGitHubRepository {
  readonly reference: GitHubRepositoryReference;
  readonly commits: Map<string, StoredGitHubCommit>;
  readonly branches: Map<string, string>;
  readonly pullRequests: Map<string, StoredPullRequest>;
  nextPullRequestNumber: number;
}

export interface FakeGitHubSeedFile {
  readonly path: string;
  readonly content: Uint8Array;
  readonly mode?: GitHubFileMode;
  readonly blobSha?: string;
}

export interface FakeGitHubSeedCommit {
  readonly commitSha: string;
  readonly files: readonly FakeGitHubSeedFile[];
  readonly tarGzArchive?: Uint8Array;
  readonly zipArchive?: Uint8Array;
}

export interface FakeGitHubRepositorySeed {
  readonly repository: GitHubRepositoryReference;
  readonly commits: readonly FakeGitHubSeedCommit[];
  readonly branches?: Readonly<Record<string, string>>;
}

export interface FakeGitHubOptions {
  readonly scenario?: DeterministicScenario;
}

export interface FakeGitHubRepositorySnapshot {
  readonly branches: Readonly<Record<string, string>>;
  readonly commitCount: number;
  readonly pullRequestCount: number;
}

type FetchValue = Omit<FetchExactSourceResult, "receipt">;
type CommitValue = Omit<CreateExactCommitResult, "receipt">;
type BranchValue = Omit<UpdateBranchResult, "receipt">;
type PullRequestValue = Omit<OpenPullRequestResult, "receipt">;

export class FakeGitHub implements GitHubPort {
  readonly scenario: DeterministicScenario;
  readonly #repositories = new Map<string, StoredGitHubRepository>();

  constructor(options: FakeGitHubOptions = {}) {
    this.scenario = options.scenario ?? new DeterministicScenario();
  }

  async seedRepository(seed: FakeGitHubRepositorySeed): Promise<void> {
    const key = repositoryKey(seed.repository);
    if (this.#repositories.has(key)) {
      throw new ScenarioFailure("repository_already_seeded", "github.seedRepository");
    }

    const repository: StoredGitHubRepository = {
      reference: { ...seed.repository },
      commits: new Map(),
      branches: new Map(),
      pullRequests: new Map(),
      nextPullRequestNumber: 1
    };
    for (const commitSeed of seed.commits) {
      if (repository.commits.has(commitSeed.commitSha)) {
        throw new ScenarioFailure("duplicate_commit", "github.seedRepository");
      }
      const files = new Map<string, StoredGitHubFile>();
      for (const file of commitSeed.files) {
        assertSafePath(file.path);
        if (files.has(file.path)) {
          throw new ScenarioFailure("duplicate_file_path", "github.seedRepository");
        }
        const content = cloneBytes(file.content);
        const contentDigest = await this.scenario.hasher.hashBytes(content);
        files.set(file.path, {
          mode: file.mode ?? "100644",
          content,
          contentDigest,
          blobSha: file.blobSha ?? digestToGitSha(contentDigest)
        });
      }
      repository.commits.set(commitSeed.commitSha, {
        commitSha: commitSeed.commitSha,
        files,
        ...(commitSeed.tarGzArchive === undefined
          ? {}
          : { tarGzArchive: cloneBytes(commitSeed.tarGzArchive) }),
        ...(commitSeed.zipArchive === undefined
          ? {}
          : { zipArchive: cloneBytes(commitSeed.zipArchive) })
      });
    }
    for (const [branch, commitSha] of Object.entries(seed.branches ?? {})) {
      assertBranchName(branch);
      if (!repository.commits.has(commitSha)) {
        throw new ScenarioFailure("branch_commit_not_found", "github.seedRepository");
      }
      repository.branches.set(branch, commitSha);
    }
    this.#repositories.set(key, repository);
  }

  async fetchExactSource(request: FetchExactSourceRequest): Promise<FetchExactSourceResult> {
    assertPositiveSafeInteger(request.maxArchiveBytes, "maxArchiveBytes");
    const execution = await this.scenario.execute<FetchValue>({
      service: "github",
      operation: "fetchExactSource",
      context: request.context,
      perform: async () => {
        const repository = this.#requireRepository(request.source.repository);
        const commit = repository.commits.get(request.source.commitSha);
        if (commit === undefined) {
          throw new ScenarioFailure("commit_not_found", "github.fetchExactSource");
        }
        const seededArchive =
          request.archiveFormat === "tar.gz" ? commit.tarGzArchive : commit.zipArchive;
        if (seededArchive === undefined) {
          throw new ScenarioFailure("archive_not_seeded", "github.fetchExactSource");
        }
        if (seededArchive.byteLength > request.maxArchiveBytes) {
          throw new ScenarioFailure("archive_limit_exceeded", "github.fetchExactSource");
        }
        const archive = cloneBytes(seededArchive);
        const archiveDigest = await this.scenario.hasher.hashBytes(archive);
        return {
          value: {
            source: {
              repository: { ...request.source.repository },
              commitSha: request.source.commitSha
            },
            archive,
            archiveDigest
          },
          resultSummary: {
            repository: repositoryKey(request.source.repository),
            commitSha: request.source.commitSha,
            archiveFormat: request.archiveFormat,
            archiveDigest,
            archiveBytes: archive.byteLength
          },
          providerResourceId: request.source.commitSha
        };
      },
      clone: cloneFetchValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async createExactCommit(request: CreateExactCommitRequest): Promise<CreateExactCommitResult> {
    assertPositiveSafeInteger(request.maxChangedFiles, "maxChangedFiles");
    assertNonNegativeSafeInteger(request.maxTotalContentBytes, "maxTotalContentBytes");
    if (request.changes.length > request.maxChangedFiles) {
      throw new ScenarioFailure("changed_file_limit_exceeded", "github.createExactCommit");
    }
    if (request.commitMessage.trim().length === 0 || request.authorIdentityId.trim().length === 0) {
      throw new ScenarioFailure("invalid_commit_metadata", "github.createExactCommit");
    }

    const execution = await this.scenario.execute<CommitValue>({
      service: "github",
      operation: "createExactCommit",
      context: request.context,
      perform: async () => {
        const repository = this.#requireRepository(request.repository);
        const base = repository.commits.get(request.baseCommitSha);
        if (base === undefined) {
          throw new ScenarioFailure("base_commit_not_found", "github.createExactCommit");
        }
        const seenPaths = new Set<string>();
        let totalContentBytes = 0;
        for (const change of request.changes) {
          assertSafePath(change.path);
          if (seenPaths.has(change.path)) {
            throw new ScenarioFailure("duplicate_change_path", "github.createExactCommit");
          }
          seenPaths.add(change.path);
          if (change.action === "upsert") {
            totalContentBytes += change.content.byteLength;
            if (!Number.isSafeInteger(totalContentBytes)) {
              throw new ScenarioFailure("content_size_overflow", "github.createExactCommit");
            }
          }
        }
        if (totalContentBytes > request.maxTotalContentBytes) {
          throw new ScenarioFailure("content_limit_exceeded", "github.createExactCommit");
        }

        const files = cloneFileMap(base.files);
        const changeFacts: {
          readonly action: "delete" | "upsert";
          readonly contentDigest?: Sha256Digest;
          readonly mode?: GitHubFileMode;
          readonly path: string;
        }[] = [];
        for (const change of request.changes) {
          if (change.action === "upsert") {
            const actualDigest = await this.scenario.hasher.hashBytes(change.content);
            if (actualDigest !== change.contentDigest) {
              throw new ScenarioFailure("content_digest_mismatch", "github.createExactCommit");
            }
            files.set(change.path, {
              mode: change.mode,
              content: cloneBytes(change.content),
              contentDigest: change.contentDigest,
              blobSha: digestToGitSha(change.contentDigest)
            });
            changeFacts.push({
              action: "upsert",
              path: change.path,
              mode: change.mode,
              contentDigest: change.contentDigest
            });
          } else {
            const existing = files.get(change.path);
            if (existing?.blobSha !== change.expectedBlobSha) {
              throw new ScenarioFailure("delete_compare_failed", "github.createExactCommit");
            }
            files.delete(change.path);
            changeFacts.push({ action: "delete", path: change.path });
          }
        }

        const sortedFacts = [...changeFacts].sort((left, right) =>
          left.path.localeCompare(right.path)
        );
        const changedPathsDigest = await this.scenario.hasher.hashCanonicalJson(
          [...seenPaths].sort()
        );
        const treeDigest = await this.scenario.hasher.hashCanonicalJson(
          [...files.entries()]
            .sort(([left], [right]) => left.localeCompare(right))
            .map(([path, file]) => ({
              path,
              mode: file.mode,
              contentDigest: file.contentDigest
            }))
        );
        const treeSha = digestToGitSha(treeDigest);
        const commitDigest = await this.scenario.hasher.hashCanonicalJson({
          baseCommitSha: request.baseCommitSha,
          authorIdentityId: request.authorIdentityId,
          commitMessage: request.commitMessage,
          changes: sortedFacts,
          treeSha
        });
        const commitSha = digestToGitSha(commitDigest);
        repository.commits.set(commitSha, { commitSha, files });

        return {
          value: { commitSha, treeSha, changedPathsDigest },
          resultSummary: {
            commitSha,
            treeSha,
            changedPathsDigest,
            changedFileCount: request.changes.length
          },
          providerResourceId: commitSha
        };
      },
      clone: cloneCommitValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async updateBranch(request: UpdateBranchRequest): Promise<UpdateBranchResult> {
    assertBranchName(request.branchName);
    const execution = await this.scenario.execute<BranchValue>({
      service: "github",
      operation: "updateBranch",
      context: request.context,
      perform: () => {
        const repository = this.#requireRepository(request.repository);
        if (!repository.commits.has(request.newHeadSha)) {
          throw new ScenarioFailure("new_head_not_found", "github.updateBranch");
        }
        const previousHeadSha = repository.branches.get(request.branchName) ?? null;
        if (previousHeadSha !== request.expectedHeadSha) {
          throw new ScenarioFailure("branch_compare_failed", "github.updateBranch");
        }
        repository.branches.set(request.branchName, request.newHeadSha);
        return {
          value: {
            branchName: request.branchName,
            previousHeadSha,
            headSha: request.newHeadSha,
            created: previousHeadSha === null
          },
          resultSummary: {
            branchName: request.branchName,
            previousHeadSha,
            headSha: request.newHeadSha,
            created: previousHeadSha === null
          },
          providerResourceId: request.branchName
        };
      },
      clone: cloneBranchValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async openPullRequest(request: OpenPullRequestRequest): Promise<OpenPullRequestResult> {
    assertBranchName(request.headBranch);
    assertBranchName(request.baseBranch);
    if (request.title.trim().length === 0 || request.bodyTemplateId.trim().length === 0) {
      throw new ScenarioFailure("invalid_pull_request_metadata", "github.openPullRequest");
    }

    const execution = await this.scenario.execute<PullRequestValue>({
      service: "github",
      operation: "openPullRequest",
      context: request.context,
      perform: () => {
        const repository = this.#requireRepository(request.repository);
        const headSha = repository.branches.get(request.headBranch);
        if (headSha === undefined || headSha !== request.expectedHeadSha) {
          throw new ScenarioFailure("pull_request_head_mismatch", "github.openPullRequest");
        }
        if (!repository.branches.has(request.baseBranch)) {
          throw new ScenarioFailure("base_branch_not_found", "github.openPullRequest");
        }

        const pullRequestKey = `${request.headBranch}\u0000${request.baseBranch}`;
        const existing = repository.pullRequests.get(pullRequestKey);
        const pullRequest =
          existing ??
          this.#createPullRequest(repository, request.headBranch, headSha, request.baseBranch);
        if (existing === undefined) {
          repository.pullRequests.set(pullRequestKey, pullRequest);
        }

        return {
          value: {
            pullRequestNumber: pullRequest.number,
            pullRequestUrl: pullRequest.url,
            headSha: pullRequest.headSha,
            created: existing === undefined
          },
          resultSummary: {
            pullRequestNumber: pullRequest.number,
            headSha: pullRequest.headSha,
            created: existing === undefined,
            bodyArgumentsDigest: request.bodyArgumentsDigest,
            draft: request.draft
          },
          providerResourceId: String(pullRequest.number)
        };
      },
      clone: clonePullRequestValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  snapshot(repository: GitHubRepositoryReference): FakeGitHubRepositorySnapshot {
    const stored = this.#requireRepository(repository);
    return {
      branches: Object.fromEntries(stored.branches),
      commitCount: stored.commits.size,
      pullRequestCount: stored.pullRequests.size
    };
  }

  #requireRepository(reference: GitHubRepositoryReference): StoredGitHubRepository {
    const repository = this.#repositories.get(repositoryKey(reference));
    if (repository === undefined) {
      throw new ScenarioFailure("repository_not_found", "github");
    }
    return repository;
  }

  #createPullRequest(
    repository: StoredGitHubRepository,
    headBranch: string,
    headSha: string,
    baseBranch: string
  ): StoredPullRequest {
    const number = repository.nextPullRequestNumber;
    repository.nextPullRequestNumber += 1;
    return {
      number,
      url: `https://github.test/${repository.reference.owner}/${repository.reference.name}/pull/${String(number)}`,
      headBranch,
      headSha,
      baseBranch
    };
  }
}

function repositoryKey(repository: GitHubRepositoryReference): string {
  return `${repository.owner}/${repository.name}@${repository.installationId}`;
}

function assertSafePath(path: string): void {
  const parts = path.split("/");
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.includes("\\") ||
    parts.some((part) => part.length === 0 || part === "." || part === "..")
  ) {
    throw new ScenarioFailure("unsafe_repository_path", "github");
  }
}

function assertBranchName(value: string): void {
  if (
    value.trim().length === 0 ||
    value.startsWith("/") ||
    value.endsWith("/") ||
    value.includes("..") ||
    value.includes("\\")
  ) {
    throw new ScenarioFailure("invalid_branch_name", "github");
  }
}

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ScenarioFailure("invalid_numeric_parameter", name);
  }
}

function assertNonNegativeSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ScenarioFailure("invalid_numeric_parameter", name);
  }
}

function digestToGitSha(digest: Sha256Digest): string {
  return digest.slice("sha256:".length, "sha256:".length + 40);
}

function cloneStoredFile(file: StoredGitHubFile): StoredGitHubFile {
  return { ...file, content: cloneBytes(file.content) };
}

function cloneFileMap(files: ReadonlyMap<string, StoredGitHubFile>): Map<string, StoredGitHubFile> {
  return new Map([...files].map(([path, file]) => [path, cloneStoredFile(file)]));
}

function cloneFetchValue(value: FetchValue): FetchValue {
  return {
    source: {
      repository: { ...value.source.repository },
      commitSha: value.source.commitSha
    },
    archive: cloneBytes(value.archive),
    archiveDigest: value.archiveDigest
  };
}

function cloneCommitValue(value: CommitValue): CommitValue {
  return { ...value };
}

function cloneBranchValue(value: BranchValue): BranchValue {
  return { ...value };
}

function clonePullRequestValue(value: PullRequestValue): PullRequestValue {
  return { ...value };
}
