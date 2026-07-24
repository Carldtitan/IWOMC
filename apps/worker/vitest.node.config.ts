import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["apps/worker/src/api/configuration/**/*.test.ts"],
    maxWorkers: 1
  }
});
