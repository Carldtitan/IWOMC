import { describe, expect, it, vi } from "vitest";

import {
  createGitHubWebhookSignature,
  handleGitHubWebhook,
  type GitHubWebhookDelivery,
  type GitHubWebhookMessage
} from "./webhook.js";

const secret = "github-webhook-test-secret";
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
      "X-Hub-Signature-256": headers.signature ?? (await createGitHubWebhookSignature(secret, raw))
    },
    method: "POST"
  });
}

function dependencies(reservation: "accepted" | "duplicate" = "accepted") {
  const deliveries: GitHubWebhookDelivery[] = [];
  const messages: GitHubWebhookMessage[] = [];
  return {
    deliveries,
    messages,
    value: {
      deliveries: {
        reserve(delivery: GitHubWebhookDelivery) {
          deliveries.push(delivery);
          return Promise.resolve(reservation);
        }
      },
      queue: {
        publish(message: GitHubWebhookMessage) {
          messages.push(message);
          return Promise.resolve();
        }
      },
      webhookSecret: secret
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
        { signature: await createGitHubWebhookSignature(secret, original) }
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

  it("fails closed on unsupported events, invalid deliveries, oversize bodies, and queue failure", async () => {
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

    const unavailable = dependencies();
    unavailable.value.queue.publish = vi.fn().mockRejectedValue(new Error("queue unavailable"));
    const response = await handleGitHubWebhook(
      await webhookRequest({ installation: { id: 41 }, repository: { id: 73 } }),
      unavailable.value
    );
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "storage_unavailable" });
  });
});
