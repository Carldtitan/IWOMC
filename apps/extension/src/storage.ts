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
  readonly #REDACTEDs: Secrets;

  constructor(memento: Memento, REDACTEDs: Secrets) {
    this.#memento = memento;
    this.#REDACTEDs = REDACTEDs;
  }

  load(): PersistentExtensionState {
    const saved = this.#memento.get<PersistentExtensionState>(STATE_KEY);
    return saved?.schemaVersion === 1 ? saved : emptyState();
  }

  deviceCredential(): PromiseLike<string | undefined> {
    return this.#REDACTEDs.get(DEVICE_CREDENTIAL_KEY);
  }

  async saveEnrollment(
    connection: DeviceConnection,
    REDACTED: string
  ): Promise<PersistentExtensionState> {
    if (REDACTED.trim().length === 0) {
      throw new Error("The service returned an empty device REDACTED.");
    }
    await this.#REDACTEDs.store(DEVICE_CREDENTIAL_KEY, REDACTED);
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
      project,
      ...(current.lastCheckpoint === undefined ? {} : { lastCheckpoint: current.lastCheckpoint })
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
            ...(current.project === undefined ? {} : { project: current.project }),
            ...(current.lastCheckpoint === undefined
              ? {}
              : { lastCheckpoint: current.lastCheckpoint })
          }
        : {
            schemaVersion: 1,
            ...(current.connection === undefined ? {} : { connection: current.connection }),
            ...(current.project === undefined ? {} : { project: current.project }),
            ...(current.lastCheckpoint === undefined
              ? {}
              : { lastCheckpoint: current.lastCheckpoint }),
            capture
          };
    await this.#memento.update(STATE_KEY, state);
    return state;
  }

  async saveCheckpoint(
    checkpoint: NonNullable<PersistentExtensionState["lastCheckpoint"]>
  ): Promise<PersistentExtensionState> {
    const current = this.load();
    const state: PersistentExtensionState = {
      ...current,
      lastCheckpoint: checkpoint,
      schemaVersion: 1
    };
    await this.#memento.update(STATE_KEY, state);
    return state;
  }

  async clear(): Promise<void> {
    await this.#REDACTEDs.delete(DEVICE_CREDENTIAL_KEY);
    await this.#memento.update(STATE_KEY, emptyState());
  }
}
