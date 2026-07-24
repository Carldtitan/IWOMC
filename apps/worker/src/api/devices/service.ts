import type { DeviceEnrollmentService } from "../device-enrollments/service.js";
import { constantTimeEqual, randomToken, sha256Base64Url } from "../../security/crypto.js";

const DEVICE_CREDENTIAL_PREFIX = "er_device_v1";

export interface DeviceRecord {
  readonly createdAtEpochSeconds: number;
  readonly deviceId: string;
  readonly publicSigningKey: string;
  readonly revokedAtEpochSeconds?: number;
  readonly workspaceId: string;
}

export interface DeviceCredentialRecord {
  readonly createdAtEpochSeconds: number;
  readonly credentialId: string;
  readonly deviceId: string;
  readonly expiresAtEpochSeconds: number;
  readonly secretDigest: string;
  readonly revokedAtEpochSeconds?: number;
  readonly workspaceId: string;
}

export interface DeviceRepository {
  createDeviceWithCredential(
    device: DeviceRecord,
    credential: DeviceCredentialRecord
  ): Promise<void>;
  findCredential(credentialId: string): Promise<DeviceCredentialRecord | undefined>;
  revokeDevice(
    deviceId: string,
    revokedAtEpochSeconds: number,
    revokedByUserId: string
  ): Promise<boolean>;
}

export interface AuthenticatedDevice {
  readonly credentialId: string;
  readonly deviceId: string;
  readonly workspaceId: string;
}

export class DeviceCredentialError extends Error {
  readonly code: "invalid" | "expired" | "revoked";

  constructor(code: DeviceCredentialError["code"]) {
    super(code);
    this.name = "DeviceCredentialError";
    this.code = code;
  }
}

function parseCredential(credential: string): { credentialId: string; secret: string } {
  const [prefix, credentialId, secret, extra] = credential.split(".");
  if (
    prefix !== DEVICE_CREDENTIAL_PREFIX ||
    credentialId === undefined ||
    credentialId.length === 0 ||
    secret === undefined ||
    secret.length < 20 ||
    extra !== undefined
  ) {
    throw new DeviceCredentialError("invalid");
  }
  return { credentialId, secret };
}

export class DeviceService {
  readonly #enrollments: DeviceEnrollmentService;
  readonly #repository: DeviceRepository;

  constructor(enrollments: DeviceEnrollmentService, repository: DeviceRepository) {
    this.#enrollments = enrollments;
    this.#repository = repository;
  }

  async register(input: {
    readonly code: string;
    readonly devicePublicKey: string;
    readonly enrollmentId: string;
    readonly lifetimeSeconds: number;
    readonly nowEpochSeconds: number;
  }): Promise<{
    readonly credential: string;
    readonly credentialId: string;
    readonly deviceId: string;
    readonly expiresAtEpochSeconds: number;
    readonly workspaceId: string;
  }> {
    if (
      !Number.isSafeInteger(input.lifetimeSeconds) ||
      input.lifetimeSeconds < 60 ||
      input.lifetimeSeconds > 90 * 24 * 60 * 60
    ) {
      throw new RangeError("device credential lifetime must be between one minute and 90 days");
    }
    const enrollment = await this.#enrollments.consume({
      code: input.code,
      devicePublicKey: input.devicePublicKey,
      enrollmentId: input.enrollmentId,
      nowEpochSeconds: input.nowEpochSeconds
    });
    const deviceId = crypto.randomUUID();
    const credentialId = crypto.randomUUID();
    const secret = randomToken();
    const expiresAtEpochSeconds = input.nowEpochSeconds + input.lifetimeSeconds;
    await this.#repository.createDeviceWithCredential(
      {
        createdAtEpochSeconds: input.nowEpochSeconds,
        deviceId,
        publicSigningKey: enrollment.devicePublicKey,
        workspaceId: enrollment.workspaceId
      },
      {
        createdAtEpochSeconds: input.nowEpochSeconds,
        credentialId,
        deviceId,
        expiresAtEpochSeconds,
        secretDigest: await sha256Base64Url(secret),
        workspaceId: enrollment.workspaceId
      }
    );
    return {
      credential: `${DEVICE_CREDENTIAL_PREFIX}.${credentialId}.${secret}`,
      credentialId,
      deviceId,
      expiresAtEpochSeconds,
      workspaceId: enrollment.workspaceId
    };
  }

  async authenticate(credential: string, nowEpochSeconds: number): Promise<AuthenticatedDevice> {
    const parsed = parseCredential(credential);
    const record = await this.#repository.findCredential(parsed.credentialId);
    if (
      record === undefined ||
      !(await constantTimeEqual(await sha256Base64Url(parsed.secret), record.secretDigest))
    ) {
      throw new DeviceCredentialError("invalid");
    }
    if (record.revokedAtEpochSeconds !== undefined) {
      throw new DeviceCredentialError("revoked");
    }
    if (record.expiresAtEpochSeconds < nowEpochSeconds) {
      throw new DeviceCredentialError("expired");
    }
    return {
      credentialId: record.credentialId,
      deviceId: record.deviceId,
      workspaceId: record.workspaceId
    };
  }

  async revoke(input: {
    readonly deviceId: string;
    readonly nowEpochSeconds: number;
    readonly revokedByUserId: string;
  }): Promise<void> {
    if (
      !(await this.#repository.revokeDevice(
        input.deviceId,
        input.nowEpochSeconds,
        input.revokedByUserId
      ))
    ) {
      throw new DeviceCredentialError("invalid");
    }
  }
}
