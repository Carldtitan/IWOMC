import { describe, expect, it, vi } from "vitest";

import {
  handleCloudflareEventBatch,
  retryDelaySeconds,
  type QueueDelivery
} from "./cloudflare-handler.js";
import { EventConsumerError } from "./event-consumer.js";

describe("handleCloudflareEventBatch", () => {
  it("acknowledges a message only after consumption completes", async () => {
    const delivery = fakeDelivery();
    const consume = vi.fn(() => Promise.resolve());

    await handleCloudflareEventBatch(
      { messages: [delivery.message], queue: "environment-REDACTED-ingest" },
      { consume }
    );

    expect(consume).toHaveBeenCalledWith(delivery.message.body);
    expect(delivery.actions).toEqual(["ack"]);
  });

  it("retries a transient failure without acknowledging it", async () => {
    const delivery = fakeDelivery(3);

    await handleCloudflareEventBatch(
      { messages: [delivery.message], queue: "environment-REDACTED-ingest" },
      {
        consume: () => Promise.reject(new EventConsumerError("object_missing", true))
      }
    );

    expect(delivery.actions).toEqual(["retry:120"]);
  });

  it("lets terminal failures exhaust Cloudflare's retry budget for DLQ transfer", async () => {
    const delivery = fakeDelivery(5);

    await handleCloudflareEventBatch(
      { messages: [delivery.message], queue: "environment-REDACTED-ingest" },
      {
        consume: () => Promise.reject(new EventConsumerError("stored_batch_invalid", false))
      }
    );

    expect(delivery.actions).toEqual(["retry:30"]);
  });

  it("holds dead-letter deliveries fail-closed without invoking the consumer", async () => {
    const delivery = fakeDelivery(1);
    const consume = vi.fn(() => Promise.resolve());

    await handleCloudflareEventBatch(
      { messages: [delivery.message], queue: "environment-REDACTED-ingest-dlq" },
      { consume }
    );

    expect(consume).not.toHaveBeenCalled();
    expect(delivery.actions).toEqual(["retry:3600"]);
  });

  it("bounds exponential retry delay and sanitizes invalid attempt values", () => {
    expect(retryDelaySeconds(1, true)).toBe(30);
    expect(retryDelaySeconds(2, true)).toBe(60);
    expect(retryDelaySeconds(100, true)).toBe(480);
    expect(retryDelaySeconds(Number.NaN, true)).toBe(30);
    expect(retryDelaySeconds(100, false)).toBe(30);
  });
});

function fakeDelivery(attempts = 1): {
  readonly actions: string[];
  readonly message: QueueDelivery;
} {
  const actions: string[] = [];
  return {
    actions,
    message: {
      ack: () => actions.push("ack"),
      attempts,
      body: { batchId: "batch-1" },
      id: "message-1",
      retry: ({ delaySeconds }) => actions.push(`retry:${String(delaySeconds)}`)
    }
  };
}
