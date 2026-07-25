import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    fileParallelism: false,
    include: [
      "apps/worker/src/api/configuration/**/*.test.ts",
      "apps/worker/src/services/reconcile-checkpoint.test.ts"
    ],
    maxWorkers: 1
  }
});
