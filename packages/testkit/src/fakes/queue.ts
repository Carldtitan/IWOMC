import type {
  QueueAcknowledgeRequest,
  QueueAcknowledgeResult,
  QueuePayloadPointer,
  QueuePort,
  QueuePublishRequest,
  QueuePublishResult,
  QueueReleaseRequest,
  QueueReleaseResult,
  QueueReserveRequest,
  QueueReserveResult,
  ReservedQueueMessage
} from "@environment-REDACTED/integrations/ports";

import { DeterministicScenario, ScenarioFailure } from "./scenario.js";

interface QueueLease {
  readonly REDACTED: string;
  readonly expiresAtMilliseconds: number;
}

interface StoredQueueMessage {
  readonly messageId: string;
  readonly payload: QueuePayloadPointer;
  readonly expiresAtMilliseconds: number;
  availableAtMilliseconds: number;
  deliveryAttempt: number;
  lease: QueueLease | undefined;
}

export interface FakeQueueOptions {
  readonly scenario?: DeterministicScenario;
  readonly maxDeliveryAttempts?: number;
}

export interface FakeQueueSnapshot {
  readonly availableMessages: number;
  readonly deadLetteredMessages: number;
  readonly leasedMessages: number;
}

type PublishValue = Omit<QueuePublishResult, "receipt">;
type ReserveValue = Omit<QueueReserveResult, "receipt">;
type AcknowledgeValue = Omit<QueueAcknowledgeResult, "receipt">;
type ReleaseValue = Omit<QueueReleaseResult, "receipt">;

export class FakeQueue implements QueuePort {
  readonly scenario: DeterministicScenario;
  readonly #maxDeliveryAttempts: number;
  readonly #queues = new Map<string, StoredQueueMessage[]>();
  readonly #deadLetters = new Map<string, StoredQueueMessage[]>();

  constructor(options: FakeQueueOptions = {}) {
    this.scenario = options.scenario ?? new DeterministicScenario();
    this.#maxDeliveryAttempts = options.maxDeliveryAttempts ?? 3;
    assertPositiveSafeInteger(this.#maxDeliveryAttempts, "maxDeliveryAttempts");
  }

  async publish(request: QueuePublishRequest): Promise<QueuePublishResult> {
    assertQueueName(request.queueName);
    assertNonNegativeSafeInteger(request.delaySeconds, "delaySeconds");
    assertPositiveSafeInteger(request.retentionSeconds, "retentionSeconds");
    assertPointer(request.payload);

    const execution = await this.scenario.execute<PublishValue>({
      service: "queue",
      operation: "publish",
      context: request.context,
      perform: () => {
        const now = this.scenario.clock.now().getTime();
        const message: StoredQueueMessage = {
          messageId: this.scenario.ids.generate(),
          payload: clonePointer(request.payload),
          availableAtMilliseconds: now + request.delaySeconds * 1_000,
          expiresAtMilliseconds: now + request.retentionSeconds * 1_000,
          deliveryAttempt: 0,
          lease: undefined
        };
        this.#queue(request.queueName).push(message);
        return {
          value: { messageId: message.messageId },
          resultSummary: { messageId: message.messageId },
          providerResourceId: message.messageId
        };
      },
      clone: clonePublishValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async reserve(request: QueueReserveRequest): Promise<QueueReserveResult> {
    assertQueueName(request.queueName);
    assertPositiveSafeInteger(request.maxMessages, "maxMessages");
    assertNonNegativeSafeInteger(request.waitTimeoutMs, "waitTimeoutMs");
    assertPositiveSafeInteger(request.visibilityTimeoutSeconds, "visibilityTimeoutSeconds");

    const execution = await this.scenario.execute<ReserveValue>({
      service: "queue",
      operation: "reserve",
      context: request.context,
      perform: () => {
        const now = this.scenario.clock.now().getTime();
        const queue = this.#queue(request.queueName);
        this.#removeExpired(queue, now);
        this.#deadLetterExhausted(request.queueName, queue, now);
        const messages: ReservedQueueMessage[] = [];

        for (const message of queue) {
          if (messages.length >= request.maxMessages) {
            break;
          }
          const leaseIsActive =
            message.lease !== undefined && message.lease.expiresAtMilliseconds > now;
          if (leaseIsActive || message.availableAtMilliseconds > now) {
            continue;
          }

          message.deliveryAttempt += 1;
          const REDACTED = this.scenario.ids.generate();
          const expiresAtMilliseconds = now + request.visibilityTimeoutSeconds * 1_000;
          message.lease = { REDACTED, expiresAtMilliseconds };
          messages.push({
            messageId: message.messageId,
            deliveryAttempt: message.deliveryAttempt,
            leaseToken: REDACTED,
            leaseExpiresAt: new Date(expiresAtMilliseconds).toISOString(),
            payload: clonePointer(message.payload)
          });
        }

        return {
          value: { messages },
          resultSummary: {
            messageIds: messages.map((message) => message.messageId),
            deliveryAttempts: messages.map((message) => message.deliveryAttempt)
          }
        };
      },
      clone: cloneReserveValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async acknowledge(request: QueueAcknowledgeRequest): Promise<QueueAcknowledgeResult> {
    assertQueueName(request.queueName);
    const execution = await this.scenario.execute<AcknowledgeValue>({
      service: "queue",
      operation: "acknowledge",
      context: request.context,
      perform: () => {
        const queue = this.#queue(request.queueName);
        const index = this.#findLeasedMessage(queue, request.messageId, request.leaseToken);
        const acknowledged = index >= 0;
        if (acknowledged) {
          queue.splice(index, 1);
        }
        return {
          value: { acknowledged },
          resultSummary: {
            acknowledged,
            messageId: request.messageId,
            normalizedResultDigest: request.normalizedResultDigest
          }
        };
      },
      clone: cloneAcknowledgeValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  async release(request: QueueReleaseRequest): Promise<QueueReleaseResult> {
    assertQueueName(request.queueName);
    assertNonNegativeSafeInteger(request.retryAfterSeconds, "retryAfterSeconds");
    if (request.reasonCode.trim().length === 0) {
      throw new ScenarioFailure("invalid_release_reason", "queue.release");
    }

    const execution = await this.scenario.execute<ReleaseValue>({
      service: "queue",
      operation: "release",
      context: request.context,
      perform: () => {
        const queue = this.#queue(request.queueName);
        const index = this.#findLeasedMessage(queue, request.messageId, request.leaseToken);
        if (index < 0) {
          return {
            value: { released: false, deadLettered: false },
            resultSummary: {
              released: false,
              deadLettered: false,
              messageId: request.messageId
            }
          };
        }

        const message = queue[index];
        if (message === undefined) {
          throw new ScenarioFailure("queue_state_corrupt", "queue.release");
        }
        if (message.deliveryAttempt >= this.#maxDeliveryAttempts) {
          queue.splice(index, 1);
          message.lease = undefined;
          this.#deadLetterQueue(request.queueName).push(message);
          return {
            value: { released: false, deadLettered: true },
            resultSummary: {
              released: false,
              deadLettered: true,
              messageId: request.messageId,
              reasonCode: request.reasonCode,
              failureDigest: request.failureDigest
            }
          };
        }

        message.lease = undefined;
        message.availableAtMilliseconds =
          this.scenario.clock.now().getTime() + request.retryAfterSeconds * 1_000;
        return {
          value: { released: true, deadLettered: false },
          resultSummary: {
            released: true,
            deadLettered: false,
            messageId: request.messageId,
            reasonCode: request.reasonCode,
            failureDigest: request.failureDigest
          }
        };
      },
      clone: cloneReleaseValue
    });

    return { ...execution.value, receipt: execution.receipt };
  }

  snapshot(queueName: string): FakeQueueSnapshot {
    assertQueueName(queueName);
    const now = this.scenario.clock.now().getTime();
    const queue = this.#queue(queueName);
    this.#removeExpired(queue, now);
    let leasedMessages = 0;
    let availableMessages = 0;
    for (const message of queue) {
      if (message.lease !== undefined && message.lease.expiresAtMilliseconds > now) {
        leasedMessages += 1;
      } else if (message.availableAtMilliseconds <= now) {
        availableMessages += 1;
      }
    }

    return {
      availableMessages,
      leasedMessages,
      deadLetteredMessages: this.#deadLetterQueue(queueName).length
    };
  }

  #queue(name: string): StoredQueueMessage[] {
    const existing = this.#queues.get(name);
    if (existing !== undefined) {
      return existing;
    }
    const queue: StoredQueueMessage[] = [];
    this.#queues.set(name, queue);
    return queue;
  }

  #deadLetterQueue(name: string): StoredQueueMessage[] {
    const existing = this.#deadLetters.get(name);
    if (existing !== undefined) {
      return existing;
    }
    const queue: StoredQueueMessage[] = [];
    this.#deadLetters.set(name, queue);
    return queue;
  }

  #findLeasedMessage(
    queue: readonly StoredQueueMessage[],
    messageId: string,
    leaseToken: string
  ): number {
    const now = this.scenario.clock.now().getTime();
    return queue.findIndex(
      (message) =>
        message.messageId === messageId &&
        message.lease?.REDACTED === leaseToken &&
        message.lease.expiresAtMilliseconds > now
    );
  }

  #removeExpired(queue: StoredQueueMessage[], now: number): void {
    for (let index = queue.length - 1; index >= 0; index -= 1) {
      if (queue[index]?.expiresAtMilliseconds !== undefined) {
        const message = queue[index];
        if (message !== undefined && message.expiresAtMilliseconds <= now) {
          queue.splice(index, 1);
        }
      }
    }
  }

  #deadLetterExhausted(queueName: string, queue: StoredQueueMessage[], now: number): void {
    for (let index = queue.length - 1; index >= 0; index -= 1) {
      const message = queue[index];
      if (message === undefined) {
        continue;
      }
      const leaseIsActive =
        message.lease !== undefined && message.lease.expiresAtMilliseconds > now;
      if (
        !leaseIsActive &&
        message.availableAtMilliseconds <= now &&
        message.deliveryAttempt >= this.#maxDeliveryAttempts
      ) {
        queue.splice(index, 1);
        message.lease = undefined;
        this.#deadLetterQueue(queueName).push(message);
      }
    }
  }
}

function assertQueueName(value: string): void {
  if (value.trim().length === 0) {
    throw new ScenarioFailure("invalid_queue_name", "queue");
  }
}

function assertPointer(value: QueuePayloadPointer): void {
  if (
    value.objectKey.trim().length === 0 ||
    value.objectVersionId.trim().length === 0 ||
    !Number.isSafeInteger(value.ciphertextBytes) ||
    value.ciphertextBytes < 0
  ) {
    throw new ScenarioFailure("invalid_payload_pointer", "queue.publish");
  }
}

function assertPositiveSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 1) {
    throw new ScenarioFailure("invalid_numeric_parameter", name);
  }
}

function assertNonNegativeSafeInteger(value: number, name: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ScenarioFailure("invalid_numeric_parameter", name);
  }
}

function clonePointer(value: QueuePayloadPointer): QueuePayloadPointer {
  return { ...value };
}

function clonePublishValue(value: PublishValue): PublishValue {
  return { ...value };
}

function cloneReserveValue(value: ReserveValue): ReserveValue {
  return {
    messages: value.messages.map((message) => ({
      ...message,
      payload: clonePointer(message.payload)
    }))
  };
}

function cloneAcknowledgeValue(value: AcknowledgeValue): AcknowledgeValue {
  return { ...value };
}

function cloneReleaseValue(value: ReleaseValue): ReleaseValue {
  return { ...value };
}
