# IWOMC — Environment Reconciler

AI coding agents can install packages and change a developer environment without
updating the repository files that are supposed to reproduce it. IWOMC captures
those actions, compares observed state with repository intent, proposes only
grounded native changes, and proves the result on clean disposable computers.

## The product loop

1. The VS Code extension starts the local Companion with explicit consent.
2. The Companion observes supported Codex actions and captures targeted
   pre/post environment evidence without storing prompts, reasoning, or secrets.
3. Signed, encrypted evidence batches are stored durably in R2 before a
   content-addressed Queue message is published.
4. Deterministic npm reconciliation builds seven evidence graphs and identifies
   a used, installed, agent-attributable dependency missing from repository
   intent. An LLM is never part of this truth decision.
5. Fireworks receives a redacted, allowlisted reasoning packet and may propose a
   schema-constrained semantic operation. Invented evidence, arbitrary files,
   manager switches, and secrets are rejected. A guarded deterministic fix is
   available when Fireworks is unavailable.
6. Daytona runs the unchanged baseline and candidate in separate clean
   sandboxes. Only an accepted behavior contract, failed baseline, passed
   candidate, matching attestation, fresh source, and confirmed cleanup can
   produce a verified result.
7. Braintrust receives metadata-only reasoning and validation traces through a
   durable encrypted outbox. Braintrust availability never changes product
   truth.
8. The shared web workspace shows the causal timeline, proof coverage, exact
   finding, guarded patch, validation phases, cleanup, and scoped attestation.

## Repository layout

- `apps/extension` — VS Code control surface and authenticated local IPC client.
- `crates/companion` — secure local capture, redaction, encryption, batching,
  and Codex normalization.
- `apps/worker` — Cloudflare Worker APIs, ingestion, reconciliation
  orchestration, candidate generation, validation, and workspace polling.
- `apps/web` — evidence-first React workspace.
- `packages/adapters` — native npm repository adapter.
- `packages/reconciler` — immutable evidence graphs and deterministic rules.
- `packages/integrations` — Daytona, Fireworks, Braintrust, GitHub, R2, and Queue
  boundaries.
- `packages/db` — PostgreSQL schema and migrations.
- `fixtures/e2e/npm-undeclared-used` — the first complete deterministic fixture.

## Run locally

Prerequisites: Node.js 22+, pnpm 10.24, and Rust from `rust-toolchain.toml`.

```bash
pnpm install
cp .env.example .env
cp .dev.vars.example .dev.vars
pnpm env:check
pnpm dev
```

Open `http://localhost:8787`. The UI remains an explicit demo fixture when no
workspace/project polling IDs are configured; it never labels fixture data as
live.

Build the VS Code extension:

```bash
pnpm extension:package
```

The VSIX is written to `apps/extension/dist/environment-reconciler.vsix`.

## Verification

```bash
pnpm check
pnpm test:r2
pnpm test:github-app
pnpm test:braintrust
pnpm test:fireworks
pnpm test:daytona
```

Live smoke commands print only non-secret status. Daytona's smoke test provisions
a sandbox, runs one structured command, bounds output, and deletes the sandbox
in `finally`.

## Security posture

- No raw prompt, private reasoning, environment value, or unrestricted log is
  sent to Fireworks or Braintrust.
- Device batches are chained, signed, replay-protected, gzip-compressed, and
  AES-256-GCM encrypted.
- R2 writes are immutable and content-addressed.
- Native adapters—not model-written shell or lockfile text—materialize accepted
  operations.
- Validation is fail-closed for unsupported, partial, stale, timed-out,
  security-blocked, infrastructure, budget, inconclusive, and cleanup-failed
  outcomes.
- GitHub publication uses an exact verified patch on a deterministic branch and
  requires explicit approval; it never writes directly to the default branch.

See `requirements.md`, `design.md`, `Contract.md`, and `tasks.md` for the full
specification and verified implementation ledger.
