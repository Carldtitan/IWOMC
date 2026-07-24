import { describe, expect, it, vi } from "vitest";

import type {
  AllowlistedTraceRecord,
  ExportAllowlistedTracesRequest,
  ExternalOperationContext,
  Sha256Digest
} from "../ports/index.js";
import { BraintrustHttpClient, exportAllowlistedTracesBestEffort } from "./http-client.js";

const digestA: Sha256Digest = `sha256:${"a".repeat(64)}`;
const digestB: Sha256Digest = `sha256:${"b".repeat(64)}`;
const digestC: Sha256Digest = `sha256:${"c".repeat(64)}`;
const projectId = "00000000-0000-4000-8000-000000000001";
const context: ExternalOperationContext = {
  attemptNumber: 1,
  budget: { maxAttempts: 1, timeoutMs: 1_000 },
  operationKey: "braintrust-export-1",
  requestDigest: digestA
};

function traceRecord(): AllowlistedTraceRecord {
  return {
    adapterVersion: "npm-native@1.0.0",
    attemptCount: 1,
    cachedInputTokens: 25,
    candidateCount: 1,
    durationMs: 125,
    inputDigest: digestA,
    inputTokens: 100,
    modelId: "accounts/fireworks/models/test",
    operation: "generate-candidate",
    organizationPseudonym: digestA,
    outcome: "succeeded",
    outputDigest: digestB,
    outputTokens: 50,
    policyVersion: "policy-v1",
    projectPseudonym: digestB,
    runPseudonym: digestC,
    spanId: "span-1",
    startedAt: "2026-07-24T12:00:00.000Z",
    traceId: "trace-1"
  };
}

function exportRequest(records: readonly AllowlistedTraceRecord[]): ExportAllowlistedTracesRequest {
  return {
    context,
    maxEncodedBytes: 32_000,
    maxRecords: 10,
    projectName: "environment-reconciler-test",
    records
  };
}

describe("Braintrust allowlisted HTTP exporter", () => {
  it("exports metadata-only project-log events and rejects runtime fields outside the allowlist", async () => {
    let capturedBody = "";
    const fetchImplementation: typeof fetch = (_input, init) => {
      if (typeof init?.body !== "string") {
        throw new Error("expected_string_body");
      }
      capturedBody = init.body;
      return Promise.resolve(
        new Response(JSON.stringify({ row_ids: ["row-1"] }), {
          headers: { "x-request-id": "braintrust-request-1" },
          status: 200
        })
      );
    };
    const client = new BraintrustHttpClient({
      apiKey: "braintrust-test-key",
      fetch: fetchImplementation,
      projectId
    });
    const recordWithRawEvidence = {
      ...traceRecord(),
      rawEvidence: "seeded-plaintext-secret-that-must-never-leave"
    } as AllowlistedTraceRecord;

    const result = await client.exportAllowlistedTraces(
      exportRequest([traceRecord(), recordWithRawEvidence])
    );

    expect(result).toMatchObject({ acceptedRecords: 1, rejectedRecords: 1 });
    expect(capturedBody).not.toContain("seeded-plaintext-secret-that-must-never-leave");
    expect(capturedBody).not.toContain("braintrust-test-key");

    const body = JSON.parse(capturedBody) as { events: Record<string, unknown>[] };
    expect(body.events).toHaveLength(1);
    expect(body.events[0]).not.toHaveProperty("input");
    expect(body.events[0]).not.toHaveProperty("output");
    expect(body.events[0]).not.toHaveProperty("error");
    expect(body.events[0]).toMatchObject({
      metadata: {
        adapter_version: "npm-native@1.0.0",
        input_digest: digestA,
        model_id: "accounts/fireworks/models/test",
        policy_version: "policy-v1",
        project_pseudonym: digestB
      },
      span_attributes: { name: "candidate.reasoning", type: "llm" }
    });
  });

  it("drops a secret-bearing allowlisted value without making a provider call", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(() =>
      Promise.resolve(new Response(JSON.stringify({ row_ids: [] }), { status: 200 }))
    );
    const client = new BraintrustHttpClient({
      apiKey: "braintrust-test-key",
      fetch: fetchImplementation,
      projectId
    });
    const secretRecord: AllowlistedTraceRecord = {
      ...traceRecord(),
      modelId: "api_key=seeded-secret-value-12345"
    };

    const result = await client.exportAllowlistedTraces(exportRequest([secretRecord]));

    expect(result).toMatchObject({ acceptedRecords: 0, rejectedRecords: 1 });
    expect(fetchImplementation).not.toHaveBeenCalled();
  });

  it("reports Braintrust failure independently without changing candidate truth", async () => {
    const candidateTruth = Object.freeze({
      findingId: "finding-1",
      nativeOperationKind: "npm_package_add",
      state: "accepted"
    });
    const fetchImplementation: typeof fetch = () =>
      Promise.resolve(new Response("", { status: 503 }));
    const client = new BraintrustHttpClient({
      apiKey: "braintrust-test-key",
      fetch: fetchImplementation,
      projectId
    });

    const delivery = await exportAllowlistedTracesBestEffort(
      client,
      exportRequest([traceRecord()])
    );

    expect(delivery).toEqual({ delivery: "deferred", failureClass: "provider" });
    expect(candidateTruth).toEqual({
      findingId: "finding-1",
      nativeOperationKind: "npm_package_add",
      state: "accepted"
    });
  });
});
