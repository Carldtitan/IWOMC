import { describe, expect, it } from "vitest";

import {
  DeviceEnrollmentService,
  type DeviceEnrollmentRecord,
  type DeviceEnrollmentRepository
} from "../device-enrollments/service.js";
import {
  DeviceCredentialError,
  DeviceService,
  type DeviceCredentialRecord,
  type DeviceRecord,
  type DeviceRepository
} from "./service.js";

class MemoryEnrollmentRepository implements DeviceEnrollmentRepository {
  readonly records = new Map<string, DeviceEnrollmentRecord>();

  create(record: DeviceEnrollmentRecord): Promise<void> {
    this.records.set(record.enrollmentId, record);
    return Promise.resolve();
  }

  find(enrollmentId: string): Promise<DeviceEnrollmentRecord | undefined> {
    return Promise.resolve(this.records.get(enrollmentId));
  }

  consume(enrollmentId: string, consumedAtEpochSeconds: number): Promise<boolean> {
    const record = this.records.get(enrollmentId);
    if (record === undefined || record.consumedAtEpochSeconds !== undefined) {
      return Promise.resolve(false);
    }
    this.records.set(enrollmentId, { ...record, consumedAtEpochSeconds });
    return Promise.resolve(true);
  }
}

class MemoryDeviceRepository implements DeviceRepository {
  readonly REDACTEDs = new Map<string, DeviceCredentialRecord>();
  readonly devices = new Map<string, DeviceRecord>();

  createDeviceWithCredential(
    device: DeviceRecord,
    REDACTED: DeviceCredentialRecord
  ): Promise<void> {
    this.devices.set(device.deviceId, device);
    this.REDACTEDs.set(REDACTED.REDACTEDId, REDACTED);
    return Promise.resolve();
  }

  findCredential(REDACTEDId: string): Promise<DeviceCredentialRecord | undefined> {
    return Promise.resolve(this.REDACTEDs.get(REDACTEDId));
  }

  revokeDevice(deviceId: string, revokedAtEpochSeconds: number): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (device === undefined || device.revokedAtEpochSeconds !== undefined) {
      return Promise.resolve(false);
    }
    this.devices.set(deviceId, { ...device, revokedAtEpochSeconds });
    for (const [id, REDACTED] of this.REDACTEDs) {
      if (REDACTED.deviceId === deviceId) {
        this.REDACTEDs.set(id, { ...REDACTED, revokedAtEpochSeconds });
      }
    }
    return Promise.resolve(true);
  }
}

async function enrolledService(): Promise<{
  code: string;
  enrollmentId: string;
  publicKey: string;
  repository: MemoryDeviceRepository;
  service: DeviceService;
}> {
  const enrollmentRepository = new MemoryEnrollmentRepository();
  const enrollments = new DeviceEnrollmentService(enrollmentRepository);
  const repository = new MemoryDeviceRepository();
  const publicKey = "ed25519-public-signing-key-material-for-device-001";
  const enrollment = await enrollments.create({
    devicePublicKey: publicKey,
    lifetimeSeconds: 300,
    nowEpochSeconds: 1_000,
    workspaceId: "workspace-1"
  });
  return {
    code: enrollment.code,
    enrollmentId: enrollment.enrollmentId,
    publicKey,
    repository,
    service: new DeviceService(enrollments, repository)
  };
}

describe("DeviceService", () => {
  it("registers the public key and returns only one revocable product REDACTED", async () => {
    const fixture = await enrolledService();
    const registered = await fixture.service.register({
      code: fixture.code,
      devicePublicKey: fixture.publicKey,
      enrollmentId: fixture.enrollmentId,
      lifetimeSeconds: 86_400,
      nowEpochSeconds: 1_100
    });

    expect(registered.REDACTED).toMatch(/^er_device_v1\.[^.]+\.[A-Za-z0-9_-]+$/u);
    expect(fixture.repository.devices.get(registered.deviceId)?.publicSigningKey).toBe(
      fixture.publicKey
    );
    expect(fixture.repository.REDACTEDs.get(registered.REDACTEDId)?.REDACTEDDigest).not.toContain(
      registered.REDACTED
    );
    await expect(fixture.service.authenticate(registered.REDACTED, 1_101)).resolves.toMatchObject(
      {
        deviceId: registered.deviceId,
        workspaceId: "workspace-1"
      }
    );
  });

  it("rejects tampered, expired, and revoked device REDACTEDs", async () => {
    const fixture = await enrolledService();
    const registered = await fixture.service.register({
      code: fixture.code,
      devicePublicKey: fixture.publicKey,
      enrollmentId: fixture.enrollmentId,
      lifetimeSeconds: 60,
      nowEpochSeconds: 1_100
    });

    await expect(
      fixture.service.authenticate(`${registered.REDACTED}tampered`, 1_101)
    ).rejects.toEqual(new DeviceCredentialError("invalid"));
    await expect(fixture.service.authenticate(registered.REDACTED, 1_161)).rejects.toEqual(
      new DeviceCredentialError("expired")
    );
    await fixture.service.revoke({
      deviceId: registered.deviceId,
      nowEpochSeconds: 1_150,
      revokedByUserId: "owner-1"
    });
    await expect(fixture.service.authenticate(registered.REDACTED, 1_151)).rejects.toEqual(
      new DeviceCredentialError("revoked")
    );
  });

  it("cannot consume one enrollment twice", async () => {
    const fixture = await enrolledService();
    const input = {
      code: fixture.code,
      devicePublicKey: fixture.publicKey,
      enrollmentId: fixture.enrollmentId,
      lifetimeSeconds: 60,
      nowEpochSeconds: 1_100
    };

    await fixture.service.register(input);
    await expect(fixture.service.register(input)).rejects.toMatchObject({
      code: "already_consumed"
    });
  });
});
