export const testkitPackageStatus = "foundation" as const;

export {
  CorpusValidationError,
  DirectoryCorpusSource,
  FAILURE_CORPUS_SCHEMA_VERSION,
  loadFailureCorpusSet,
  type CorpusTextSource,
  type CorpusValidationErrorCode,
  type FailureCorpus,
  type FailureCorpusCategory,
  type FailureCorpusFixture,
  type FailureCorpusManifest,
  type FailureCorpusManifestEntry,
  type LoadedFailureCorpus,
  type LoadedFailureCorpusSet
} from "./corpus/index.js";

export {
  CanonicalSha256Hasher,
  ConfigurableFailpoints,
  DeterministicClock,
  DeterministicIdGenerator,
  FailpointError,
  canonicalizeJson,
  type FailpointContext,
  type FailpointPlan
} from "./runtime/index.js";

export * from "./fakes/index.js";
