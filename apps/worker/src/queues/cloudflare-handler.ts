import { EventConsumerError } from "./event-consumer.js";

export interface QueueMessageConsumer {
  consume(pointer: unknown): Promise<void>;
}

export interface QueueDelivery {
  readonly attempts: number;
  readonly body: unknown;
  readonly id: string;
  ack(): void;
  retry(options: { readonly delaySeconds: number }): void;
}

export interface QueueDeliveryBatch {
  readonly messages: readonly QueueDelivery[];
  readonly queue: string;
}

export interface QueueDeliveryLog {
  readonly attempt: number;
  readonly code: string;
  readonly messageId: string;
  readonly queue: string;
}

export async function handleCloudflareEventBatch(
  batch: QueueDeliveryBatch,
  consumer: QueueMessageConsumer,
  log: (entry: QueueDeliveryLog) => void = () => undefined
): Promise<void> {
  if (isDeadLetterQueue(batch.queue)) {
    for (const message of batch.messages) {
      log({
        attempt: message.attempts,
        code: "dead_letter_held",
        messageId: message.id,
        queue: batch.queue
      });
      message.retry({ delaySeconds: 3_600 });
    }
    return;
  }

  for (const message of batch.messages) {
    try {
      await consumer.consume(message.body);
      message.ack();
    } catch (error) {
      const classified =
        error instanceof EventConsumerError
          ? error
          : new EventConsumerError("unexpected_consumer_failure", true);
      log({
        attempt: message.attempts,
        code: classified.code,
        messageId: message.id,
        queue: batch.queue
      });
      message.retry({
        delaySeconds: retryDelaySeconds(message.attempts, classified.retryable)
      });
    }
  }
}

export function retryDelaySeconds(attempt: number, retryable: boolean): number {
  if (!retryable) {
    return 30;
  }
  const normalizedAttempt = Number.isSafeInteger(attempt) && attempt > 0 ? attempt : 1;
  const exponent = Math.max(0, Math.min(4, normalizedAttempt - 1));
  return Math.min(600, 30 * 2 ** exponent);
}

function isDeadLetterQueue(queue: string): boolean {
  return queue === "environment-reconciler-ingest-dlq" || queue.endsWith("-ingest-dlq");
}
