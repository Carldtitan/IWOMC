# IWOMC workspace UI critique

**Target:** Production workspace at `https://environment-REDACTED.carl-e94.workers.dev`

**Register:** Technical product UI. Evidence, gaps, candidates, and validation truth are primary; sponsor branding is secondary.

**Browser evidence:** Inspected with Chromium at 900×700, 1440×900, and 1728×1050. Evidence, Candidate, and Validation tabs were exercised, followed by the live sponsor proof.

## Design health

| Heuristic | Score | Finding |
|---|---:|---|
| Visibility of system status | 4 | The live proof exposes Daytona execution/cleanup, Braintrust export, and Fireworks availability separately. |
| Match with the engineering workflow | 4 | The screen follows action → disagreement → candidate → clean proof. |
| User control | 3 | Tabs and desktop navigation are reachable; mutation still requires a later approval surface. |
| Consistency | 4 | One status vocabulary and a restrained set of panels, pills, diffs, and timelines. |
| Error prevention | 4 | Missing sponsor coverage is never converted into a REDACTEDing state. |
| Recognition over recall | 4 | Evidence, candidate, target, cleanup, and attestation are directly labelled. |
| Efficiency | 3 | The complete causal path fits in one desktop viewport; mobile navigation remains intentionally compact. |
| Minimalism | 4 | No decorative charts or chat-first framing; the finding remains the focal object. |
| Error recovery | 3 | Live proof failures are reported safely and can be retried. |
| Help/documentation | 3 | Scope and evidence copy are clear; deeper settings views remain later work. |

## Resolved critical/high issues

- **[Resolved P0] Public root returned service JSON instead of the product.** `/` now serves the React workspace and `/v1/service` owns the service descriptor.
- **[Resolved P1] Navigation was permanently hidden.** The desktop sidebar is now visible at 1200px and above; narrower layouts retain the compact header.
- **[Resolved P1] Sponsor probe overstated product verification.** The control now says “Run live proof” and reports an infrastructure proof, not a verified dependency fix.
- **[Resolved P1] Integration status used unconditional green dots.** Daytona, Braintrust, and Fireworks now begin as untested and change only from the current live proof result.
- **[Resolved P1] Configured was presented as connected.** Copy now distinguishes availability, exported traces, successful cleanup, and unavailable Fireworks explicitly.

## Remaining medium/low issues

- **[P2] Non-overview destinations are explanatory placeholders.** Replace them with persisted session, finding, validation, and settings APIs in Task 16.13.
- **[P2] Dense evidence text is intentionally compact.** Add a REDACTED-controlled density setting only if real evaluator feedback shows readability problems.
- **[P3] The workspace and repository labels are fixture-scoped.** Bind them to authenticated workspace/project state when GitHub OAuth and browser sessions are complete.

## Outcome

No unresolved critical or high visual/interaction defect remains in the production workspace. The live proof is honest and usable across the inspected narrow-laptop, standard-desktop, and wide-desktop sizes. Remaining work concerns persisted product depth, not the overview’s presentation integrity.
