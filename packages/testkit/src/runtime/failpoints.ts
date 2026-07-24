export interface FailpointContext {
  readonly hit: number;
  readonly name: string;
}

export interface FailpointPlan {
  readonly errorFactory?: (context: FailpointContext) => Error;
  readonly failures?: number | "always";
  readonly skip?: number;
}

interface ArmedFailpoint {
  readonly errorFactory: (context: FailpointContext) => Error;
  remainingFailures: number | "always";
  remainingSkips: number;
}

export class FailpointError extends Error {
  readonly failpoint: string;
  readonly hit: number;

  constructor(context: FailpointContext) {
    super(`Failpoint "${context.name}" triggered on hit ${String(context.hit)}`);
    this.name = "FailpointError";
    this.failpoint = context.name;
    this.hit = context.hit;
  }
}

function assertNonNegativeSafeInteger(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative safe integer`);
  }
}

export class ConfigurableFailpoints {
  readonly #armed = new Map<string, ArmedFailpoint>();
  readonly #hits = new Map<string, number>();

  arm(name: string, plan: FailpointPlan = {}): void {
    if (name.trim().length === 0) {
      throw new TypeError("Failpoint names must not be empty");
    }

    const failures = plan.failures ?? 1;
    if (failures !== "always") {
      assertNonNegativeSafeInteger(failures, "Failpoint failure count");
    }
    const skip = plan.skip ?? 0;
    assertNonNegativeSafeInteger(skip, "Failpoint skip count");

    this.#armed.set(name, {
      errorFactory: plan.errorFactory ?? ((context) => new FailpointError(context)),
      remainingFailures: failures,
      remainingSkips: skip
    });
  }

  clear(): void {
    this.#armed.clear();
    this.#hits.clear();
  }

  disarm(name: string): void {
    this.#armed.delete(name);
  }

  getHitCount(name: string): number {
    return this.#hits.get(name) ?? 0;
  }

  hit(name: string): void {
    const hit = this.getHitCount(name) + 1;
    this.#hits.set(name, hit);

    const failpoint = this.#armed.get(name);
    if (failpoint === undefined) {
      return;
    }

    if (failpoint.remainingSkips > 0) {
      failpoint.remainingSkips -= 1;
      return;
    }

    if (failpoint.remainingFailures === 0) {
      this.#armed.delete(name);
      return;
    }

    if (failpoint.remainingFailures !== "always") {
      failpoint.remainingFailures -= 1;
      if (failpoint.remainingFailures === 0) {
        this.#armed.delete(name);
      }
    }

    throw failpoint.errorFactory({ hit, name });
  }

  isArmed(name: string): boolean {
    return this.#armed.has(name);
  }
}
