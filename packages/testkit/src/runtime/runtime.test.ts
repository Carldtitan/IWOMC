import { describe, expect, it } from "vitest";

import {
  CanonicalSha256Hasher,
  ConfigurableFailpoints,
  DeterministicClock,
  DeterministicIdGenerator,
  FailpointError,
  canonicalizeJson
} from "./index.js";

describe("DeterministicClock", () => {
  it("returns defensive Date instances and advances deterministically", () => {
    const clock = new DeterministicClock("2026-07-24T12:00:00.000Z");
    const first = clock.now();
    first.setUTCFullYear(1999);

    expect(clock.now().toISOString()).toBe("2026-07-24T12:00:00.000Z");

    clock.advance(1_500);
    expect(clock.now().toISOString()).toBe("2026-07-24T12:00:01.500Z");
    expect(clock.monotonicNanoseconds()).toBe(1_500_000_000n);

    clock.reset();
    expect(clock.now().toISOString()).toBe("2026-07-24T12:00:00.000Z");
    expect(clock.monotonicNanoseconds()).toBe(0n);
  });

  it("keeps wall and monotonic clocks independently controllable", () => {
    const clock = new DeterministicClock("2026-07-24T12:00:00.000Z", 500n);

    clock.advanceMonotonic(250n);
    expect(clock.monotonicNanoseconds()).toBe(750n);
    expect(clock.now().toISOString()).toBe("2026-07-24T12:00:00.000Z");

    clock.setWall("2020-01-01T00:00:00.000Z");
    expect(clock.now().toISOString()).toBe("2020-01-01T00:00:00.000Z");
    expect(clock.monotonicNanoseconds()).toBe(750n);

    clock.advanceWall(1_000);
    expect(clock.now().toISOString()).toBe("2020-01-01T00:00:01.000Z");
    expect(clock.monotonicNanoseconds()).toBe(750n);
  });

  it("rejects invalid instants and unsafe advancement", () => {
    expect(() => new DeterministicClock("not-a-date")).toThrow(RangeError);

    const clock = new DeterministicClock(0);
    expect(() => clock.advance(-1)).toThrow(RangeError);
    expect(() => clock.advance(0.5)).toThrow(RangeError);
    expect(() => clock.advanceMonotonic(-1n)).toThrow(RangeError);
    expect(() => new DeterministicClock(0, -1n)).toThrow(RangeError);
  });
});

describe("DeterministicIdGenerator", () => {
  it("generates stable, distinct UUID-shaped identifiers", () => {
    const generator = new DeterministicIdGenerator();

    expect(generator.generate()).toBe("00000000-0000-4000-8000-000000000001");
    expect(generator.generate()).toBe("00000000-0000-4000-8000-000000000002");
  });

  it("replays the same sequence from the same seed", () => {
    const left = new DeterministicIdGenerator(41);
    const right = new DeterministicIdGenerator(41n);

    expect(left.generate()).toBe(right.generate());
  });
});

describe("canonical SHA-256 hashing", () => {
  const hasher = new CanonicalSha256Hasher();

  it("matches the published SHA-256 digest for empty UTF-8 text", async () => {
    await expect(hasher.hashText("")).resolves.toBe(
      "sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
    );
    await expect(hasher.hashText("é😀")).resolves.toBe(
      "sha256:1184d1f608158eea09d297565575892231550c403aaa913008d867a97cfd5c76"
    );
  });

  it("sorts object keys recursively while preserving array order", async () => {
    const left = {
      z: [{ second: 2, first: 1 }],
      a: true
    };
    const right = {
      a: true,
      z: [{ first: 1, second: 2 }]
    };

    expect(canonicalizeJson(left)).toBe('{"a":true,"z":[{"first":1,"second":2}]}');
    await expect(hasher.hashCanonicalJson(left)).resolves.toBe(
      await hasher.hashCanonicalJson(right)
    );
    await expect(hasher.hashCanonicalJson([1, 2])).resolves.not.toBe(
      await hasher.hashCanonicalJson([2, 1])
    );
  });

  it("rejects non-JSON and ambiguous values", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;

    expect(() => canonicalizeJson({ value: Number.NaN })).toThrow(TypeError);
    expect(() => canonicalizeJson({ value: undefined } as never)).toThrow(TypeError);
    expect(() => canonicalizeJson(new Date() as never)).toThrow(TypeError);
    expect(() => canonicalizeJson(cyclic as never)).toThrow(TypeError);
    expect(() => canonicalizeJson(["\ud800"])).toThrow(TypeError);

    const sparse = new Array<unknown>(1);
    expect(() => canonicalizeJson(sparse as never)).toThrow(TypeError);
  });
});

describe("ConfigurableFailpoints", () => {
  it("skips and fails an exact deterministic number of hits", () => {
    const failpoints = new ConfigurableFailpoints();
    failpoints.arm("object.write", { failures: 2, skip: 1 });

    expect(() => failpoints.hit("object.write")).not.toThrow();
    expect(() => failpoints.hit("object.write")).toThrow(FailpointError);
    expect(() => failpoints.hit("object.write")).toThrow(FailpointError);
    expect(() => failpoints.hit("object.write")).not.toThrow();
    expect(failpoints.getHitCount("object.write")).toBe(4);
    expect(failpoints.isArmed("object.write")).toBe(false);
  });

  it("supports persistent and caller-defined failures", () => {
    const failpoints = new ConfigurableFailpoints();
    failpoints.arm("queue.send", {
      errorFactory: ({ hit }) => new Error(`queue unavailable on hit ${String(hit)}`),
      failures: "always"
    });

    expect(() => failpoints.hit("queue.send")).toThrow("queue unavailable on hit 1");
    expect(() => failpoints.hit("queue.send")).toThrow("queue unavailable on hit 2");

    failpoints.disarm("queue.send");
    expect(() => failpoints.hit("queue.send")).not.toThrow();
  });

  it("rejects invalid plans", () => {
    const failpoints = new ConfigurableFailpoints();

    expect(() => failpoints.arm(" ")).toThrow(TypeError);
    expect(() => failpoints.arm("queue.send", { failures: -1 })).toThrow(RangeError);
    expect(() => failpoints.arm("queue.send", { skip: 0.5 })).toThrow(RangeError);
  });
});
