import { describe, expect, it } from "vitest";

import { computeBackoffDelay } from "./use-workspace-polling.js";

describe("computeBackoffDelay", () => {
  it("grows exponentially but never exceeds the configured bound", () => {
    expect(computeBackoffDelay(0, 1_000, 8_000, 0, 0.5)).toBe(1_000);
    expect(computeBackoffDelay(1, 1_000, 8_000, 0, 0.5)).toBe(2_000);
    expect(computeBackoffDelay(20, 1_000, 8_000, 0, 0.5)).toBe(8_000);
  });

  it("applies deterministic bounded jitter", () => {
    expect(computeBackoffDelay(1, 1_000, 8_000, 0.2, 0)).toBe(1_600);
    expect(computeBackoffDelay(1, 1_000, 8_000, 0.2, 1)).toBe(2_400);
    expect(computeBackoffDelay(20, 1_000, 8_000, 0.2, 1)).toBe(8_000);
  });
});
