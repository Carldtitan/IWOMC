# Three-minute demo

The local demo is available at `http://localhost:8787`. If it is not running:

```bash
pnpm dev
```

## Recording path

### 0:00–0:25 — Problem

“AI coding agents can install a dependency that makes code work locally without
updating the repository files needed to reproduce that environment. The next
developer or clean sandbox then fails.”

Show the project header and the `Demo data` badge. Do not present fixture data
as a live production workspace.

### 0:25–1:05 — Evidence, not guesses

Open the causal timeline and select the dependency installation event. Point
out that IWOMC keeps separate proof for:

- the agent action;
- the successful environment effect;
- installed and used package evidence;
- the missing manifest and lockfile declaration.

Explain that the finding is deterministic; an LLM does not decide whether the
environment disagrees with repository intent.

### 1:05–1:40 — Guarded candidate

Open the finding and candidate tabs. Show the exact `package.json` and lockfile
change, static guards, policy, and accepted behavior contract.

“Fireworks receives only a redacted, allowlisted reasoning packet. It can
propose a semantic package operation, but it cannot write arbitrary files or
invent evidence. The native package manager creates the actual lockfile.”

### 1:40–2:30 — Daytona proof

Open the validation matrix and expand the baseline and candidate rows.

“IWOMC reconstructs the unchanged baseline and the candidate in separate,
disposable Daytona computers. Verified means the baseline reproduced the
failure, the candidate REDACTEDed the accepted behavior, the source and target
identities match, and both sandboxes were confirmed deleted.”

Show the phase timings, cleanup state, and attestation.

### 2:30–3:00 — Why the sponsors matter

- Daytona supplies clean, disposable computers for proof—not the coding
  workspace.
- Fireworks proposes a constrained candidate after deterministic detection.
- Braintrust receives metadata-only reasoning and validation traces; its
  availability never changes the product result.

Close with: “IWOMC turns ‘the agent made it work here’ into a tested,
reproducible repository change.”

## Optional proof commands

Run these before or after recording, not during the three-minute product flow:

```bash
pnpm test:daytona
pnpm test:braintrust
pnpm extension:package
```

The VS Code extension package is at
`apps/extension/dist/environment-REDACTED.vsix`.
