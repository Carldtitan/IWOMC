import type { IdGenerator } from "@environment-reconciler/reconciler";

const maximumCounter = 0xffffffffffffn;

function parseInitialCounter(value: bigint | number): bigint {
  if (
    (typeof value === "number" && (!Number.isSafeInteger(value) || value < 0)) ||
    (typeof value === "bigint" && value < 0n)
  ) {
    throw new RangeError("The initial ID counter must be a non-negative integer");
  }

  const counter = BigInt(value);
  if (counter > maximumCounter) {
    throw new RangeError("The initial ID counter exceeds the deterministic UUID range");
  }

  return counter;
}

/**
 * Produces stable RFC 4122 variant, version-4-shaped UUIDs backed by a
 * deterministic 48-bit sequence. It is intended for fixtures, never for
 * production uniqueness or unpredictability.
 */
export class DeterministicIdGenerator implements IdGenerator {
  #counter: bigint;

  constructor(initialCounter: bigint | number = 0n) {
    this.#counter = parseInitialCounter(initialCounter);
  }

  generate(): string {
    if (this.#counter === maximumCounter) {
      throw new RangeError("The deterministic ID sequence is exhausted");
    }

    this.#counter += 1n;
    const suffix = this.#counter.toString(16).padStart(12, "0");
    return `00000000-0000-4000-8000-${suffix}`;
  }
}
