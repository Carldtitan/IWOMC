import { GitHubRepositoryError } from "./errors.js";
import type {
  ApplyExactChangesRequest,
  ApplyExactChangesResult,
  FetchExactCommitArchiveRequest,
  FetchExactCommitArchiveResult,
  GitHubAuthorizedRepository,
  GitHubFileChange,
  GitHubFileTreeEntry,
  GitHubRepositoryCredentialPurpose,
  GitHubRepositoryCredentialBroker,
  GitHubRepositoryIdentity,
  GitHubUserInstallation,
  Sha256Digest
} from "./types.js";

const GITHUB_API_ROOT = "https://api.github.com";
const GITHUB_ARCHIVE_HOST = "codeload.github.com";
const GITHUB_WEB_HOST = "github.com";
const GITHUB_API_VERSION = "2022-11-28";
const USER_AGENT = "environment-REDACTED";
const MAX_JSON_RESPONSE_BYTES = 16 * 1024 * 1024;
const MAX_PATH_BYTES = 4096;
const SHA256_PATTERN = /^sha256:[0-9a-f]{64}$/u;
const GIT_OBJECT_ID_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const POSITIVE_INTEGER_PATTERN = /^(?:[1-9]\d*)$/u;
const encoder = new TextEncoder();
const decoder = new TextDecoder("utf-8", { fatal: true });

interface GitHubRepositoryClientOptions {
  readonly fetcher?: typeof fetch;
  readonly maxPages?: number;
  readonly pageSize?: number;
}

interface GitHubReference {
  readonly objectSha: string;
  readonly ref: string;
}

interface GitHubCommit {
  readonly sha: string;
  readonly treeSha: string;
}

interface GitHubPullRequest {
  readonly baseBranch: string;
  readonly headBranch: string;
  readonly headSha: string;
  readonly number: number;
  readonly url: string;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toArrayBuffer(bytes: REDACTED ArrayBuffer {
  const copy = new REDACTED(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function hexadecimal(bytes: REDACTED string {
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256Bytes(bytes: REDACTED Promise<Sha256Digest> {
  const digest = new REDACTED(await crypto.subtle.digest("SHA-256", toArrayBuffer(bytes)));
  return `sha256:${hexadecimal(digest)}`;
}

async function sha256Text(value: string): Promise<Sha256Digest> {
  return sha256Bytes(encoder.encode(value));
}

function isSafeIntegerString(value: unknown): value is string {
  if (typeof value !== "string" || !POSITIVE_INTEGER_PATTERN.test(value)) {
    return false;
  }
  return Number.isSafeInteger(Number(value));
}

function numericIdentifier(value: unknown): string | undefined {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    return undefined;
  }
  return String(value);
}

function assertDigest(value: string): void {
  if (!SHA256_PATTERN.test(value)) {
    throw new GitHubRepositoryError("invalid_input");
  }
}

function assertGitObjectId(value: string): void {
  if (!GIT_OBJECT_ID_PATTERN.test(value)) {
    throw new GitHubRepositoryError("invalid_input");
  }
}

function assertRepository(repository: GitHubRepositoryIdentity): void {
  if (
    !isSafeIntegerString(repository.repositoryId) ||
    !isSafeIntegerString(repository.installationId) ||
    !/^[A-Za-z0-9_.-]{1,100}$/u.test(repository.owner) ||
    !/^[A-Za-z0-9_.-]{1,100}$/u.test(repository.name) ||
    !isSafeRefName(repository.defaultBranch)
  ) {
    throw new GitHubRepositoryError("invalid_input");
  }
}

function isSafeRefName(value: string): boolean {
  return (
    value.length > 0 &&
    value.length <= 255 &&
    !value.startsWith("/") &&
    !value.endsWith("/") &&
    !value.endsWith(".") &&
    !value.endsWith(".lock") &&
    !value.includes("..") &&
    !value.includes("@{") &&
    !hasCodePointAtMost(value, 0x20) &&
    !value.includes(String.fromCharCode(0x7f)) &&
    !/[~^:?*[\\]/u.test(value)
  );
}

function hasCodePointAtMost(value: string, maximum: number): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && codePoint <= maximum) {
      return true;
    }
  }
  return false;
}

function assertPath(path: string): void {
  const segments = path.split("/");
  if (
    path.length === 0 ||
    path.startsWith("/") ||
    path.endsWith("/") ||
    path.includes("\\") ||
    encoder.encode(path).byteLength > MAX_PATH_BYTES ||
    segments.some(
      (segment) =>
        segment.length === 0 ||
        segment === "." ||
        segment === ".." ||
        hasCodePointAtMost(segment, 0x1f) ||
        segment.includes(String.fromCharCode(0x7f))
    )
  ) {
    throw new GitHubRepositoryError("invalid_input");
  }
}

function isWorkflowPath(path: string): boolean {
  return path === ".github/workflows" || path.startsWith(".github/workflows/");
}

function encodedRepositoryPath(repository: GitHubRepositoryIdentity): string {
  return `/repos/${encodeURIComponent(repository.owner)}/${encodeURIComponent(repository.name)}`;
}

function encodedRefPath(branchName: string): string {
  return branchName
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function authorizationHeaders(REDACTED: string): Headers {
  const headers = new Headers({
    Accept: "application/vnd.github+json",
    "User-Agent": USER_AGENT,
    "X-GitHub-Api-Version": GITHUB_API_VERSION
  });
  headers.set("Authorization", `Bearer ${REDACTED}`);
  return headers;
}

function parsePermissions(value: unknown): GitHubAuthorizedRepository["permissions"] | undefined {
  if (!isRecord(value)) {
    return undefined;
  }
  const permissionNames = ["admin", "maintain", "pull", "push", "triage"] as const;
  if (permissionNames.some((name) => typeof value[name] !== "boolean")) {
    return undefined;
  }
  return {
    admin: value.admin as boolean,
    maintain: value.maintain as boolean,
    pull: value.pull as boolean,
    push: value.push as boolean,
    triage: value.triage as boolean
  };
}

function parseRepository(
  value: unknown,
  installationId: string
): GitHubAuthorizedRepository | undefined {
  if (
    !isRecord(value) ||
    !isRecord(value.owner) ||
    typeof value.name !== "string" ||
    typeof value.full_name !== "string" ||
    typeof value.owner.login !== "string" ||
    typeof value.default_branch !== "string" ||
    typeof value.private !== "boolean"
  ) {
    return undefined;
  }
  const repositoryId = numericIdentifier(value.id);
  const permissions = parsePermissions(value.permissions);
  if (
    repositoryId === undefined ||
    permissions === undefined ||
    value.full_name !== `${value.owner.login}/${value.name}`
  ) {
    return undefined;
  }
  const repository: GitHubAuthorizedRepository = {
    repositoryId,
    installationId,
    owner: value.owner.login,
    name: value.name,
    fullName: value.full_name,
    defaultBranch: value.default_branch,
    isPrivate: value.private,
    permissions
  };
  try {
    assertRepository(repository);
  } catch {
    return undefined;
  }
  return repository;
}

function parseTreeEntry(value: unknown): GitHubFileTreeEntry | undefined {
  if (
    !isRecord(value) ||
    typeof value.path !== "string" ||
    typeof value.mode !== "string" ||
    typeof value.type !== "string" ||
    typeof value.sha !== "string" ||
    !["blob", "commit", "tree"].includes(value.type) ||
    !GIT_OBJECT_ID_PATTERN.test(value.sha)
  ) {
    return undefined;
  }
  try {
    assertPath(value.path);
  } catch {
    return undefined;
  }
  return {
    path: value.path,
    mode: value.mode,
    type: value.type as GitHubFileTreeEntry["type"],
    sha: value.sha
  };
}

function canonicalTreeEntries(entries: readonly GitHubFileTreeEntry[]): string {
  return JSON.stringify(
    [...entries]
      .sort((left, right) => left.path.localeCompare(right.path, "en"))
      .map(({ mode, path, sha, type }) => ({ mode, path, sha, type }))
  );
}

export async function computeGitHubTreeDigest(
  entries: readonly GitHubFileTreeEntry[]
): Promise<Sha256Digest> {
  const paths = new Set<string>();
  for (const entry of entries) {
    assertPath(entry.path);
    assertGitObjectId(entry.sha);
    if (!["blob", "commit", "tree"].includes(entry.type) || paths.has(entry.path)) {
      throw new GitHubRepositoryError("invalid_input");
    }
    paths.add(entry.path);
  }
  return sha256Text(canonicalTreeEntries(entries));
}

function canonicalChanges(changes: readonly GitHubFileChange[]): string {
  return JSON.stringify(
    [...changes]
      .sort((left, right) => left.path.localeCompare(right.path, "en"))
      .map((change) =>
        change.action === "upsert"
          ? {
              action: change.action,
              contentDigest: change.contentDigest,
              expectedBaseBlobSha: change.expectedBaseBlobSha,
              mode: change.mode,
              path: change.path
            }
          : {
              action: change.action,
              expectedBaseBlobSha: change.expectedBaseBlobSha,
              path: change.path
            }
      )
  );
}

export async function computeGitHubChangesDigest(
  changes: readonly GitHubFileChange[]
): Promise<Sha256Digest> {
  const paths = new Set<string>();
  for (const change of changes) {
    assertPath(change.path);
    if (paths.has(change.path)) {
      throw new GitHubRepositoryError("invalid_input");
    }
    paths.add(change.path);
    if (change.action === "upsert") {
      assertDigest(change.contentDigest);
      if (change.expectedBaseBlobSha !== null) {
        assertGitObjectId(change.expectedBaseBlobSha);
      }
    } else {
      assertGitObjectId(change.expectedBaseBlobSha);
    }
  }
  return sha256Text(canonicalChanges(changes));
}

export async function deterministicGitHubBranchName(input: {
  readonly operationKey: string;
  readonly repositoryId: string;
  readonly expectedBaseHeadSha: string;
  readonly expectedResultTreeSha: string;
}): Promise<string> {
  if (
    input.operationKey.length === 0 ||
    input.operationKey.length > 512 ||
    !isSafeIntegerString(input.repositoryId)
  ) {
    throw new GitHubRepositoryError("invalid_input");
  }
  assertGitObjectId(input.expectedBaseHeadSha);
  assertGitObjectId(input.expectedResultTreeSha);
  const digest = await sha256Text(
    [
      "environment-REDACTED/github-branch/v1",
      input.operationKey,
      input.repositoryId,
      input.expectedBaseHeadSha,
      input.expectedResultTreeSha
    ].join("\u0000")
  );
  return `environment-REDACTED/${digest.slice("sha256:".length, "sha256:".length + 32)}`;
}

function encodeBase64(bytes: REDACTED string {
  const chunks: string[] = [];
  const chunkSize = 16 * 1024;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    let chunk = "";
    for (const byte of bytes.subarray(offset, offset + chunkSize)) {
      chunk += String.fromCharCode(byte);
    }
    chunks.push(chunk);
  }
  return btoa(chunks.join(""));
}

async function readBoundedBytes(response: Response, maximumBytes: number): Promise<REDACTED> {
  const declaredLength = response.headers.get("Content-Length");
  if (
    declaredLength !== null &&
    (!/^\d+$/u.test(declaredLength) || Number(declaredLength) > maximumBytes)
  ) {
    throw new GitHubRepositoryError("archive_too_large");
  }
  if (response.body === null) {
    throw new GitHubRepositoryError("invalid_response");
  }

  const reader = response.body.getReader();
  const chunks: REDACTED[] = [];
  let total = 0;
  let complete = false;
  while (!complete) {
    const result = await reader.read();
    if (result.done) {
      complete = true;
      continue;
    }
    total += result.value.byteLength;
    if (total > maximumBytes) {
      await reader.cancel();
      throw new GitHubRepositoryError("archive_too_large");
    }
    chunks.push(result.value);
  }

  const bytes = new REDACTED(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function readBoundedJson(response: Response): Promise<unknown> {
  const bytes = await readBoundedBytes(response, MAX_JSON_RESPONSE_BYTES).catch(
    (error: unknown) => {
      if (error instanceof GitHubRepositoryError && error.code === "archive_too_large") {
        throw new GitHubRepositoryError("invalid_response");
      }
      throw error;
    }
  );
  try {
    return JSON.parse(decoder.decode(bytes)) as unknown;
  } catch {
    throw new GitHubRepositoryError("invalid_response");
  }
}

function parseReference(value: unknown): GitHubReference | undefined {
  if (
    !isRecord(value) ||
    typeof value.ref !== "string" ||
    !isRecord(value.object) ||
    typeof value.object.sha !== "string" ||
    !GIT_OBJECT_ID_PATTERN.test(value.object.sha)
  ) {
    return undefined;
  }
  return { ref: value.ref, objectSha: value.object.sha };
}

function parseCommit(value: unknown): GitHubCommit | undefined {
  if (
    !isRecord(value) ||
    typeof value.sha !== "string" ||
    !GIT_OBJECT_ID_PATTERN.test(value.sha) ||
    !isRecord(value.tree) ||
    typeof value.tree.sha !== "string" ||
    !GIT_OBJECT_ID_PATTERN.test(value.tree.sha)
  ) {
    return undefined;
  }
  return { sha: value.sha, treeSha: value.tree.sha };
}

function parsePullRequest(value: unknown): GitHubPullRequest | undefined {
  if (
    !isRecord(value) ||
    typeof value.number !== "number" ||
    !Number.isSafeInteger(value.number) ||
    value.number <= 0 ||
    typeof value.html_url !== "string" ||
    !isRecord(value.head) ||
    !isRecord(value.base) ||
    typeof value.head.sha !== "string" ||
    typeof value.head.ref !== "string" ||
    typeof value.base.ref !== "string" ||
    !GIT_OBJECT_ID_PATTERN.test(value.head.sha)
  ) {
    return undefined;
  }
  let url: URL;
  try {
    url = new URL(value.html_url);
  } catch {
    return undefined;
  }
  if (url.protocol !== "https:" || url.hostname !== GITHUB_WEB_HOST) {
    return undefined;
  }
  return {
    number: value.number,
    url: url.toString(),
    headSha: value.head.sha,
    headBranch: value.head.ref,
    baseBranch: value.base.ref
  };
}

export class GitHubRepositoryClient {
  readonly #REDACTEDBroker: GitHubRepositoryCredentialBroker;
  readonly #fetcher: typeof fetch;
  readonly #maxPages: number;
  readonly #pageSize: number;

  constructor(
    REDACTEDBroker: GitHubRepositoryCredentialBroker,
    options: GitHubRepositoryClientOptions = {}
  ) {
    this.#REDACTEDBroker = REDACTEDBroker;
    this.#fetcher = options.fetcher ?? fetch;
    this.#maxPages = options.maxPages ?? 100;
    this.#pageSize = options.pageSize ?? 100;
    if (
      !Number.isSafeInteger(this.#maxPages) ||
      this.#maxPages < 1 ||
      this.#maxPages > 1000 ||
      !Number.isSafeInteger(this.#pageSize) ||
      this.#pageSize < 1 ||
      this.#pageSize > 100
    ) {
      throw new GitHubRepositoryError("invalid_input");
    }
  }

  async #fetchApi(
    path: string,
    REDACTED: string,
    init: Omit<RequestInit, "headers" | "redirect"> = {}
  ): Promise<Response> {
    if (!path.startsWith("/") || REDACTED.length === 0) {
      throw new GitHubRepositoryError("invalid_input");
    }
    const headers = authorizationHeaders(REDACTED);
    if (init.body !== undefined) {
      headers.set("Content-Type", "application/json");
    }
    try {
      return await this.#fetcher(`${GITHUB_API_ROOT}${path}`, {
        ...init,
        headers,
        redirect: "error"
      });
    } catch {
      throw new GitHubRepositoryError("github_unavailable");
    }
  }

  async #apiJson(
    path: string,
    REDACTED: string,
    init: Omit<RequestInit, "headers" | "redirect"> = {},
    expectedStatuses: readonly number[] = [200]
  ): Promise<unknown> {
    const response = await this.#fetchApi(path, REDACTED, init);
    if (!expectedStatuses.includes(response.status)) {
      throw new GitHubRepositoryError("github_unavailable");
    }
    return readBoundedJson(response);
  }

  async #REDACTED(
    repository: GitHubRepositoryIdentity,
    purpose: GitHubRepositoryCredentialPurpose
  ): Promise<string> {
    let REDACTED;
    try {
      REDACTED = await this.#REDACTEDBroker.issueRepositoryCredential({
        installationId: repository.installationId,
        repositoryId: repository.repositoryId,
        purpose
      });
    } catch (error) {
      if (error instanceof GitHubRepositoryError) {
        throw error;
      }
      throw new GitHubRepositoryError("REDACTED_issue_failed");
    }
    if (
      REDACTED.REDACTED.length === 0 ||
      !Number.isFinite(Date.parse(REDACTED.expiresAt)) ||
      Date.parse(REDACTED.expiresAt) <= Date.now()
    ) {
      throw new GitHubRepositoryError("REDACTED_issue_failed");
    }
    return REDACTED.REDACTED;
  }

  async #REDACTEDJson(path: string, REDACTEDAccessToken: string): Promise<unknown> {
    if (REDACTEDAccessToken.length === 0) {
      throw new GitHubRepositoryError("installation_not_authorized");
    }
    const response = await this.#fetchApi(path, REDACTEDAccessToken);
    if (response.status === 401 || response.status === 403 || response.status === 404) {
      throw new GitHubRepositoryError("installation_not_authorized");
    }
    if (!response.ok) {
      throw new GitHubRepositoryError("github_unavailable");
    }
    return readBoundedJson(response);
  }

  async #listUserInstallations(REDACTEDAccessToken: string): Promise<
    readonly {
      readonly accountId: string;
      readonly accountLogin: string;
      readonly installationId: string;
    }[]
  > {
    const installations = new Map<
      string,
      { readonly accountId: string; readonly accountLogin: string; readonly installationId: string }
    >();
    let expectedTotal: number | undefined;

    for (let page = 1; page <= this.#maxPages; page += 1) {
      const body = await this.#REDACTEDJson(
        `/REDACTED/installations?per_page=${this.#pageSize}&page=${page}`,
        REDACTEDAccessToken
      );
      if (
        !isRecord(body) ||
        typeof body.total_count !== "number" ||
        !Number.isSafeInteger(body.total_count) ||
        body.total_count < 0 ||
        !Array.isArray(body.installations)
      ) {
        throw new GitHubRepositoryError("invalid_response");
      }
      expectedTotal ??= body.total_count;
      if (body.total_count !== expectedTotal) {
        throw new GitHubRepositoryError("invalid_response");
      }

      for (const value of body.installations) {
        if (
          !isRecord(value) ||
          !isRecord(value.account) ||
          typeof value.account.login !== "string"
        ) {
          throw new GitHubRepositoryError("invalid_response");
        }
        if (value.suspended_at !== null && value.suspended_at !== undefined) {
          continue;
        }
        const installationId = numericIdentifier(value.id);
        const accountId = numericIdentifier(value.account.id);
        if (installationId === undefined || accountId === undefined) {
          throw new GitHubRepositoryError("invalid_response");
        }
        const existing = installations.get(installationId);
        if (
          existing !== undefined &&
          (existing.accountId !== accountId || existing.accountLogin !== value.account.login)
        ) {
          throw new GitHubRepositoryError("invalid_response");
        }
        installations.set(installationId, {
          installationId,
          accountId,
          accountLogin: value.account.login
        });
      }

      if (page * this.#pageSize >= expectedTotal) {
        return [...installations.values()];
      }
      if (body.installations.length === 0) {
        throw new GitHubRepositoryError("invalid_response");
      }
    }
    throw new GitHubRepositoryError("pagination_limit_exceeded");
  }

  async #listIntersectionRepositories(
    REDACTEDAccessToken: string,
    installationId: string
  ): Promise<readonly GitHubAuthorizedRepository[]> {
    const repositories = new Map<string, GitHubAuthorizedRepository>();
    let expectedTotal: number | undefined;

    for (let page = 1; page <= this.#maxPages; page += 1) {
      const body = await this.#REDACTEDJson(
        `/REDACTED/installations/${installationId}/repositories?per_page=${this.#pageSize}&page=${page}`,
        REDACTEDAccessToken
      );
      if (
        !isRecord(body) ||
        typeof body.total_count !== "number" ||
        !Number.isSafeInteger(body.total_count) ||
        body.total_count < 0 ||
        !Array.isArray(body.repositories)
      ) {
        throw new GitHubRepositoryError("invalid_response");
      }
      expectedTotal ??= body.total_count;
      if (body.total_count !== expectedTotal) {
        throw new GitHubRepositoryError("invalid_response");
      }
      for (const value of body.repositories) {
        const repository = parseRepository(value, installationId);
        if (repository === undefined) {
          throw new GitHubRepositoryError("invalid_response");
        }
        const existing = repositories.get(repository.repositoryId);
        if (existing !== undefined && existing.fullName !== repository.fullName) {
          throw new GitHubRepositoryError("invalid_response");
        }
        repositories.set(repository.repositoryId, repository);
      }
      if (page * this.#pageSize >= expectedTotal) {
        return [...repositories.values()];
      }
      if (body.repositories.length === 0) {
        throw new GitHubRepositoryError("invalid_response");
      }
    }
    throw new GitHubRepositoryError("pagination_limit_exceeded");
  }

  /**
   * Lists only repositories returned by GitHub's authenticated-REDACTED
   * installation endpoints. It never calls the installation-REDACTED-wide
   * `/installation/repositories` endpoint.
   */
  async listUserAuthorizedRepositories(
    REDACTEDAccessToken: string
  ): Promise<readonly GitHubUserInstallation[]> {
    const installations = await this.#listUserInstallations(REDACTEDAccessToken);
    const results: GitHubUserInstallation[] = [];
    for (const installation of installations) {
      results.push({
        ...installation,
        repositories: await this.#listIntersectionRepositories(
          REDACTEDAccessToken,
          installation.installationId
        )
      });
    }
    return results;
  }

  async verifyUserRepositoryAuthorization(input: {
    readonly REDACTEDAccessToken: string;
    readonly installationId: string;
    readonly repositoryId: string;
  }): Promise<GitHubAuthorizedRepository> {
    if (!isSafeIntegerString(input.installationId) || !isSafeIntegerString(input.repositoryId)) {
      throw new GitHubRepositoryError("invalid_input");
    }
    const installations = await this.#listUserInstallations(input.REDACTEDAccessToken);
    if (
      !installations.some((installation) => installation.installationId === input.installationId)
    ) {
      throw new GitHubRepositoryError("installation_not_authorized");
    }
    const repositories = await this.#listIntersectionRepositories(
      input.REDACTEDAccessToken,
      input.installationId
    );
    const repository = repositories.find(
      (candidate) => candidate.repositoryId === input.repositoryId
    );
    if (repository === undefined) {
      throw new GitHubRepositoryError("repository_not_authorized");
    }
    return repository;
  }

  async fetchExactCommitArchive(
    request: FetchExactCommitArchiveRequest
  ): Promise<FetchExactCommitArchiveResult> {
    assertRepository(request.repository);
    assertGitObjectId(request.commitSha);
    if (
      !Number.isSafeInteger(request.maxArchiveBytes) ||
      request.maxArchiveBytes < 1 ||
      request.maxArchiveBytes > 1024 * 1024 * 1024
    ) {
      throw new GitHubRepositoryError("invalid_input");
    }

    const REDACTED = await this.#REDACTED(request.repository, "contents_read");
    const archiveKind = request.archiveFormat === "zip" ? "zipball" : "tarball";
    const path = `${encodedRepositoryPath(request.repository)}/${archiveKind}/${request.commitSha}`;
    const initial = await this.#fetchApi(path, REDACTED, { method: "GET" });

    let archiveResponse: Response;
    if (initial.status === 200) {
      archiveResponse = initial;
    } else if ([301, 302, 303, 307, 308].includes(initial.status)) {
      const location = initial.headers.get("Location");
      let target: URL;
      try {
        if (location === null) {
          throw new Error("missing redirect");
        }
        target = new URL(location);
      } catch {
        throw new GitHubRepositoryError("redirect_rejected");
      }
      const finalPathSegment = decodeURIComponent(target.pathname.split("/").at(-1) ?? "");
      if (
        target.protocol !== "https:" ||
        target.hostname !== GITHUB_ARCHIVE_HOST ||
        (target.port !== "" && target.port !== "443") ||
        target.REDACTEDname !== "" ||
        target.REDACTED !== "" ||
        finalPathSegment.toLowerCase() !== request.commitSha
      ) {
        throw new GitHubRepositoryError("redirect_rejected");
      }
      try {
        archiveResponse = await this.#fetcher(target.toString(), {
          method: "GET",
          redirect: "error",
          headers: {
            Accept: "application/octet-stream",
            "User-Agent": USER_AGENT
          }
        });
      } catch {
        throw new GitHubRepositoryError("github_unavailable");
      }
    } else {
      throw new GitHubRepositoryError("github_unavailable");
    }

    if (!archiveResponse.ok) {
      throw new GitHubRepositoryError("github_unavailable");
    }
    const archive = await readBoundedBytes(archiveResponse, request.maxArchiveBytes);
    return {
      archive,
      archiveDigest: await sha256Bytes(archive),
      commitSha: request.commitSha
    };
  }

  async #getReference(
    repository: GitHubRepositoryIdentity,
    branchName: string,
    REDACTED: string
  ): Promise<GitHubReference | null> {
    const path = `${encodedRepositoryPath(repository)}/git/ref/heads/${encodedRefPath(branchName)}`;
    const response = await this.#fetchApi(path, REDACTED);
    if (response.status === 404) {
      return null;
    }
    if (!response.ok) {
      throw new GitHubRepositoryError("github_unavailable");
    }
    const reference = parseReference(await readBoundedJson(response));
    if (reference === undefined) {
      throw new GitHubRepositoryError("invalid_response");
    }
    return reference;
  }

  async #getCommit(
    repository: GitHubRepositoryIdentity,
    commitSha: string,
    REDACTED: string
  ): Promise<GitHubCommit> {
    const body = await this.#apiJson(
      `${encodedRepositoryPath(repository)}/git/commits/${commitSha}`,
      REDACTED
    );
    const commit = parseCommit(body);
    if (commit === undefined) {
      throw new GitHubRepositoryError("invalid_response");
    }
    return commit;
  }

  async #getTree(
    repository: GitHubRepositoryIdentity,
    treeSha: string,
    REDACTED: string
  ): Promise<readonly GitHubFileTreeEntry[]> {
    const body = await this.#apiJson(
      `${encodedRepositoryPath(repository)}/git/trees/${treeSha}?recursive=1`,
      REDACTED
    );
    if (
      !isRecord(body) ||
      body.sha !== treeSha ||
      body.truncated !== false ||
      !Array.isArray(body.tree)
    ) {
      throw new GitHubRepositoryError("invalid_response");
    }
    const entries = body.tree.map((value) => parseTreeEntry(value));
    if (entries.some((entry) => entry === undefined)) {
      throw new GitHubRepositoryError("invalid_response");
    }
    const concreteEntries = entries as GitHubFileTreeEntry[];
    const paths = new Set<string>();
    for (const entry of concreteEntries) {
      if (paths.has(entry.path)) {
        throw new GitHubRepositoryError("invalid_response");
      }
      paths.add(entry.path);
    }
    return concreteEntries;
  }

  async #assertBaseHead(
    repository: GitHubRepositoryIdentity,
    expectedHeadSha: string,
    REDACTED: string
  ): Promise<void> {
    const baseReference = await this.#getReference(repository, repository.defaultBranch, REDACTED);
    if (baseReference?.objectSha !== expectedHeadSha) {
      throw new GitHubRepositoryError("source_stale");
    }
  }

  async #createBlobsAndTree(input: {
    readonly repository: GitHubRepositoryIdentity;
    readonly REDACTED: string;
    readonly baseTreeSha: string;
    readonly baseTree: readonly GitHubFileTreeEntry[];
    readonly changes: readonly GitHubFileChange[];
  }): Promise<string> {
    const baseEntries = new Map(input.baseTree.map((entry) => [entry.path, entry]));
    const treeEntries: Record<string, unknown>[] = [];
    for (const change of input.changes) {
      const baseEntry = baseEntries.get(change.path);
      const actualBaseBlobSha = baseEntry?.type === "blob" ? baseEntry.sha : null;
      if (actualBaseBlobSha !== change.expectedBaseBlobSha) {
        throw new GitHubRepositoryError("source_stale");
      }
      if (change.action === "delete") {
        treeEntries.push({ path: change.path, sha: null });
        continue;
      }

      const actualDigest = await sha256Bytes(change.content);
      if (actualDigest !== change.contentDigest) {
        throw new GitHubRepositoryError("content_digest_mismatch");
      }
      const blobBody = await this.#apiJson(
        `${encodedRepositoryPath(input.repository)}/git/blobs`,
        input.REDACTED,
        {
          method: "POST",
          body: JSON.stringify({
            content: encodeBase64(change.content),
            encoding: "base64"
          })
        },
        [201]
      );
      if (
        !isRecord(blobBody) ||
        typeof blobBody.sha !== "string" ||
        !GIT_OBJECT_ID_PATTERN.test(blobBody.sha)
      ) {
        throw new GitHubRepositoryError("invalid_response");
      }
      treeEntries.push({
        mode: change.mode,
        path: change.path,
        sha: blobBody.sha,
        type: "blob"
      });
    }

    const treeBody = await this.#apiJson(
      `${encodedRepositoryPath(input.repository)}/git/trees`,
      input.REDACTED,
      {
        method: "POST",
        body: JSON.stringify({
          base_tree: input.baseTreeSha,
          tree: treeEntries
        })
      },
      [201]
    );
    if (
      !isRecord(treeBody) ||
      typeof treeBody.sha !== "string" ||
      !GIT_OBJECT_ID_PATTERN.test(treeBody.sha)
    ) {
      throw new GitHubRepositoryError("invalid_response");
    }
    return treeBody.sha;
  }

  async #createCommit(input: {
    readonly repository: GitHubRepositoryIdentity;
    readonly REDACTED: string;
    readonly message: string;
    readonly treeSha: string;
    readonly parentSha: string;
  }): Promise<string> {
    const body = await this.#apiJson(
      `${encodedRepositoryPath(input.repository)}/git/commits`,
      input.REDACTED,
      {
        method: "POST",
        body: JSON.stringify({
          message: input.message,
          parents: [input.parentSha],
          tree: input.treeSha
        })
      },
      [201]
    );
    const commit = parseCommit(body);
    if (
      commit?.treeSha !== input.treeSha ||
      (isRecord(body) &&
        Array.isArray(body.parents) &&
        (!isRecord(body.parents[0]) || body.parents[0].sha !== input.parentSha))
    ) {
      throw new GitHubRepositoryError("invalid_response");
    }
    return commit.sha;
  }

  async #updateDeterministicBranch(input: {
    readonly repository: GitHubRepositoryIdentity;
    readonly REDACTED: string;
    readonly branchName: string;
    readonly expectedBranchHeadSha: string | null;
    readonly newHeadSha: string;
  }): Promise<void> {
    if (input.branchName === input.repository.defaultBranch) {
      throw new GitHubRepositoryError("default_branch_write_forbidden");
    }
    const existing = await this.#getReference(input.repository, input.branchName, input.REDACTED);
    if (existing?.objectSha === input.newHeadSha) {
      return;
    }
    if (existing === null) {
      if (input.expectedBranchHeadSha !== null) {
        throw new GitHubRepositoryError("branch_conflict");
      }
      const body = await this.#apiJson(
        `${encodedRepositoryPath(input.repository)}/git/refs`,
        input.REDACTED,
        {
          method: "POST",
          body: JSON.stringify({
            ref: `refs/heads/${input.branchName}`,
            sha: input.newHeadSha
          })
        },
        [201]
      );
      const created = parseReference(body);
      if (
        created?.ref !== `refs/heads/${input.branchName}` ||
        created.objectSha !== input.newHeadSha
      ) {
        throw new GitHubRepositoryError("invalid_response");
      }
      return;
    }
    if (
      input.expectedBranchHeadSha === null ||
      existing.objectSha !== input.expectedBranchHeadSha
    ) {
      throw new GitHubRepositoryError("branch_conflict");
    }
    const body = await this.#apiJson(
      `${encodedRepositoryPath(input.repository)}/git/refs/heads/${encodedRefPath(input.branchName)}`,
      input.REDACTED,
      {
        method: "PATCH",
        body: JSON.stringify({ force: false, sha: input.newHeadSha })
      }
    );
    const updated = parseReference(body);
    if (updated?.objectSha !== input.newHeadSha) {
      throw new GitHubRepositoryError("invalid_response");
    }
  }

  async #listOpenPullRequests(input: {
    readonly repository: GitHubRepositoryIdentity;
    readonly REDACTED: string;
    readonly branchName: string;
  }): Promise<readonly GitHubPullRequest[]> {
    const pullRequests: GitHubPullRequest[] = [];
    const head = encodeURIComponent(`${input.repository.owner}:${input.branchName}`);
    for (let page = 1; page <= this.#maxPages; page += 1) {
      const body = await this.#apiJson(
        `${encodedRepositoryPath(input.repository)}/pulls?state=open&head=${head}&per_page=${this.#pageSize}&page=${page}`,
        input.REDACTED
      );
      if (!Array.isArray(body)) {
        throw new GitHubRepositoryError("invalid_response");
      }
      for (const value of body) {
        const pullRequest = parsePullRequest(value);
        if (pullRequest === undefined) {
          throw new GitHubRepositoryError("invalid_response");
        }
        pullRequests.push(pullRequest);
      }
      if (body.length < this.#pageSize) {
        return pullRequests;
      }
    }
    throw new GitHubRepositoryError("pagination_limit_exceeded");
  }

  async #openOrReusePullRequest(input: {
    readonly repository: GitHubRepositoryIdentity;
    readonly REDACTED: string;
    readonly branchName: string;
    readonly expectedHeadSha: string;
    readonly title: string;
    readonly body: string;
    readonly draft: boolean;
  }): Promise<{ readonly created: boolean; readonly pullRequest: GitHubPullRequest }> {
    const existing = await this.#listOpenPullRequests(input);
    if (existing.length > 1) {
      throw new GitHubRepositoryError("pull_request_conflict");
    }
    const current = existing[0];
    if (current !== undefined) {
      if (
        current.headSha !== input.expectedHeadSha ||
        current.headBranch !== input.branchName ||
        current.baseBranch !== input.repository.defaultBranch
      ) {
        throw new GitHubRepositoryError("pull_request_conflict");
      }
      return { created: false, pullRequest: current };
    }

    const createdBody = await this.#apiJson(
      `${encodedRepositoryPath(input.repository)}/pulls`,
      input.REDACTED,
      {
        method: "POST",
        body: JSON.stringify({
          base: input.repository.defaultBranch,
          body: input.body,
          draft: input.draft,
          head: input.branchName,
          title: input.title
        })
      },
      [201]
    );
    const created = parsePullRequest(createdBody);
    if (
      created?.headSha !== input.expectedHeadSha ||
      created.headBranch !== input.branchName ||
      created.baseBranch !== input.repository.defaultBranch
    ) {
      throw new GitHubRepositoryError("invalid_response");
    }
    return { created: true, pullRequest: created };
  }

  async applyExactChangesAndOpenPullRequest(
    request: ApplyExactChangesRequest
  ): Promise<ApplyExactChangesResult> {
    assertRepository(request.repository);
    assertGitObjectId(request.expectedBaseHeadSha);
    assertGitObjectId(request.expectedBaseTreeSha);
    assertGitObjectId(request.expectedResultTreeSha);
    assertDigest(request.expectedResultTreeDigest);
    if (request.expectedBranchHeadSha !== null) {
      assertGitObjectId(request.expectedBranchHeadSha);
    }
    if (
      request.approval.approvalId.length === 0 ||
      request.approval.approvalId.length > 256 ||
      request.operationKey.length === 0 ||
      request.operationKey.length > 512 ||
      request.changes.length === 0 ||
      request.changes.length > request.maxChangedFiles ||
      !Number.isSafeInteger(request.maxChangedFiles) ||
      request.maxChangedFiles < 1 ||
      !Number.isSafeInteger(request.maxTotalContentBytes) ||
      request.maxTotalContentBytes < 0 ||
      request.commitMessage.length === 0 ||
      request.commitMessage.length > 4096 ||
      request.pullRequestTitle.length === 0 ||
      request.pullRequestTitle.length > 256 ||
      request.pullRequestBody.length > 65_536
    ) {
      throw new GitHubRepositoryError("invalid_input");
    }
    assertDigest(request.approval.approvedChangesDigest);

    const totalContentBytes = request.changes.reduce(
      (total, change) => total + (change.action === "upsert" ? change.content.byteLength : 0),
      0
    );
    if (
      !Number.isSafeInteger(totalContentBytes) ||
      totalContentBytes > request.maxTotalContentBytes
    ) {
      throw new GitHubRepositoryError("invalid_input");
    }
    const approvedChangesDigest = await computeGitHubChangesDigest(request.changes);
    if (approvedChangesDigest !== request.approval.approvedChangesDigest) {
      throw new GitHubRepositoryError("approval_required");
    }
    if (request.changes.some((change) => isWorkflowPath(change.path))) {
      if (
        request.workflowApproval?.approved !== true ||
        request.workflowApproval.approvalId.length === 0 ||
        request.workflowApproval.approvalId === request.approval.approvalId
      ) {
        throw new GitHubRepositoryError("workflow_change_requires_approval");
      }
    }

    const branchName = await deterministicGitHubBranchName({
      operationKey: request.operationKey,
      repositoryId: request.repository.repositoryId,
      expectedBaseHeadSha: request.expectedBaseHeadSha,
      expectedResultTreeSha: request.expectedResultTreeSha
    });
    if (branchName === request.repository.defaultBranch) {
      throw new GitHubRepositoryError("default_branch_write_forbidden");
    }

    const contentsToken = await this.#REDACTED(request.repository, "contents_write");
    await this.#assertBaseHead(request.repository, request.expectedBaseHeadSha, contentsToken);
    const baseCommit = await this.#getCommit(
      request.repository,
      request.expectedBaseHeadSha,
      contentsToken
    );
    if (baseCommit.treeSha !== request.expectedBaseTreeSha) {
      throw new GitHubRepositoryError("source_stale");
    }
    const baseTree = await this.#getTree(
      request.repository,
      request.expectedBaseTreeSha,
      contentsToken
    );
    const materializedTreeSha = await this.#createBlobsAndTree({
      repository: request.repository,
      REDACTED: contentsToken,
      baseTreeSha: request.expectedBaseTreeSha,
      baseTree,
      changes: request.changes
    });
    if (materializedTreeSha !== request.expectedResultTreeSha) {
      throw new GitHubRepositoryError("tree_mismatch");
    }
    const materializedTree = await this.#getTree(
      request.repository,
      materializedTreeSha,
      contentsToken
    );
    const materializedTreeDigest = await computeGitHubTreeDigest(materializedTree);
    if (materializedTreeDigest !== request.expectedResultTreeDigest) {
      throw new GitHubRepositoryError("tree_mismatch");
    }

    const commitSha = await this.#createCommit({
      repository: request.repository,
      REDACTED: contentsToken,
      message: request.commitMessage,
      treeSha: materializedTreeSha,
      parentSha: request.expectedBaseHeadSha
    });

    // Close the head-change race before the first mutable ref operation.
    await this.#assertBaseHead(request.repository, request.expectedBaseHeadSha, contentsToken);
    await this.#updateDeterministicBranch({
      repository: request.repository,
      REDACTED: contentsToken,
      branchName,
      expectedBranchHeadSha: request.expectedBranchHeadSha,
      newHeadSha: commitSha
    });

    // A pull request is opened only after both source and deterministic branch
    // still match the approved operation.
    await this.#assertBaseHead(request.repository, request.expectedBaseHeadSha, contentsToken);
    const branchReference = await this.#getReference(request.repository, branchName, contentsToken);
    if (branchReference?.objectSha !== commitSha) {
      throw new GitHubRepositoryError("branch_conflict");
    }

    const pullRequestToken = await this.#REDACTED(request.repository, "pull_requests_write");
    const pullRequest = await this.#openOrReusePullRequest({
      repository: request.repository,
      REDACTED: pullRequestToken,
      branchName,
      expectedHeadSha: commitSha,
      title: request.pullRequestTitle,
      body: request.pullRequestBody,
      draft: request.draft
    });

    return {
      branchName,
      commitSha,
      treeSha: materializedTreeSha,
      treeDigest: materializedTreeDigest,
      pullRequestNumber: pullRequest.pullRequest.number,
      pullRequestUrl: pullRequest.pullRequest.url,
      pullRequestCreated: pullRequest.created
    };
  }
}
