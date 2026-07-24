import { describe, expect, it } from "vitest";

import {
  EnvironmentValidationError,
  getIntegrationReadiness,
  parseMigrationEnvironment,
  parsePublicEnvironment,
  parseServerEnvironment,
  parseToolingEnvironment
} from "./env.js";

const key32 = "AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

function validServerEnvironment(): Record<string, string> {
  return {
    APP_ENV: "test",
    PUBLIC_APP_URL: "https://reconciler.example.test",
    LOG_LEVEL: "info",
    APP_SESSION_SECRET: key32,
    DATA_ENCRYPTION_KEY: key32,
    DATABASE_URL: "postgresql://user:password@db.example.test/reconciler",
    DAYTONA_API_KEY: "daytona-test",
    DAYTONA_API_URL: "https://app.daytona.io/api",
    DAYTONA_TARGET: "us",
    FIREWORKS_API_KEY: "fireworks-test",
    FIREWORKS_BASE_URL: "https://api.fireworks.ai/inference/v1",
    FIREWORKS_MODEL_ID: "accounts/fireworks/models/test",
    BRAINTRUST_API_KEY: "braintrust-test",
    BRAINTRUST_API_URL: "https://api.braintrust.dev",
    BRAINTRUST_PROJECT_NAME: "test-project",
    BRAINTRUST_ENABLED: "true",
    GITHUB_APP_ID: "1",
    GITHUB_APP_CLIENT_ID: "Iv1.test",
    GITHUB_APP_CLIENT_SECRET: "github-client-test",
    GITHUB_APP_SLUG: "reconciler-test",
    GITHUB_APP_WEBHOOK_SECRET: "github-webhook-test",
    GITHUB_APP_PRIVATE_KEY_BASE64: "github-key-test",
    R2_S3_ENDPOINT: "https://account.r2.cloudflarestorage.com",
    R2_S3_ACCESS_KEY_ID: "r2-access-test",
    R2_S3_SECRET_ACCESS_KEY: "r2-secret-test",
    R2_BUCKET_NAME: "reconciler-test"
  };
}

describe("environment contracts", () => {
  it("parses each environment scope independently", () => {
    const server = parseServerEnvironment(validServerEnvironment());
    const migration = parseMigrationEnvironment({
      DATABASE_DIRECT_URL: "postgresql://user:password@db.example.test/reconciler"
    });
    const tooling = parseToolingEnvironment({
      CLOUDFLARE_ACCOUNT_ID: "0123456789abcdef0123456789abcdef"
    });

    expect(server.APP_ENV).toBe("test");
    expect(server).not.toHaveProperty("DATABASE_DIRECT_URL");
    expect(migration.DATABASE_DIRECT_URL).toContain("postgresql://");
    expect(tooling.CLOUDFLARE_ACCOUNT_ID).toHaveLength(32);
    expect(Object.values(getIntegrationReadiness(server))).toEqual([true, true, true, true, true]);
  });

  it("rejects missing required server values", () => {
    const input = validServerEnvironment();
    delete input.APP_SESSION_SECRET;

    expect(() => parseServerEnvironment(input)).toThrow(EnvironmentValidationError);
  });

  it("rejects malformed values without including their contents in the error", () => {
    const input = validServerEnvironment();
    const malformedSecret = "this-value-must-never-appear-in-an-error";
    input.DATA_ENCRYPTION_KEY = malformedSecret;

    expect(() => parseServerEnvironment(input)).toThrowError(
      expect.objectContaining({
        message: expect.not.stringContaining(malformedSecret)
      })
    );
  });

  it("rejects partial R2 configuration", () => {
    const input = validServerEnvironment();
    delete input.R2_S3_SECRET_ACCESS_KEY;

    expect(() => parseServerEnvironment(input)).toThrow(
      "R2 direct-transfer configuration must be either complete or absent"
    );
  });

  it("rejects device-only keys from cloud configuration", () => {
    expect(() =>
      parseServerEnvironment({
        ...validServerEnvironment(),
        FINGERPRINT_HMAC_KEY: "device-only"
      })
    ).toThrow("belongs only in the Companion OS credential store");
  });

  it("rejects accidental private keys passed to browser configuration", () => {
    expect(() =>
      parsePublicEnvironment({
        APP_ENV: "test",
        PUBLIC_APP_URL: "https://reconciler.example.test",
        FIREWORKS_API_KEY: "must-not-reach-browser"
      })
    ).toThrow("FIREWORKS_API_KEY: is not browser-safe");
  });

  it("returns only explicitly public values", () => {
    expect(
      parsePublicEnvironment({
        APP_ENV: "test",
        PUBLIC_APP_URL: "https://reconciler.example.test",
        VITE_INTERNAL_NOISE: "ignored"
      })
    ).toEqual({
      APP_ENV: "test",
      PUBLIC_APP_URL: "https://reconciler.example.test"
    });
  });
});
