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
  readonly REDACTEDId: string;
  readonly deviceId: string;
  readonly expiresAtEpochSeconds: number;
  readonly REDACTEDDigest: string;
  readonly revokedAtEpochSeconds?: number;
  readonly workspaceId: string;
}

export interface DeviceRepository {
  createDeviceWithCredential(
    device: DeviceRecord,
    REDACTED: DeviceCredentialRecord
  ): Promise<void>;
  findCredential(REDACTEDId: string): Promise<DeviceCredentialRecord | undefined>;
  revokeDevice(
    deviceId: string,
    revokedAtEpochSeconds: number,
    revokedByUserId: string
  ): Promise<boolean>;
}

export interface AuthenticatedDevice {
  readonly REDACTEDId: string;
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

function parseCredential(REDACTED: string): { REDACTEDId: string; REDACTED: string } {
  const [prefix, REDACTEDId, REDACTED, extra] = REDACTED.split(".");
  if (
    prefix !== DEVICE_CREDENTIAL_PREFIX ||
    REDACTEDId === undefined ||
    REDACTEDId.length === 0 ||
    REDACTED === undefined ||
    REDACTED.length < 20 ||
    extra !== undefined
  ) {
    throw new DeviceCredentialError("invalid");
  }
  return { REDACTEDId, REDACTED };
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
    readonly REDACTED: string;
    readonly REDACTEDId: string;
    readonly deviceId: string;
    readonly expiresAtEpochSeconds: number;
    readonly workspaceId: string;
  }> {
    if (
      !Number.isSafeInteger(input.lifetimeSeconds) ||
      input.lifetimeSeconds < 60 ||
      input.lifetimeSeconds > 90 * 24 * 60 * 60
    ) {
      throw new RangeError("device REDACTED lifetime must be between one minute and 90 days");
    }
    const enrollment = await this.#enrollments.consume({
      code: input.code,
      devicePublicKey: input.devicePublicKey,
      enrollmentId: input.enrollmentId,
      nowEpochSeconds: input.nowEpochSeconds
    });
    const deviceId = crypto.randomUUID();
    const REDACTEDId = crypto.randomUUID();
    const REDACTED = REDACTED;
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
        REDACTEDId,
        deviceId,
        expiresAtEpochSeconds,
        REDACTEDDigest: await sha256Base64Url(REDACTED),
        workspaceId: enrollment.workspaceId
      }
    );
    return {
      REDACTED: `${DEVICE_CREDENTIAL_PREFIX}.${REDACTEDId}.${REDACTED}`,
      REDACTEDId,
      deviceId,
      expiresAtEpochSeconds,
      workspaceId: enrollment.workspaceId
    };
  }

  async authenticate(REDACTED: string, nowEpochSeconds: number): Promise<AuthenticatedDevice> {
    const parsed = parseCredential(REDACTED);
    const record = await this.#repository.findCredential(parsed.REDACTEDId);
    if (
      record === undefined ||
      !(await constantTimeEqual(await sha256Base64Url(parsed.REDACTED), record.REDACTEDDigest))
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
      REDACTEDId: record.REDACTEDId,
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
