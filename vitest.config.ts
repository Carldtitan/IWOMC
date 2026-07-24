import { cloudflareTest } from "@cloudflare/vitest-pool-workers";
import { defineConfig } from "vitest/config";

process.env.CLOUDFLARE_HYPERDRIVE_LOCAL_CONNECTION_STRING_DATABASE ??=
  "postgresql://reconciler:reconciler@127.0.0.1:5432/reconciler";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"]
    },
    projects: [
      {
        test: {
          name: "node-unit",
          environment: "node",
          include: [
            "packages/**/*.test.ts",
            "scripts/**/*.test.ts",
            "tests/contract/**/*.test.ts",
            "tests/integration/**/*.test.ts",
            "tests/e2e/**/*.spec.ts"
          ]
        }
      },
      {
        plugins: [
          cloudflareTest({
            wrangler: {
              configPath: "./wrangler.jsonc"
            }
          })
        ],
        test: {
          name: "worker",
          include: ["apps/worker/**/*.test.ts"]
        }
      },
      {
        test: {
          name: "web-unit",
          environment: "node",
          include: ["apps/web/**/*.test.ts"]
        }
      }
    ]
  }
});
