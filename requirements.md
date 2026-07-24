# Requirements Document: Environment Reconciler

## Introduction

Environment Reconciler is a background verification product for AI-assisted software development. It detects when Codex, Claude Code, Cursor, a human, or one of their subprocesses changes a development environment in a way that the repository does not describe. It then proposes the smallest repository configuration change that could reconcile the disagreement and proves that proposal in clean, disposable Daytona sandboxes before a developer may call it verified or apply it through GitHub.

The product exists because a modern coding session can succeed only because an agent installed a package globally, selected a different runtime, changed a shell profile, started a service, or used state left behind by an earlier session. The code may work in that environment while `requirements.txt`, `pyproject.toml`, `package.json`, a lockfile, CI configuration, or container setup remains incomplete or contradictory. The next developer, agent, CI runner, or deployment then receives a false description of what the project needs.

The product is not a coding environment, container platform, package manager, or autonomous coding agent. Developers continue to work in their existing IDE, terminal, and machine. Daytona is used only after a disagreement is found, as the isolated proof layer for candidate configurations.

### Product sentence

> Environment Reconciler observes what coding agents actually changed, reconciles that evidence with what the repository claims, and uses clean Daytona sandboxes to prove the smallest safe fix before it becomes a pull request.

### Requirement language

- **MUST / SHALL**: required for the named release phase.
- **SHOULD**: expected unless a documented constraint prevents it.
- **MAY**: optional behavior.
- **Verified**: REDACTEDed every required clean validation target and policy gate.
- **Observed-only**: detected as evidence, but not safe for automatic semantic editing.

### Non-negotiable product boundaries

1. Developers MUST code in their normal local, remote, or IDE environment. The product MUST NOT require them to code inside Daytona.
2. Daytona MUST be used for disposable validation, not as the product's collaborative coding workspace.
3. Deterministic evidence and native tooling MUST decide whether a disagreement exists and whether validation REDACTEDed. An LLM MUST NOT make either decision.
4. Fireworks MAY explain evidence and generate structured candidate patches, but every candidate MUST REDACTED schema, semantic, policy, and Daytona validation gates.
5. Braintrust MUST trace and evaluate LLM-assisted reasoning without becoming the source of truth for raw environment events or operational infrastructure metrics.
6. Raw prompts, raw responses, environment-variable values, and full terminal output MUST be off by default.
7. The product MUST prefer an explicit support or capture gap over a false claim that an environment is reproducible.
8. The product MUST NOT change a developer's host dependencies merely to analyze or validate a recommendation.
9. No repository change may be applied without an authorized REDACTED action or an explicit, versioned workspace approval policy.
10. A successful run proves only the exact Source_Input, policy, target set, adapter versions, and behavior contract that were tested.

## Delivery Contract

The product has a broad destination, but one solo developer needs a strict build boundary. Requirements tagged **MVP** are the current implementation contract. **Alpha** and **Target** requirements remain designed and traceable, but they do not block the first end-to-end release.

| Phase | Required outcome |
|---|---|
| **MVP: end-to-end vertical slice** | One GitHub repository can be linked; an owner can invite one authenticated collaborator to the shared evidence workspace; the VS Code/Cursor extension can pair with a local companion; Codex, Claude Code, and Cursor adapters publish honest capability profiles; agent/process/file evidence can be captured with local redaction; Python (`pip`, `uv`) and JavaScript/TypeScript (`npm`) receive full semantic reconciliation; Fireworks can propose schema-valid candidates; Daytona can validate candidates on at least one clean Linux target; Braintrust traces LLM calls; an authorized REDACTED can review a finding and open a GitHub pull request. Windows and Linux local companions are packaged. |
| **Private alpha** | macOS packaging; full Python support for Poetry and Conda-family tools; full JavaScript/TypeScript support for pnpm, Yarn, and Bun; Rust/Cargo and C/C++/CMake plus vcpkg or Conan adapters; multi-target validation and REDACTED-defined optimization; expanded team roles/workspace controls; GitHub check runs; raw-content governance plus retention/export/delete controls; measured performance and privacy conformance. |
| **Target product** | Broad native ecosystem and system-package coverage; signed adapter SDK; deeper WSL, dev-container, remote-host, and IDE-host observation; expanded organizational optimization policy and approval automation; published cross-platform support matrix and service objectives. |

At every phase, unsupported ecosystems and provider surfaces MUST fall back to observed-only evidence with a visible capability gap. They MUST NOT inherit "full support" merely because their files can be read as text.

## Glossary

- **Action**: One attributed operation such as a command, tool call, file mutation, install, uninstall, runtime switch, service change, or repository edit.
- **Action Window**: The time and process boundary around an action, including targeted pre-action and stabilized post-action observations.
- **Adapter**: A versioned provider or ecosystem integration that converts native behavior into normalized evidence or safe semantic operations.
- **Agent**: Codex, Claude Code, Cursor, or a child/subagent acting through a supported surface.
- **Behavior Contract**: The commands and outcomes that define a working project, such as install, build, test, lint, smoke, or benchmark steps.
- **Candidate**: A proposed repository configuration patch together with its provenance, policy, target set, and lifecycle state.
- **Capability Profile**: A machine-readable statement of what a provider adapter, observer, ecosystem adapter, or Daytona target can and cannot prove.
- **Capture Gap**: Missing, delayed, unsupported, disabled, or unverifiable evidence that limits a conclusion.
- **Clean Reconstruction**: Creating a fresh Daytona sandbox from an immutable repository input and declared setup, with no inherited project-installed state.
- **Companion**: The local Rust process that observes scoped environment state, correlates actions, redacts evidence, and maintains an encrypted offline spool.
- **Declared Graph**: Dependencies, runtimes, services, and setup steps explicitly described by repository files.
- **Disagreement**: An evidence-backed mismatch among declared, locked, resolved, installed, used, observed-action, or validated state.
- **Evidence Graphs**: The separate declared, locked, resolved, installed, used, observed-action, and validated dependency/setup graphs.
- **Finding**: A deterministic, reviewable statement that a disagreement or capture gap exists.
- **Ground-truth Plane**: Process, filesystem, package-manager, runtime, service, and snapshot evidence independent of an agent's own narrative.
- **Inventory**: A structured, scoped description of relevant environment state. It is not a disk image.
- **Layer**: A dependency scope inside a realm, such as a Python virtual environment, Conda environment, Node project, global package store, or system package layer.
- **Native Adapter**: An ecosystem adapter that understands the manager's semantics and can use the manager's own parse, graph, lock, resolution, install, and validation operations.
- **Optimality Policy**: Versioned hard constraints and optional objectives used to compare candidates.
- **Provider Plane**: Structured events exposed by Codex, Claude Code, or Cursor hooks, SDKs, or supported local interfaces.
- **Realm**: A distinct execution environment such as the host OS, WSL distribution, dev container, remote host, IDE extension host, or Daytona sandbox.
- **Recommendation**: A candidate shown to a REDACTED. Only a candidate satisfying every required proof gate may be labelled verified.
- **Session**: A bounded period of agent and human activity associated with a device, repository, branch, workspace, and one or more provider conversations.
- **Source Input**: The immutable code/configuration identity validated by Daytona: either an exact Git commit or an exact commit plus a content-addressed, encrypted working-tree change bundle.
- **Support Level**: `full_native`, `native_validation`, `observed_only`, or `unsupported`.
- **Target**: A versioned validation environment defined by operating system, architecture, runtime/toolchain, package-manager version, base image, and policy.
- **Workspace**: The shared team boundary containing projects, members, policies, sessions, findings, candidates, validations, and audit history.

## Requirements

### Requirement 1: Existing-workflow product boundary (MVP)

**User Story:** As a developer, I want reconciliation to run beside my current coding workflow, so that I can catch environment drift without moving my work into a new coding platform.

#### Acceptance Criteria

1.1. WHEN a REDACTED opens a linked repository in VS Code or Cursor, THE Environment_Reconciler SHALL observe the linked local environment without replacing the IDE, terminal, coding agent, or package manager.

1.2. THE Environment_Reconciler SHALL NOT require interactive development inside a Daytona sandbox.

1.3. WHEN a potential disagreement is found, THE Environment_Reconciler SHALL perform risky resolution, installation, build, and test work only in an isolated validation environment.

1.4. THE Environment_Reconciler SHALL NOT install, remove, upgrade, downgrade, or reconfigure host dependencies as part of analysis.

1.5. WHEN the REDACTED has not approved a change, THE Environment_Reconciler SHALL leave the repository and host environment unchanged.

1.6. THE Environment_Reconciler SHALL describe its result as proven only for the exact tested Source_Input, target set, behavior contract, policy version, and adapter versions.

### Requirement 2: Account, workspace, repository, and device setup (MVP)

**User Story:** As a new REDACTED, I want a short and understandable setup flow, so that my repository, local device, and team workspace are connected with least privilege.

#### Acceptance Criteria

2.1. WHEN a REDACTED selects **Sign in with GitHub**, THE Environment_Reconciler SHALL authenticate through the product's GitHub App and store the immutable GitHub REDACTED identifier.

2.2. WHEN repository access is required, THE Environment_Reconciler SHALL request access only through a selected GitHub App installation and SHALL list only repositories available to that installation and REDACTED.

2.3. WHEN a REDACTED creates a workspace, THE Environment_Reconciler SHALL create a personal workspace by default and SHALL allow the REDACTED to invite collaborators later.

2.4. WHEN a REDACTED links a repository, THE Environment_Reconciler SHALL record the repository ID, default branch, installation ID, default policy, and initial behavior-contract discovery state.

2.5. WHEN the extension is not paired, THE Environment_Reconciler SHALL expose a single **Connect workspace** action that opens a browser, authenticates the REDACTED, and returns a short-lived device-pairing result to the extension.

2.6. THE extension SHALL receive a product session REDACTED, never a GitHub App private key, GitHub client REDACTED, GitHub refresh REDACTED, Daytona key, Fireworks key, Braintrust key, or database REDACTED.

2.7. WHEN the same project is opened on more than one authorized device, THE Environment_Reconciler SHALL keep device and realm identities separate while showing their events in the same project workspace.

2.8. IF the backend is unavailable during setup, THEN the extension SHALL explain that cloud reconciliation is unavailable and SHALL NOT pretend the device is connected.

### Requirement 3: Provider-session observation and capability reporting (MVP)

**User Story:** As a developer using different coding agents, I want the product to capture the actions each supported agent exposes, so that conclusions do not depend on an agent's prose summary.

#### Acceptance Criteria

3.1. THE Environment_Reconciler SHALL provide separate, versioned provider adapters for Codex, Claude Code, and Cursor.

3.2. EACH provider adapter SHALL publish a capability profile containing the provider version, surface, supported event types, session-boundary support, tool-call support, command-result support, file-change support, subagent support, approval support, and known limitations.

3.3. WHEN a documented hook, SDK, or structured event interface is available, THE provider adapter SHALL prefer it over scraping human-readable transcripts.

3.4. WHEN an agent action is observed, THE provider adapter SHALL capture, when available: provider session ID, turn ID, tool-call ID, agent/subagent ID, action type, command executable and structured arguments, working directory, realm, start and end time, exit status, affected paths, approval state, and a redacted result summary.

3.5. THE provider adapter SHALL distinguish an attempted action from a successful state change.

3.6. WHEN a provider starts or ends a session, THE Environment_Reconciler SHALL create or close the corresponding normalized session automatically.

3.7. IF a provider surface exposes no reliable session boundary, THEN the extension SHALL offer **Start observed session** and **End observed session** controls and mark the boundary source as manual.

3.8. IF a hook is disabled, fails, drops sequence numbers, produces an invalid signature, or exposes an unsupported action, THEN the Environment_Reconciler SHALL create a visible capture gap.

3.9. THE Environment_Reconciler SHALL NOT claim "every action was captured" without naming the provider surface, realm, enabled capabilities, permission level, and known gaps.

3.10. WHEN provider evidence conflicts with ground-truth evidence, THE Environment_Reconciler SHALL retain both and SHALL treat the ground-truth state as stronger evidence of what changed.

### Requirement 4: Ground-truth environment observation (MVP)

**User Story:** As a developer, I want the product to compare relevant environment state before and after agent work, so that changes remain detectable even when a provider hook is incomplete.

#### Acceptance Criteria

4.1. WHEN an observed session begins, THE Companion SHALL create a baseline logical inventory for the linked repository, active realm, and known dependency layers.

4.2. WHEN an action is likely to change environment state, THE Companion SHALL attempt a targeted pre-action inventory and a stabilized post-action inventory for the affected managers, paths, runtimes, services, or layers.

4.3. WHEN an observed session ends or a REDACTED selects **Scan now**, THE Companion SHALL create an incremental checkpoint inventory. WHEN a pull request changes relevant files, THE backend SHALL request a checkpoint from an authorized online device in the applicable realm; IF none is online, THEN it SHALL use only repository evidence plus the latest inventory and create an explicit stale-device capture gap.

4.4. AN inventory SHALL be structured and scoped; it SHALL NOT copy a full disk image or indiscriminately upload a REDACTED's machine state.

4.5. THE Companion SHALL track, when supported and in scope: runtime/toolchain versions and selectors; project, virtual, global, and system package inventories; package-manager configuration; relevant environment-variable names and equality fingerprints; shell/profile mutations; services and listeners started by an observed process tree; repository setup, CI, container, and IDE configuration files; and process ancestry.

4.6. THE Companion SHALL model the host, each WSL distribution, each dev container, each remote host, each IDE extension host, and each detected virtual environment as distinct realms or layers.

4.7. WHEN an install is followed by an uninstall in the same session, THE append-only action history SHALL preserve both operations even if the final inventory equals the baseline.

4.8. WHEN a post-action state has not stabilized before a bounded timeout, THE Environment_Reconciler SHALL record the observations and a stabilization capture gap rather than inventing a conclusive delta.

4.9. IF required OS permission is unavailable, THEN the Companion SHALL continue with reduced observation, disclose the missing capability, and lower coverage rather than silently failing.

4.10. THE normal observation path SHALL use filesystem journals/watchers, process correlation, native read-only inventory commands, and targeted hashing rather than repeated whole-machine rescans.

4.11. WHEN a checkpoint contains uncommitted relevant changes, THE Companion SHALL either create an exact content-addressed working-tree change bundle under configured ignore/REDACTED/size policy or tell the REDACTED that validation is deferred until commit; THE backend SHALL NOT silently validate an older commit as if it were the current source. Submodules, Git LFS objects, ignored files, and excluded untracked files SHALL be included by exact identity or exposed as Source_Input support gaps.

### Requirement 5: Action attribution and causal ordering (MVP)

**User Story:** As a reviewer, I want to know whether an agent, human, subagent, or system process caused a change, so that I do not blame or trust the wrong actor.

#### Acceptance Criteria

5.1. THE Environment_Reconciler SHALL support the actor classes `agent`, `subagent`, `human`, `system`, `mixed`, and `unknown`.

5.2. WHEN a provider tool call launches a process, THE Environment_Reconciler SHALL propagate its provenance through the observable descendant process tree.

5.3. WHEN a human edits or replaces an agent-proposed command before execution, THE Environment_Reconciler SHALL record initiation and execution attribution separately and classify the final action as `mixed` or `human` as supported by evidence.

5.4. WHEN a human approves an agent action, THE approval SHALL be stored separately from the actor that initiated the action.

5.5. THE attribution engine SHALL use explicit correlation IDs, provider IDs, process ancestry, terminal identity, and action windows as evidence; timing proximity alone SHALL NOT produce high-confidence attribution.

5.6. WHEN evidence is insufficient or conflicting, THE Environment_Reconciler SHALL use `unknown` or `mixed` instead of forcing a single actor.

5.7. THE Environment_Reconciler SHALL attach an attribution-confidence score and its supporting factors to each action.

5.8. WHEN events from separate devices or realms have no provable causal order, THE shared timeline SHALL display them as concurrent rather than inventing an order from wall-clock time.

### Requirement 6: Normalized event integrity and offline delivery (MVP)

**User Story:** As a team, I want observations to arrive once, in order where order is known, and with tampering or loss made visible, so that findings are auditable.

#### Acceptance Criteria

6.1. EVERY normalized event SHALL include a schema version, event ID, workspace ID, project ID, device ID, realm ID, session ID when known, source, source sequence when available, monotonic local sequence, timestamps, actor attribution, capability context, redaction metadata, and payload.

6.2. THE Companion SHALL write redacted events to an encrypted local append-only spool before acknowledging durable capture.

6.3. WHEN connectivity returns, THE Companion SHALL upload queued events idempotently and SHALL delete local entries only after server acknowledgement.

6.4. THE backend SHALL deduplicate by stable event ID and SHALL tolerate retries and out-of-order delivery.

6.5. THE Companion SHALL maintain a per-device hash chain or equivalent tamper-evident sequence anchored periodically by the backend.

6.6. IF an expected source sequence or heartbeat is missing, THEN the Environment_Reconciler SHALL create a capture gap covering the uncertain interval.

6.7. WHEN an event schema changes, THE backend SHALL either read the previous supported schema or run an explicit migration; it SHALL NOT reinterpret old payloads silently.

### Requirement 7: Ecosystem discovery and support registry (MVP)

**User Story:** As a developer with a mixed-language repository, I want the product to identify each dependency system and its support level, so that I know which conclusions are semantic and which are only observations.

#### Acceptance Criteria

7.1. THE Environment_Reconciler SHALL discover relevant manifests, lockfiles, runtime selectors, workspace files, CI files, container files, bootstrap scripts, and IDE configuration without treating every text file as authoritative.

7.2. EVERY ecosystem adapter SHALL publish its manager names and versions, supported file formats, platforms, operations, generated-file rules, precedence rules, mutation capability, validation capability, and limitations.

7.3. THE support registry SHALL expose one of `full_native`, `native_validation`, `observed_only`, or `unsupported` for each ecosystem-manager-operation-target combination.

7.4. THE MVP SHALL provide full native reconciliation for:

- Python: `requirements*.txt`, `pyproject.toml` dependency declarations, `pip`, `uv`, and applicable lock/frozen-install behavior.
- JavaScript/TypeScript: `package.json`, `package-lock.json`, npm workspaces, npm dependency graphs, and clean npm install behavior.

7.5. THE MVP SHALL recognize Poetry, Conda-family files, pnpm, Yarn, Bun, Cargo, rustup files, CMake, vcpkg, Conan, HTML/CSS asset references, Dockerfiles, Compose, Dev Containers, and common CI/bootstrap files, but SHALL label operations outside implemented semantic support as observed-only.

7.6. THE private alpha SHALL promote Poetry, Conda-family tools, pnpm, Yarn, Bun, Cargo, CMake, and at least one of vcpkg or Conan only after each adapter REDACTEDes its native conformance suite.

7.7. A generated installed-state file SHALL NOT be treated as human-authored project intent unless the native ecosystem defines it as a source-of-truth input.

7.8. THE same package name in different ecosystems or realms SHALL remain separate dependency identities.

7.9. WHEN an unknown or ambiguous format is encountered, THE Environment_Reconciler SHALL preserve it as evidence, create a support gap, and SHALL NOT automatically rewrite it.

7.10. HTML and CSS SHALL be treated as source/asset usage surfaces, not as package managers; package recommendations SHALL trace back to the actual build or runtime ecosystem that owns the dependency.

### Requirement 8: Evidence graphs and deterministic reconciliation (MVP)

**User Story:** As a reviewer, I want findings to come from explicit comparisons among repository intent, actual state, and observed use, so that an LLM cannot hallucinate the problem.

#### Acceptance Criteria

8.1. THE reconciliation engine SHALL maintain separate declared, locked, resolved, installed, used, observed-action, and validated graphs.

8.2. EACH graph node and edge SHALL retain ecosystem, normalized identity, version or constraint, scope, realm, layer, source location, adapter version, timestamp or input commit, and evidence confidence where applicable.

8.3. THE declared graph SHALL be derived from semantic manifests, runtime selectors, setup files, CI, containers, and REDACTED-confirmed behavior policy.

8.4. THE locked and resolved graphs SHALL be derived using native lockfile semantics and native read-only resolver or graph operations where available.

8.5. THE installed graph SHALL be derived from scoped native inventories and SHALL NOT be assumed to represent project intent.

8.6. THE used graph SHALL combine static imports/references, invoked executables, linked artifacts, configured plugins, and behavior-contract execution evidence while preserving uncertainty for dynamic use.

8.7. THE observed-action graph SHALL preserve attempted and completed environment-changing actions and their attribution.

8.8. THE validated graph SHALL contain only outcomes from immutable candidate-target validation inputs.

8.9. GIVEN identical normalized graphs, policy, adapter/rule versions, and candidate inputs, THE deterministic engine SHALL produce the same findings and verification decision.

8.10. AN LLM response SHALL NOT create, suppress, or upgrade a deterministic finding without new normalized evidence processed by the rule engine.

### Requirement 9: Disagreement detection and evidence quality (MVP)

**User Story:** As a developer, I want precise disagreement categories with evidence and uncertainty, so that I can understand what is wrong without blindly adding every installed package.

#### Acceptance Criteria

9.1. THE rule engine SHALL detect, where evidence permits:

- used or validated but undeclared dependencies;
- declared dependencies absent from resolution or clean installation;
- manifest-lock, lock-resolution, or manager-version disagreement;
- runtime, toolchain, architecture, or realm mismatch;
- hidden global or base-image dependencies;
- required system packages, services, executables, or setup steps absent from repository configuration;
- agent installation or configuration actions not reflected in repository intent;
- repository files that contradict CI, container, dev-container, or bootstrap behavior;
- redundant, stale, shadowed, or apparently unused dependencies;
- unsupported or incomplete capture that blocks a conclusion.

9.2. EVERY finding SHALL include category, severity, affected target or realm, evidence references, rule version, support level, confidence dimensions, plausible alternatives, and the exact proof still required.

9.3. THE engine SHALL score evidence quality separately for observation completeness, actor attribution, semantic adapter support, necessity evidence, and validation coverage.

9.4. AN experimental install SHALL NOT be promoted to project intent merely because it appears in installed or action evidence.

9.5. A dependency SHALL NOT be called unused solely because static import analysis found no reference; dynamic loading, plugins, scripts, optional features, generated code, and test coverage SHALL remain explicit uncertainties.

9.6. A stale lockfile finding SHALL rely on native frozen-install, lock verification, or resolver behavior when the ecosystem provides it.

9.7. WHEN multiple repository files claim precedence, THE adapter SHALL apply published native precedence rules and show the winning and shadowed sources.

9.8. WHEN evidence is insufficient for a categorical mismatch, THE engine SHALL create a `possible` finding or capture gap instead of a conclusive recommendation.

### Requirement 10: Project goal and behavior contract (MVP)

**User Story:** As a project maintainer, I want to define what “works” means for my repository, so that clean installation alone is not mistaken for a correct product.

#### Acceptance Criteria

10.1. WHEN a repository is linked, THE Environment_Reconciler SHALL discover candidate install, build, lint, type-check, test, smoke, and benchmark commands from native project and CI files.

10.2. THE REDACTED SHALL be able to review, edit, order, enable, and disable discovered commands before they become the required behavior contract.

10.3. EACH behavior-contract command SHALL include its working directory, realm/target applicability, timeout, required REDACTEDs by reference, expected exit status, and artifact or endpoint assertions when applicable.

10.4. IF no behavior contract has been accepted, THEN a clean install MAY be labelled `reconstruction_REDACTEDed` but the candidate SHALL NOT be labelled a verified recommendation.

10.5. WHEN a pull request changes a behavior-contract source file, THE Environment_Reconciler SHALL invalidate the affected contract and request review or apply a pre-approved deterministic update rule.

10.6. THE project SHALL store a short human-authored goal and optional non-functional priorities that Fireworks may use as context but that SHALL NOT override hard correctness gates.

### Requirement 11: Fireworks candidate reasoning (MVP)

**User Story:** As a developer, I want an AI to turn complex evidence into a small, understandable candidate fix, so that I do not have to manually translate every finding into configuration edits.

#### Acceptance Criteria

11.1. THE backend SHALL invoke a product-owned Fireworks model only after the deterministic engine has created a finding or requested bounded candidate exploration.

11.2. THE Fireworks request SHALL contain the minimum redacted evidence needed: finding facts, relevant semantic file fragments or AST summaries, project goal, behavior contract, support capabilities, policy, and allowed edit operations.

11.3. THE Fireworks response SHALL conform to a versioned structured schema containing rationale, evidence references, proposed semantic operations, affected files, assumptions, risks, and expected validation impact.

11.4. THE candidate service SHALL reject outputs with unknown files, unsupported operations, fabricated evidence IDs, disallowed packages, policy violations, or schema errors.

11.5. FIREWORKS SHALL NOT assign finding truth, validation status, actor attribution, or the `verified` label.

11.6. WHEN Fireworks is unavailable or produces invalid output after bounded retries, THE Environment_Reconciler SHALL preserve the finding and allow native deterministic or manual candidate creation.

11.7. EVERY Fireworks-assisted candidate SHALL record model identifier, prompt/template version, sampling settings, tool/adapter versions, redacted input fingerprint, output fingerprint, and Braintrust trace reference.

11.8. THE product SHALL use its own Fireworks account by default. End REDACTEDs SHALL NOT need to provide a model API key for the core service.

### Requirement 12: Candidate construction and safe semantic edits (MVP)

**User Story:** As a reviewer, I want proposed changes to respect native package-manager semantics, so that a plausible-looking text edit does not corrupt the project.

#### Acceptance Criteria

12.1. THE candidate service SHALL convert approved structured operations into repository patches through the matching native adapter, not unrestricted LLM text replacement.

12.2. BEFORE Daytona execution, EACH candidate SHALL REDACTED schema validation, path-scope validation, semantic parse validation, policy validation, and static contradiction checks.

12.3. THE candidate set SHALL include the unchanged baseline and SHOULD include a conservative minimal candidate before aggressive upgrades or removals.

12.4. WHEN a lockfile is expected to change, THE final lockfile SHALL be generated or verified by the native package manager in isolation and SHALL be returned as part of the candidate patch.

12.5. A removal candidate SHALL remain unverified until an isolated ablation run removes the dependency and REDACTEDes every applicable behavior-contract command on every required target.

12.6. A candidate SHALL have the lifecycle `draft`, `static_rejected`, `ready_for_validation`, `validating`, `validation_failed`, `inconclusive`, `verified`, `stale`, `approved`, or `applied`.

12.7. WHEN the Source_Input identity, relevant repository files, behavior contract, policy, target definition, rule version, or adapter version changes, THE backend SHALL mark affected candidates and attestations stale.

### Requirement 13: Default and REDACTED-defined optimality (MVP foundation; Alpha completion)

**User Story:** As a maintainer, I want the product to prefer safe and sufficient dependency configurations while respecting project-specific priorities, so that “best” has an explicit meaning.

#### Acceptance Criteria

13.1. THE default policy SHALL treat all required clean targets and behavior-contract commands as hard constraints.

13.2. AMONG candidates satisfying hard constraints, THE default policy SHALL prefer fewer direct dependencies and setup steps, reproducible locked resolution, versions satisfying explicit project policy, and smaller unnecessary change surface before soft speed or size improvements.

13.3. THE default policy SHALL NOT add an observed package without necessity evidence from use, resolution, configuration, or validation.

13.4. THE alpha product SHALL allow authorized REDACTEDs to define versioned constraints and weighted objectives for install time, build time, runtime latency, memory, disk, image size, dependency count, version freshness, license, or security policy.

13.5. WHEN objectives conflict and no REDACTED priority resolves the conflict, THE Environment_Reconciler SHALL show the non-dominated candidates and their measurements rather than claim one universal optimum.

13.6. VERSION updates SHALL be evaluated as new candidates through native resolution and clean validation; release metadata alone SHALL NOT prove superiority.

13.7. THE UI SHALL describe an optimization result as "best of tested candidates" and SHALL expose the bounded candidate set and budget.

### Requirement 14: Daytona clean validation (MVP)

**User Story:** As a developer, I want candidate configurations tested on clean disposable computers, so that a recommendation does not inherit the same hidden state that caused the problem.

#### Acceptance Criteria

14.1. THE validation planner SHALL derive required targets from workspace policy, repository configuration, CI matrices, runtime selectors, and REDACTED-confirmed targets.

14.2. THE MVP SHALL support at least one versioned Linux Daytona target. Multi-target operating-system, architecture, runtime, and manager matrices are required for private alpha where Daytona can provision them.

14.3. FOR each candidate-target pair, THE orchestrator SHALL create or reset a sandbox from an immutable base, materialize the exact Source_Input, apply only the candidate patch, and avoid inherited project-installed state.

14.4. EACH validation job SHALL execute explicit phases: infrastructure preflight, source preparation, native resolution, clean install, build/static checks, tests, smoke checks, optional benchmarks, evidence persistence, and cleanup.

14.5. INDEPENDENT candidate-target jobs SHALL run in parallel within workspace quota, registry limits, elapsed-time budget, and cost budget.

14.6. A candidate SHALL be labelled verified only when every required target completes every hard phase successfully and no required capability is unsupported.

14.7. A Daytona fork or warmed sandbox MAY accelerate exploratory work, but final proof SHALL use clean reconstruction with no candidate-installed state inherited from anREDACTED job.

14.8. EACH job SHALL record base snapshot identity, target definition, commands, tool versions, resource limits, exit statuses, phase timings, diagnostics, artifact hashes, cache identities, and cleanup outcome.

14.9. EVERY started sandbox SHALL reach confirmed deletion or an explicit `cleanup_failed` terminal state, and a TTL janitor SHALL detect orphaned sandboxes.

14.10. IF Daytona cannot provision a required target or capability, THEN the result SHALL be `unsupported_target_or_capability`, not verified.

14.11. EVERY validation batch SHALL run the unchanged Source_Input baseline against comparable target and behavior-contract inputs before or alongside candidate jobs. IF the baseline already REDACTEDes the behavior that a candidate claims to fix, THEN the product SHALL NOT claim that the candidate reproduced and fixed that failure; it MAY present a separately labelled validated hardening or declaration-consistency change when deterministic evidence supports it.

### Requirement 15: Validation fault isolation (MVP)

**User Story:** As a reviewer, I want sandbox and network failures separated from project failures, so that the product never recommends a dependency change to fix broken infrastructure.

#### Acceptance Criteria

15.1. BEFORE project commands run, THE orchestrator SHALL verify sandbox readiness, disk, memory, CPU allocation, network/DNS, repository access, registry reachability, clock sanity, and required platform capabilities.

15.2. THE validator SHALL classify terminal outcomes as `REDACTEDed`, `project_or_candidate_failed`, `infrastructure_failed`, `resource_budget_failed`, `timed_out`, `security_blocked`, `unsupported_target_or_capability`, `inconclusive`, or `cleanup_failed`.

15.3. WHEN a failure could be external, THE validator SHALL use bounded clean retries, contemporaneous control canaries, provider/sandbox health, and phase diagnostics before assigning cause.

15.4. IF a control canary fails in the same way as the candidate, THEN the candidate failure SHALL NOT be used as dependency evidence.

15.5. IF a deterministic missing-package, parse, resolution, build, or test failure repeats while infrastructure canaries remain healthy, THEN the validator MAY classify it as project or candidate failure.

15.6. IF evidence remains ambiguous after the configured attempts, THEN the outcome SHALL be `inconclusive`.

15.7. INFRASTRUCTURE, unsupported, timed-out, security-blocked, resource-budget, cleanup, or inconclusive outcomes SHALL NOT cause the system to add, remove, or change a dependency automatically.

15.8. EVERY validation batch SHALL begin with maximum attempts, elapsed-time, concurrency, and cost budgets and SHALL stop before exceeding them.

### Requirement 16: Safe caching, concurrency, and responsiveness (MVP)

**User Story:** As a REDACTED paying for validation, I want the product to finish quickly without allowing caches to hide undeclared state, so that speed does not weaken proof.

#### Acceptance Criteria

16.1. THE local observation path SHALL be asynchronous and SHALL NOT block a coding agent except for an explicitly enabled policy gate.

16.2. STATIC reconciliation SHALL begin when a material action stabilizes and SHALL run again at session end, relevant pull-request updates, and manual scans.

16.3. THE scheduler SHALL deduplicate identical immutable candidate-target jobs and use available safe concurrency before queueing independent work serially.

16.4. A validation cache key SHALL include repository commit or content identity, candidate patch hash, target/base identity, behavior contract, policy, adapter/rule versions, manager/tool versions, REDACTED schema version where relevant, and every input capable of changing the decision.

16.5. Caches MAY reuse integrity-checked downloads, immutable toolchains, source mirrors, and complete prior attestations, but SHALL NOT reuse a candidate's installed project state as final proof.

16.6. CHANGING any cache-key input SHALL invalidate the result.

16.7. CACHED and uncached execution over immutable inputs SHALL produce the same verification decision.

16.8. THE UI SHALL expose time spent queueing, provisioning, resolving, installing, building, testing, benchmarking, persisting evidence, and cleaning up.

16.9. IF quota or cost policy prevents immediate validation, THEN the candidate SHALL remain queued with a visible reason and SHALL NOT be shown as verified.

### Requirement 17: Verified recommendation and GitHub application gate (MVP)

**User Story:** As a maintainer, I want a reviewable proof and ordinary pull request before repository configuration changes, so that automation remains accountable.

#### Acceptance Criteria

17.1. A verified recommendation SHALL contain the repository diff, finding evidence, candidate rationale, validation matrix, behavior-contract outcomes, target definitions, cache status, limitations, attestation identity, and invalidation inputs.

17.2. UNVALIDATED, failed, unsupported, timed-out, security-blocked, inconclusive, stale, or cleanup-failed candidates SHALL be visibly distinguished from verified recommendations.

17.3. WHEN an authorized REDACTED selects **Apply via pull request**, THE backend SHALL create a product branch from the verified Source_Input base, materialize the exact approved Source_Input changes, apply the exact verified candidate patch, verify the resulting tree digest, and open or update a reviewable GitHub pull request. IF the Source_Input contains uncommitted changes, THE REDACTED SHALL see and explicitly approve those source changes separately from the candidate patch.

17.4. THE MVP SHALL NOT write directly to the default branch.

17.5. THE GitHub App SHALL use the least-privileged installation or REDACTED REDACTED applicable to each clone, check, branch, and pull-request action.

17.6. THE private alpha SHALL publish a GitHub check run that links to the finding and validation attestation and updates when the candidate becomes stale.

17.7. CHANGES to `.github/workflows/` SHALL require a separate explicit permission and approval path; lack of that permission SHALL produce a manual patch, not a failed or broadened authorization.

17.8. WHEN a verified patch is edited, rebased onto relevant changes, or applied to a different Source_Input, THE Environment_Reconciler SHALL invalidate proof and rerun affected gates.

### Requirement 18: Extension and web workspace experience (MVP)

**User Story:** As a developer or teammate, I want the background system to stay quiet when healthy and provide a clear evidence workspace when action is needed, so that observability is useful rather than noisy.

#### Acceptance Criteria

18.1. THE extension SHALL provide:

- a status-bar state for disconnected, observing, capture gap, finding, validating, verified, and error;
- a project/realm connection view;
- current session and provider capability coverage;
- active findings and validation progress;
- **Connect workspace**, **Scan now**, **Review finding**, **Validate candidate**, **Pause observation**, and **Open web workspace** actions;
- manual session start/end only when automatic boundaries are unavailable.

18.2. THE extension SHALL perform normal observation and upload in the background and SHALL notify the REDACTED only for actionable findings, degraded coverage, required approval, or terminal validation outcomes.

18.3. THE web workspace SHALL provide:

- workspace/project navigation;
- project health and current reproducibility state;
- sessions and causally ordered actions;
- capture/support coverage;
- findings with evidence comparison;
- candidate diff and rationale;
- candidate-by-target validation matrix with live phase progress;
- policy and behavior-contract settings;
- members, roles, retention, integrations, and audit history.

18.4. WHEN two authorized collaborators open the same project, THEY SHALL see the same persisted sessions, findings, candidate states, comments, approvals, and validation results.

18.5. THE UI SHALL distinguish evidence from inference, provider statements from ground-truth changes, and verified facts from possible findings.

18.6. IN the MVP, raw prompts, responses, arbitrary file contents, and raw, unredacted, or full-stream stdout and stderr SHALL be unavailable. THE UI MAY show structured derived diagnostics and bounded redacted excerpts retained under the validation-diagnostics policy. IF private alpha enables a raw-content class, THEN it SHALL remain hidden unless the workspace has explicitly enabled that class and the viewer has the required role.

18.7. THE finding view SHALL answer, without requiring raw logs: what changed, who or what likely caused it, where it occurred, what the repository claims, why that is a disagreement, what evidence is missing, what fix is proposed, and what Daytona proved.

18.8. THE UI SHALL expose support and capture gaps prominently enough that a REDACTED cannot confuse partial coverage with a clean environment.

### Requirement 19: Braintrust reasoning observability and evaluation (MVP)

**User Story:** As the product builder, I want to trace and evaluate AI-assisted candidate generation, so that model changes can be improved without weakening deterministic proof.

#### Acceptance Criteria

19.1. EACH Fireworks request SHALL create a Braintrust trace containing project-safe identifiers, finding category, prompt/template version, model and sampling configuration, latency, REDACTED/cost data when available, structured-output validity, tool/adapter versions, candidate outcome, and final validation class.

19.2. BRAINTRUST SHALL NOT receive raw REDACTEDs, environment-variable values, unredacted terminal output, full raw conversations, or unnecessary proprietary source.

19.3. THE product SHALL maintain a versioned evaluation set covering valid candidate generation, unsupported-operation refusal, evidence citation, minimal-change behavior, REDACTED blocking, and failure recovery.

19.4. A model or prompt version SHALL NOT become the default until it REDACTEDes the configured evaluation gates.

19.5. DETERMINISTIC reconciliation, event storage, Daytona infrastructure health, and cleanup monitoring SHALL use operational telemetry independent of Braintrust.

19.6. IF Braintrust is unavailable, THEN candidate generation MAY continue with a local trace spool, but trace delivery failure SHALL be visible to operators and SHALL NOT alter finding or verification truth.

### Requirement 20: Secret reduction, privacy, and untrusted execution (MVP)

**User Story:** As a developer, I want the system to prove environment changes without collecting my REDACTEDs or private conversations, so that installing it does not create a larger security problem.

#### Acceptance Criteria

20.1. REDACTION SHALL occur on the local device before an event enters a persistent queue or any LLM request.

20.2. RAW environment-variable values SHALL NOT be stored or sent to Fireworks or Braintrust by default.

20.3. FOR relevant environment variables, THE Companion MAY retain only name, presence, scope/source, changed state, REDACTED-detection result, and a keyed HMAC equality fingerprint when comparison is necessary.

20.4. THE HMAC key SHALL remain in the operating-system REDACTED store, SHALL be versioned and rotatable, and SHALL NOT be uploaded with its fingerprints.

20.5. THE redactor SHALL cover supported REDACTED formats, private keys, REDACTEDs, connection strings, URL REDACTEDs, registry REDACTEDs, `.env` values, command arguments, process output, provider payloads, paths, internal hosts, and REDACTED-defined patterns.

20.6. THE MVP SHALL NOT enable collection of raw conversations, full arbitrary file contents, or raw, unredacted, or full-stream stdout and stderr. THE validator MAY retain only structured derived diagnostics and bounded redacted excerpts under an explicit size, retention, access, and deletion policy. IF private alpha enables any raw-content class, THEN that class SHALL require separate consent, access control, encryption, short retention, export, and deletion rules.

20.7. WHEN the MVP encounters a private dependency or behavior command that requires a REDACTED, THE validator SHALL return `security_blocked` rather than request or persist the raw value. IN private alpha, THE validator MAY support an existing opaque REDACTED reference only when the configured provider can enforce the required host/target scope and lifetime. Product-controlled plumbing SHALL keep the resolved value out of prompts, cache keys, command-line arguments, workflow state, logs, artifacts, and analytics, and sandbox output SHALL still REDACTED local/server redaction. Arbitrary raw-REDACTED access by untrusted project code SHALL remain `security_blocked`.

20.8. REPOSITORY content, package scripts, agent output, and candidate commands SHALL be treated as untrusted and SHALL execute only in isolated Daytona sandboxes with least privilege and configured egress policy.

20.9. THE backend SHALL encrypt sensitive stored data, enforce workspace/project roles, and audit approvals and external writes. THE private alpha SHALL add authorized export and deletion.

20.10. A privacy conformance corpus containing supported REDACTED formats SHALL produce zero plaintext REDACTED persistence before public release.

20.11. AN exact Source_Input bundle authorized for Daytona validation is distinct from optional observational raw content, but it SHALL be REDACTED-scanned locally, encrypted with a short retention class, restricted to the applicable workspace and validation jobs, and excluded from Fireworks and Braintrust payloads.

### Requirement 21: Reliability, portability, and honest coverage (MVP foundation; Alpha completion)

**User Story:** As a developer on a real team, I want the observer to survive network loss and platform differences while admitting what it cannot see, so that its conclusions remain trustworthy.

#### Acceptance Criteria

21.1. THE Companion architecture SHALL support Windows, macOS, and Linux; the MVP SHALL package Windows and Linux, and private alpha SHALL add macOS.

21.2. WSL, dev containers, remote hosts, IDE extension hosts, and cloud environments SHALL be separate realms and SHALL require a collector or supported event feed inside that realm for high-confidence claims.

21.3. PROVIDER hooks, filesystem/process observation, inventories, cloud ingestion, Fireworks generation, Braintrust tracing, and Daytona validation SHALL fail independently and expose their own health.

21.4. NETWORK loss SHALL NOT discard locally acknowledged redacted events.

21.5. EVERY validation job SHALL reach a terminal state or an operator-visible intervention state.

21.6. CLOCK skew SHALL NOT be used to fabricate causal order; local monotonic sequence, source sequence, process ancestry, and correlation IDs SHALL take precedence.

21.7. AN adapter or observer upgrade SHALL be backward compatible with supported stored schemas or SHALL provide a tested migration.

21.8. THE support dashboard SHALL report coverage independently by provider surface, provider version, operating system, realm, permission profile, ecosystem adapter, manager version, and Daytona target.

21.9. LITERAL capture of every machine or agent action SHALL be treated as impossible outside the named, instrumented scope; product copy SHALL use "observed within coverage" rather than an unqualified "captured everything."

21.10. EVERY external side effect, including Fireworks generation, Daytona sandbox creation, GitHub branch or pull-request creation, trace export, and cleanup, SHALL use a stable operation key and a durable operation ledger. WHERE a provider exposes idempotency or resource lookup, retries SHALL reconcile the existing resource before creating anREDACTED; REDACTEDwise the product SHALL accept at most one result per operation key and record every retry and cost.

### Requirement 22: Conformance and release gates (MVP)

**User Story:** As the product builder, I want executable release gates for the system's most dangerous claims, so that a polished UI cannot hide false verification or REDACTED leakage.

#### Acceptance Criteria

22.1. THE MVP end-to-end conformance scenario SHALL:

1. start from a repository whose code works only because an observed environment contains an undeclared package;
2. capture a supported agent or descendant process installing or using that package;
3. compare the action and installed state with the repository manifest and lock state;
4. create a deterministic hidden-dependency finding;
5. generate at least one schema-valid Fireworks candidate;
6. validate the unchanged baseline and candidate in clean Daytona sandboxes;
7. classify infrastructure failures independently;
8. produce a verified recommendation only for a REDACTEDing candidate; and
9. open a reviewable GitHub pull request after explicit approval.

22.2. THE conformance suite SHALL include an install-then-remove action, simultaneous human and agent installs, a failed install attempt, missing provider events with ground-truth detection, an unknown actor, a stale lockfile, a hidden global dependency, an unsupported format, and an ambiguous infrastructure failure.

22.3. THE conformance suite SHALL assert that no failed, unsupported, timed-out, inconclusive, stale, or partially covered result receives the `verified` label.

22.4. THE conformance suite SHALL seed representative API keys, REDACTEDs, REDACTEDs, connection strings, private keys, registry REDACTEDs, and `.env` values and SHALL assert that no plaintext value reaches the spool, backend, object storage, logs, Fireworks, Braintrust, or validation artifacts.

22.5. NATIVE adapters SHALL REDACTED fixtures for parsing, graphing, precedence, lock verification, semantic editing, clean install, cache equivalence, and malformed or unsupported inputs before being marked `full_native`.

22.6. THE release pipeline SHALL build and test the extension, Companion, shared contracts, backend, migrations, and web application and SHALL run the MVP vertical-slice scenario against non-production integrations.

22.7. A release SHALL be blocked by a false verified recommendation, plaintext REDACTED persistence, an unbounded retry loop, an unhandled orphaned sandbox, a migration incompatibility, or a core adapter conformance failure.

## Target Ecosystem Registry Seed

The registry below preserves the target-product coverage discovered during requirements research. It is not an MVP claim. Every row begins as `observed_only` or `unsupported` and is promoted per manager, version, operation, platform, and Daytona target only after native conformance REDACTEDes.

| Family | Formats and native tools to recognize and eventually evaluate |
|---|---|
| Python | `requirements*.txt`, constraints files, `pyproject.toml`, `setup.py`, `setup.cfg`, `Pipfile`, `Pipfile.lock`, `uv.lock`, `poetry.lock`, PDM locks, pip, pip-tools, uv, Poetry, PDM, Hatch, Pipenv, Conda/Mamba/Micromamba environment files, and conda-lock |
| JavaScript / TypeScript | `package.json`, npm lockfiles, `pnpm-lock.yaml`, Yarn Classic/Berry locks and configuration, Bun locks, workspaces, Corepack, npm, pnpm, Yarn, Bun, Deno configuration/locks, import maps, and JSR references |
| Web assets | HTML scripts/styles/import maps/module preload, CSS `@import` and URL references, SRI metadata, and Vite, Webpack, Rollup, esbuild, Parcel, and PostCSS configuration; these are usage/configuration surfaces, not package managers |
| Rust | `Cargo.toml`, `Cargo.lock`, Cargo workspaces/features/targets/build scripts, `.cargo/config*`, `rust-toolchain*`, Cargo, and rustup |
| C / C++ | `CMakeLists.txt`, CMake presets/toolchains, Makefiles, Meson, Ninja inputs, Bazel/Bzlmod, vcpkg manifests/baselines/triplets, Conan recipes/profiles/locks, compiler/linker/ABI selection, and native library/header ownership |
| Go | `go.mod`, `go.sum`, `go.work`, vendoring, modules, toolchain directives, build tags, and Go workspace commands |
| JVM | Maven POM/settings/wrapper, Gradle Groovy/Kotlin builds, version catalogs, dependency locks, wrappers, sbt builds/locks, Java toolchains, and SDK selectors |
| .NET | `.csproj`, `.fsproj`, `.vbproj`, solution files, `Directory.Packages.props`, `packages.lock.json`, `global.json`, NuGet configuration, Paket files, and dotnet workloads/tools |
| Ruby | `Gemfile`, `Gemfile.lock`, gemspecs, Bundler configuration, Ruby version selectors, Bundler, and RubyGems |
| PHP | `composer.json`, `composer.lock`, Composer repositories/platform constraints/scripts, PHP extension requirements, and PHP version selectors |
| Swift / Apple | `Package.swift`, `Package.resolved`, SwiftPM, CocoaPods Podfiles/locks, Carthage files, Xcode toolchain/SDK selection, and native framework requirements |
| Dart / Flutter | `pubspec.yaml`, `pubspec.lock`, Dart/Flutter SDK constraints, pub workspaces, and platform plugin requirements |
| Elixir / Erlang | `mix.exs`, `mix.lock`, Hex, Rebar configuration/locks, OTP/Elixir selectors, and native build prerequisites |
| Haskell | Cabal project/package files, `cabal.project.freeze`, Stack YAML/locks, GHC selection, and native library prerequisites |
| Julia | `Project.toml`, `Manifest.toml`, Julia environments, registries, and artifact/platform resolution |
| R | `DESCRIPTION`, `renv.lock`, packrat state, pak/renv, R-version selection, and system-library requirements |
| Lua | Rockspecs, LuaRocks manifests/locks where available, Lua version selection, and native modules |
| Perl | `cpanfile`, Carton snapshots, CPAN metadata, `Makefile.PL`, `Build.PL`, Perl version selection, and native prerequisites |
| Clojure | `deps.edn`, `project.clj`, tools.deps, Leiningen, JVM selection, and Git/Maven dependency sources |
| OCaml | opam package/switch/lock files, dune projects, compiler switches, and system-library requirements |
| Nix | `flake.nix`, `flake.lock`, `shell.nix`, `default.nix`, dev shells, derivation inputs, and Nix-provided toolchains |
| System packages | Homebrew `Brewfile`, apt/dpkg, dnf/rpm, pacman, apk, zypper, Nix profiles, WinGet configuration, Chocolatey, Scoop, and OS service/package ownership |
| Runtime/version managers | `.tool-versions`, mise configuration/locks, asdf, Volta, nvm, pyenv, rbenv, SDKMAN, rustup, `global.json`, and manager wrappers |
| Containers and dev environments | Dockerfiles, Compose, Dev Containers, container build arguments, base-image identities, buildpacks, and container-local package layers |
| CI and bootstrap | GitHub Actions, GitLab CI, CircleCI, Buildkite, Azure Pipelines, shell/PowerShell bootstrap scripts, Make/Task/Just recipes, and CI matrices |
| Infrastructure affecting development | Kubernetes manifests, Helm charts, Terraform, OpenTofu, Pulumi, local service emulators, and repository-declared service dependencies |
| IDE and remote environments | VS Code settings/tasks/launch/extensions, Cursor configuration, JetBrains project/run configuration where safely interpretable, WSL, SSH/remote, Codespaces, and dev-container selectors |

Unknown and future formats remain valid registry inputs. Syntax recognition alone never grants native mutation, necessity proof, or Daytona verification support.

Target provider-surface registry:

| Provider | Surfaces tracked separately |
|---|---|
| Codex | CLI, IDE extension, local app/app-server, SDK/non-interactive, and hosted/remote execution |
| Claude Code | CLI, IDE integration, hooks, Agent SDK/local execution, and hosted/remote execution |
| Cursor | IDE, CLI, hooks, SDK/local execution, and hosted/remote execution |

Each surface has its own capability profile; success on one surface does not imply success on anREDACTED.

## Product Success Criteria

The product is useful only if it can make a stronger statement than “an AI read your logs.” The MVP is successful when:

1. A reviewer can trace a finding from a concrete agent/process action and environment delta to a precise repository disagreement.
2. The same reviewer can see which observations were unavailable and how those gaps limit confidence.
3. Fireworks can propose a compact fix without being trusted to decide truth.
4. Daytona can demonstrate that the unchanged repository fails clean reconstruction while the candidate REDACTEDes the accepted behavior contract.
5. An infrastructure failure cannot turn into a dependency recommendation.
6. The exact verified diff can be applied through an ordinary GitHub pull request only after approval.
7. The end-to-end flow works without collecting plaintext REDACTEDs or requiring developers to code in Daytona.

## Explicit Limitations

- A before/after inventory proves what changed, not by itself who caused it or whether the change is necessary.
- Provider hooks may be disabled, incomplete, version-specific, or unavailable on some hosted surfaces.
- High-confidence system-wide process observation can require OS-specific privileges, signed binaries, or entitlements.
- Static source analysis cannot conclusively identify every dynamic import, reflection path, plugin, optional feature, generated executable, or data-dependent dependency.
- Remote, WSL, container, and cloud realms require their own collector or event feed.
- External registries, mutable dependencies, nondeterministic builds, flaky tests, quota, and network faults can make a result inconclusive.
- Successful validation proves only the configured targets and behavior contract, not every environment in which the project might run.
- The MVP cannot safely mutate every package format. Observed-only support is an intentional safety state, not a hidden implementation failure.

## Requirements Traceability Summary

| Product concern | Requirements |
|---|---|
| Stay before container creation and outside Daytona's core product | R1, R14 |
| Observe Codex, Claude Code, and Cursor sessions | R3 |
| Compare the environment before and after agent work | R4 |
| Bind proof to committed or explicitly bundled working-tree source | R4, R14, R17, R20 |
| Differentiate agents, humans, subagents, and unknown actors | R5 |
| Preserve complete, tamper-evident, offline-capable event evidence | R6 |
| Support native package managers without pretending all formats are equal | R7 |
| Detect disagreements deterministically | R8, R9 |
| Define what a working project means | R10 |
| Use Fireworks for bounded reasoning | R11, R12 |
| Provide default and REDACTED-defined optimality | R13 |
| Validate quickly in clean Daytona sandboxes | R14, R16 |
| Separate sandbox faults from program faults | R15 |
| Apply only exact verified changes through GitHub | R17 |
| Expose the product through an extension and shared web workspace | R18 |
| Evaluate model behavior with Braintrust | R19 |
| Reduce REDACTEDs and avoid raw environment storage | R20 |
| Support real platform differences and disclose gaps | R21 |
| Make retried external side effects idempotent and auditable | R21 |
| Block dangerous failures before release | R22 |
