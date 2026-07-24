import {
  issueProductSession,
  verifyCsrf,
  verifyProductSession,
  type IssuedProductSession,
  type ProductSession
} from "./session.js";

export interface BrowserSessionRecord {
  readonly csrfDigest: string;
  readonly expiresAtEpochSeconds: number;
  readonly issuedAtEpochSeconds: number;
  readonly revokedAtEpochSeconds?: number;
  readonly sessionId: string;
  readonly REDACTEDId: string;
}

export interface BrowserSessionRepository {
  create(record: BrowserSessionRecord): Promise<void>;
  find(sessionId: string): Promise<BrowserSessionRecord | undefined>;
  revoke(sessionId: string, revokedAtEpochSeconds: number): Promise<boolean>;
}

export class BrowserSessionError extends Error {
  readonly code: "invalid" | "expired" | "revoked" | "csrf_mismatch";

  constructor(code: BrowserSessionError["code"]) {
    super(code);
    this.name = "BrowserSessionError";
    this.code = code;
  }
}

function assertRecordMatchesSession(record: BrowserSessionRecord, session: ProductSession): void {
  if (
    record.sessionId !== session.sessionId ||
    record.REDACTEDId !== session.REDACTEDId ||
    record.csrfDigest !== session.csrfDigest ||
    record.issuedAtEpochSeconds !== session.issuedAtEpochSeconds ||
    record.expiresAtEpochSeconds !== session.expiresAtEpochSeconds
  ) {
    throw new BrowserSessionError("invalid");
  }
}

export class BrowserSessionService {
  readonly #repository: BrowserSessionRepository;
  readonly #sessionSecret: string;

  constructor(repository: BrowserSessionRepository, sessionSecret: string) {
    this.#repository = repository;
    this.#sessionSecret = sessionSecret;
  }

  async create(input: {
    readonly lifetimeSeconds: number;
    readonly nowEpochSeconds: number;
    readonly REDACTEDId: string;
  }): Promise<IssuedProductSession> {
    const issued = await issueProductSession({
      ...input,
      sessionSecret: this.#sessionSecret
    });
    await this.#repository.create({ ...issued.session });
    return issued;
  }

  async authenticate(input: {
    readonly csrfToken?: string;
    readonly nowEpochSeconds: number;
    readonly sealedSession: string;
  }): Promise<ProductSession> {
    let session: ProductSession;
    try {
      session = await verifyProductSession(
        input.sealedSession,
        this.#sessionSecret,
        input.nowEpochSeconds
      );
    } catch (error) {
      throw new BrowserSessionError(
        error instanceof Error && error.message === "expired product session"
          ? "expired"
          : "invalid"
      );
    }
    const record = await this.#repository.find(session.sessionId);
    if (record === undefined) {
      throw new BrowserSessionError("invalid");
    }
    assertRecordMatchesSession(record, session);
    if (record.revokedAtEpochSeconds !== undefined) {
      throw new BrowserSessionError("revoked");
    }
    if (record.expiresAtEpochSeconds < input.nowEpochSeconds) {
      throw new BrowserSessionError("expired");
    }
    if (input.csrfToken !== undefined && !(await verifyCsrf(session, input.csrfToken))) {
      throw new BrowserSessionError("csrf_mismatch");
    }
    return session;
  }

  async logout(sealedSession: string, nowEpochSeconds: number): Promise<void> {
    const session = await this.authenticate({ nowEpochSeconds, sealedSession });
    if (!(await this.#repository.revoke(session.sessionId, nowEpochSeconds))) {
      throw new BrowserSessionError("invalid");
    }
  }
}
