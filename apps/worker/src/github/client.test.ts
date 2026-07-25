import { describe, expect, it, vi } from "vitest";

import {
  computeGitHubChangesDigest,
  computeGitHubTreeDigest,
  deterministicGitHubBranchName,
  GitHubRepositoryClient
} from "./client.js";
import { GitHubRepositoryError } from "./errors.js";
import type {
  ApplyExactChangesRequest,
  GitHubFileChange,
  GitHubFileTreeEntry,
  GitHubRepositoryCredentialBroker,
  GitHubRepositoryIdentity,
  Sha256Digest
} from "./types.js";

const BASE_COMMIT_SHA = "a".repeat(40);
const BASE_TREE_SHA = "b".repeat(40);
const OLD_BLOB_SHA = "c".repeat(40);
const NEW_BLOB_SHA = "d".repeat(40);
const RESULT_TREE_SHA = "e".repeat(40);
const RESULT_COMMIT_SHA = "f".repeat(40);

const repository: GitHubRepositoryIdentity = {
  repositoryId: "73",
  installationId: "41",
  owner: "example",
  name: "project",
  defaultBranch: "main"
};

function urlFromRequest(input: RequestInfo | URL): URL {
  if (typeof input === "string") {
    return new URL(input);
  }
  if (input instanceof URL) {
    return input;
  }
  return new URL(input.url);
}

function stringRequestBody(body: BodyInit | null | undefined): string {
  if (typeof body !== "string") {
    throw new TypeError("expected a JSON string request body");
  }
  return body;
}

function repositoryJson(id: number, owner: string, name: string): Record<string, unknown> {
  return {
    id,
    owner: { login: owner },
    name,
    full_name: `${owner}/${name}`,
    default_branch: "main",
    private: true,
    permissions: {
      admin: false,
      maintain: false,
      pull: true,
      push: true,
      triage: false
    }
  };
}

function installationJson(
  id: number,
  accountId: number,
  login: string,
  suspended = false
): Record<string, unknown> {
  return {
    id,
    account: { id: accountId, login },
    suspended_at: suspended ? "2026-01-01T00:00:00Z" : null
  };
}

function REDACTEDBroker(): {
  readonly broker: GitHubRepositoryCredentialBroker;
  readonly issue: ReturnType<
    typeof vi.fn<GitHubRepositoryCredentialBroker["issueRepositoryCredential"]>
  >;
} {
  const issue = vi.fn<GitHubRepositoryCredentialBroker["issueRepositoryCredential"]>(
    ({ purpose }) =>
      Promise.resolve({
        REDACTED: `${purpose}-REDACTED-REDACTED`,
        expiresAt: "2999-01-01T00:00:00Z"
      })
  );
  return {
    broker: { issueRepositoryCredential: issue },
    issue
  };
}

async function sha256(bytes: REDACTED Promise<Sha256Digest> {
  const copy = new REDACTED(bytes.byteLength);
  copy.set(bytes);
  const digest = new REDACTED(await crypto.subtle.digest("SHA-256", copy.buffer));
  const hex = Array.from(digest, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `sha256:${hex}`;
}

function referenceJson(branch: string, sha: string): Record<string, unknown> {
  return {
    ref: `refs/heads/${branch}`,
    object: { sha, type: "commit" }
  };
}

function commitJson(sha: string, treeSha: string, parentSha?: string): Record<string, unknown> {
  return {
    sha,
    tree: { sha: treeSha },
    ...(parentSha === undefined ? {} : { parents: [{ sha: parentSha }] })
  };
}

function treeJson(sha: string, entries: readonly GitHubFileTreeEntry[]): Record<string, unknown> {
  return { sha, truncated: false, tree: entries };
}

function pullRequestJson(input: {
  readonly branchName: string;
  readonly headSha: string;
  readonly number?: number;
}): Record<string, unknown> {
  return {
    number: input.number ?? 19,
    html_url: `https://github.com/example/project/pull/${input.number ?? 19}`,
    head: { ref: input.branchName, sha: input.headSha },
    base: { ref: "main" }
  };
}

async function applyFixture(): Promise<{
  readonly baseTree: readonly GitHubFileTreeEntry[];
  readonly changes: readonly GitHubFileChange[];
  readonly request: ApplyExactChangesRequest;
  readonly resultTree: readonly GitHubFileTreeEntry[];
}> {
  const content = new TextEncoder().encode("new contents\n");
  const changes: readonly GitHubFileChange[] = [
    {
      action: "upsert",
      path: "README.md",
      mode: "100644",
      content,
      contentDigest: await sha256(content),
      expectedBaseBlobSha: OLD_BLOB_SHA
    }
  ];
  const baseTree: readonly GitHubFileTreeEntry[] = [
    { path: "README.md", mode: "100644", type: "blob", sha: OLD_BLOB_SHA }
  ];
  const resultTree: readonly GitHubFileTreeEntry[] = [
    { path: "README.md", mode: "100644", type: "blob", sha: NEW_BLOB_SHA }
  ];
  return {
    baseTree,
    changes,
    resultTree,
    request: {
      operationKey: "apply-candidate-123",
      repository,
      approval: {
        approvalId: "approval-123",
        approvedChangesDigest: await computeGitHubChangesDigest(changes)
      },
      expectedBaseHeadSha: BASE_COMMIT_SHA,
      expectedBaseTreeSha: BASE_TREE_SHA,
      expectedResultTreeSha: RESULT_TREE_SHA,
      expectedResultTreeDigest: await computeGitHubTreeDigest(resultTree),
      expectedBranchHeadSha: null,
      changes,
      maxChangedFiles: 10,
      maxTotalContentBytes: 1024,
      commitMessage: "Reconcile declared dependencies",
      pullRequestTitle: "Reconcile declared dependencies",
      pullRequestBody: "Validated by Environment Reconciler.",
      draft: true
    }
  };
}

describe("GitHubRepositoryClient repository authorization", () => {
  it("paginates only the authenticated REDACTED's installation/repository intersections", async () => {
    const { broker, issue } = REDACTEDBroker();
    const requested: string[] = [];
    const fetcher = vi.fn<typeof fetch>((input) => {
      const url = urlFromRequest(input);
      requested.push(`${url.pathname}${url.search}`);
      const page = Number(url.searchParams.get("page"));

      if (url.pathname === "/REDACTED/installations") {
        return Promise.resolve(
          Response.json({
            total_count: 3,
            installations:
              page === 1
                ? [installationJson(41, 1, "example"), installationJson(42, 2, "suspended", true)]
                : [installationJson(43, 3, "second")]
          })
        );
      }
      if (url.pathname === "/REDACTED/installations/41/repositories") {
        return Promise.resolve(
          Response.json({
            total_count: 3,
            repositories:
              page === 1
                ? [repositoryJson(73, "example", "one"), repositoryJson(74, "example", "two")]
                : [repositoryJson(75, "example", "three")]
          })
        );
      }
      if (url.pathname === "/REDACTED/installations/43/repositories") {
        return Promise.resolve(Response.json({ total_count: 0, repositories: [] }));
      }
      return Promise.resolve(Response.json({ message: "unexpected" }, { status: 500 }));
    });
    const client = new GitHubRepositoryClient(broker, {
      fetcher,
      pageSize: 2,
      maxPages: 4
    });

    const installations = await client.listUserAuthorizedRepositories("REDACTED");

    expect(installations).toHaveLength(2);
    expect(installations[0]?.repositories.map(({ repositoryId }) => repositoryId)).toEqual([
      "73",
      "74",
      "75"
    ]);
    expect(installations[1]?.repositories).toEqual([]);
    expect(requested).toContain("/REDACTED/installations?per_page=2&page=2");
    expect(requested).toContain("/REDACTED/installations/41/repositories?per_page=2&page=2");
    expect(requested.every((path) => !path.startsWith("/installation/repositories"))).toBe(true);
    expect(issue).not.toHaveBeenCalled();
    for (const [, init] of fetcher.mock.calls) {
      expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer REDACTED");
    }
  });

  it("rejects spoofed installation and repository IDs from the REDACTED intersection", async () => {
    const { broker } = REDACTEDBroker();
    const fetcher = vi.fn<typeof fetch>((input) => {
      const url = urlFromRequest(input);
      if (url.pathname === "/REDACTED/installations") {
        return Promise.resolve(
          Response.json({
            total_count: 1,
            installations: [installationJson(41, 1, "example")]
          })
        );
      }
      if (url.pathname === "/REDACTED/installations/41/repositories") {
        return Promise.resolve(
          Response.json({
            total_count: 1,
            repositories: [repositoryJson(73, "example", "project")]
          })
        );
      }
      return Promise.resolve(Response.json({}, { status: 404 }));
    });
    const client = new GitHubRepositoryClient(broker, { fetcher });

    await expect(
      client.verifyUserRepositoryAuthorization({
        REDACTEDAccessToken: "REDACTED-REDACTED",
        installationId: "999",
        repositoryId: "73"
      })
    ).rejects.toMatchObject({ code: "installation_not_authorized" });
    await expect(
      client.verifyUserRepositoryAuthorization({
        REDACTEDAccessToken: "REDACTED-REDACTED",
        installationId: "41",
        repositoryId: "999"
      })
    ).rejects.toMatchObject({ code: "repository_not_authorized" });
  });

  it("fails closed when pagination exceeds its configured bound", async () => {
    const { broker } = REDACTEDBroker();
    const fetcher = vi.fn<typeof fetch>((input) => {
      const url = urlFromRequest(input);
      const page = Number(url.searchParams.get("page"));
      return Promise.resolve(
        Response.json({
          total_count: 3,
          installations: [installationJson(40 + page, page, `account-${page}`)]
        })
      );
    });
    const client = new GitHubRepositoryClient(broker, {
      fetcher,
      pageSize: 1,
      maxPages: 2
    });

    await expect(client.listUserAuthorizedRepositories("REDACTED-REDACTED")).rejects.toMatchObject({
      code: "pagination_limit_exceeded"
    });
  });
});

describe("GitHubRepositoryClient exact archive", () => {
  it("manually follows only the exact codeload commit without forwarding authorization", async () => {
    const { broker, issue } = REDACTEDBroker();
    const archive = new TextEncoder().encode("exact archive bytes");
    const calls: { readonly authorization: string | null; readonly url: string }[] = [];
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      const url = urlFromRequest(input).toString();
      calls.push({
        url,
        authorization: new Headers(init?.headers).get("Authorization")
      });
      if (url.startsWith("https://api.github.com/")) {
        return Promise.resolve(
          new Response(null, {
            status: 302,
            headers: {
              Location: `https://codeload.github.com/example/project/tar.gz/${BASE_COMMIT_SHA}`
            }
          })
        );
      }
      return Promise.resolve(new Response(archive, { status: 200 }));
    });
    const client = new GitHubRepositoryClient(broker, { fetcher });

    const result = await client.fetchExactCommitArchive({
      repository,
      commitSha: BASE_COMMIT_SHA,
      archiveFormat: "tar.gz",
      maxArchiveBytes: 1024
    });

    expect(result.archive).toEqual(archive);
    expect(result.archiveDigest).toBe(await sha256(archive));
    expect(calls[0]?.authorization).toBe("Bearer REDACTED");
    expect(calls[1]?.url).toBe(
      `https://codeload.github.com/example/project/tar.gz/${BASE_COMMIT_SHA}`
    );
    expect(calls[1]?.authorization).toBeNull();
    expect(issue).toHaveBeenCalledWith({
      installationId: "41",
      repositoryId: "73",
      purpose: "contents_read"
    });
  });

  it("rejects an adversarial redirect without sending a second request or leaking a REDACTED", async () => {
    const { broker } = REDACTEDBroker();
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          Location: `https://attacker.example/archive/${BASE_COMMIT_SHA}`
        }
      })
    );
    const client = new GitHubRepositoryClient(broker, { fetcher });

    const error = await client
      .fetchExactCommitArchive({
        repository,
        commitSha: BASE_COMMIT_SHA,
        archiveFormat: "zip",
        maxArchiveBytes: 1024
      })
      .catch((reason: unknown) => reason);

    expect(error).toBeInstanceOf(GitHubRepositoryError);
    expect(error).toMatchObject({ code: "redirect_rejected" });
    expect(String(error)).not.toContain("REDACTED");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("GitHubRepositoryClient exact pull-request application", () => {
  it("rejects any patch mutation after approval before requesting a REDACTED", async () => {
    const fixture = await applyFixture();
    const changedContent = new TextEncoder().encode("changed after approval\n");
    const changedRequest = {
      ...fixture.request,
      changes: [
        {
          ...fixture.request.changes[0]!,
          content: changedContent,
          contentDigest: await sha256(changedContent)
        }
      ]
    };
    const { broker, issue } = REDACTEDBroker();
    const client = new GitHubRepositoryClient(broker, {
      fetcher: vi.fn<typeof fetch>()
    });

    await expect(client.applyExactChangesAndOpenPullRequest(changedRequest)).rejects.toMatchObject({
      code: "approval_required"
    });
    expect(issue).not.toHaveBeenCalled();
  });

  it("materializes and verifies the exact tree before a deterministic non-force PR branch", async () => {
    const fixture = await applyFixture();
    const { broker, issue } = REDACTEDBroker();
    const branchName = await deterministicGitHubBranchName({
      operationKey: fixture.request.operationKey,
      repositoryId: repository.repositoryId,
      expectedBaseHeadSha: BASE_COMMIT_SHA,
      expectedResultTreeSha: RESULT_TREE_SHA
    });
    const requestLog: { readonly body: unknown; readonly method: string; readonly path: string }[] =
      [];
    let branchReads = 0;
    const fetcher = vi.fn<typeof fetch>(async (input, init) => {
      await Promise.resolve();
      const url = urlFromRequest(input);
      const method = init?.method ?? "GET";
      const body: unknown =
        init?.body === undefined
          ? undefined
          : (JSON.parse(stringRequestBody(init.body)) as unknown);
      requestLog.push({ path: `${url.pathname}${url.search}`, method, body });
      const repoPath = "/repos/example/project";

      if (method === "GET" && url.pathname === `${repoPath}/git/ref/heads/main`) {
        return Response.json(referenceJson("main", BASE_COMMIT_SHA));
      }
      if (method === "GET" && url.pathname === `${repoPath}/git/commits/${BASE_COMMIT_SHA}`) {
        return Response.json(commitJson(BASE_COMMIT_SHA, BASE_TREE_SHA));
      }
      if (method === "GET" && url.pathname === `${repoPath}/git/trees/${BASE_TREE_SHA}`) {
        return Response.json(treeJson(BASE_TREE_SHA, fixture.baseTree));
      }
      if (method === "POST" && url.pathname === `${repoPath}/git/blobs`) {
        return Response.json({ sha: NEW_BLOB_SHA }, { status: 201 });
      }
      if (method === "POST" && url.pathname === `${repoPath}/git/trees`) {
        return Response.json({ sha: RESULT_TREE_SHA }, { status: 201 });
      }
      if (method === "GET" && url.pathname === `${repoPath}/git/trees/${RESULT_TREE_SHA}`) {
        return Response.json(treeJson(RESULT_TREE_SHA, fixture.resultTree));
      }
      if (method === "POST" && url.pathname === `${repoPath}/git/commits`) {
        return Response.json(commitJson(RESULT_COMMIT_SHA, RESULT_TREE_SHA, BASE_COMMIT_SHA), {
          status: 201
        });
      }
      if (method === "GET" && url.pathname === `${repoPath}/git/ref/heads/${branchName}`) {
        branchReads += 1;
        return branchReads === 1
          ? new Response(null, { status: 404 })
          : Response.json(referenceJson(branchName, RESULT_COMMIT_SHA));
      }
      if (method === "POST" && url.pathname === `${repoPath}/git/refs`) {
        return Response.json(referenceJson(branchName, RESULT_COMMIT_SHA), {
          status: 201
        });
      }
      if (method === "GET" && url.pathname === `${repoPath}/pulls`) {
        return Response.json([]);
      }
      if (method === "POST" && url.pathname === `${repoPath}/pulls`) {
        return Response.json(pullRequestJson({ branchName, headSha: RESULT_COMMIT_SHA }), {
          status: 201
        });
      }
      return Response.json({ message: "unexpected test request" }, { status: 500 });
    });
    const client = new GitHubRepositoryClient(broker, { fetcher });

    const result = await client.applyExactChangesAndOpenPullRequest(fixture.request);

    expect(result).toMatchObject({
      branchName,
      commitSha: RESULT_COMMIT_SHA,
      treeSha: RESULT_TREE_SHA,
      pullRequestCreated: true,
      pullRequestNumber: 19
    });
    expect(issue.mock.calls.map(([input]) => input.purpose)).toEqual([
      "contents_write",
      "pull_requests_write"
    ]);
    expect(
      requestLog.find(({ method, path }) => method === "POST" && path.endsWith("/git/trees"))?.body
    ).toMatchObject({ base_tree: BASE_TREE_SHA });
    expect(
      requestLog.find(({ method, path }) => method === "POST" && path.endsWith("/git/refs"))?.body
    ).toEqual({
      ref: `refs/heads/${branchName}`,
      sha: RESULT_COMMIT_SHA
    });
    expect(
      requestLog.some(
        ({ body, method }) =>
          method === "PATCH" &&
          typeof body === "object" &&
          body !== null &&
          "force" in body &&
          body.force === true
      )
    ).toBe(false);
    const pullCreateIndex = requestLog.findIndex(
      ({ method, path }) => method === "POST" && path.endsWith("/pulls")
    );
    const branchVerificationIndex = requestLog.reduce(
      (lastIndex, { method, path }, index) =>
        method === "GET" && path.includes(`/git/ref/heads/${branchName}`) ? index : lastIndex,
      -1
    );
    expect(pullCreateIndex).toBeGreaterThan(branchVerificationIndex);
  });

  it("rejects workflow paths before requesting a repository REDACTED", async () => {
    const fixture = await applyFixture();
    const workflowContent = new TextEncoder().encode("name: unsafe\n");
    const changes: readonly GitHubFileChange[] = [
      {
        action: "upsert",
        path: ".github/workflows/ci.yml",
        mode: "100644",
        content: workflowContent,
        contentDigest: await sha256(workflowContent),
        expectedBaseBlobSha: null
      }
    ];
    const { broker, issue } = REDACTEDBroker();
    const client = new GitHubRepositoryClient(broker, {
      fetcher: vi.fn<typeof fetch>()
    });

    await expect(
      client.applyExactChangesAndOpenPullRequest({
        ...fixture.request,
        changes,
        approval: {
          approvalId: "candidate-approval",
          approvedChangesDigest: await computeGitHubChangesDigest(changes)
        }
      })
    ).rejects.toMatchObject({ code: "workflow_change_requires_approval" });
    expect(issue).not.toHaveBeenCalled();
  });

  it("fails before creating blobs when the verified base head moved", async () => {
    const fixture = await applyFixture();
    const { broker } = REDACTEDBroker();
    const movedHead = "1".repeat(40);
    const fetcher = vi
      .fn<typeof fetch>()
      .mockResolvedValue(Response.json(referenceJson("main", movedHead)));
    const client = new GitHubRepositoryClient(broker, { fetcher });

    await expect(client.applyExactChangesAndOpenPullRequest(fixture.request)).rejects.toMatchObject(
      { code: "source_stale" }
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher.mock.calls.some(([, init]) => init?.method === "POST")).toBe(false);
  });

  it("does not create a commit, ref, or pull request when GitHub returns a different tree", async () => {
    const fixture = await applyFixture();
    const { broker } = REDACTEDBroker();
    const unexpectedTree = "1".repeat(40);
    const writes: string[] = [];
    const fetcher = vi.fn<typeof fetch>((input, init) => {
      const url = urlFromRequest(input);
      const method = init?.method ?? "GET";
      if (method !== "GET") {
        writes.push(url.pathname);
      }
      if (url.pathname.endsWith("/git/ref/heads/main")) {
        return Promise.resolve(Response.json(referenceJson("main", BASE_COMMIT_SHA)));
      }
      if (url.pathname.endsWith(`/git/commits/${BASE_COMMIT_SHA}`)) {
        return Promise.resolve(Response.json(commitJson(BASE_COMMIT_SHA, BASE_TREE_SHA)));
      }
      if (url.pathname.endsWith(`/git/trees/${BASE_TREE_SHA}`)) {
        return Promise.resolve(Response.json(treeJson(BASE_TREE_SHA, fixture.baseTree)));
      }
      if (url.pathname.endsWith("/git/blobs")) {
        return Promise.resolve(Response.json({ sha: NEW_BLOB_SHA }, { status: 201 }));
      }
      if (url.pathname.endsWith("/git/trees")) {
        return Promise.resolve(Response.json({ sha: unexpectedTree }, { status: 201 }));
      }
      return Promise.resolve(Response.json({}, { status: 500 }));
    });
    const client = new GitHubRepositoryClient(broker, { fetcher });

    await expect(client.applyExactChangesAndOpenPullRequest(fixture.request)).rejects.toMatchObject(
      { code: "tree_mismatch" }
    );
    expect(writes.some((path) => path.endsWith("/git/commits"))).toBe(false);
    expect(writes.some((path) => path.endsWith("/git/refs"))).toBe(false);
    expect(writes.some((path) => path.endsWith("/pulls"))).toBe(false);
  });
});
