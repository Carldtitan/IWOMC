import type { IngestQueuePort } from "../../domain/ingestion/ports.js";
import type { IngestQueuePointer } from "../../domain/ingestion/types.js";
import type {
  ReconcileRequestedMessage,
  ReconcileRequestQueuePort
} from "../../queues/event-consumer.js";

export interface CloudflareJsonQueueBinding<Message extends object> {
  send(body: Message, options: { readonly contentType: "json" }): Promise<unknown>;
}

export class CloudflareIngestQueue implements IngestQueuePort {
  readonly #queue: CloudflareJsonQueueBinding<IngestQueuePointer>;

  constructor(queue: CloudflareJsonQueueBinding<IngestQueuePointer>) {
    this.#queue = queue;
  }

  async publish(pointer: IngestQueuePointer): Promise<void> {
    await this.#queue.send(pointer, { contentType: "json" });
  }
}

export class CloudflareReconcileQueue implements ReconcileRequestQueuePort {
  readonly #queue: CloudflareJsonQueueBinding<ReconcileRequestedMessage>;

  constructor(queue: CloudflareJsonQueueBinding<ReconcileRequestedMessage>) {
    this.#queue = queue;
  }

  async publish(message: ReconcileRequestedMessage): Promise<void> {
    await this.#queue.send(message, { contentType: "json" });
  }
}

export function cloudflareIngestQueue(queue: Queue<IngestQueuePointer>): CloudflareIngestQueue {
  return new CloudflareIngestQueue(queue);
}
