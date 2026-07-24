# IWOMC Product Direction

## Product

IWOMC is an environment reconciler for AI-assisted software development. It observes coding-agent actions and machine-state changes, compares them with repository-declared intent, explains material disagreements, proposes a constrained configuration change, and proves that change on a clean disposable computer before a developer accepts it.

## Primary users

- Developers using Codex, Claude Code, or Cursor who need to know whether an agent changed the working environment without updating the repository.
- Technical teams reviewing agent-authored dependency and environment changes.
- Technical evaluators who expect claims to be backed by inspectable evidence and a real clean-environment run.

## Core job

Answer one question with evidence: **Will another clean machine reproduce what the agent made work locally?**

IWOMC links provider events, process ancestry, package-manager operations, installed-state deltas, source usage, manifests, and lockfiles. It then validates the smallest evidence-grounded correction in Daytona. Braintrust records metadata-only reasoning and validation traces. Fireworks provides constrained reasoning when available; deterministic reconciliation remains the safe fallback.

## Product personality

Precise, technical, restrained, and trustworthy. The interface should feel like an engineering instrument: dense enough for experts, legible at a glance, and explicit about what was observed, inferred, validated, or unavailable.

## Interface principles

- Lead with the disagreement and its proof, not generic activity metrics.
- Show causality: agent action → machine change → repository mismatch → candidate → clean validation.
- Never label an integration connected unless a live request has established it.
- Never turn missing coverage into a passing state.
- Keep the overview compact enough to explain in one screen.
- Use a single green accent for confirmed success; amber for review or fallback; red for failure; blue for informational scope.
- Use familiar panels, tabs, timelines, diffs, and status pills. Avoid decorative charts, excessive nesting, gradients without meaning, and generic AI-product language.
- Meet WCAG AA contrast, preserve keyboard focus, respect reduced motion, and never communicate state by color alone.

## Anti-patterns

- Fake live states, placeholder claims, or wording that presents sample data as production state.
- A chat-first interface when evidence and validation are the primary objects.
- Unexplained model output or autonomous manifest edits without deterministic guards.
- Bloated navigation, oversized cards, and repeated summaries that hide the causal evidence.

## Demo-critical path

The overview must make the complete loop visible: captured session, undeclared runtime dependency, evidence-grounded candidate, Daytona clean-run proof, cleanup confirmation, and Braintrust trace status. A live proof control may create a disposable Daytona sandbox, run a bounded command, delete it, and report the actual result without overstating Fireworks or Braintrust availability.
