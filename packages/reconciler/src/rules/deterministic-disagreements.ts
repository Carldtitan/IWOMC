import {
  compareText,
  identityCanonicalValue,
  resourceMatchKey,
  stableId
} from "../graphs/canonical.js";
import type {
  EvidenceGraphSet,
  EvidenceNode,
  EvidenceReference,
  Finding,
  ReconciliationResult,
  ReconciliationUncertainty,
  ResourceIdentity,
  SupportLevel
} from "../graphs/types.js";
import { reconcileNpmUndeclaredDependencies } from "./npm-undeclared.js";

/**
 * Attribute vocabulary consumed by these rules is deliberately small and
 * adapter-neutral. Adapters produce facts; these rules compare those facts.
 * No model output is accepted as truth evidence.
 */
export const deterministicDisagreementRules = Object.freeze({
  ruleId: "core.deterministic-disagreements",
  version: "1.0.0"
});

const configurationKinds = new Set(["ci", "container", "dev_container", "bootstrap"]);
const requiredSetupKinds = new Set(["system_package", "service", "executable", "setup_step"]);
const removableClassifications = new Set(["redundant", "stale", "shadowed", "apparently_unused"]);
const mismatchDimensions = [
  "runtime",
  "toolchain",
  "architecture",
  "realm",
  "dependency_layer"
] as const;

type MismatchDimension = (typeof mismatchDimensions)[number];

interface FindingCandidate {
  readonly category: string;
  readonly identity: ResourceIdentity;
  readonly nodes: readonly EvidenceNode[];
  readonly counterNodes?: readonly EvidenceNode[];
  readonly severity: Finding["severity"];
  readonly assertion: string;
  readonly alternatives?: readonly string[];
  readonly nextEvidence?: readonly string[];
  readonly necessity?: number;
}

/**
 * Runs the complete first deterministic rule set. Stronger, directly observed
 * dependency findings take precedence over weaker overlapping categories.
 */
export function reconcileDeterministicDisagreements(
  graphs: EvidenceGraphSet
): ReconciliationResult {
  const npmResult = reconcileNpmUndeclaredDependencies(graphs);
  const candidates: FindingCandidate[] = [];
  const uncertainties: ReconciliationUncertainty[] = [...npmResult.uncertainties];
  const allNodes = graphs.all.flatMap((graph) => graph.nodes);
  const declaredByBase = groupByBaseIdentity(graphs.declared.nodes);
  const installedByBase = groupByBaseIdentity(graphs.installed.nodes);
  const usedByBase = groupByBaseIdentity(graphs.used.nodes.filter(isCertainExecutableUse));
  const actionsByBase = groupByBaseIdentity(graphs.observedAction.nodes);
  const lockedByBase = groupByBaseIdentity(graphs.locked.nodes);
  const resolvedByBase = groupByBaseIdentity(graphs.resolved.nodes);
  const validatedByBase = groupByBaseIdentity(graphs.validated.nodes);
  const occupied = new Set(
    npmResult.findings.flatMap((finding) => finding.affectedIdentities.map(resourceMatchKey))
  );

  const bases = new Set([
    ...declaredByBase.keys(),
    ...installedByBase.keys(),
    ...usedByBase.keys(),
    ...actionsByBase.keys(),
    ...lockedByBase.keys(),
    ...resolvedByBase.keys()
  ]);

  for (const base of [...bases].sort(compareText)) {
    const declared = declaredByBase.get(base) ?? [];
    const installed = installedByBase.get(base) ?? [];
    const used = usedByBase.get(base) ?? [];
    const actions = actionsByBase.get(base) ?? [];
    const locked = lockedByBase.get(base) ?? [];
    const resolved = resolvedByBase.get(base) ?? [];
    const validated = validatedByBase.get(base) ?? [];
    const identity =
      used[0]?.identity ??
      installed[0]?.identity ??
      actions[0]?.identity ??
      declared[0]?.identity ??
      locked[0]?.identity ??
      resolved[0]?.identity;
    if (identity === undefined) continue;

    const supporting = [...used, ...installed, ...actions, ...declared, ...locked, ...resolved];
    if (supporting.some((node) => !canDriveFinding(node.adapter.supportLevel))) {
      addUncertainty(uncertainties, "unsupported_evidence", identity, supporting);
      continue;
    }

    const presentInstalled = installed.filter(
      (node) => stringAttribute(node, "stateEffect") === "present"
    );
    const successfulInstall = actions.filter(
      (node) =>
        stringAttribute(node, "action") === "install" &&
        stringAttribute(node, "outcome") === "succeeded" &&
        stringAttribute(node, "stateEffect") === "present"
    );
    const failedInstall = actions.filter(
      (node) =>
        stringAttribute(node, "action") === "install" &&
        (stringAttribute(node, "outcome") === "failed" ||
          stringAttribute(node, "stateEffect") === "none")
    );

    if (declared.length === 0 && used.length > 0 && presentInstalled.length > 0) {
      const hidden = presentInstalled.filter(isHiddenLayer);
      const category =
        hidden.length > 0 ? "environment.hidden_dependency" : "dependency.used_but_undeclared";
      addCandidate(candidates, occupied, {
        assertion:
          hidden.length > 0
            ? `${displayIdentity(identity)} is required by executable source but is supplied only by a global or base-image layer.`
            : `${displayIdentity(identity)} is used by executable source and installed, but absent from repository declarations.`,
        category,
        identity,
        nodes: [...used, ...presentInstalled, ...successfulInstall, ...validated],
        severity: "error",
        alternatives: [
          "The resource could be intentionally supplied by a documented target image",
          "The use could resolve through an unrecorded workspace or alias"
        ],
        nextEvidence: validated.some(isPassedValidation)
          ? []
          : ["Reconstruct repository intent in a clean target and run the behavior contract"]
      });
    } else if (
      declared.length === 0 &&
      successfulInstall.length > 0 &&
      presentInstalled.length > 0
    ) {
      addCandidate(candidates, occupied, {
        assertion: `${displayIdentity(identity)} was installed successfully with a measured state effect, but no matching repository declaration exists.`,
        category: "dependency.observed_install_without_declaration",
        identity,
        nodes: [...successfulInstall, ...presentInstalled],
        severity: "warning",
        alternatives: ["The installation could have been an intentional one-off development tool"],
        nextEvidence: [
          "Establish executable use or clean-target necessity before proposing a declaration"
        ],
        necessity: 0
      });
    } else if (failedInstall.length > 0 && presentInstalled.length === 0) {
      addUncertainty(uncertainties, "failed_install_without_effect", identity, failedInstall);
    }

    detectResolutionDisagreement(candidates, occupied, identity, declared, locked, resolved);
    detectAbsentCleanResolution(candidates, occupied, identity, declared, resolved, validated);
    detectTargetMismatch(candidates, occupied, identity, declared, installed, used, resolved);
    detectRequiredSetup(candidates, occupied, identity, declared, used);
    detectConservativeRemoval(
      candidates,
      occupied,
      identity,
      declared,
      used,
      validated,
      uncertainties
    );
  }

  detectConfigurationContradictions(candidates, occupied, allNodes);
  addCaptureGapUncertainties(uncertainties, graphs);

  return Object.freeze({
    findings: Object.freeze(
      [
        ...npmResult.findings,
        ...candidates.map((candidate) => materializeFinding(candidate, graphs))
      ].sort((left, right) => compareText(left.findingId, right.findingId))
    ),
    gaps: graphs.gaps,
    uncertainties: Object.freeze(
      deduplicateUncertainties(uncertainties).sort((left, right) =>
        compareText(left.uncertaintyId, right.uncertaintyId)
      )
    )
  });
}

function detectResolutionDisagreement(
  output: FindingCandidate[],
  occupied: Set<string>,
  identity: ResourceIdentity,
  declared: readonly EvidenceNode[],
  locked: readonly EvidenceNode[],
  resolved: readonly EvidenceNode[]
): void {
  if (declared.length === 0 || (locked.length === 0 && resolved.length === 0)) return;
  const versions = distinct([
    ...declared.map(versionOf),
    ...locked.map(versionOf),
    ...resolved.map(versionOf)
  ]);
  const managerVersions = distinct(
    [...declared, ...locked, ...resolved].map((node) => stringAttribute(node, "managerVersion"))
  );
  const explicitConflict = [...declared, ...locked, ...resolved].some((node) =>
    booleanAttribute(node, "resolutionConflict")
  );
  const exactComparable =
    versions.length > 1 &&
    [...declared, ...locked, ...resolved]
      .filter((node) => versionOf(node) !== undefined)
      .every((node) => booleanAttribute(node, "exactVersion"));
  if (!explicitConflict && !exactComparable && managerVersions.length <= 1) return;
  addCandidate(output, occupied, {
    assertion: `${displayIdentity(identity)} has contradictory manifest, lock, clean-resolution, or package-manager version evidence.`,
    category: "dependency.resolution_disagreement",
    identity,
    nodes: [...declared, ...locked, ...resolved],
    severity: "error",
    alternatives: [
      "A range and its resolved version may be compatible; the adapter must mark compatibility explicitly"
    ],
    nextEvidence: [
      "Resolve with the repository-selected manager and compare the generated lock state"
    ]
  });
}

function detectAbsentCleanResolution(
  output: FindingCandidate[],
  occupied: Set<string>,
  identity: ResourceIdentity,
  declared: readonly EvidenceNode[],
  resolved: readonly EvidenceNode[],
  validated: readonly EvidenceNode[]
): void {
  if (declared.length === 0) return;
  const absence = [...resolved, ...validated].filter(
    (node) =>
      (stringAttribute(node, "stateEffect") === "absent" ||
        stringAttribute(node, "outcome") === "absent") &&
      booleanAttribute(node, "cleanResolution")
  );
  if (absence.length === 0) return;
  addCandidate(output, occupied, {
    assertion: `${displayIdentity(identity)} is declared but was conclusively absent from a clean repository-only resolution.`,
    category: "dependency.declared_absent_from_clean_resolution",
    identity,
    nodes: [...declared, ...absence],
    severity: "error",
    nextEvidence: ["Inspect manager diagnostics and repository source configuration"]
  });
}

function detectTargetMismatch(
  output: FindingCandidate[],
  occupied: Set<string>,
  identity: ResourceIdentity,
  declared: readonly EvidenceNode[],
  installed: readonly EvidenceNode[],
  used: readonly EvidenceNode[],
  resolved: readonly EvidenceNode[]
): void {
  const nodes = [...declared, ...installed, ...used, ...resolved];
  if (nodes.length < 2) return;
  const explicit = mismatchDimensions.find((dimension) =>
    nodes.some((node) => booleanAttribute(node, `${dimension}Mismatch`))
  );
  const dimension = explicit ?? inferredMismatchDimension(declared, [...installed, ...resolved]);
  if (dimension === undefined) return;
  addCandidate(output, occupied, {
    assertion: `${displayIdentity(identity)} has contradictory ${dimension.replace("_", " ")} requirements across repository intent and observed or resolved state.`,
    category: `environment.${dimension}_mismatch`,
    identity,
    nodes,
    severity: "error",
    alternatives: ["The difference could be intentional for a separately scoped target"],
    nextEvidence: ["Confirm the affected target matrix and target-specific repository intent"]
  });
}

function detectRequiredSetup(
  output: FindingCandidate[],
  occupied: Set<string>,
  identity: ResourceIdentity,
  declared: readonly EvidenceNode[],
  used: readonly EvidenceNode[]
): void {
  if (declared.length > 0) return;
  const requirements = used.filter(
    (node) =>
      requiredSetupKinds.has(stringAttribute(node, "resourceKind") ?? "") &&
      booleanAttribute(node, "required") &&
      stringAttribute(node, "certainty") === "certain"
  );
  if (requirements.length === 0) return;
  addCandidate(output, occupied, {
    assertion: `${displayIdentity(identity)} is a conclusively required ${stringAttribute(requirements[0]!, "resourceKind")?.replace("_", " ")} with no matching repository setup intent.`,
    category: "repository.required_setup_absent",
    identity,
    nodes: requirements,
    severity: "error",
    alternatives: ["The target image may intentionally provide this prerequisite"],
    nextEvidence: [
      "Validate the prerequisite against a fresh target before proposing setup changes"
    ]
  });
}

function detectConservativeRemoval(
  output: FindingCandidate[],
  occupied: Set<string>,
  identity: ResourceIdentity,
  declared: readonly EvidenceNode[],
  used: readonly EvidenceNode[],
  validated: readonly EvidenceNode[],
  uncertainties: ReconciliationUncertainty[]
): void {
  const classified = declared.filter((node) =>
    removableClassifications.has(stringAttribute(node, "dependencyStatus") ?? "")
  );
  if (classified.length === 0 || used.length > 0) return;
  const complete = classified.every((node) => booleanAttribute(node, "necessityEvidenceComplete"));
  if (!complete) {
    addUncertainty(uncertainties, "necessity_not_established", identity, classified);
  }
  const classification = stringAttribute(classified[0]!, "dependencyStatus") ?? "apparently_unused";
  addCandidate(output, occupied, {
    assertion: `${displayIdentity(identity)} is conservatively classified as ${classification.replace("_", " ")}; absence of use is not proof that removal is safe.`,
    category: `dependency.${classification}`,
    identity,
    nodes: [...classified, ...validated],
    severity: "info",
    alternatives: [
      "Static analysis may not observe plugin, reflection, generated, or target-specific use"
    ],
    nextEvidence: complete
      ? ["Validate behavior after an exact removal candidate"]
      : ["Complete necessity capture before allowing a removal recommendation"],
    necessity: complete ? minimumConfidence(classified) : 0
  });
}

function detectConfigurationContradictions(
  output: FindingCandidate[],
  occupied: Set<string>,
  nodes: readonly EvidenceNode[]
): void {
  const intent = nodes.filter(
    (node) =>
      stringAttribute(node, "configurationRole") === "repository_intent" &&
      configurationKinds.has(stringAttribute(node, "configurationKind") ?? "")
  );
  const observed = nodes.filter(
    (node) =>
      stringAttribute(node, "configurationRole") === "observed_configuration" &&
      configurationKinds.has(stringAttribute(node, "configurationKind") ?? "")
  );
  for (const expected of intent) {
    const key = stringAttribute(expected, "configurationKey");
    if (key === undefined) continue;
    const contradictory = observed.filter(
      (node) =>
        stringAttribute(node, "configurationKind") ===
          stringAttribute(expected, "configurationKind") &&
        stringAttribute(node, "configurationKey") === key &&
        stringAttribute(node, "configurationValue") !==
          stringAttribute(expected, "configurationValue")
    );
    if (contradictory.length === 0) continue;
    addCandidate(output, occupied, {
      assertion: `${stringAttribute(expected, "configurationKind")} configuration contradicts repository intent for ${key}.`,
      category: "repository.intent_contradicted",
      identity: expected.identity,
      nodes: [expected, ...contradictory],
      severity: "error",
      alternatives: ["The observed configuration may belong to a separately scoped target"],
      nextEvidence: ["Confirm target scope before changing repository configuration"]
    });
  }
}

function inferredMismatchDimension(
  expected: readonly EvidenceNode[],
  actual: readonly EvidenceNode[]
): MismatchDimension | undefined {
  if (expected.length === 0 || actual.length === 0) return undefined;
  const fieldByDimension: Readonly<
    Record<MismatchDimension, keyof ResourceIdentity | "runtime" | "toolchain">
  > = {
    architecture: "architecture",
    dependency_layer: "layerId",
    realm: "realmId",
    runtime: "runtime",
    toolchain: "toolchain"
  };
  for (const dimension of mismatchDimensions) {
    const field = fieldByDimension[dimension];
    const expectedValues = distinct(expected.map((node) => identityOrAttribute(node, field)));
    const actualValues = distinct(actual.map((node) => identityOrAttribute(node, field)));
    if (
      expectedValues.length > 0 &&
      actualValues.length > 0 &&
      expectedValues.every((value) => !actualValues.includes(value))
    ) {
      return dimension;
    }
  }
  return undefined;
}

function identityOrAttribute(
  node: EvidenceNode,
  field: keyof ResourceIdentity | "runtime" | "toolchain"
): string | undefined {
  if (field === "runtime" || field === "toolchain") return stringAttribute(node, field);
  const value = node.identity[field];
  return typeof value === "string" ? value : undefined;
}

function addCaptureGapUncertainties(
  output: ReconciliationUncertainty[],
  graphs: EvidenceGraphSet
): void {
  for (const gap of graphs.gaps) {
    const unsupported =
      gap.adapter.supportLevel === "unsupported" || gap.code.toLowerCase().includes("unsupported");
    const identity: ResourceIdentity = Object.freeze({
      ecosystem: "capture",
      normalizedName: gap.adapter.adapterId,
      scope: gap.adapter.inputSourceId
    });
    output.push(
      Object.freeze({
        code: unsupported ? "unsupported_capture" : "incomplete_capture",
        evidence: Object.freeze([
          Object.freeze({
            evidenceId: gap.gapId,
            inputSourceId: gap.adapter.inputSourceId,
            kind: "capture_gap",
            sourceLocation: gap.sourceLocation,
            summary: gap.message
          })
        ]),
        identity,
        uncertaintyId: stableId("uncertainty", {
          code: unsupported ? "unsupported_capture" : "incomplete_capture",
          gapId: gap.gapId,
          ruleId: deterministicDisagreementRules.ruleId
        })
      })
    );
  }
}

function addCandidate(
  output: FindingCandidate[],
  occupied: Set<string>,
  candidate: FindingCandidate
): void {
  const key = resourceMatchKey(candidate.identity);
  if (occupied.has(key)) return;
  occupied.add(key);
  output.push(candidate);
}

function materializeFinding(candidate: FindingCandidate, graphs: EvidenceGraphSet): Finding {
  const evidence = mergeEvidence(candidate.nodes);
  const counterEvidence = mergeEvidence(candidate.counterNodes ?? []);
  const affectedTargetIds = distinct(candidate.nodes.flatMap((node) => node.targetIds ?? []));
  const supportLevel = weakestSupportLevel(candidate.nodes);
  const observation = minimumConfidence(candidate.nodes);
  const attributionNodes = candidate.nodes.filter((node) => node.attribution !== undefined);
  const validationNodes = candidate.nodes.filter(
    (node) =>
      node.evidence.some((item) => item.kind.includes("validation")) ||
      stringAttribute(node, "cleanResolution") === "true" ||
      node.attributes?.cleanResolution === true
  );
  return Object.freeze({
    affectedIdentities: Object.freeze([candidate.identity]),
    affectedTargetIds: Object.freeze(affectedTargetIds),
    assertion: candidate.assertion,
    category: candidate.category,
    confidence: Object.freeze({
      attribution:
        attributionNodes.length === 0
          ? 0
          : Math.min(...attributionNodes.map((node) => node.attribution?.confidence ?? 0)),
      necessity: candidate.necessity ?? Math.min(observation, 0.8),
      observation,
      semantics: candidate.nodes.some(isCertainExecutableUse)
        ? minimumConfidence(candidate.nodes.filter(isCertainExecutableUse))
        : 0,
      validation: validationNodes.length === 0 ? 0 : minimumConfidence(validationNodes)
    }),
    counterEvidence: Object.freeze(counterEvidence),
    findingId: stableId("finding", {
      category: candidate.category,
      identity: identityCanonicalValue(candidate.identity),
      ruleId: deterministicDisagreementRules.ruleId,
      ruleVersion: deterministicDisagreementRules.version
    }),
    gapIds: Object.freeze(graphs.gaps.map((gap) => gap.gapId).sort(compareText)),
    nextEvidenceNeeded: Object.freeze([...(candidate.nextEvidence ?? [])]),
    plausibleAlternatives: Object.freeze([...(candidate.alternatives ?? [])]),
    ruleId: deterministicDisagreementRules.ruleId,
    ruleVersion: deterministicDisagreementRules.version,
    severity: candidate.severity,
    supportLevel,
    supportingEvidence: Object.freeze(evidence)
  });
}

function addUncertainty(
  output: ReconciliationUncertainty[],
  code: ReconciliationUncertainty["code"],
  identity: ResourceIdentity,
  nodes: readonly EvidenceNode[]
): void {
  output.push(
    Object.freeze({
      code,
      evidence: Object.freeze(mergeEvidence(nodes)),
      identity,
      uncertaintyId: stableId("uncertainty", {
        code,
        identity: identityCanonicalValue(identity),
        ruleId: deterministicDisagreementRules.ruleId
      })
    })
  );
}

function deduplicateUncertainties(
  uncertainties: readonly ReconciliationUncertainty[]
): ReconciliationUncertainty[] {
  return [
    ...new Map(
      uncertainties.map((uncertainty) => [uncertainty.uncertaintyId, uncertainty])
    ).values()
  ];
}

function groupByBaseIdentity(
  nodes: readonly EvidenceNode[]
): ReadonlyMap<string, readonly EvidenceNode[]> {
  const groups = new Map<string, EvidenceNode[]>();
  for (const node of nodes) {
    const key = baseIdentityKey(node.identity);
    const group = groups.get(key);
    if (group === undefined) groups.set(key, [node]);
    else group.push(node);
  }
  return groups;
}

function baseIdentityKey(identity: ResourceIdentity): string {
  return `${identity.ecosystem}\u0000${identity.normalizedName}\u0000${identity.scope ?? ""}`;
}

function isCertainExecutableUse(node: EvidenceNode): boolean {
  return stringAttribute(node, "certainty") === "certain" && booleanAttribute(node, "executable");
}

function isHiddenLayer(node: EvidenceNode): boolean {
  const kind = stringAttribute(node, "layerKind");
  return kind === "global" || kind === "base_image";
}

function isPassedValidation(node: EvidenceNode): boolean {
  return stringAttribute(node, "outcome") === "passed";
}

function versionOf(node: EvidenceNode): string | undefined {
  return node.identity.versionOrConstraint;
}

function distinct(values: readonly (string | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => value !== undefined))].sort(
    compareText
  );
}

function mergeEvidence(nodes: readonly EvidenceNode[]): EvidenceReference[] {
  const evidence = new Map<string, EvidenceReference>();
  for (const node of nodes) {
    for (const item of node.evidence) evidence.set(item.evidenceId, item);
  }
  return [...evidence.values()].sort((left, right) =>
    compareText(left.evidenceId, right.evidenceId)
  );
}

function canDriveFinding(supportLevel: SupportLevel): boolean {
  return supportLevel === "full_native" || supportLevel === "native_validation";
}

function weakestSupportLevel(nodes: readonly EvidenceNode[]): SupportLevel {
  const rank: Readonly<Record<SupportLevel, number>> = {
    full_native: 0,
    native_validation: 1,
    observed_only: 2,
    unsupported: 3
  };
  return nodes.reduce<SupportLevel>(
    (weakest, node) =>
      rank[node.adapter.supportLevel] > rank[weakest] ? node.adapter.supportLevel : weakest,
    "full_native"
  );
}

function minimumConfidence(nodes: readonly EvidenceNode[]): number {
  return nodes.length === 0
    ? 0
    : nodes.reduce((minimum, node) => Math.min(minimum, node.confidence), 1);
}

function displayIdentity(identity: ResourceIdentity): string {
  return `${identity.ecosystem}:${identity.normalizedName}`;
}

function stringAttribute(node: EvidenceNode, key: string): string | undefined {
  const value = node.attributes?.[key];
  return typeof value === "string" ? value : undefined;
}

function booleanAttribute(node: EvidenceNode, key: string): boolean {
  return node.attributes?.[key] === true;
}
