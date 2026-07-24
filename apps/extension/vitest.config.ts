import * as path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      vscode: path.resolve(import.meta.dirname, "src", "test", "vscode.ts")
    }
  },
  test: {
    environment: "node",
    fileParallelism: false,
    include: ["apps/extension/src/**/*.test.ts"],
    maxWorkers: 1
  }
});
