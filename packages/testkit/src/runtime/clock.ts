import type { Clock } from "@environment-REDACTED/REDACTED";

type ClockInput = Date | number | string;

function toEpochMilliseconds(value: ClockInput): number {
  const epochMilliseconds = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (!Number.isFinite(epochMilliseconds)) {
    throw new RangeError("DeterministicClock requires a valid instant");
  }

  return epochMilliseconds;
}

export class DeterministicClock implements Clock {
  readonly #initialEpochMilliseconds: number;
  readonly #initialMonotonicNanoseconds: bigint;
  #epochMilliseconds: number;
  #monotonicNanoseconds: bigint;

  constructor(initialInstant: ClockInput, initialMonotonicNanoseconds = 0n) {
    const epochMilliseconds = toEpochMilliseconds(initialInstant);
    if (initialMonotonicNanoseconds < 0n) {
      throw new RangeError("Initial monotonic time must not be negative");
    }

    this.#initialEpochMilliseconds = epochMilliseconds;
    this.#initialMonotonicNanoseconds = initialMonotonicNanoseconds;
    this.#epochMilliseconds = epochMilliseconds;
    this.#monotonicNanoseconds = initialMonotonicNanoseconds;
  }

  now(): Date {
    return new Date(this.#epochMilliseconds);
  }

  monotonicNanoseconds(): bigint {
    return this.#monotonicNanoseconds;
  }

  advance(milliseconds: number): void {
    this.#assertValidWallAdvancement(milliseconds);
    this.#epochMilliseconds += milliseconds;
    this.#monotonicNanoseconds += BigInt(milliseconds) * 1_000_000n;
  }

  advanceMonotonic(nanoseconds: bigint): void {
    if (nanoseconds < 0n) {
      throw new RangeError("Monotonic advancement must not be negative");
    }
    this.#monotonicNanoseconds += nanoseconds;
  }

  advanceWall(milliseconds: number): void {
    this.#assertValidWallAdvancement(milliseconds);
    this.#epochMilliseconds += milliseconds;
  }

  #assertValidWallAdvancement(milliseconds: number): void {
    if (!Number.isSafeInteger(milliseconds) || milliseconds < 0) {
      throw new RangeError("Clock advancement must be a non-negative safe integer");
    }

    const next = this.#epochMilliseconds + milliseconds;
    if (!Number.isSafeInteger(next)) {
      throw new RangeError("Clock advancement exceeds the safe timestamp range");
    }
  }

  reset(): void {
    this.#epochMilliseconds = this.#initialEpochMilliseconds;
    this.#monotonicNanoseconds = this.#initialMonotonicNanoseconds;
  }

  set(instant: ClockInput): void {
    this.setWall(instant);
  }

  setWall(instant: ClockInput): void {
    this.#epochMilliseconds = toEpochMilliseconds(instant);
  }
}
