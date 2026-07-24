import type { CanonicalJsonValue, Sha256Digest } from "../ports/common.js";

const SECRET_PATTERNS: readonly RegExp[] = [
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/iu,
  /\bAKIA[0-9A-Z]{16}\b/u,
  /\b(?:gh[pousr]|github_pat)_[A-Za-z0-9_]{16,}\b/u,
  /\b(?:glpat-|npm_|sk-|sk_|hf_|xox[baprs]-)[A-Za-z0-9_-]{12,}\b/u,
  /\bAIza[0-9A-Za-z_-]{20,}\b/u,
  /\bBearer\s+[A-Za-z0-9._~+/-]{12,}={0,2}\b/iu,
  /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u,
  /(?:^|[^A-Za-z0-9])(?:[A-Za-z0-9]+[_-])*(?:api[_-]?key|access[_-]?token|auth[_-]?token|auth(?:orization)?|credential|database[_-]?url|password|private[_-]?key|registry[_-]?token|secret(?:[_-]?access[_-]?key)?|token)\s*[:=]\s*["']?[^\s"',;]{4,}/iu,
  /\b[a-z][a-z0-9+.-]*:\/\/[^/\s:@]+:[^/\s@]+@/iu
];

const PROMPT_INJECTION_PATTERNS: readonly RegExp[] = [
  /\bignore\s+(?:all\s+|any\s+|the\s+)?(?:previous|prior|above)\s+(?:instructions?|messages?|rules?)/iu,
  /\b(?:system|developer)\s+(?:message|prompt|instructions?)\b/iu,
  /\b(?:reveal|return|print|expose|leak)\b.{0,48}\b(?:secret|token|credential|prompt)\b/iu,
  /\bexfiltrat(?:e|ion)\b/iu,
  /\boverride\b.{0,32}\b(?:instructions?|policy|guardrails?)\b/iu,
  /<\s*\/?\s*(?:system|developer|assistant)\s*>/iu
];

export class BoundaryValidationError extends Error {
  readonly code: "invalid_json_value" | "prompt_injection_detected" | "secret_material_detected";

  constructor(code: BoundaryValidationError["code"]) {
    super(code);
    this.name = "BoundaryValidationError";
    this.code = code;
  }
}

export function isSha256Digest(value: unknown): value is Sha256Digest {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/u.test(value);
}

export function containsSecretMaterial(value: string): boolean {
  return SECRET_PATTERNS.some((pattern) => pattern.test(value));
}

export function containsPromptInjection(value: string): boolean {
  return PROMPT_INJECTION_PATTERNS.some((pattern) => pattern.test(value));
}

export function assertSafeText(
  value: string,
  options: { readonly rejectPromptInjection: boolean }
): void {
  if (containsSecretMaterial(value)) {
    throw new BoundaryValidationError("secret_material_detected");
  }
  if (options.rejectPromptInjection && containsPromptInjection(value)) {
    throw new BoundaryValidationError("prompt_injection_detected");
  }
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const prototype: unknown = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function isCanonicalArray(value: CanonicalJsonValue): value is readonly CanonicalJsonValue[] {
  return Array.isArray(value);
}

function isUnknownArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

export function toCanonicalJson(value: unknown, depth = 0): CanonicalJsonValue {
  if (depth > 32) {
    throw new BoundaryValidationError("invalid_json_value");
  }
  if (value === null || typeof value === "string" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new BoundaryValidationError("invalid_json_value");
    }
    return value;
  }
  if (isUnknownArray(value)) {
    if (value.length > 1_000) {
      throw new BoundaryValidationError("invalid_json_value");
    }
    return value.map((item) => toCanonicalJson(item, depth + 1));
  }
  if (!isPlainRecord(value)) {
    throw new BoundaryValidationError("invalid_json_value");
  }
  const result: Record<string, CanonicalJsonValue> = {};
  const entries = Object.entries(value);
  if (entries.length > 1_000) {
    throw new BoundaryValidationError("invalid_json_value");
  }
  for (const [key, item] of entries) {
    if (key.length === 0 || key.length > 256) {
      throw new BoundaryValidationError("invalid_json_value");
    }
    result[key] = toCanonicalJson(item, depth + 1);
  }
  return result;
}

export function assertCanonicalJsonSafe(
  value: CanonicalJsonValue,
  options: { readonly rejectPromptInjection: boolean }
): void {
  if (typeof value === "string") {
    assertSafeText(value, options);
    return;
  }
  if (value === null || typeof value !== "object") {
    return;
  }
  if (isCanonicalArray(value)) {
    for (const item of value) {
      assertCanonicalJsonSafe(item, options);
    }
    return;
  }
  for (const [key, item] of Object.entries(value)) {
    assertSafeText(key, options);
    assertCanonicalJsonSafe(item, options);
  }
}
