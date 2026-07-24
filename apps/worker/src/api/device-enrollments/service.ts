import { constantTimeEqual, randomToken, sha256Base64Url } from "../../security/crypto.js";

export interface DeviceEnrollmentRecord {
  readonly codeDigest: string;
  readonly consumedAtEpochSeconds?: number;
  readonly devicePublicKey: string;
  readonly enrollmentId: string;
  readonly expiresAtEpochSeconds: number;
  readonly revokedAtEpochSeconds?: number;
  readonly workspaceId: string;
}

export interface DeviceEnrollmentRepository {
  create(record: DeviceEnrollmentRecord): Promise<void>;
  find(enrollmentId: string): Promise<DeviceEnrollmentRecord | undefined>;
  consume(enrollmentId: string, consumedAtEpochSeconds: number): Promise<boolean>;
}

export interface CreatedDeviceEnrollment {
  readonly code: string;
  readonly enrollmentId: string;
  readonly expiresAtEpochSeconds: number;
}

export class DeviceEnrollmentError extends Error {
  readonly code: "invalid" | "expired" | "revoked" | "already_consumed";

  constructor(code: DeviceEnrollmentError["code"]) {
    super(code);
    this.name = "DeviceEnrollmentError";
    this.code = code;
  }
}

export class DeviceEnrollmentService {
  readonly #repository: DeviceEnrollmentRepository;

  constructor(repository: DeviceEnrollmentRepository) {
    this.#repository = repository;
  }

  async create(input: {
    readonly devicePublicKey: string;
    readonly lifetimeSeconds: number;
    readonly nowEpochSeconds: number;
    readonly workspaceId: string;
  }): Promise<CreatedDeviceEnrollment> {
    if (
      !Number.isSafeInteger(input.lifetimeSeconds) ||
      input.lifetimeSeconds < 60 ||
      input.lifetimeSeconds > 15 * 60
    ) {
      throw new RangeError("device enrollment lifetime must be between one and 15 minutes");
    }
    if (input.devicePublicKey.length < 32 || input.devicePublicKey.length > 4096) {
      throw new Error("device public key has an invalid length");
    }
    const code = randomToken(24);
    const enrollmentId = crypto.randomUUID();
    const expiresAtEpochSeconds = input.nowEpochSeconds + input.lifetimeSeconds;
    await this.#repository.create({
      codeDigest: await sha256Base64Url(code),
      devicePublicKey: input.devicePublicKey,
      enrollmentId,
      expiresAtEpochSeconds,
      workspaceId: input.workspaceId
    });
    return { code, enrollmentId, expiresAtEpochSeconds };
  }

  async consume(input: {
    readonly code: string;
    readonly devicePublicKey: string;
    readonly enrollmentId: string;
    readonly nowEpochSeconds: number;
  }): Promise<DeviceEnrollmentRecord> {
    const record = await this.#repository.find(input.enrollmentId);
    if (
      record === undefined ||
      !(await constantTimeEqual(await sha256Base64Url(input.code), record.codeDigest)) ||
      !(await constantTimeEqual(input.devicePublicKey, record.devicePublicKey))
    ) {
      throw new DeviceEnrollmentError("invalid");
    }
    if (record.revokedAtEpochSeconds !== undefined) {
      throw new DeviceEnrollmentError("revoked");
    }
    if (record.consumedAtEpochSeconds !== undefined) {
      throw new DeviceEnrollmentError("already_consumed");
    }
    if (record.expiresAtEpochSeconds < input.nowEpochSeconds) {
      throw new DeviceEnrollmentError("expired");
    }
    if (!(await this.#repository.consume(record.enrollmentId, input.nowEpochSeconds))) {
      throw new DeviceEnrollmentError("already_consumed");
    }
    return { ...record, consumedAtEpochSeconds: input.nowEpochSeconds };
  }
}
