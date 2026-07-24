export type GitHubRepositoryErrorCode =
  | "approval_required"
  | "archive_too_large"
  | "branch_conflict"
  | "content_digest_mismatch"
  | "default_branch_write_forbidden"
  | "github_unavailable"
  | "installation_not_authorized"
  | "invalid_input"
  | "invalid_response"
  | "pagination_limit_exceeded"
  | "pull_request_conflict"
  | "redirect_rejected"
  | "repository_not_authorized"
  | "source_stale"
  | "token_issue_failed"
  | "tree_mismatch"
  | "workflow_change_requires_approval";

const SAFE_MESSAGES: Readonly<Record<GitHubRepositoryErrorCode, string>> = {
  approval_required: "An explicit, bound approval is required.",
  archive_too_large: "The exact source archive exceeds the configured limit.",
  branch_conflict: "The deterministic branch does not have the expected head.",
  content_digest_mismatch: "A file change does not match its approved content digest.",
  default_branch_write_forbidden: "Direct writes to the default branch are forbidden.",
  github_unavailable: "GitHub could not complete the requested operation.",
  installation_not_authorized: "The GitHub installation is not available to this user.",
  invalid_input: "The GitHub repository request is invalid.",
  invalid_response: "GitHub returned an invalid response.",
  pagination_limit_exceeded: "GitHub pagination exceeded the configured safety limit.",
  pull_request_conflict: "An existing pull request does not match the expected branch state.",
  redirect_rejected: "The source archive redirect was rejected.",
  repository_not_authorized:
    "The repository is not in the authenticated user and installation intersection.",
  source_stale: "The repository source no longer matches the verified base.",
  token_issue_failed: "A least-privileged repository credential could not be issued.",
  tree_mismatch: "The materialized repository tree does not match the verified tree.",
  workflow_change_requires_approval:
    "Workflow-file changes require a separate explicit permission and approval."
};

/**
 * A deliberately low-detail error safe for logs and API responses.
 *
 * Provider bodies, credentials, repository content, and authorization headers
 * are never attached to this error.
 */
export class GitHubRepositoryError extends Error {
  readonly code: GitHubRepositoryErrorCode;

  constructor(code: GitHubRepositoryErrorCode) {
    super(SAFE_MESSAGES[code]);
    this.name = "GitHubRepositoryError";
    this.code = code;
  }
}
