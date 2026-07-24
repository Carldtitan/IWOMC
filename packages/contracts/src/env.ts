import { z } from "zod";

type EnvironmentInput = Readonly<Record<string, string | undefined>>;

const appEnvironments = ["development", "test", "preview", "production"] as const;
const logLevels = ["debug", "info", "warn", "error"] as const;
const daytonaTargets = ["us", "eu"] as const;

const nonEmptyString = z.string().trim().min(1, "must not be empty");

const httpUrl = nonEmptyString.refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
}, "must be an HTTP(S) URL");

const httpsUrl = nonEmptyString.refine((value) => {
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}, "must be an HTTPS URL");

const postgresUrl = nonEmptyString.refine((value) => {
  try {
    const protocol = new URL(value).protocol;
    return protocol === "postgres:" || protocol === "postgresql:";
  } catch {
    return false;
  }
}, "must be a PostgreSQL URL");

const base64Encoded32Bytes = nonEmptyString.refine((value) => {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value) || value.length % 4 !== 0) {
    return false;
  }

  const padding = value.endsWith("==") ? 2 : value.endsWith("=") ? 1 : 0;
  return (value.length / 4) * 3 - padding === 32;
}, "must be a Base64-encoded 32-byte value");

const optionalNonEmptyString = nonEmptyString.optional();
const optionalHttpUrl = httpUrl.optional();
const optionalHttpsUrl = httpsUrl.optional();

export const publicEnvironmentSchema = z.object({
  APP_ENV: z.enum(appEnvironments),
  PUBLIC_APP_URL: httpUrl
});

export const serverEnvironmentSchema = z
  .object({
    APP_ENV: z.enum(appEnvironments),
    PUBLIC_APP_URL: httpUrl,
    LOG_LEVEL: z.enum(logLevels),
    APP_SESSION_SECRET: base64Encoded32Bytes,
    DATA_ENCRYPTION_KEY: base64Encoded32Bytes,
    DATABASE_URL: postgresUrl,
    DAYTONA_API_KEY: optionalNonEmptyString,
    DAYTONA_API_URL: optionalHttpsUrl,
    DAYTONA_TARGET: z.enum(daytonaTargets).optional(),
    FIREWORKS_API_KEY: optionalNonEmptyString,
    FIREWORKS_BASE_URL: optionalHttpsUrl,
    FIREWORKS_MODEL_ID: optionalNonEmptyString,
    BRAINTRUST_API_KEY: optionalNonEmptyString,
    BRAINTRUST_API_URL: optionalHttpsUrl,
    BRAINTRUST_PROJECT_NAME: optionalNonEmptyString,
    BRAINTRUST_ENABLED: z
      .enum(["true", "false"])
      .transform((value) => value === "true")
      .optional(),
    GITHUB_APP_ID: optionalNonEmptyString,
    GITHUB_APP_CLIENT_ID: optionalNonEmptyString,
    GITHUB_APP_CLIENT_SECRET: optionalNonEmptyString,
    GITHUB_APP_SLUG: optionalNonEmptyString,
    GITHUB_APP_WEBHOOK_SECRET: optionalNonEmptyString,
    GITHUB_APP_PRIVATE_KEY_BASE64: optionalNonEmptyString,
    R2_S3_ENDPOINT: optionalHttpsUrl,
    R2_S3_ACCESS_KEY_ID: optionalNonEmptyString,
    R2_S3_SECRET_ACCESS_KEY: optionalNonEmptyString,
    R2_BUCKET_NAME: optionalNonEmptyString
  })
  .superRefine((environment, context) => {
    const r2Values = [
      environment.R2_S3_ENDPOINT,
      environment.R2_S3_ACCESS_KEY_ID,
      environment.R2_S3_SECRET_ACCESS_KEY,
      environment.R2_BUCKET_NAME
    ];
    const configuredCount = r2Values.filter((value) => value !== undefined).length;

    if (configuredCount !== 0 && configuredCount !== r2Values.length) {
      context.addIssue({
        code: "custom",
        path: ["R2_S3_ENDPOINT"],
        message: "R2 direct-transfer configuration must be either complete or absent"
      });
    }
  });

export const migrationEnvironmentSchema = z.object({
  DATABASE_DIRECT_URL: postgresUrl
});

export const toolingEnvironmentSchema = z.object({
  CLOUDFLARE_ACCOUNT_ID: nonEmptyString.regex(
    /^[a-fA-F0-9]{32}$/,
    "must be a 32-character hexadecimal Cloudflare account ID"
  )
});

export const PUBLIC_ENVIRONMENT_KEYS = ["APP_ENV", "PUBLIC_APP_URL"] as const;

export const SERVER_ENVIRONMENT_KEYS = [
  "APP_ENV",
  "PUBLIC_APP_URL",
  "LOG_LEVEL",
  "APP_SESSION_SECRET",
  "DATA_ENCRYPTION_KEY",
  "DATABASE_URL",
  "DAYTONA_API_KEY",
  "DAYTONA_API_URL",
  "DAYTONA_TARGET",
  "FIREWORKS_API_KEY",
  "FIREWORKS_BASE_URL",
  "FIREWORKS_MODEL_ID",
  "BRAINTRUST_API_KEY",
  "BRAINTRUST_API_URL",
  "BRAINTRUST_PROJECT_NAME",
  "BRAINTRUST_ENABLED",
  "GITHUB_APP_ID",
  "GITHUB_APP_CLIENT_ID",
  "GITHUB_APP_CLIENT_SECRET",
  "GITHUB_APP_SLUG",
  "GITHUB_APP_WEBHOOK_SECRET",
  "GITHUB_APP_PRIVATE_KEY_BASE64",
  "R2_S3_ENDPOINT",
  "R2_S3_ACCESS_KEY_ID",
  "R2_S3_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME"
] as const;

export const MIGRATION_ENVIRONMENT_KEYS = ["DATABASE_DIRECT_URL"] as const;
export const TOOLING_ENVIRONMENT_KEYS = ["CLOUDFLARE_ACCOUNT_ID"] as const;
export const DEVICE_ONLY_ENVIRONMENT_KEYS = ["FINGERPRINT_HMAC_KEY"] as const;

const browserForbiddenKeys = new Set<string>([
  ...SERVER_ENVIRONMENT_KEYS.filter(
    (key): key is Exclude<(typeof SERVER_ENVIRONMENT_KEYS)[number], "APP_ENV" | "PUBLIC_APP_URL"> =>
      key !== "APP_ENV" && key !== "PUBLIC_APP_URL"
  ),
  ...MIGRATION_ENVIRONMENT_KEYS,
  ...TOOLING_ENVIRONMENT_KEYS,
  ...DEVICE_ONLY_ENVIRONMENT_KEYS
]);

export class EnvironmentValidationError extends Error {
  readonly issues: readonly string[];

  constructor(scope: string, issues: readonly string[]) {
    super(`Invalid ${scope} environment: ${issues.join("; ")}`);
    this.name = "EnvironmentValidationError";
    this.issues = issues;
  }
}

function pickEnvironment<const Keys extends readonly string[]>(
  input: EnvironmentInput,
  keys: Keys
): Record<Keys[number], string | undefined> {
  return Object.fromEntries(keys.map((key) => [key, input[key]])) as Record<
    Keys[number],
    string | undefined
  >;
}

function parseWithSanitizedErrors<Output>(
  scope: string,
  schema: z.ZodType<Output>,
  input: unknown
): Output {
  const result = schema.safeParse(input);
  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues.map((issue) => {
    const path = issue.path.length === 0 ? "environment" : issue.path.join(".");
    return `${path}: ${issue.message}`;
  });
  throw new EnvironmentValidationError(scope, issues);
}

function assertNoDeviceOnlyKeys(input: EnvironmentInput): void {
  const present = DEVICE_ONLY_ENVIRONMENT_KEYS.filter((key) => input[key] !== undefined);
  if (present.length > 0) {
    throw new EnvironmentValidationError(
      "cloud",
      present.map((key) => `${key}: belongs only in the Companion OS credential store`)
    );
  }
}

export function parsePublicEnvironment(input: EnvironmentInput) {
  const exposedPrivateKeys = Object.keys(input).filter(
    (key) => browserForbiddenKeys.has(key) && input[key] !== undefined
  );
  if (exposedPrivateKeys.length > 0) {
    throw new EnvironmentValidationError(
      "browser",
      exposedPrivateKeys.map((key) => `${key}: is not browser-safe`)
    );
  }

  return parseWithSanitizedErrors(
    "public",
    publicEnvironmentSchema,
    pickEnvironment(input, PUBLIC_ENVIRONMENT_KEYS)
  );
}

export function parseServerEnvironment(input: EnvironmentInput) {
  assertNoDeviceOnlyKeys(input);
  return parseWithSanitizedErrors(
    "server",
    serverEnvironmentSchema,
    pickEnvironment(input, SERVER_ENVIRONMENT_KEYS)
  );
}

export function parseMigrationEnvironment(input: EnvironmentInput) {
  return parseWithSanitizedErrors(
    "migration",
    migrationEnvironmentSchema,
    pickEnvironment(input, MIGRATION_ENVIRONMENT_KEYS)
  );
}

export function parseToolingEnvironment(input: EnvironmentInput) {
  return parseWithSanitizedErrors(
    "tooling",
    toolingEnvironmentSchema,
    pickEnvironment(input, TOOLING_ENVIRONMENT_KEYS)
  );
}

export type IntegrationName = "braintrust" | "daytona" | "fireworks" | "github" | "r2";

export function getIntegrationReadiness(
  environment: z.output<typeof serverEnvironmentSchema>
): Readonly<Record<IntegrationName, boolean>> {
  return {
    braintrust:
      environment.BRAINTRUST_API_KEY !== undefined &&
      environment.BRAINTRUST_API_URL !== undefined &&
      environment.BRAINTRUST_PROJECT_NAME !== undefined,
    daytona:
      environment.DAYTONA_API_KEY !== undefined &&
      environment.DAYTONA_API_URL !== undefined &&
      environment.DAYTONA_TARGET !== undefined,
    fireworks:
      environment.FIREWORKS_API_KEY !== undefined &&
      environment.FIREWORKS_BASE_URL !== undefined &&
      environment.FIREWORKS_MODEL_ID !== undefined,
    github:
      environment.GITHUB_APP_ID !== undefined &&
      environment.GITHUB_APP_CLIENT_ID !== undefined &&
      environment.GITHUB_APP_CLIENT_SECRET !== undefined &&
      environment.GITHUB_APP_SLUG !== undefined &&
      environment.GITHUB_APP_WEBHOOK_SECRET !== undefined &&
      environment.GITHUB_APP_PRIVATE_KEY_BASE64 !== undefined,
    r2:
      environment.R2_S3_ENDPOINT !== undefined &&
      environment.R2_S3_ACCESS_KEY_ID !== undefined &&
      environment.R2_S3_SECRET_ACCESS_KEY !== undefined &&
      environment.R2_BUCKET_NAME !== undefined
  };
}
