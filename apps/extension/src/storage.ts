import {
  DEVICE_CREDENTIAL_KEY,
  STATE_KEY,
  emptyState,
  type DeviceConnection,
  type LinkedProject,
  type PersistentExtensionState
} from "./model.js";

export interface Memento {
  get<T>(key: string): T | undefined;
  update(key: string, value: unknown): PromiseLike<void>;
}

export interface Secrets {
  delete(key: string): PromiseLike<void>;
  get(key: string): PromiseLike<string | undefined>;
  store(key: string, value: string): PromiseLike<void>;
}

export class ExtensionStateStore {
  readonly #memento: Memento;
  readonly #secrets: Secrets;

  constructor(memento: Memento, secrets: Secrets) {
    this.#memento = memento;
    this.#secrets = secrets;
  }

  load(): PersistentExtensionState {
    const saved = this.#memento.get<PersistentExtensionState>(STATE_KEY);
    return saved?.schemaVersion === 1 ? saved : emptyState();
  }

  deviceCredential(): PromiseLike<string | undefined> {
    return this.#secrets.get(DEVICE_CREDENTIAL_KEY);
  }

  async saveEnrollment(
    connection: DeviceConnection,
    credential: string
  ): Promise<PersistentExtensionState> {
    if (credential.trim().length === 0) {
      throw new Error("The service returned an empty device credential.");
    }
    await this.#secrets.store(DEVICE_CREDENTIAL_KEY, credential);
    const state: PersistentExtensionState = { schemaVersion: 1, connection };
    await this.#memento.update(STATE_KEY, state);
    return state;
  }

  async saveProject(project: LinkedProject): Promise<PersistentExtensionState> {
    const current = this.load();
    if (current.connection === undefined) {
      throw new Error("Connect the device before linking a project.");
    }
    const state: PersistentExtensionState = {
      schemaVersion: 1,
      connection: current.connection,
      project
    };
    await this.#memento.update(STATE_KEY, state);
    return state;
  }

  async saveCapture(
    capture: PersistentExtensionState["capture"]
  ): Promise<PersistentExtensionState> {
    const current = this.load();
    const state: PersistentExtensionState =
      capture === undefined
        ? {
            schemaVersion: 1,
            ...(current.connection === undefined ? {} : { connection: current.connection }),
            ...(current.project === undefined ? {} : { project: current.project })
          }
        : {
            schemaVersion: 1,
            ...(current.connection === undefined ? {} : { connection: current.connection }),
            ...(current.project === undefined ? {} : { project: current.project }),
            capture
          };
    await this.#memento.update(STATE_KEY, state);
    return state;
  }

  async clear(): Promise<void> {
    await this.#secrets.delete(DEVICE_CREDENTIAL_KEY);
    await this.#memento.update(STATE_KEY, emptyState());
  }
}
