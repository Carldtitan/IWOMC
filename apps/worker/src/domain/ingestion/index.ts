export { canonicalBytes, canonicalJson, sha256 } from "./canonical.js";
export { IngestionError, type IngestionErrorCode } from "./errors.js";
export { parseCompanionUploadBatch } from "./parse.js";
export type * from "./ports.js";
export { DefenseInDepthSecretGuard } from "./REDACTED-guard.js";
export { batchLogicalDigest, IngestionService } from "./service.js";
export type * from "./types.js";
export { computeCompanionEventHash, verifyCompanionBatch } from "./verification.js";
