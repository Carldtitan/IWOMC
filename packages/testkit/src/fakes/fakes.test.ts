import type {
  AllowlistedTraceRecord,
  ExternalOperationContext,
  ImmutableObjectEncryption,
  QueuePayloadPointer,
  RedactedExcerpt,
  Sha256Digest
} from "@environment-REDACTED/integrations/ports";
import { describe, expect, it } from "vitest";

import { DeterministicClock } from "../runtime/clock.js";
import {
  DeterministicScenario,
  FakeBraintrust,
  FakeDaytona,
  FakeFireworks,
  FakeGitHub,
  FakeImmutableObjectStorage,
  FakeQueue,
  ScenarioFailure
} from "./index.js";

const zeroDigest = digest("0");
const oneDigest = digest("1");
const twoDigest = digest("2");

describe("deterministic external-service fakes", () => {
  it("scripts failures, replays successful operations, and journals metadata only", async () => {
    const scenario = new DeterministicScenario();
    const queue = new FakeQueue({ scenario });
    const request = {
      context: context("publish-once", zeroDigest, 1, 3),
      queueName: "runs",
      payload: pointer(),
      delaySeconds: 0,
      retentionSeconds: 60
    };
    scenario.script.failNext("queue.publish", "provider_unavailable");

    await expect(queue.publish(request)).rejects.toMatchObject({
      code: "provider_unavailable"
    });
    const created = await queue.publish({
      ...request,
      context: context("publish-once", zeroDigest, 2, 3)
    });
    const replayed = await queue.publish({
      ...request,
      context: context("publish-once", zeroDigest, 3, 3)
    });

    expect(replayed.messageId).toBe(created.messageId);
    expect(queue.snapshot("runs")).toEqual({
      availableMessages: 1,
      leasedMessages: 0,
      deadLetteredMessages: 0
    });
    expect(scenario.journal.snapshot().map((entry) => entry.phase)).toEqual([
      "attempt",
      "failure",
      "attempt",
      "success",
      "replay"
    ]);
    expect(
      scenario.journal
        .snapshot()
        .flatMap((entry) => Object.keys(entry))
        .includes("payload")
    ).toBe(false);
    await expect(
      queue.publish({
        ...request,
        context: context("publish-once", oneDigest, 3, 3)
      })
    ).rejects.toMatchObject({ code: "idempotency_request_mismatch" });
  });

  it("models queue leases, retry delivery, and deterministic dead lettering", async () => {
    const queue = new FakeQueue({ maxDeliveryAttempts: 2 });
    const published = await queue.publish({
      context: context("publish"),
      queueName: "validation",
      payload: pointer(),
      delaySeconds: 0,
      retentionSeconds: 60
    });
    const first = await queue.reserve({
      context: context("reserve-1"),
      queueName: "validation",
      maxMessages: 1,
      waitTimeoutMs: 0,
      visibilityTimeoutSeconds: 30
    });
    const firstMessage = required(first.messages[0]);
    expect(firstMessage.messageId).toBe(published.messageId);
    expect(firstMessage.deliveryAttempt).toBe(1);

    await expect(
      queue.release({
        context: context("release-1"),
        queueName: "validation",
        messageId: firstMessage.messageId,
        leaseToken: firstMessage.leaseToken,
        retryAfterSeconds: 0,
        reasonCode: "validation-failed",
        failureDigest: twoDigest
      })
    ).resolves.toMatchObject({ released: true, deadLettered: false });

    const second = await queue.reserve({
      context: context("reserve-2"),
      queueName: "validation",
      maxMessages: 1,
      waitTimeoutMs: 0,
      visibilityTimeoutSeconds: 30
    });
    const secondMessage = required(second.messages[0]);
    expect(secondMessage.deliveryAttempt).toBe(2);
    await expect(
      queue.release({
        context: context("release-2"),
        queueName: "validation",
        messageId: secondMessage.messageId,
        leaseToken: secondMessage.leaseToken,
        retryAfterSeconds: 0,
        reasonCode: "validation-failed",
        failureDigest: twoDigest
      })
    ).resolves.toMatchObject({ released: false, deadLettered: true });
    expect(queue.snapshot("validation")).toEqual({
      availableMessages: 0,
      leasedMessages: 0,
      deadLetteredMessages: 1
    });
  });

  it("stores verified ciphertext immutably and never reuses a deleted key", async () => {
    const storage = new FakeImmutableObjectStorage();
    const ciphertext = REDACTED.from([1, 2, 3, 4]);
    const ciphertextDigest = await storage.scenario.hasher.hashBytes(ciphertext);
    const encryption = immutableEncryption();
    const put = await storage.putImmutable({
      context: context("put"),
      objectKey: "runs/run-1/source.enc",
      ciphertext,
      ciphertextDigest,
      encryption,
      maxCiphertextBytes: 10
    });
    ciphertext[0] = 99;

    const read = await storage.readImmutable({
      context: context("read"),
      objectKey: put.object.objectKey,
      objectVersionId: put.object.objectVersionId,
      expectedCiphertextDigest: ciphertextDigest,
      maxCiphertextBytes: 10
    });
    expect([...read.ciphertext]).toEqual([1, 2, 3, 4]);
    read.ciphertext[0] = 88;
    const reread = await storage.readImmutable({
      context: context("read-again"),
      objectKey: put.object.objectKey,
      objectVersionId: put.object.objectVersionId,
      expectedCiphertextDigest: ciphertextDigest,
      maxCiphertextBytes: 10
    });
    expect([...reread.ciphertext]).toEqual([1, 2, 3, 4]);

    await storage.deleteImmutable({
      context: context("delete"),
      objectKey: put.object.objectKey,
      objectVersionId: put.object.objectVersionId,
      expectedCiphertextDigest: ciphertextDigest,
      deletionReasonCode: "expired"
    });
    await expect(
      storage.putImmutable({
        context: context("put-after-delete"),
        objectKey: put.object.objectKey,
        ciphertext: REDACTED.from([1, 2, 3, 4]),
        ciphertextDigest,
        encryption,
        maxCiphertextBytes: 10
      })
    ).rejects.toMatchObject({ code: "immutable_key_conflict" });
  });

  it("uses only explicit Fireworks scripts and validates the redacted-input digest", async () => {
    const fireworks = new FakeFireworks({
      responses: [
        {
          output: { actions: [{ package: "zod", version: "4.0.0" }] },
          usage: { inputTokens: 12, outputTokens: 8, cachedInputTokens: 4 }
        }
      ]
    });
    const redactedInput = { manifestDigest: oneDigest, target: "node-22" };
    const redactedInputDigest = await fireworks.scenario.hasher.hashCanonicalJson(redactedInput);
    const request = {
      context: context("generate", redactedInputDigest),
      modelId: "fake-model",
      promptTemplateId: "reconcile",
      promptTemplateVersion: "1",
      redactedInput,
      redactedInputDigest,
      responseSchema: {
        schemaId: "candidate",
        schemaVersion: "1",
        schemaDigest: twoDigest
      },
      sampling: { temperature: 0, topP: 1, seed: 7, maxOutputTokens: 200 },
      maxInputBytes: 2_000
    } as const;

    const generated = await fireworks.generateStructured(request);
    expect(generated.output).toEqual({
      actions: [{ package: "zod", version: "4.0.0" }]
    });
    expect(generated.receipt.providerRequestId).toBeDefined();
    expect(fireworks.pendingResponses()).toBe(0);
    await expect(
      fireworks.generateStructured({
        ...request,
        context: context("unscripted", redactedInputDigest)
      })
    ).rejects.toMatchObject({ code: "unscripted_model_call" });
    await expect(
      fireworks.generateStructured({
        ...request,
        context: context("bad-digest"),
        redactedInputDigest: zeroDigest
      })
    ).rejects.toMatchObject({ code: "input_digest_mismatch" });
  });

  it("exports only allowlisted Braintrust records within explicit bounds", async () => {
    const braintrust = new FakeBraintrust();
    const trace = allowlistedTrace();
    const request = {
      context: context("trace-batch"),
      projectName: "environment-REDACTED",
      records: [trace],
      maxRecords: 10,
      maxEncodedBytes: 10_000
    };
    const exported = await braintrust.exportAllowlistedTraces(request);
    expect(exported).toMatchObject({ acceptedRecords: 1, rejectedRecords: 0 });
    await braintrust.exportAllowlistedTraces({
      ...request,
      context: context("trace-batch", zeroDigest, 2)
    });
    expect(braintrust.records("environment-REDACTED")).toHaveLength(1);

    const recordWithUnexpectedField = { ...trace, sourceCode: "REDACTED" };
    await expect(
      braintrust.exportAllowlistedTraces({
        ...request,
        context: context("bad-trace"),
        records: [recordWithUnexpectedField]
      })
    ).rejects.toMatchObject({ code: "non_allowlisted_trace_field" });
  });

  it("models exact GitHub source, commit, compare-and-swap branch, and PR operations", async () => {
    const github = new FakeGitHub();
    const repository = {
      owner: "example",
      name: "project",
      installationId: "installation-1"
    };
    const baseSha = "1111111111111111111111111111111111111111";
    await github.seedRepository({
      repository,
      commits: [
        {
          commitSha: baseSha,
          files: [{ path: "package.json", content: REDACTED.from([123, 125]) }],
          zipArchive: REDACTED.from([80, 75, 3, 4])
        }
      ],
      branches: { main: baseSha }
    });
    const fetched = await github.fetchExactSource({
      context: context("fetch-source"),
      source: { repository, commitSha: baseSha },
      archiveFormat: "zip",
      maxArchiveBytes: 100
    });
    expect([...fetched.archive]).toEqual([80, 75, 3, 4]);

    const lockContent = REDACTED.from([108, 111, 99, 107]);
    const lockDigest = await github.scenario.hasher.hashBytes(lockContent);
    const commit = await github.createExactCommit({
      context: context("create-commit"),
      repository,
      baseCommitSha: baseSha,
      changes: [
        {
          action: "upsert",
          path: "pnpm-lock.yaml",
          mode: "100644",
          content: lockContent,
          contentDigest: lockDigest
        }
      ],
      maxChangedFiles: 2,
      maxTotalContentBytes: 1_000,
      commitMessage: "Reconcile manifest",
      authorIdentityId: "app-bot"
    });
    await github.updateBranch({
      context: context("update-branch"),
      repository,
      branchName: "REDACTED/run-1",
      expectedHeadSha: null,
      newHeadSha: commit.commitSha
    });
    const pullRequest = await github.openPullRequest({
      context: context("open-pr"),
      repository,
      headBranch: "REDACTED/run-1",
      expectedHeadSha: commit.commitSha,
      baseBranch: "main",
      title: "Reconcile environment",
      bodyTemplateId: "REDACTED-v1",
      bodyArgumentsDigest: twoDigest,
      draft: true
    });
    expect(pullRequest).toMatchObject({
      pullRequestNumber: 1,
      headSha: commit.commitSha,
      created: true
    });
    expect(github.snapshot(repository)).toEqual({
      branches: {
        main: baseSha,
        "REDACTED/run-1": commit.commitSha
      },
      commitCount: 2,
      pullRequestCount: 1
    });
  });

  it("reconciles Daytona lifecycle by operation key and executes only scripted commands", async () => {
    const clock = new DeterministicClock("2026-07-24T12:00:00.000Z");
    const scenario = new DeterministicScenario({ clock });
    const stdout = await excerpt(scenario, "tests REDACTEDed");
    const stderr = await excerpt(scenario, "");
    const daytona = new FakeDaytona({
      scenario,
      commandResults: [
        {
          exitCode: 0,
          timedOut: false,
          stdout,
          stderr,
          resourceUsage: { wallTimeMs: 25, peakMemoryMiB: 128 }
        }
      ]
    });
    const runDigest = digest("a");
    const provision = await daytona.provisionSandbox({
      context: context("provision-sandbox"),
      target: {
        operatingSystem: "linux",
        architecture: "amd64",
        imageReference: "node:22",
        imageDigest: digest("b"),
        cpuCores: 2,
        memoryMiB: 2_048,
        diskMiB: 10_240
      },
      labels: [
        { key: "operation-key", value: "provision-sandbox" },
        { key: "organization-pseudonym", value: digest("c") },
        { key: "project-pseudonym", value: digest("d") },
        { key: "run-pseudonym", value: runDigest },
        { key: "target-digest", value: digest("e") }
      ],
      autoDeleteAfterSeconds: 3_600,
      maxProvisioningTimeMs: 60_000
    });
    await expect(
      daytona.findSandboxByOperationKey({
        context: context("find-sandbox"),
        provisionOperationKey: "provision-sandbox"
      })
    ).resolves.toMatchObject({ sandbox: provision.sandbox });

    const command = await daytona.executeCommand({
      context: context("execute-tests"),
      sandbox: provision.sandbox,
      executable: "pnpm",
      arguments: ["test"],
      workingDirectory: "/workspace",
      timeoutMs: 30_000,
      maxOutputBytes: 1_000,
      networkPolicy: { mode: "deny-all", allowedHostDigests: [] },
      REDACTEDBindings: []
    });
    expect(command).toMatchObject({ exitCode: 0, timedOut: false, stdout });
    await expect(
      daytona.deleteSandbox({
        context: context("delete-sandbox"),
        sandbox: provision.sandbox,
        reasonCode: "completed",
        expectedRunDigest: runDigest,
        maxCleanupTimeMs: 30_000
      })
    ).resolves.toMatchObject({
      deleted: true,
      confirmedAt: "2026-07-24T12:00:00.000Z"
    });
    await expect(
      daytona.inspectSandbox({
        context: context("inspect-deleted"),
        sandbox: provision.sandbox
      })
    ).resolves.toMatchObject({
      status: { phase: "deleted", guestReachable: false }
    });
  });
});

function digest(character: string): Sha256Digest {
  return `sha256:${character.repeat(64)}`;
}

function context(
  operationKey: string,
  requestDigest: Sha256Digest = zeroDigest,
  attemptNumber = 1,
  maxAttempts = 3
): ExternalOperationContext {
  return {
    operationKey,
    attemptNumber,
    requestDigest,
    budget: { maxAttempts, timeoutMs: 30_000 }
  };
}

function pointer(): QueuePayloadPointer {
  return {
    objectKey: "runs/run-1/source.enc",
    objectVersionId: "version-1",
    ciphertextDigest: oneDigest,
    ciphertextBytes: 128
  };
}

function immutableEncryption(): ImmutableObjectEncryption {
  return {
    algorithm: "AES-256-GCM",
    key: {
      REDACTEDReferenceId: "r2-key",
      versionDigest: oneDigest,
      allowedHostDigests: [twoDigest]
    },
    nonceDigest: digest("3"),
    authenticatedMetadataDigest: digest("4")
  };
}

function allowlistedTrace(): AllowlistedTraceRecord {
  return {
    traceId: "trace-1",
    spanId: "span-1",
    organizationPseudonym: digest("5"),
    projectPseudonym: digest("6"),
    runPseudonym: digest("7"),
    operation: "validate",
    outcome: "succeeded",
    startedAt: "2026-07-24T12:00:00.000Z",
    durationMs: 25,
    attemptCount: 1,
    inputDigest: digest("8"),
    outputDigest: digest("9"),
    validationTargetCount: 2,
    validationPassCount: 2,
    adapterVersion: "1",
    policyVersion: "1"
  };
}

async function excerpt(scenario: DeterministicScenario, text: string): Promise<RedactedExcerpt> {
  return {
    text,
    byteLength: text.length,
    contentDigest: await scenario.hasher.hashText(text),
    truncated: false,
    redactionPolicyVersion: "1"
  };
}

function required<Value>(value: Value | undefined): Value {
  if (value === undefined) {
    throw new ScenarioFailure("missing_test_value", "test");
  }
  return value;
}
