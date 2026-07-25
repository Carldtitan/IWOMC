import type { GitHubRepositoryCredentialAuthorization } from "./token.js";

export type GitHubInstallationLifecycleAction =
  "created" | "deleted" | "new_permissions_accepted" | "suspend" | "unsuspend";

export interface GitHubInstallationStateStore extends GitHubRepositoryCredentialAuthorization {
  applyInstallationLifecycle(input: {
    readonly action: GitHubInstallationLifecycleAction;
    readonly occurredAtEpochSeconds: number;
    readonly providerInstallationId: string;
  }): Promise<boolean>;
}

export class GitHubInstallationLifecycleService {
  readonly #store: GitHubInstallationStateStore;

  constructor(store: GitHubInstallationStateStore) {
    this.#store = store;
  }

  /**
   * Applies only authenticated, allowlisted installation webhook actions.
   * `false` means the installation is not linked locally; it is not silently
   * created from untrusted webhook display data.
   */
  apply(input: {
    readonly action: GitHubInstallationLifecycleAction;
    readonly occurredAtEpochSeconds: number;
    readonly providerInstallationId: string;
  }): Promise<boolean> {
    if (
      !/^[1-9]\d*$/u.test(input.providerInstallationId) ||
      !Number.isSafeInteger(input.occurredAtEpochSeconds) ||
      input.occurredAtEpochSeconds < 0
    ) {
      return Promise.resolve(false);
    }
    return this.#store.applyInstallationLifecycle(input);
  }
}
