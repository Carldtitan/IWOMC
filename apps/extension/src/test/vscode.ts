type CommandHandler = (...arguments_: readonly unknown[]) => unknown;

interface MessageCall {
  readonly arguments: readonly unknown[];
  readonly message: string;
}

interface QuickPickCall {
  readonly items: readonly unknown[];
  readonly options: unknown;
}

class TestDisposable {
  readonly #dispose: () => void;

  constructor(dispose: () => void) {
    this.#dispose = dispose;
  }

  dispose(): void {
    this.#dispose();
  }
}

export class ThemeColor {
  readonly id: string;

  constructor(id: string) {
    this.id = id;
  }
}

export class Uri {
  readonly fsPath: string;
  readonly #value: string;

  private constructor(value: string, fsPath: string) {
    this.#value = value;
    this.fsPath = fsPath;
  }

  static file(fsPath: string): Uri {
    return new Uri(`file://${fsPath}`, fsPath);
  }

  static parse(value: string, strict?: boolean): Uri {
    void strict;
    let fsPath = value;
    try {
      const parsed = new URL(value);
      fsPath = decodeURIComponent(parsed.pathname);
    } catch {
      // VS Code also accepts URI-like values that the WHATWG parser rejects.
    }
    return new Uri(value, fsPath);
  }

  toString(): string {
    return this.#value;
  }
}

class TestStatusBarItem {
  backgroundColor: ThemeColor | undefined;
  command: string | undefined;
  disposed = false;
  name = "";
  shown = false;
  text = "";
  tooltip: string | undefined;

  dispose(): void {
    this.disposed = true;
  }

  show(): void {
    this.shown = true;
  }
}

const commandHandlers = new Map<string, CommandHandler>();
const configuration = new Map<string, unknown>();
const informationMessages: MessageCall[] = [];
const inputBoxCalls: unknown[] = [];
const inputBoxResponses: (string | undefined)[] = [];
const openedUris: Uri[] = [];
const quickPickCalls: QuickPickCall[] = [];
const quickPickResponses: unknown[] = [];
const statusBarItems: TestStatusBarItem[] = [];
const warningMessages: MessageCall[] = [];
const warningResponses: (string | undefined)[] = [];
const errorMessages: MessageCall[] = [];

export const commands = {
  async executeCommand(command: string, ...arguments_: readonly unknown[]): Promise<unknown> {
    const handler = commandHandlers.get(command);
    if (handler === undefined) {
      throw new Error(`No test command registered for ${command}.`);
    }
    return await handler(...arguments_);
  },

  registerCommand(command: string, handler: CommandHandler): TestDisposable {
    commandHandlers.set(command, handler);
    return new TestDisposable(() => {
      commandHandlers.delete(command);
    });
  }
};

export const env = {
  openExternal(uri: Uri): Promise<boolean> {
    openedUris.push(uri);
    return Promise.resolve(true);
  },
  remoteName: undefined as string | undefined
};

export const ProgressLocation = {
  Notification: 15
} as const;

export const StatusBarAlignment = {
  Left: 1,
  Right: 2
} as const;

export const window = {
  createStatusBarItem(alignment?: number, priority?: number): TestStatusBarItem {
    void alignment;
    void priority;
    const item = new TestStatusBarItem();
    statusBarItems.push(item);
    return item;
  },

  showErrorMessage(message: string, ...arguments_: readonly unknown[]): Promise<undefined> {
    errorMessages.push({ arguments: arguments_, message });
    return Promise.resolve(undefined);
  },

  showInformationMessage(
    message: string,
    ...arguments_: readonly unknown[]
  ): Promise<string | undefined> {
    informationMessages.push({ arguments: arguments_, message });
    return Promise.resolve(undefined);
  },

  showInputBox(options?: unknown): Promise<string | undefined> {
    inputBoxCalls.push(options);
    return Promise.resolve(inputBoxResponses.shift());
  },

  showQuickPick<T>(items: readonly T[], options?: unknown): Promise<T | undefined> {
    quickPickCalls.push({ items, options });
    return Promise.resolve(quickPickResponses.shift() as T | undefined);
  },

  showWarningMessage(
    message: string,
    ...arguments_: readonly unknown[]
  ): Promise<string | undefined> {
    warningMessages.push({ arguments: arguments_, message });
    return Promise.resolve(warningResponses.shift());
  },

  async withProgress<T>(_options: unknown, task: () => T | PromiseLike<T>): Promise<T> {
    return await task();
  }
};

export const workspace = {
  getConfiguration(section: string): {
    get<T>(property: string, defaultValue: T): T;
  } {
    return {
      get<T>(property: string, defaultValue: T): T {
        const key = `${section}.${property}`;
        return configuration.has(key) ? (configuration.get(key) as T) : defaultValue;
      }
    };
  },
  workspaceFolders: undefined as readonly { readonly uri: Uri }[] | undefined
};

export const testVscode = {
  commandHandlers,
  errorMessages,
  informationMessages,
  inputBoxCalls,
  openedUris,
  quickPickCalls,
  statusBarItems,
  warningMessages,

  queueInputBoxResponse(response: string | undefined): void {
    inputBoxResponses.push(response);
  },

  queueQuickPickResponse(response: unknown): void {
    quickPickResponses.push(response);
  },

  queueWarningResponse(response: string | undefined): void {
    warningResponses.push(response);
  },

  reset(): void {
    commandHandlers.clear();
    configuration.clear();
    informationMessages.splice(0);
    inputBoxCalls.splice(0);
    inputBoxResponses.splice(0);
    openedUris.splice(0);
    quickPickCalls.splice(0);
    quickPickResponses.splice(0);
    statusBarItems.splice(0);
    warningMessages.splice(0);
    warningResponses.splice(0);
    errorMessages.splice(0);
    env.remoteName = undefined;
    workspace.workspaceFolders = undefined;
  },

  setConfiguration(key: string, value: unknown): void {
    configuration.set(key, value);
  },

  setWorkspaceFolder(fsPath: string): void {
    workspace.workspaceFolders = [{ uri: Uri.file(fsPath) }];
  }
};
