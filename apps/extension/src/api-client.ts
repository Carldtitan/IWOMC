export interface SignInSession {
  readonly enrollmentId: string;
  readonly expiresAtEpochSeconds: number;
  readonly signInUrl: string;
}

export interface DeviceEnrollment {
  readonly credential: string;
  readonly deviceId: string;
  readonly expiresAtEpochSeconds: number;
  readonly workspaceId: string;
}

export interface ProjectSummary {
  readonly projectId: string;
  readonly projectName: string;
}

export interface ExtensionApiClient {
  beginSignIn(input: { readonly repositoryPath: string }): Promise<SignInSession>;
  completeEnrollment(input: {
    readonly code: string;
    readonly enrollmentId: string;
  }): Promise<DeviceEnrollment>;
  listProjects(input: {
    readonly credential: string;
    readonly repositoryPath: string;
    readonly workspaceId: string;
  }): Promise<readonly ProjectSummary[]>;
  createCheckpoint(input: {
    readonly credential: string;
    readonly projectId: string;
  }): Promise<void>;
}

export class ExtensionApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(
      status === 0
        ? "The Environment Reconciler service is unavailable."
        : `The Environment Reconciler service rejected the request (${status}).`
    );
    this.name = "ExtensionApiError";
    this.status = status;
  }
}

export class HttpExtensionApiClient implements ExtensionApiClient {
  readonly #baseUrl: URL;

  constructor(baseUrl: string) {
    this.#baseUrl = new URL(baseUrl);
  }

  beginSignIn(input: { readonly repositoryPath: string }): Promise<SignInSession> {
    return this.#request<SignInSession>("/api/extension/sign-in", {
      body: JSON.stringify(input),
      method: "POST"
    });
  }

  completeEnrollment(input: {
    readonly code: string;
    readonly enrollmentId: string;
  }): Promise<DeviceEnrollment> {
    return this.#request<DeviceEnrollment>("/api/extension/enroll", {
      body: JSON.stringify(input),
      method: "POST"
    });
  }

  listProjects(input: {
    readonly credential: string;
    readonly repositoryPath: string;
    readonly workspaceId: string;
  }): Promise<readonly ProjectSummary[]> {
    const query = new URLSearchParams({
      repositoryPath: input.repositoryPath,
      workspaceId: input.workspaceId
    });
    return this.#request<readonly ProjectSummary[]>(`/api/extension/projects?${query.toString()}`, {
      headers: { authorization: `Bearer ${input.credential}` },
      method: "GET"
    });
  }

  async createCheckpoint(input: {
    readonly credential: string;
    readonly projectId: string;
  }): Promise<void> {
    await this.#request<unknown>(
      `/api/extension/projects/${encodeURIComponent(input.projectId)}/checkpoints`,
      {
        body: JSON.stringify({ reason: "manual" }),
        headers: { authorization: `Bearer ${input.credential}` },
        method: "POST"
      }
    );
  }

  async #request<T>(path: string, init: RequestInit): Promise<T> {
    let response: Response;
    try {
      response = await fetch(new URL(path, this.#baseUrl), {
        ...init,
        headers: {
          accept: "application/json",
          ...(init.body === undefined ? {} : { "content-type": "application/json" }),
          ...init.headers
        },
        signal: AbortSignal.timeout(15_000)
      });
    } catch {
      throw new ExtensionApiError(0);
    }
    if (!response.ok) {
      throw new ExtensionApiError(response.status);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }
}
