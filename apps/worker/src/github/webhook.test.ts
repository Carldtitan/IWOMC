import { describe, expect, it, vi } from "vitest";

import {
  createGitHubWebhookSignature,
  handleGitHubWebhook,
  type GitHubWebhookDelivery,
  type GitHubWebhookDeliveryReservation,
  type GitHubWebhookMessage
} from "./webhook.js";

const REDACTED = "REDACTED";
const encoder = new TextEncoder();

async function webhookRequest(
  body: Readonly<Record<string, unknown>>,
  headers: { readonly delivery?: string; readonly event?: string; readonly signature?: string } = {}
): Promise<Request> {
  const raw = encoder.encode(JSON.stringify(body));
  return new Request("https://app.example.test/v1/github/webhook", {
    body: raw,
    headers: {
      "Content-Type": "application/json",
      "X-GitHub-Delivery": headers.delivery ?? "delivery-1",
      "X-GitHub-Event": headers.event ?? "push",
      "X-Hub-Signature-256": headers.signature ?? (await createGitHubWebhookSignature(REDACTED, raw))
    },
    method: "POST"
  });
}

function dependencies(reservation: "accepted" | "duplicate" = "accepted") {
  const deliveries: GitHubWebhookDelivery[] = [];
  const messages: GitHubWebhookMessage[] = [];
  const states = new Map<
    string,
    { handled: boolean; payloadDigest: GitHubWebhookDelivery["payloadDigest"] }
  >();
  return {
    deliveries,
    messages,
    value: {
      deliveries: {
        reserve(delivery: GitHubWebhookDelivery): Promise<GitHubWebhookDeliveryReservation> {
          deliveries.push(delivery);
          if (reservation === "duplicate") {
            return Promise.resolve("duplicate" as const);
          }
          const existing = states.get(delivery.deliveryId);
          if (existing !== undefined) {
            if (existing.payloadDigest !== delivery.payloadDigest) {
              return Promise.reject(new Error("delivery digest mismatch"));
            }
            return Promise.resolve(existing.handled ? ("duplicate" as const) : "retry_pending");
          }
          states.set(delivery.deliveryId, {
            handled: false,
            payloadDigest: delivery.payloadDigest
          });
          return Promise.resolve("accepted" as const);
        },
        markHandled(input: {
          readonly deliveryId: string;
          readonly outcome: "enqueued" | "ignored";
          readonly payloadDigest: GitHubWebhookDelivery["payloadDigest"];
        }) {
          const existing = states.get(input.deliveryId);
          if (existing?.payloadDigest !== input.payloadDigest) {
            return Promise.reject(new Error("delivery digest mismatch"));
          }
          existing.handled = true;
          return Promise.resolve();
        }
      },
      queue: {
        publish(message: GitHubWebhookMessage) {
          messages.push(message);
          return Promise.resolve();
        }
      },
      webhookSecret: REDACTED
    }
  };
}

describe("GitHub webhook boundary", () => {
  it("verifies the exact raw body, durably reserves the delivery, and enqueues metadata", async () => {
    const deps = dependencies();
    const response = await handleGitHubWebhook(
      await webhookRequest({
        installation: { id: 41 },
        repository: { id: 73 },
        ref: "refs/heads/main"
      }),
      deps.value,
      { now: () => 1234 }
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true, duplicate: false });
    expect(deps.deliveries).toHaveLength(1);
    expect(deps.deliveries[0]).toMatchObject({
      deliveryId: "delivery-1",
      event: "push",
      installationId: "41",
      receivedAtEpochMilliseconds: 1234,
      repositoryIds: ["73"]
    });
    expect(deps.deliveries[0]?.payloadDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    expect(deps.messages).toEqual([
      expect.objectContaining({
        deliveryId: "delivery-1",
        event: "push",
        installationId: "41",
        reason: "source.push",
        repositoryIds: ["73"],
        requestFreshCheckpoint: true
      })
    ]);
  });

  it("rejects a signature for any different body before persistence", async () => {
    const original = encoder.encode(JSON.stringify({ installation: { id: 41 } }));
    const deps = dependencies();
    const response = await handleGitHubWebhook(
      await webhookRequest(
        { installation: { id: 999 } },
        { signature: await createGitHubWebhookSignature(REDACTED, original) }
      ),
      deps.value
    );

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "invalid_signature" });
    expect(deps.deliveries).toEqual([]);
    expect(deps.messages).toEqual([]);
  });

  it("deduplicates atomically and never republishes a duplicate", async () => {
    const deps = dependencies("duplicate");
    const response = await handleGitHubWebhook(
      await webhookRequest({ installation: { id: 41 }, repository: { id: 73 } }),
      deps.value
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true, duplicate: true });
    expect(deps.deliveries).toHaveLength(1);
    expect(deps.messages).toEqual([]);
  });

  it.each([
    ["installation", "suspend", "installation.changed", false],
    ["installation_repositories", "added", "repository.changed", true],
    ["pull_request", "synchronize", "source.pull_request", true]
  ] as const)(
    "classifies %s/%s without putting the raw payload on the queue",
    async (event, action, reason, requestFreshCheckpoint) => {
      const deps = dependencies();
      const response = await handleGitHubWebhook(
        await webhookRequest(
          {
            action,
            installation: { id: 41 },
            repository: { id: 73 },
            repositories_added: [{ id: 74 }]
          },
          { event }
        ),
        deps.value
      );

      expect(response.status).toBe(202);
      expect(deps.messages[0]).toMatchObject({ event, reason, requestFreshCheckpoint });
      expect(JSON.stringify(deps.messages[0])).not.toContain("repositories_added");
    }
  );

  it("durably records but does not enqueue an unallowlisted action", async () => {
    const deps = dependencies();
    const response = await handleGitHubWebhook(
      await webhookRequest(
        { action: "labeled", installation: { id: 41 }, repository: { id: 73 } },
        { event: "pull_request" }
      ),
      deps.value
    );

    expect(response.status).toBe(202);
    expect(await response.json()).toEqual({ accepted: true, ignored: true });
    expect(deps.deliveries).toHaveLength(1);
    expect(deps.messages).toEqual([]);
  });

  it("fails closed on unsupported events, invalid deliveries, and oversize bodies", async () => {
    const unsupported = dependencies();
    expect(
      (
        await handleGitHubWebhook(
          await webhookRequest({ installation: { id: 41 } }, { event: "issues" }),
          unsupported.value
        )
      ).status
    ).toBe(400);

    const invalidDelivery = dependencies();
    expect(
      (
        await handleGitHubWebhook(
          await webhookRequest({ installation: { id: 41 } }, { delivery: "bad delivery" }),
          invalidDelivery.value
        )
      ).status
    ).toBe(400);

    const oversized = dependencies();
    expect(
      (
        await handleGitHubWebhook(
          await webhookRequest({ installation: { id: 41 } }),
          oversized.value,
          { maximumBodyBytes: 1 }
        )
      ).status
    ).toBe(413);
  });

  it("republishes a reserved-but-not-enqueued delivery and then deduplicates it", async () => {
    const deps = dependencies();
    deps.value.queue.publish = vi.fn().mockRejectedValueOnce(new Error("queue unavailable"));
    const body = { installation: { id: 41 }, repository: { id: 73 } };

    const failed = await handleGitHubWebhook(await webhookRequest(body), deps.value);

    expect(failed.status).toBe(503);
    expect(await failed.json()).toEqual({ error: "storage_unavailable" });

    deps.value.queue.publish = (message: GitHubWebhookMessage) => {
      deps.messages.push(message);
      return Promise.resolve();
    };
    const retried = await handleGitHubWebhook(await webhookRequest(body), deps.value);
    expect(retried.status).toBe(202);
    expect(await retried.json()).toEqual({ accepted: true, duplicate: false });
    expect(deps.messages).toHaveLength(1);

    const duplicate = await handleGitHubWebhook(await webhookRequest(body), deps.value);
    expect(await duplicate.json()).toEqual({ accepted: true, duplicate: true });
    expect(deps.messages).toHaveLength(1);
  });
});
