# Implementation Plan: Environment Reconciler

## Overview

This is a dependency-ordered plan for one developer. It follows the requirements-first structure used by the `fairy` reference, but it does not split work by owner or assume parallel human implementation.

The plan deliberately proves one complete product loop before broadening provider, language, platform, or team coverage:

```text
observe a real action
→ prove its environment effect
→ detect a deterministic repository disagreement
→ generate a bounded Fireworks candidate
→ materialize it through a native manager
→ validate it in a clean Daytona sandbox
→ show the evidence
→ apply the exact verified patch through GitHub
```

Core correctness, privacy, fault-isolation, cleanup, and end-to-end tests are mandatory. A task is complete only when its implementation, tests, and stated exit condition are complete.

## Execution Rules

1. Work through top-level tasks in numeric order.
2. Do not begin broad ecosystem work before Checkpoint 1 passes.
3. Do not mark an adapter `full_native` until its entire conformance suite passes.
4. Do not mark a candidate `verified` in a fixture, mock, or UI unless the same server-side invariant used in production permits it.
5. Keep live integration tests separate from deterministic local tests, but run both before the corresponding release checkpoint.
6. Add every real failure discovered during development to the appropriate regression corpus before fixing it.
7. Update `requirements.md`, then `design.md`, then this file if a product decision changes; do not patch implementation tasks around an undocumented architecture change.

## Tasks

### Milestone 1: Repository and protocol foundation

- [x] 1. Scaffold the TypeScript/Rust monorepo
  - [x] 1.1 Create the root `package.json`, `pnpm-workspace.yaml`, `tsconfig.base.json`, `vitest.workspace.ts`, ESLint configuration, Prettier configuration, and shared scripts.
  - [x] 1.2 Create the root Cargo workspace in `Cargo.toml` and pin the Rust toolchain in `rust-toolchain.toml`.
  - [x] 1.3 Create these application packages:
    - `apps/worker/`
    - `apps/web/`
    - `apps/extension/`
    - `crates/companion/`
  - [x] 1.4 Create these shared packages:
    - `packages/contracts/`
    - `packages/db/`
    - `packages/reconciler/`
    - `packages/adapters/`
    - `packages/integrations/`
    - `packages/testkit/`
  - [x] 1.5 Create `fixtures/`, `evals/`, `tests/contract/`, `tests/integration/`, `tests/e2e/`, and `tests/performance/`.
  - [x] 1.6 Add strict TypeScript, `cargo fmt --check`, Clippy with warnings denied, Vitest, Rust unit tests, and Playwright scripts.
  - [x] 1.7 Implement environment validation in `packages/contracts/src/env.ts` using `.env.example` as the documented contract; separate server-only, migration-only, and public values.
  - [x] 1.8 Add CI jobs for formatting, linting, TypeScript compilation, Rust compilation, unit tests, contract generation, secret scanning, and extension packaging.
  - [x] 1.9 Test missing, malformed, and accidentally browser-exposed environment variables.
  - [x] 1.10 Create `wrangler.jsonc` with Worker static-asset, Queue, Workflow, R2, Neon, and `nodejs_compat` configuration stubs; pin the Daytona SDK version instead of relying on an unbounded latest dependency.
  - **Exit:** A clean checkout can install, type-check, compile, test empty packages, and package an empty VSIX without using a real sponsor credential.
  - _Requirements: R20.9, R21.7, R22.6_

- [x] 2. Define canonical versioned contracts
  - [x] 2.1 Create canonical JSON Schemas in `packages/contracts/schema/` for:
    - workspace, project, device, realm, and layer;
    - provider capability profile and session;
    - observation event, action envelope, capture gap, and snapshot;
    - source input, working-tree bundle, submodule/LFS identity, and object metadata;
    - declared, locked, resolved, installed, used, observed-action, and validated graphs;
    - finding and evidence reference;
    - behavior contract and optimality policy;
    - candidate plan, candidate patch, and candidate lifecycle;
    - validation target, batch, job, phase, outcome, and attestation;
    - validation job key, cache entry, concurrency lease, external operation, secret reference/binding, and Braintrust outbox record;
    - recommendation, approval, and audit event;
    - extension/companion IPC and public API payloads.
  - [x] 2.2 Generate TypeScript types into `packages/contracts/src/generated/`.
  - [x] 2.3 Generate or validate matching Rust types in `crates/companion/src/contracts/generated/`.
  - [x] 2.4 Represent `unknown`, `partial`, `not_applicable`, `unsupported`, and `inconclusive` explicitly; never use a missing Boolean to mean one of them.
  - [x] 2.5 Represent verification as a scoped attestation bound to source, patch, targets, behavior contract, policy, rules, adapters, and validator versions; do not create a standalone `isVerified` field.
  - [x] 2.6 Add golden JSON fixtures in `tests/contract/fixtures/`.
  - [x] 2.7 Test TypeScript-to-Rust round trips, unsupported schema versions, additive compatibility, and explicit migration for breaking versions.
  - [x] 2.8 Add a CI check that fails when generated contracts differ from the checked-in schema.
  - **Exit:** The extension, companion, Worker, tests, and future integrations share one versioned protocol and can round-trip every MVP payload.
  - _Requirements: R3.2, R5, R6.1, R6.7, R8, R12.6-R12.7, R14.8, R15.2, R21.7_

- [x] 3. Create the deterministic testkit and initial corpora
  - [x] 3.1 Implement clocks, ID generators, content hashing, fake queues, fake object storage, fake GitHub, fake Fireworks, fake Braintrust, and fake Daytona clients in `packages/testkit/`.
  - [x] 3.2 Create `fixtures/e2e/npm-undeclared-used/`: source imports a package absent from `package.json`, while a mutable local fixture can succeed because that package is installed.
  - [x] 3.3 Create provider fixtures for normal, failed, interrupted, missing-terminal-event, subagent, and human-modified command lifecycles.
  - [x] 3.4 Create `fixtures/security/secrets/` with synthetic API keys, passwords, URL credentials, connection strings, private keys, registry tokens, `.env` values, and benign high-entropy controls.
  - [x] 3.5 Create `fixtures/validation-failures/` for provisioning, DNS, registry, resource, timeout, unsupported-target, cleanup, missing-package, parse, build, and test failures.
  - [x] 3.6 Create graph/rule fixtures for install-then-remove, hidden global state, stale lock, transient experiment, unknown actor, concurrent human/agent actions, and unsupported format.
  - [x] 3.7 Version each corpus and give every fixture a documented expected result.
  - **Exit:** Core development can proceed without depending on live external services, and every dangerous negative state has a reusable fixture.
  - _Requirements: R22.1-R22.5_

### Milestone 2: Durable application and local privacy boundary

- [x] 4. Implement the Neon persistence model and migrations
  - [x] 4.1 Create Drizzle schemas under `packages/db/src/schema/` for all tables named in `design.md`.
  - [x] 4.2 Add workspace ID to every tenant-owned table and centralize workspace-scoped query helpers.
  - [x] 4.3 Add unique constraints for observation event IDs, stream sequences, upload batches, GitHub delivery IDs, workflow idempotency keys, candidate-target jobs, and attestation digests.
  - [x] 4.4 Store only indexes and metadata for large objects; create `object_metadata` references for private R2 payloads.
  - [x] 4.5 Add explicit candidate, validation-job, recommendation, and cleanup state-transition constraints.
  - [x] 4.6 Add policy version, behavior-contract version, support capability, consent, retention, deletion, and audit metadata.
  - [x] 4.7 Generate the first migration in `packages/db/migrations/`.
  - [x] 4.8 Implement development seed data containing one user, workspace, repository, device, and project without synthetic verification results.
  - [x] 4.9 Test migration application, idempotent insertion, unique constraints, state transitions, foreign keys, and cross-workspace isolation.
  - [x] 4.10 Add and test the external-operation ledger, Braintrust trace outbox, source-input/bundle, invitation/comment, device-credential, support-registry, cache/dedup/lease, retention/export/delete, secret-reference, and cleanup-lease tables named in `design.md`.
  - [x] 4.11 Implement an append-only audit service for authentication/installation changes, policy/contract edits, approvals, external side effects, GitHub writes, retention/export/deletion actions, and cleanup escalation; test actor, workspace, object, time, and outcome binding.
  - **Exit:** A disposable Neon/local Postgres database can migrate from empty, seed, accept duplicate inputs safely, and reject cross-workspace queries in integration tests.
  - _Requirements: R2, R6.4, R12.6-R12.7, R17, R18.4, R20.9, R21.7_

- [x] 5. Build the Companion foundation, key storage, redaction, and encrypted spool
  - [x] 5.1 Implement configuration, structured local logging, graceful shutdown, and health reporting in `crates/companion/src/main.rs`.
  - [x] 5.2 Implement OS credential-store access for the device signing key, local encryption key, and device-scoped HMAC key.
  - [x] 5.3 Implement the local SQLite WAL schema in `crates/companion/src/spool/`.
  - [x] 5.4 Encrypt sensitive spool fields with a versioned authenticated-encryption envelope and never store the plaintext data key in SQLite.
  - [x] 5.5 Implement local redaction modules for:
    - environment-variable values;
    - command arguments and output;
    - credential-shaped strings;
    - URLs and connection strings;
    - private keys and certificates;
    - repository, username, host, and home-path pseudonyms;
    - provider payload fields;
    - user-defined patterns.
  - [x] 5.6 Implement device-scoped keyed equality fingerprints for selected environment variables.
  - [x] 5.7 Implement mandatory monotonic `localSequence`, optional provider/source sequence, append-only hash chaining over local sequence, and Ed25519 chain-head signing.
  - [x] 5.8 Implement offline batch creation, acknowledgement, retry cursor, and safe deletion after server acknowledgement.
  - [x] 5.9 Test restart recovery, network loss, duplicate acknowledgement, key rotation, hash-chain tampering, spool corruption, and disk-pressure behavior.
  - [x] 5.10 Run the seeded secret corpus against logs, SQLite, serialized batches, crash messages, and HMAC output.
  - **Exit:** A redacted event can be durably accepted offline, survive restart, upload idempotently later, and reveal no seeded plaintext secret.
  - _Requirements: R6.2-R6.7, R20.1-R20.6, R20.10, R21.3-R21.4, R22.4_

- [ ] 6. Implement GitHub sign-in, workspace setup, repository linking, and device enrollment
  - [ ] 6.1 Create the Hono Worker entry/auth route group, then implement GitHub App OAuth start/callback routes in `apps/worker/src/auth/github/` with state, PKCE, exact callback validation, and expiring product sessions.
  - [x] 6.2 Implement installation verification and repository listing through the authenticated user's user-token/repository intersection, not every repository visible to an installation.
  - [x] 6.3 Implement personal-workspace creation and project/repository linking in `apps/worker/src/api/workspaces/` and `apps/worker/src/api/projects/`.
  - [x] 6.4 Implement an MVP workspace invite link for an authenticated GitHub user with simple `owner` and `member` roles; reserve the expanded role matrix for private alpha.
  - [x] 6.5 Implement one-time, short-lived, workspace-bound device enrollment codes in `apps/worker/src/api/device-enrollments/`, tied to a device-generated public key.
  - [x] 6.6 Register the device public signing key and issue only a revocable product device credential.
  - [ ] 6.7 Implement encrypted server-side GitHub user/refresh-token storage, `HttpOnly`/`Secure`/`SameSite` browser sessions, CSRF protection, logout, device revocation, and installation suspension handling.
  - [x] 6.8 Ensure no GitHub, Daytona, Fireworks, Braintrust, database, or encryption root credential is returned to the browser or extension.
  - [x] 6.9 Implement the minimum least-privileged GitHub repository client: request one-repository reduced permissions, fetch an exact commit archive, and after explicit approval create Git blobs/tree/commit for the exact Source_Input plus candidate patch, verify the resulting tree digest, update a deterministic branch ref, and open a pull request with expected-head checks.
  - [ ] 6.10 Test OAuth state/PKCE, spoofed installation IDs, token expiry/refresh, repository authorization, invite authorization/expiry, revoked installations, enrollment expiry, device revocation, and exact-commit/patch binding.
  - **Exit:** A user can sign in, link one authorized repository, invite one collaborator, enroll one device, and exercise the minimal exact-patch PR client without broad or client-side credentials.
  - _Requirements: R2.1-R2.8, R17.5, R20.9_

- [ ] 7. Implement the thin ingestion control plane
  - [ ] 7.1 Extend the existing Hono Worker with device-ingestion, object-finalize, health, and queue route groups plus shared schema/error middleware.
  - [x] 7.2 Implement authenticated device endpoints:
    - `POST /v1/projects/:id/events/batches`
    - `POST /v1/projects/:id/snapshots`
    - `POST /v1/projects/:id/capabilities`
    - `POST /v1/projects/:id/chain-anchors`
    - `GET /v1/devices/:id/status`
  - [x] 7.3 Verify request size, schema, workspace/project/device authorization, event chain, stream sequence, and replay protection before accepting a batch.
  - [x] 7.4 Add a server-side defense-in-depth secret guard before R2, Queue, Neon, Fireworks, Braintrust, or logs.
  - [x] 7.5 Store compressed/encrypted immutable payloads in private R2 and an idempotent ingest record in Neon.
  - [x] 7.6 Enqueue only a content-addressed pointer after durable object storage succeeds.
  - [x] 7.7 Implement `apps/worker/src/queues/event-consumer.ts` to normalize event headers, snapshots, capability reports, and capture gaps.
  - [x] 7.8 Implement DLQ handling and a reconciliation job for `stored_not_enqueued` or stalled batches.
  - [x] 7.9 Return a signed chain-anchor receipt to the Companion.
  - [ ] 7.10 Test duplicate batches, out-of-order delivery, missing sequence, bad chain/signature, oversized input, R2 failure, Queue failure, Neon failure, Worker restart, and DLQ replay.
  - [ ] 7.11 Implement large-object envelope encryption, direct upload, and finalize verification: uploader ephemeral X25519 key, random per-object AES-256-GCM key/nonce, server-master wrapped key, authenticated metadata, expected size/digests, shortest-practical object authorization, one-time sealed-key exchange for trusted Daytona bootstrap, and a rule that URLs/tokens/keys never enter durable Workflow state, logs, model traces, command arguments, or cache keys.
  - [x] 7.12 Publish a versioned, idempotent internal `checkpoint.reconcile_requested` message only after the checkpoint's event/snapshot/source references are durable; support material-action-stabilized, session-end, PR-update, and manual-scan reasons and define its consumer contract for Task 12.
  - [ ] 7.13 Implement and test `POST /v1/objects/:id/download-authorizations` and `POST /v1/objects/:id/key-exchanges`. Require a one-time validation-job-bound bootstrap token plus sandbox ephemeral X25519 public key; verify job, workspace, object, target, expiry, and single use before returning shortest-practical download authorization and a sealed per-object key, never the server master key.
  - **Exit:** Companion batches reach R2/Queue/Neon exactly once at the logical level, and no invalid or secret-bearing batch is partially accepted.
  - _Requirements: R6.3-R6.7, R19.5, R20.1, R20.9, R21.3-R21.5_

- [ ] 8. Build the extension shell and secure local IPC
  - [x] 8.1 Implement activation/deactivation in `apps/extension/src/extension.ts`.
  - [x] 8.2 Package and launch the matching Companion binary through `apps/extension/src/companion/`.
  - [x] 8.3 Implement named-pipe IPC on Windows and Unix-domain-socket IPC on Linux/macOS with a startup challenge and request validation.
  - [x] 8.4 Implement browser-based **Connect workspace**, device enrollment return, project binding, logout, and disconnect.
  - [x] 8.5 Add status states and the commands specified in `design.md`.
  - [x] 8.6 Implement consent screens for observation scope and provider-hook installation. Show raw observational content as unavailable and off in MVP; do not expose an opt-in until Task 31 implements its separate controls.
  - [ ] 8.7 Show provider, realm, permission, upload, and adapter coverage without a false global “all clear.”
  - [ ] 8.8 Test extension activation, companion binary hash mismatch, missing binary, IPC authentication failure, offline state, enrollment expiry, consent denial, pause/resume, and recovery after Companion restart.
  - **Exit:** A VSIX can pair one repository/device, launch the Companion, show honest status, and create a manual checkpoint without sponsor keys in the extension.
  - _Requirements: R1, R2.5-R2.8, R3.7-R3.9, R18.1-R18.2, R20.6_

### Milestone 3: First observation and native ecosystem slice

- [ ] 9. Implement realm discovery, action envelopes, and targeted inventories
  - [ ] 9.1 Implement repository, process, terminal, host realm, and active dependency-layer discovery in `crates/companion/src/realm/`.
  - [ ] 9.2 Implement platform abstractions in `crates/companion/src/platform/` for process ancestry and repository-scoped filesystem events.
  - [ ] 9.3 Implement baseline, pre-action, stabilized post-action, session-end, PR/manual checkpoint, and timeout snapshot epochs in `crates/companion/src/snapshots/`.
  - [ ] 9.4 Implement native read-only runtime, package, path, service, shell-profile, and configuration inventories under `crates/companion/src/inventory/`.
  - [x] 9.5 Implement action correlation under `crates/companion/src/correlation/` using provider IDs, process ancestry, terminal ID, working directory, realm/layer, and action windows.
  - [x] 9.6 Implement actor classes, separate initiation/execution/approval fields, independent confidence factors, and `unknown`/`mixed` restraint.
  - [x] 9.7 Preserve install-then-remove operations and overlapping actions independently of final inventory.
  - [x] 9.8 Emit explicit gaps for missing privilege, missing pre-state, stabilization timeout, observer loss, scope exclusion, and unsupported realm.
  - [x] 9.9 Test process descendants, failed actions, concurrent human/agent actions, install-then-remove, overlap, timeout, unknown actor, global-versus-project layer, and realm separation.
  - [ ] 9.10 Implement checkpoint Source_Input identity: record the exact Git commit/tree, submodule and LFS identities or gaps, and for an eligible dirty tree create an encrypted content-addressed patch/untracked-file bundle after local ignore, size, and secret-policy checks; otherwise defer validation explicitly.
  - [ ] 9.11 Give Source_Input bundles a validation-only authorization class and short retention policy, exclude them from Fireworks/Braintrust, and test finalize, expiry, deletion, missing LFS/submodule, ignored-file, and stale-base behavior.
  - [ ] 9.12 Keep provider hooks non-gating: durably queue/redact the local action, acknowledge without waiting for cloud work, and asynchronously create the reconciliation trigger as soon as a material action stabilizes; test all four R16.2 trigger reasons.
  - **Exit:** A synthetic or manual process action creates a redacted, attributed action envelope with pre/post evidence or an explicit reason why that proof is incomplete.
  - _Requirements: R4, R5, R16.1-R16.2, R21.1-R21.2, R21.6, R22.2_

- [ ] 10. Implement the first Codex provider adapter
  - [x] 10.1 Create `crates/companion/src/providers/codex.rs` and the local provider-event receiver.
  - [x] 10.2 Normalize documented Codex session, turn, tool, command, file, approval, subagent, and terminal-state events available on the selected MVP surface.
  - [x] 10.3 Publish a capability profile for the exact Codex surface, provider version, adapter version, and enabled hooks.
  - [x] 10.4 Link likely environment-changing actions to targeted snapshot envelopes before execution when the hook permits it.
  - [ ] 10.5 Keep the observation lease open through a bounded descendant-process drain.
  - [x] 10.6 Record intent and failure without installed effect when a command fails.
  - [x] 10.7 Emit capture gaps for missing sequence, missing terminal event, disabled hook, unsupported hosted execution, or invalid provider payload.
  - [x] 10.8 Remove private reasoning and raw prompt/response fields before normalized persistence.
  - [x] 10.9 Add versioned recorded fixtures in `fixtures/providers/codex/`.
  - [x] 10.10 Test normal, interrupted, failed, duplicate, out-of-order, subagent, human-approved, human-modified, descendant-installer, and hook-disabled cases.
  - **Exit:** One supported Codex local surface can start/end a session automatically and correlate an npm installation with its process and state effects.
  - _Requirements: R3, R4.2, R5, R20.1-R20.6_

- [ ] 11. Implement the native adapter registry and npm adapter
  - [ ] 11.1 Define the shared AdapterManifest/graph protocol, explicit local-inventory/repository-parsing/mutation/validation capabilities, generated-file rules, precedence rules, manager-selection rules, Rust `LocalInventoryAdapter`, TypeScript `RepositoryAdapter`, isolated `IsolatedAdapterRunner`, support levels, and registry; do not create one cross-runtime adapter object.
  - [x] 11.2 Implement generic observed-only discovery that can record unknown files/actions but cannot propose mutations.
  - [x] 11.3 Implement `packages/adapters/src/node/npm.ts`.
  - [x] 11.4 Discover npm project roots and workspaces without crossing repository boundaries.
  - [x] 11.5 Parse `package.json` and supported `package-lock.json` versions semantically.
  - [ ] 11.6 Implement `crates/companion/src/inventory/node_npm.rs` for safe local read-only Node/npm version, scope, layer, and structured `npm ls --json` inventory.
  - [ ] 11.7 Parse the local native result in TypeScript and obtain resolved graphs through structured npm output only in the isolated runner.
  - [x] 11.8 Preserve production/development/optional/peer, direct/transitive, workspace, platform, and engine semantics.
  - [x] 11.9 Implement conservative JS/TS import and executable-use evidence for the vertical fixture while marking dynamic use uncertain.
  - [x] 11.10 Define structured native operations for add, remove, update, lock, clean install, graph, build, test, and smoke.
  - [ ] 11.11 Add npm conformance fixtures for workspaces, peer dependencies, malformed/stale locks, global-versus-local scope, unsupported lock versions, lifecycle scripts, and idempotent parsing.
  - [x] 11.12 Prevent a second package manager or text-only lockfile edit from entering an npm candidate.
  - [ ] 11.13 Test the Rust inventory result against the canonical schema and the TypeScript parser so the same manager/version/scope identities survive the runtime boundary.
  - [ ] 11.14 Seed observed-only recognizers and fixtures for Poetry, Conda/Mamba/Micromamba, pnpm, Yarn, Bun, Cargo/rustup, CMake, vcpkg, Conan, HTML/CSS ownership, Dockerfiles, Compose, Dev Containers, and common CI/bootstrap files named by R7.5.
  - **Exit:** npm has complete repository/local/isolated implementation ready for Daytona conformance; named and unknown managers have honest observed-only profiles. npm remains `native_validation` until Task 22 passes the full R22.5 conformance suite.
  - _Requirements: R7.1-R7.5, R7.7-R7.10, R12.1-R12.4, R22.5_

- [ ] 12. Implement the seven graphs and first deterministic rules
  - [x] 12.1 Create immutable node, edge, graph-set, source-location, adapter/input identity, confidence, and canonicalization types in `packages/reconciler/src/graphs/`.
  - [x] 12.2 Build declared, locked, resolved, installed, used, observed-action, and validated graph fragments from normalized inputs.
  - [ ] 12.3 Implement deterministic rules for:
    - used and installed but undeclared;
    - observed installation without matching declaration;
    - hidden global or base-image dependency;
    - manifest/lock/resolution or manager-version disagreement;
    - declared but absent from clean resolution;
    - runtime, toolchain, architecture, realm, or dependency-layer mismatch;
    - required system package, service, executable, or setup step absent from repository intent;
    - repository intent contradicted by observed-only CI, container, Dev Container, or bootstrap configuration;
    - redundant, stale, shadowed, or apparently unused dependency, conservatively labelled when necessity evidence is incomplete;
    - failed installation without installed-state effect;
    - unsupported or incomplete capture.
  - [x] 12.4 Attach evidence, counterevidence, affected targets, plausible alternatives, realm/layer, source locations, adapter/input versions, support level, rule version, gaps, and independent observation/attribution/semantics/necessity/validation confidence.
  - [x] 12.5 Keep actor attribution separate from environment effect and dependency necessity.
  - [x] 12.6 Ensure an installed package alone and a missing static import alone never trigger add/remove recommendations.
  - [x] 12.7 Add stable finding identifiers and supersession behavior across repeated checkpoints.
  - [x] 12.8 Use property tests to prove deterministic output, ecosystem identity isolation, attribution restraint, gap preservation, and installed-state restraint.
  - [ ] 12.9 Implement `apps/worker/src/services/reconcile-checkpoint.ts` and wire the Queue consumer to load durable inputs, build graphs, run rules, persist/supersede findings, and enqueue candidate-generation work idempotently for material-action-stabilized, session-end, PR-update, and manual-scan triggers.
  - **Exit:** The npm fixture deterministically produces one evidence-backed hidden-dependency finding, while every negative fixture produces its expected non-finding or uncertainty state.
  - _Requirements: R8, R9, R16.2, R22.2-R22.3_

- [ ] 13. Implement behavior-contract discovery and the default policy
  - [ ] 13.1 Persist an editable human-authored project goal and discover npm install/build/lint/typecheck/test/smoke/benchmark commands from package scripts and CI configuration.
  - [ ] 13.2 Implement behavior-contract step IDs/order, enable/disable, discovery evidence/fingerprint, review state, acceptance actor/time, invalidation source, working directory, realm/target applicability, timeout, expected exit statuses, secret references, and assertions.
  - [x] 13.3 Implement the default policy with hard target/behavior gates followed by dependency-count, reproducibility, supported-version, and change-surface preferences.
  - [x] 13.4 Implement candidate, concurrency, retry, elapsed-time, and cost budgets.
  - [x] 13.5 Ensure clean installation without an accepted behavior contract can produce only `reconstruction_passed`.
  - [ ] 13.6 Add property tests proving hard constraints dominate, policies are immutable once referenced, and changes invalidate affected candidates.
  - [ ] 13.7 Implement authenticated project-goal, behavior-contract, and policy read/edit/reorder/enable/disable/accept APIs with optimistic version checks and audit events.
  - **Exit:** The vertical fixture has an accepted, versioned behavior contract and a default policy that cannot be overridden by an LLM.
  - _Requirements: R10, R13.1-R13.3, R15.8_

### Milestone 4: Candidate reasoning, proof, and product surface

- [x] 14. Implement Fireworks candidate generation and Braintrust evaluation
  - [x] 14.1 Create the Fireworks transport, reasoning-packet builder, CandidatePlan schema (including affected files and expected validation impact), and bounded retry policy in `packages/integrations/src/fireworks/`.
  - [x] 14.2 Send only the finding, relevant redacted graph slice and semantic file/AST fragments, project goal, behavior-contract summary, repository conventions, capability summary, permitted native operations, policy summary, and prior validation summary.
  - [x] 14.3 Reject invented evidence IDs, unknown files, unsupported operations, package-manager switching, disallowed dependencies, policy violations, and invalid structured output.
  - [x] 14.4 Convert accepted plans to native adapter operations; do not allow Fireworks to write arbitrary final files or lockfiles.
  - [x] 14.5 Record model, prompt/template, sampling, adapter/tool versions, and redacted input/output fingerprints.
  - [x] 14.6 Create Braintrust tracing in `packages/integrations/src/braintrust/` and instrument only the allowed spans/fields from `design.md`.
  - [x] 14.7 Create eval cases for the first finding, hallucinated package, fabricated evidence, manager switching, ambiguous evidence, dynamic dependency, prompt injection, invalid JSON, timeout, and secret-bearing input.
  - [x] 14.8 Implement the encrypted R2/Neon `braintrust_trace_outbox` with trace ID, payload digest, attempts, next attempt, and terminal export state; do not use Worker memory as the retry spool.
  - [x] 14.9 Make deterministic finding/candidate state independent of Braintrust availability.
  - [x] 14.10 Add deterministic native quick-fix and user-authored semantic-operation paths for Fireworks failure; both pass the same guard, materialization, and validation gates.
  - [x] 14.11 Implement a model/template registry and Braintrust evaluation promotion gate; a new default cannot activate until the configured validity, grounding, refusal, and secret-leakage thresholds pass.
  - [x] 14.12 Append the final validation summary class to the reasoning trace and expose pending/terminal trace-export failure through the MVP integration/operator status API.
  - [x] 14.13 Implement `apps/worker/src/services/generate-candidate.ts` to consume an accepted finding; reserve the deterministic Fireworks external operation and audit event before the call; run the selected candidate path; persist guard outcomes and candidate state; and start the validation Workflow idempotently.
  - **Exit:** Fireworks can produce an allowed npm operation for the fixture, malicious/invalid outputs are guard-rejected, and Braintrust contains no seeded plaintext secret.
  - _Requirements: R11, R12.1-R12.3, R19, R20.1-R20.6, R22.4_

- [ ] 15. Implement Daytona materialization, validation, and cleanup
  - [ ] 15.1 Pin the Daytona TypeScript SDK behind `packages/integrations/src/daytona/`, enable Cloudflare `nodejs_compat`, and keep a transport wrapper/direct-HTTPS fallback for individual incompatible methods.
  - [ ] 15.2 Persist each sandbox ID immediately and monitor it through bounded authoritative SDK reads or a verified `/v1/daytona/webhook` event plus final authoritative refresh; do not depend on a long-lived WebSocket surviving Workflow suspension.
  - [ ] 15.3 Implement immutable Source_Input materialization for exact Git commit archives and eligible encrypted working-tree bundles, including submodule/LFS identities or gaps, without giving Daytona a GitHub token or substituting an older commit.
  - [ ] 15.4 Reserve an `external_operations` row and emit an audit event before Fireworks/Daytona side effects; use deterministic workspace/batch/baseline-or-candidate/target/operation/TTL labels so retries reconcile an existing resource.
  - [ ] 15.5 Implement candidate materialization:
    - provision or reconcile a short-lived sandbox;
    - upload the exact encrypted source input through a shortest-practical authorization;
    - run the npm native operation through a trusted JSON-envelope runner without shell concatenation;
    - generate/verify the lockfile natively;
    - export exact patch and hashes;
    - run path-scope, secret, diff-size, semantic-reparse, manifest-lock, generated-file, policy, and operation-to-diff guards;
    - persist evidence;
    - delete the sandbox.
  - [x] 15.6 Implement MVP target derivation from workspace policy, repository/runtime selectors, CI matrices, and user confirmation. Resolve the supported case to one versioned Linux/Node/npm target whose immutable base identity includes snapshot ID/digest, baseline inventory digest, creation metadata, delivered capability report, resource policy, and enforceable default-deny or explicit registry/source egress policy; emit `unsupported_target_or_capability` for any additional required target rather than omitting it.
  - [x] 15.7 Expand every batch into the unchanged baseline plus conservative/additional bounded candidates by required target, using comparable Source_Input, base, policy, and behavior-contract inputs.
  - [ ] 15.8 Implement preflight, source preparation, resolve, clean install, graph verification, build, enabled lint, enabled type-check, test, smoke, optional benchmark, evidence persistence, and cleanup phases.
  - [ ] 15.9 Implement phase status/timing, trusted structured commands, structured derived diagnostics and bounded redacted excerpts with no full-stream capture, requested-versus-delivered resources, target/base identity, cache identity, artifact fingerprints, and the complete scoped VerificationAttestation.
  - [x] 15.10 Implement server-side verification as an invariant requiring the accepted behavior contract and a pass on every required target; if baseline already passes the claimed behavior, prohibit “reproduced and fixed” and use only the supported narrower hardening label.
  - [ ] 15.11 Delete sandboxes in `finally`, record confirmed deletion, and add a leased TTL janitor for orphan discovery, authoritative reconciliation, and retry.
  - [x] 15.12 Implement explicit unsupported, timed-out, security-blocked, infrastructure, resource-budget, inconclusive, and cleanup-failed outcomes.
  - [ ] 15.13 Test the full lifecycle, baseline semantics, duplicate Workflow attempts, webhook/poll recovery, egress inability, trusted-runner envelopes, and post-materialization guards with fakes, then run one live Daytona create/execute/collect/delete smoke job.
  - [ ] 15.14 Prove materialization state cannot be reused as final validation state and that no bearer URL, secret, source bundle, or log is persisted in Workflow state.
  - [x] 15.15 Implement the first production `apps/worker/src/workflows/validate-candidate.ts`: persist baseline/candidate jobs, execute the one-target matrix, aggregate terminal results, create the scoped attestation/recommendation, update the Braintrust summary link, and leave advanced cache/lease/multi-target hardening to Task 21.
  - **Exit:** The unchanged fixture fails clean reconstruction or behavior, the exact native candidate passes, and every sandbox is confirmed deleted or visibly escalated.
  - _Requirements: R4.11, R12.2-R12.7, R14, R15, R16.5, R17.1-R17.2, R20.7-R20.8, R20.11, R21.10, R22.1_

- [ ] 16. Build the MVP web workspace
  - [x] 16.1 Build the authenticated React application shell in `apps/web/src/app/`.
  - [ ] 16.2 Implement workspace/project navigation and the project overview.
  - [x] 16.3 Implement capture/support coverage by provider surface, realm, permission, adapter, manager, and target.
  - [x] 16.4 Implement session list and causal timeline with concurrent events left visibly concurrent.
  - [x] 16.5 Implement finding detail with actual state, declared state, action evidence, actor confidence, gaps, and next proof needed.
  - [x] 16.6 Implement candidate diff/rationale, static guard results, behavior contract, and policy summary.
  - [x] 16.7 Implement candidate-by-target validation matrix, live phase state, terminal classification, structured diagnostics, cleanup, and scoped attestation.
  - [x] 16.8 Implement incremental cursor polling and ETags rather than adding a new real-time infrastructure service.
  - [x] 16.9 Never collapse partial capture, unknown actor, infrastructure failure, unsupported target, inconclusive, or stale proof into a generic green/red badge.
  - [ ] 16.10 Implement basic persisted finding comments and explicit candidate approval records with audit events for the MVP `owner` and `member` roles.
  - [ ] 16.11 Verify that an invited collaborator sees the same persisted sessions, findings, candidate states, validation results, comments, and approvals permitted by the MVP role.
  - [ ] 16.12 Implement editable project-goal/behavior-contract/policy views plus member, device/provider, integration, MVP privacy/retention status, and audit-history views required by R18.3.
  - [ ] 16.13 Implement and authorize the browser APIs for capabilities, sessions, checkpoints, findings, candidates, validations, project goal, behavior contract, policy, comments, approvals, members/devices/integrations, privacy/retention status, and audit history; wire every MVP view to persisted APIs rather than fixture-only state.
  - [ ] 16.14 Add component and Playwright tests for setup, collaboration, overview, timeline, finding, validation, settings editing, audit, and approval states.
  - [ ] 16.15 After the UI exists, inspect real screenshots at narrow laptop, standard desktop, and wide desktop sizes; create `critique.md` using the `fairy/critique.md` rubric and resolve every critical/high issue before Checkpoint 1.
  - **Exit:** A reviewer can answer the eight finding-detail questions in `design.md` without reading raw logs.
  - _Requirements: R18, R20.6, R21.8-R21.9_

- [ ] 17. Prove the first complete vertical slice
  - [x] 17.1 Add `tests/e2e/vertical-slice.spec.ts` around `fixtures/e2e/npm-undeclared-used/`.
  - [ ] 17.2 Pair the extension and Companion with a test project and start a Codex-observed session.
  - [x] 17.3 Observe an npm installation/use that makes the mutable environment succeed but is absent from repository intent.
  - [x] 17.4 Prove provider intent, process ancestry, action outcome, installed-state delta, used evidence, and manifest/lock absence are separately present.
  - [x] 17.5 Prove deterministic reconciliation creates the expected finding with no LLM call in the truth decision.
  - [ ] 17.6 Generate an allowed Fireworks candidate and materialize the exact package/lock patch through npm in Daytona.
  - [ ] 17.7 Validate the baseline and candidate in separate clean Daytona sandboxes against the accepted behavior contract.
  - [x] 17.8 Display exact evidence, gaps, patch, target, phases, cleanup, and scoped verified result in the web workspace.
  - [ ] 17.9 After explicit approval, use the GitHub integration to create a test branch and pull request containing the exact verified patch digest; do not write to the default branch.
  - [ ] 17.10 Run negative variants:
    - provider event exists but install fails;
    - package effect exists without a provider event;
    - hook is disabled;
    - actor remains unknown;
    - human and agent install concurrently;
    - install is later removed;
    - lockfile is stale;
    - format is observed-only or unsupported;
    - pre-snapshot is missing or stabilization times out;
    - secret appears in command input;
    - Daytona provisioning or registry fails;
    - behavior contract is missing;
    - unchanged baseline already passes the claimed behavior;
    - dirty Source_Input contains an excluded, LFS, or submodule gap;
    - source changes after validation.
  - [ ] 17.11 Assert that no failed, unsupported, timed-out, security-blocked, inconclusive, stale, partial-coverage, resource-budget, infrastructure, or cleanup-failed variant receives a verified label; non-project outcomes also receive no dependency mutation recommendation.
  - [ ] 17.12 Save all real defects found as regression fixtures before fixing them.
  - **Exit:** The entire loop works against live Daytona and test Fireworks/Braintrust projects, and all negative cases fail safely.
  - _Requirements: R22.1-R22.4_

Full R1-R22 acceptance remains Task 22.

## Checkpoint 1: The product loop is real

Do not add another package manager or provider until all conditions pass:

- [ ] The vertical slice passes locally and against a live Daytona sandbox.
- [ ] The same immutable inputs produce the same deterministic finding.
- [ ] Fireworks can fail without erasing or changing that finding.
- [ ] No seeded plaintext secret reaches persistent local/cloud data, Fireworks, Braintrust, or logs.
- [ ] An infrastructure or ambiguous failure produces no dependency mutation recommendation.
- [ ] Missing behavior contract, unsupported target, or stale source cannot produce `verified`.
- [ ] Materialization and final validation use separate clean state.
- [ ] Every created sandbox is confirmed deleted or produces a visible cleanup escalation.
- [ ] Explicit approval creates one GitHub pull request containing exactly the verified patch and no default-branch write.
- [ ] The implemented UI has a real `critique.md`, and its critical/high issues are resolved.

### Milestone 5: Complete the MVP contract

- [ ] 18. Add Claude Code and Cursor provider adapters
  - [ ] 18.1 Implement `crates/companion/src/providers/claude_code.rs`.
  - [ ] 18.2 Implement `crates/companion/src/providers/cursor.rs`.
  - [ ] 18.3 Select and document one supported local MVP surface for each provider.
  - [ ] 18.4 Negotiate capabilities per surface/version rather than assuming parity with Codex.
  - [ ] 18.5 Normalize available session, tool, command, result, file, approval, and subagent events.
  - [ ] 18.6 Use the same action-envelope and ground-truth plane when a provider omits an event.
  - [ ] 18.7 Emit explicit gaps for hosted/remote work without an in-realm collector.
  - [ ] 18.8 Add fixtures and compatibility tests for every claimed event/surface.
  - [ ] 18.9 Test disabled hooks, missing terminal events, human-edited commands, subagents, duplicate payloads, private-reasoning removal, and provider-version changes.
  - **Exit:** Codex, Claude Code, and Cursor each publish an honest capability profile and can contribute to the same normalized action model on one documented local surface.
  - _Requirements: R3, R5, R21.8-R21.9_

- [ ] 19. Implement full MVP Python support for pip and uv
  - [ ] 19.1 Implement Python project/interpreter/virtual-environment discovery in `packages/adapters/src/python/`.
  - [ ] 19.2 Parse supported `requirements*.txt`, `pyproject.toml`, uv project metadata, and uv lock data semantically.
  - [ ] 19.3 Preserve markers, extras, indexes by redacted identity, editable/local references, Python version, platform, direct/transitive, and environment scope.
  - [ ] 19.4 Implement Rust local read-only pip/uv inventory adapters plus canonical native results and TypeScript parsers for installed graphs.
  - [ ] 19.5 Implement conservative Python import/executable/configuration usage evidence with uncertainty for dynamic loading.
  - [ ] 19.6 Implement native add/remove/update/lock/frozen-install/graph/build/test operations for the claimed manager versions.
  - [ ] 19.7 Add fixtures for stale locks, hidden global/user installs, wrong interpreter, missing extras, platform markers, editable dependencies, and unsupported indexes.
  - [ ] 19.8 Run one live clean Daytona conformance fixture per claimed pip/uv target.
  - [ ] 19.9 Keep Poetry and Conda-family behavior observed-only until their later tasks pass.
  - [ ] 19.10 Discover Python install/build/lint/typecheck/test/smoke/benchmark behavior steps from supported project and CI files and route them through the same contract review API.
  - [ ] 19.11 Define the versioned Linux/Python target matrix with exact Python, pip, uv, immutable base, and architecture identities; publish unsupported combinations explicitly and run Task 19.8 for every claimed target.
  - **Exit:** pip and uv have passing versioned target fixtures but remain `native_validation` until Task 22 passes the full R22.5 conformance suite.
  - _Requirements: R7.4-R7.6, R9, R12, R22.5_

- [ ] 20. Harden GitHub webhooks and exact pull-request application
  - [ ] 20.1 Implement raw-body webhook HMAC verification, delivery-ID deduplication, event/action allowlisting, and quick acknowledgement in `apps/worker/src/github/webhook.ts`.
  - [ ] 20.2 Handle `installation`, `installation_repositories`, `push`, and `pull_request` events; request a fresh checkpoint from an authorized online applicable device, or attach a stale-device capture gap when none is online.
  - [ ] 20.3 Create checkpoints and invalidate candidates/attestations when relevant source, Source_Input, behavior, policy, target, adapter, or rule identity changes.
  - [ ] 20.4 Fetch exact source archives with short-lived one-repository installation tokens and authorization headers, preserving submodule/LFS identities or explicit gaps.
  - [ ] 20.5 Implement **Apply via pull request** by reserving/auditing a deterministic external operation/branch, materializing the exact approved Source_Input changes plus exact candidate patch through Git blobs/tree/ref APIs, comparing the resulting tree digest, and separately showing/approving dirty source changes.
  - [ ] 20.6 Fail closed when the base/head changed, permissions are insufficient, or the patch no longer applies.
  - [ ] 20.7 Never write directly to the default branch.
  - [ ] 20.8 Return workflow-file changes as a manual patch unless the separate permission and approval path exists.
  - [ ] 20.9 Test spoofed setup IDs, invalid signatures, duplicate/out-of-order deliveries, offline/stale checkpoint requests, installation suspension, token expiry, permission reduction, dirty-source approval, submodule/LFS gaps, source rebase, tree/patch tampering, Workflow retry, and PR idempotency.
  - **Exit:** An authorized reviewer can open one ordinary PR whose resulting tree exactly matches the approved verified Source_Input plus candidate patch; any identity change invalidates it before application.
  - _Requirements: R2.1-R2.4, R4.3, R4.11, R10.5, R12.7, R17, R21.10, R22.1_

- [ ] 21. Complete fault classification, safe caching, and bounded scheduling
  - [ ] 21.1 Implement infrastructure preflight for sandbox readiness, delivered resources, disk, memory, CPU, network/DNS, repository access, registry reachability, clock, and target capability.
  - [ ] 21.2 Implement same-target control canaries and bounded fresh-sandbox retries.
  - [ ] 21.3 Implement the complete terminal-outcome classifier and independent suspected-origin confidence.
  - [ ] 21.4 Implement unchanged-baseline/candidate-by-target job expansion, canonical `ValidationJobKey` deduplication, and fan-out/fan-in in a Cloudflare Workflow.
  - [ ] 21.5 Implement concurrency, attempt, time, and estimated-cost budget enforcement.
  - [ ] 21.6 Implement the complete semantic validation cache key.
  - [ ] 21.7 Permit only integrity-checked downloads, immutable toolchains, and complete attestations as cacheable accelerators; prohibit installed candidate state as final proof.
  - [ ] 21.8 Expose queue, provision, resolve, install, build, test, smoke, benchmark, persist, and cleanup time.
  - [ ] 21.9 Add fault-injection and property tests for every terminal class, retry exhaustion, canary behavior, cache-key dimension, cached/fresh equivalence, job duplication, supersession, and cost stop.
  - [ ] 21.10 Implement and test per-workspace/repository/target/registry concurrency leases, cost reservation before sandbox creation, supersession cancellation with cleanup preserved, and the external-operation reconciliation wrapper used by Fireworks, Daytona, Braintrust, and GitHub.
  - **Exit:** Every fixture is classified correctly or inconclusively within budget, and none of the non-project terminal states produces dependency advice.
  - _Requirements: R14.5-R14.11, R15, R16.3-R16.9, R21.10, R22.3, R22.7_

- [ ] 22. Package Windows and Linux Companions and finish MVP acceptance
  - [ ] 22.1 Implement and test Windows process/filesystem/credential-store/named-pipe behavior for the published MVP scope.
  - [ ] 22.2 Implement and test Linux process/filesystem/credential-store/Unix-socket behavior for the published MVP scope.
  - [ ] 22.3 Build platform-specific companion binaries and VSIX packages; verify the embedded binary hash before launch.
  - [ ] 22.4 Add extension/Companion/schema compatibility checks and a safe rollback path.
  - [ ] 22.5 Publish the exact provider surface, OS, realm, ecosystem manager/version, operation, and Daytona target support matrix.
  - [ ] 22.6 Run the complete R22 conformance suite and all TypeScript/Rust/extension/web/integration tests.
  - [ ] 22.7 Run real GitHub App, Fireworks, Braintrust, and Daytona smoke tests in non-production projects.
  - [ ] 22.8 Document onboarding, permissions, privacy, support gaps, incident response, cleanup, key rotation, rollback, and deletion limitations.
  - [ ] 22.9 Deploy a preview Worker, Queue/DLQ, Workflow, private R2 bucket, Neon migration, and web assets.
  - [ ] 22.10 Block release on false verification, plaintext secret persistence, unbounded retry, silent orphan, migration failure, or npm/pip/uv conformance failure.
  - [ ] 22.11 Promote npm, pip, and uv from `native_validation` to `full_native` only after their complete manager/version/format/platform/operation/Daytona-target matrices pass every R22.5 conformance case, including cached-versus-uncached decision equivalence.
  - **Exit:** The MVP delivery contract in `requirements.md` is satisfied and reproducible from a clean checkout.
  - _Requirements: R1-R22_

## Checkpoint 2: MVP release gate

- [ ] Codex, Claude Code, and Cursor each have one documented local capability profile.
- [ ] npm, pip, and uv pass their full native conformance matrices.
- [ ] Windows and Linux extension/Companion packages pass install, update, and rollback smoke tests.
- [ ] A user can sign in, pair a device, link a repository, observe a session, review a finding, validate a candidate, and open an exact PR.
- [ ] Every unsupported provider, realm, manager, and target is visible as a gap.
- [ ] R22's false-verification, privacy, cleanup, and infrastructure-fault gates all pass.

### Milestone 6: Private-alpha collaboration and platform hardening

- [ ] 23. Implement team workspaces, roles, comments, and audit views
  - [ ] 23.1 Implement workspace invitations and `owner`, `maintainer`, `developer`, `reviewer`, and `observer` roles.
  - [ ] 23.2 Enforce authorization in every API query, R2 object lookup, validation action, approval, and GitHub mutation.
  - [ ] 23.3 Add shared finding comments, dispositions, approvals, and explicit policy-change audit events.
  - [ ] 23.4 Keep concurrent device/realm events concurrent when no causal link exists.
  - [ ] 23.5 Add member, role, device, consent, retention, and audit settings to the web workspace.
  - [ ] 23.6 Test every role/action combination and cross-tenant object/database isolation.
  - **Exit:** Two authorized collaborators can review the same evidence and approvals without either gaining an unintended data or mutation capability.
  - _Requirements: R2.3, R2.7, R18.4, R20.9_

- [ ] 24. Add macOS packaging and deeper realm coverage
  - [ ] 24.1 Implement macOS process/filesystem/credential-store/Unix-socket support for the published scope.
  - [ ] 24.2 Sign and notarize the macOS Companion and package the matching VSIX.
  - [ ] 24.3 Implement WSL realm discovery and in-realm collector communication.
  - [ ] 24.4 Implement dev-container and IDE-extension-host realm identities and capability reporting.
  - [ ] 24.5 Represent remote hosts as separate realms requiring their own collector or event feed.
  - [ ] 24.6 Test host/WSL/container separation, missing privilege, collector disconnect, reboot/boot identity, clock uncertainty, and extension-host packages.
  - **Exit:** macOS is packaged, and no host observation is misrepresented as proof for WSL, container, remote, or IDE-host state.
  - _Requirements: R4.6, R21.1-R21.9_

- [ ] 25. Harden the adapter SDK and support registry
  - [ ] 25.1 Move native tool execution behind isolated structured-command runners.
  - [ ] 25.2 Add versioned adapter manifests, conformance reports, and signed release metadata.
  - [ ] 25.3 Publish support per manager/version/format/platform/operation/Daytona target.
  - [ ] 25.4 Harden cross-adapter generated-file, precedence, wrapper-selection, and manager-conflict conformance using the MVP contract already established in Task 11.
  - [ ] 25.5 Add an adapter conformance harness in `packages/testkit/src/adapter-conformance.ts`.
  - [ ] 25.6 Prevent unknown, executable, or observed-only formats from automatic mutation.
  - **Exit:** Adding an adapter cannot silently broaden claims; support changes only from a versioned conformance report.
  - _Requirements: R7.2-R7.3, R7.7-R7.9, R22.5_

### Milestone 7: Private-alpha ecosystem coverage

- [ ] 26. Add pnpm, Yarn, and Bun native adapters
  - [ ] 26.1 Implement project/workspace discovery and native manifest/lock semantics for each manager.
  - [ ] 26.2 Preserve Corepack/version selection, workspace, peer, override/resolution, patch, and script semantics.
  - [ ] 26.3 Implement installed/resolved/used graph operations and native add/remove/update/lock/install commands.
  - [ ] 26.4 Add HTML/CSS asset, import-map, URL, and build-tool usage evidence without treating HTML/CSS as package managers.
  - [ ] 26.5 Add manager-conflict and unsupported-lock-version fixtures.
  - [ ] 26.6 Run at least one live clean Daytona fixture for every claimed manager/target combination.
  - **Exit:** Each manager is promoted independently; missing semantic operations leave it at native-validation or observed-only support.
  - _Requirements: R7.5-R7.6, R7.10, R22.5_

- [ ] 27. Add Poetry and Conda-family native adapters
  - [ ] 27.1 Implement Poetry `pyproject.toml`, lock, groups, extras, source, and Python-selector semantics.
  - [ ] 27.2 Implement Conda/Mamba/Micromamba environment files, channels by redacted identity, platform/subdir, pip subsection, and lock semantics.
  - [ ] 27.3 Keep interpreter, virtual/Conda environment, user/global/project scope, native prerequisites, and mixed pip/Conda ownership separate.
  - [ ] 27.4 Implement native graph, lock, clean install, mutation, and behavior operations.
  - [ ] 27.5 Add fixtures for conflicting environments, channel priority, stale locks, platform selectors, mixed manager ownership, and native-library requirements.
  - [ ] 27.6 Run live Daytona conformance for every claimed target.
  - **Exit:** Poetry and each Conda-family tool have separate, honest support entries and conformance evidence.
  - _Requirements: R7.5-R7.6, R22.5_

- [ ] 28. Add Rust/Cargo native support
  - [ ] 28.1 Implement Cargo workspace, manifest, lock, target, feature, source, and build-script semantics.
  - [ ] 28.2 Track rustup toolchain selection separately from crate dependencies.
  - [ ] 28.3 Implement installed/used/resolved graphs and native mutation/lock/build/test operations.
  - [ ] 28.4 Detect build-script native/system prerequisites without blindly converting them to crates.
  - [ ] 28.5 Add fixtures for feature mismatch, toolchain conflict, stale lock, target-specific dependency, vendored source, and native prerequisite.
  - [ ] 28.6 Run live Daytona conformance for every claimed target.
  - **Exit:** Cargo is full native only for the tested toolchain and target matrix.
  - _Requirements: R7.5-R7.6, R22.5_

- [ ] 29. Add C/C++ native support
  - [ ] 29.1 Implement CMake project discovery and preset/toolchain semantics.
  - [ ] 29.2 Implement vcpkg manifest/baseline/feature/triplet semantics.
  - [ ] 29.3 Implement Conan profile/lock/option/settings semantics.
  - [ ] 29.4 Track compiler, linker, ABI, architecture, headers, linked libraries, and system-package ownership separately.
  - [ ] 29.5 Implement native resolution, mutation, clean configure/build/test, and installed graph operations for claimed combinations.
  - [ ] 29.6 Add fixtures for hidden headers/libraries, compiler/ABI mismatch, architecture mismatch, undeclared system package, and conflicting managers.
  - [ ] 29.7 Run live Daytona conformance where targets exist and publish unavailable targets explicitly.
  - **Exit:** CMake and each package manager have separate support states; unavailable Daytona platforms never become verified by omission.
  - _Requirements: R7.5-R7.6, R14.10, R22.5_

## Checkpoint 3: Private-alpha adapter honesty

For every adapter promoted beyond observed-only:

- [ ] Semantic project/manifest discovery passes.
- [ ] Lock or exact-resolution semantics pass where applicable.
- [ ] Installed, resolved, and used graph operations pass.
- [ ] Candidate mutation and native lock generation pass.
- [ ] Frozen/equivalent clean installation passes.
- [ ] Behavior-contract validation passes.
- [ ] At least one explicitly supported Daytona target passes.
- [ ] Unsupported manager versions and targets are published.

### Milestone 8: Private-alpha optimization, security, and operations

- [ ] 30. Implement multi-target validation and user-defined optimality
  - [ ] 30.1 Expand the MVP target derivation into executable multi-target operating-system, architecture, runtime, manager, and service matrices.
  - [ ] 30.2 Query current Daytona organization capabilities before scheduling and mark missing targets unsupported.
  - [ ] 30.3 Run candidate-target matrices concurrently within quota and cost limits.
  - [ ] 30.4 Implement versioned user constraints and objectives for install/build/runtime speed, memory, disk, image size, dependency count, version freshness, license, and security policy.
  - [ ] 30.5 Generate only bounded policy-permitted candidate alternatives.
  - [ ] 30.6 Display tested candidate measurements and a Pareto frontier when objectives conflict.
  - [ ] 30.7 Label results “best of tested candidates” and preserve the bounded candidate set.
  - [ ] 30.8 Test that no soft score outranks a failed hard target and that every update is natively resolved/validated.
  - **Exit:** Multi-target proof and project-specific optimization remain scoped, budgeted, and honest.
  - _Requirements: R13.4-R13.7, R14.1-R14.6, R16_

- [ ] 31. Implement retention, export, deletion, and just-in-time secrets
  - [ ] 31.1 Add separate raw-content consent, role, encryption, and short retention classes.
  - [ ] 31.2 Implement workspace/project/device export and deletion APIs.
  - [ ] 31.3 Replace deleted raw payloads with non-sensitive audit tombstones while preserving chain integrity.
  - [ ] 31.4 Implement HMAC and data-encryption key rotation.
  - [ ] 31.5 Implement workspace-namespaced opaque SecretReference/SecretBinding records only for provider capabilities that enforce target/host scope and lifetime; bind them to one validation job and keep arbitrary raw-secret access `security_blocked`.
  - [ ] 31.6 Keep resolved values out of product-controlled prompts, Braintrust, cache keys, workflow state, process arguments, logs, artifacts, and analytics, and redact sandbox output because hostile project code may still attempt disclosure.
  - [ ] 31.7 Run cross-tenant, retention, export, deletion, key-rotation, and seeded-secret tests.
  - **Exit:** Authorized users control retained data, and private dependency validation does not expose the credential.
  - _Requirements: R20.3-R20.10_

- [ ] 32. Add GitHub check runs and production observability
  - [ ] 32.1 Publish one check run for the exact PR head SHA and update it through finding, validating, verified, failed, stale, and unsupported states.
  - [ ] 32.2 Link the check to the evidence workspace and scoped attestation.
  - [ ] 32.3 Keep workflow-file write permission separate.
  - [ ] 32.4 Implement operational metrics for Companion health, gaps, Queue/DLQ, Fireworks, Braintrust export, Daytona phase/cleanup/cost, R2/Neon growth, and GitHub webhooks.
  - [ ] 32.5 Build benchmark corpora for small, medium, monorepo, cache, concurrency, and fault cases.
  - [ ] 32.6 Add network-loss, duplicate-message, Worker restart, Neon/R2 outage, and orphaned-sandbox chaos tests.
  - [ ] 32.7 Publish cold/warm performance and cost measurements separately.
  - **Exit:** Operators can distinguish product, model, database, queue, GitHub, and Daytona failures without using Braintrust as infrastructure monitoring.
  - _Requirements: R16.8-R16.9, R17.6-R17.7, R19.5-R19.6, R21.3-R21.8_

- [ ] 33. Package and release the private alpha
  - [ ] 33.1 Run database migrations on a disposable production-like branch and verify rollback/forward-fix procedure.
  - [ ] 33.2 Deploy Worker, Queue/DLQ, Workflow, private R2, Neon, and web assets with production secret bindings.
  - [ ] 33.3 Package Windows, Linux, and signed/notarized macOS extension/Companion bundles.
  - [ ] 33.4 Run full provider, adapter, privacy, fault, cleanup, GitHub, Fireworks, Braintrust, and Daytona acceptance suites.
  - [ ] 33.5 Publish the exact support/capture matrix, privacy behavior, limits, budgets, and known gaps.
  - [ ] 33.6 Roll out first to one internal workspace, then a small invited cohort with rollback criteria.
  - [ ] 33.7 Capture every real failure as a regression case before widening access.
  - **Exit:** The private-alpha delivery contract in `requirements.md` is satisfied without weakening any MVP invariant.
  - _Requirements: R1-R22_

### Milestone 9: Target-product expansion

- [ ] 34. Expand deterministic disagreement coverage beyond the MVP generic rules
  - [ ] 34.1 Add adapter-specific precision for runtime, compiler, SDK, manager, architecture, ABI, marker, feature, group, and platform variants.
  - [ ] 34.2 Promote supported CI, bootstrap, container, Dev Container, service, PATH, environment-name, and system-library evidence from generic observed-only contradictions to semantic rules as adapters mature.
  - [ ] 34.3 Add long-tail transient, duplicate-manager, mutable-source, lifecycle-script, base-image, and IDE-host variants.
  - [ ] 34.4 Add clean removal ablation for dynamic imports, plugins, optional features, generated code, and lifecycle behavior.
  - [ ] 34.5 Measure rule precision/recall per adapter on a versioned corpus and block promotion when thresholds fail.
  - _Requirements: R9, R12.5, R22.2-R22.5_

- [ ] 35. Add broader system and ecosystem adapters through conformance
  - [ ] 35.1 Prioritize new adapters from observed real project evidence and user demand, not an unversioned “everything” claim.
  - [ ] 35.2 Add system-package, runtime/version-manager, container, CI/bootstrap, and IDE configuration adapters.
  - [ ] 35.3 Add Go, Java/Kotlin, .NET, Ruby, PHP, Swift, Dart/Flutter, and other ecosystems one at a time.
  - [ ] 35.4 Require the same native manifest/lock/graph/mutation/clean-validation contract before `full_native`.
  - [ ] 35.5 Keep any unsupported operation or unavailable Daytona target explicit.
  - _Requirements: R7.2-R7.3, R7.9, R21.8-R21.9, R22.5_

- [ ] 36. Add organizational policy and signed third-party adapters
  - [ ] 36.1 Implement signed adapter publication, version pinning, revocation, and isolated execution.
  - [ ] 36.2 Implement organization policy inheritance, exceptions, approval automation, and audit.
  - [ ] 36.3 Require explicit authorization for automatic PR creation or application and preserve default-branch protection.
  - [ ] 36.4 Add organization-wide privacy/retention controls without weakening local redaction.
  - [ ] 36.5 Run supply-chain, malicious-adapter, policy-conflict, and revocation tests.
  - _Requirements: R13, R17, R20.8-R20.9_

- [ ] 37. Prepare general availability
  - [ ] 37.1 Define and measure production service objectives from observed alpha data.
  - [ ] 37.2 Run a third-party security review of Companion privileges, key handling, cloud authorization, GitHub permissions, and sandbox isolation.
  - [ ] 37.3 Complete disaster recovery, migration, incident, key compromise, provider outage, and data-deletion drills.
  - [ ] 37.4 Verify zero false-verified results and zero plaintext secret persistence on the release corpus.
  - [ ] 37.5 Publish versioned support, limitations, data flow, security, and proof semantics.
  - [ ] 37.6 Release gradually with automated rollback and cleanup safeguards.
  - _Requirements: R20-R22_

## Solo Dependency Sequence

```text
1 → 2 → 3
→ 4 → 5 → 6 → 7 → 8
→ 9 → 10 → 11 → 12 → 13
→ 14 → 15 → 16 → 17
→ Checkpoint 1
→ 18 → 19 → 20 → 21 → 22
→ Checkpoint 2
→ 23 → 24 → 25
→ 26 → 27 → 28 → 29
→ Checkpoint 3
→ 30 → 31 → 32 → 33
→ 34 → 35 → 36 → 37
```

The human work is sequential. Runtime candidate-target jobs are intentionally parallel inside Task 21 and Task 30.

## First Stopping Rule

If Checkpoint 1 cannot pass, do not hide that failure by adding more provider adapters, package managers, UI polish, or sponsor integrations. Use the failing stage to revise the relevant requirement and design:

```text
capture failed        → revisit R3-R6
finding was weak      → revisit R7-R9
candidate was unsafe  → revisit R11-R13
proof was ambiguous   → revisit R14-R16
value was unclear     → revisit R17-R18 and the finding screen
privacy failed        → revisit R20 before all other work
```
