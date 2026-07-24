import { buildEvidenceGraphSet } from "./graphs/build.js";
import { stableId } from "./graphs/canonical.js";
import type {
  AdapterInputIdentity,
  Attribution,
  CaptureGap,
  EvidenceGraphSet,
  EvidenceNodeInput,
  EvidenceReference,
  SourceLocation,
  SupportLevel
} from "./graphs/types.js";

interface NpmAdapterIdentityLike {
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly inputSourceId: string;
  readonly supportLevel: SupportLevel;
}

interface NpmDeclaredDependencyLike {
  readonly adapter: NpmAdapterIdentityLike;
  readonly kind: string;
  readonly normalizedName: string;
  readonly projectRoot: string;
  readonly sourceLocation: SourceLocation;
  readonly specifier: string;
}

interface NpmLockedDependencyLike {
  readonly adapter: NpmAdapterIdentityLike;
  readonly dependencyKind: string;
  readonly direct: boolean;
  readonly normalizedName: string;
  readonly projectRoot: string;
  readonly sourceLocation: SourceLocation;
  readonly version: string;
}

interface NpmUsageEvidenceLike {
  readonly adapter: NpmAdapterIdentityLike;
  readonly certainty: "certain" | "uncertain";
  readonly executable: boolean;
  readonly kind: string;
  readonly normalizedName: string;
  readonly projectRoot: string;
  readonly sourceLocation: SourceLocation;
}

interface NpmAdapterGapLike {
  readonly code: string;
  readonly message: string;
  readonly sourceLocation: SourceLocation;
}

interface NpmProjectLike {
  readonly declared: readonly NpmDeclaredDependencyLike[];
  readonly gaps: readonly NpmAdapterGapLike[];
  readonly locked: readonly NpmLockedDependencyLike[];
  readonly projectRoot: string;
  readonly usage: readonly NpmUsageEvidenceLike[];
}

export interface NpmRepositorySnapshotLike {
  readonly adapter: NpmAdapterIdentityLike;
  readonly projects: readonly NpmProjectLike[];
}

export interface NpmInstalledPackageInput {
  readonly adapter: AdapterInputIdentity;
  readonly evidenceId: string;
  readonly layerId?: string;
  readonly name: string;
  readonly projectRoot: string;
  readonly realmId?: string;
  readonly sourceLocation?: SourceLocation;
  readonly stateEffect: "absent" | "present";
  readonly targetIds?: readonly string[];
  readonly version: string;
}

export interface NpmObservedInstallInput {
  readonly action: "install";
  readonly adapter: AdapterInputIdentity;
  readonly attribution: Attribution;
  readonly evidenceId: string;
  readonly layerId?: string;
  readonly name: string;
  readonly outcome: "failed" | "succeeded";
  readonly projectRoot: string;
  readonly realmId?: string;
  readonly sourceLocation?: SourceLocation;
  readonly stateEffect: "none" | "present";
  readonly targetIds?: readonly string[];
}

export interface NpmValidatedPackageInput {
  readonly adapter: AdapterInputIdentity;
  readonly evidenceId: string;
  readonly name: string;
  readonly outcome: "failed" | "passed";
  readonly projectRoot: string;
  readonly sourceLocation?: SourceLocation;
  readonly targetIds?: readonly string[];
}

export interface NpmCheckpointInput {
  readonly additionalGaps?: readonly CaptureGap[];
  readonly installed?: readonly NpmInstalledPackageInput[];
  readonly observedActions?: readonly NpmObservedInstallInput[];
  readonly repository: NpmRepositorySnapshotLike;
  readonly validated?: readonly NpmValidatedPackageInput[];
}

export function buildNpmEvidenceGraphSet(input: NpmCheckpointInput): EvidenceGraphSet {
  const declared: EvidenceNodeInput[] = [];
  const locked: EvidenceNodeInput[] = [];
  const used: EvidenceNodeInput[] = [];
  const gaps: CaptureGap[] = [...(input.additionalGaps ?? [])];

  for (const project of input.repository.projects) {
    for (const dependency of project.declared) {
      declared.push({
        adapter: dependency.adapter,
        attributes: {
          dependencyKind: dependency.kind,
          direct: true,
          projectRoot: dependency.projectRoot
        },
        confidence: 1,
        evidence: [
          evidenceReference(
            "manifest_declaration",
            dependency.adapter.inputSourceId,
            dependency.sourceLocation,
            `${dependency.normalizedName} is declared as ${dependency.specifier}`
          )
        ],
        identity: npmIdentity(dependency.normalizedName, dependency.projectRoot, {
          versionOrConstraint: dependency.specifier
        }),
        sourceLocation: dependency.sourceLocation
      });
    }
    for (const dependency of project.locked) {
      locked.push({
        adapter: dependency.adapter,
        attributes: {
          dependencyKind: dependency.dependencyKind,
          direct: dependency.direct,
          projectRoot: dependency.projectRoot
        },
        confidence: 1,
        evidence: [
          evidenceReference(
            "lock_resolution",
            dependency.adapter.inputSourceId,
            dependency.sourceLocation,
            `${dependency.normalizedName} is locked to ${dependency.version}`
          )
        ],
        identity: npmIdentity(dependency.normalizedName, dependency.projectRoot, {
          versionOrConstraint: dependency.version
        }),
        sourceLocation: dependency.sourceLocation
      });
    }
    for (const usage of project.usage) {
      used.push({
        adapter: usage.adapter,
        attributes: {
          certainty: usage.certainty,
          executable: usage.executable,
          projectRoot: usage.projectRoot,
          useKind: usage.kind
        },
        confidence: usage.certainty === "certain" ? 0.95 : 0.35,
        evidence: [
          evidenceReference(
            "source_use",
            usage.adapter.inputSourceId,
            usage.sourceLocation,
            `${usage.normalizedName} has ${usage.kind} evidence`
          )
        ],
        identity: npmIdentity(usage.normalizedName, usage.projectRoot),
        sourceLocation: usage.sourceLocation
      });
    }
    for (const adapterGap of project.gaps) {
      gaps.push({
        adapter: input.repository.adapter,
        code: adapterGap.code,
        message: adapterGap.message,
        sourceLocation: adapterGap.sourceLocation
      });
    }
  }

  const installed = (input.installed ?? []).map((item): EvidenceNodeInput => ({
    adapter: item.adapter,
    attributes: {
      projectRoot: item.projectRoot,
      stateEffect: item.stateEffect
    },
    confidence: 1,
    evidence: [
      explicitEvidence(
        item.evidenceId,
        "installed_inventory",
        item.adapter.inputSourceId,
        item.sourceLocation,
        `${item.name}@${item.version} is ${item.stateEffect}`
      )
    ],
    identity: npmIdentity(item.name, item.projectRoot, {
      ...(item.layerId === undefined ? {} : { layerId: item.layerId }),
      ...(item.realmId === undefined ? {} : { realmId: item.realmId }),
      versionOrConstraint: item.version
    }),
    ...(item.sourceLocation === undefined ? {} : { sourceLocation: item.sourceLocation }),
    targetIds: item.targetIds ?? []
  }));
  const observedAction = (input.observedActions ?? []).map((item): EvidenceNodeInput => ({
    adapter: item.adapter,
    attributes: {
      action: item.action,
      outcome: item.outcome,
      projectRoot: item.projectRoot,
      stateEffect: item.stateEffect
    },
    attribution: item.attribution,
    confidence: item.outcome === "succeeded" ? 0.95 : 1,
    evidence: [
      explicitEvidence(
        item.evidenceId,
        "observed_install_action",
        item.adapter.inputSourceId,
        item.sourceLocation,
        `${item.action} ${item.name} ${item.outcome} with ${item.stateEffect} effect`
      )
    ],
    identity: npmIdentity(item.name, item.projectRoot, {
      ...(item.layerId === undefined ? {} : { layerId: item.layerId }),
      ...(item.realmId === undefined ? {} : { realmId: item.realmId })
    }),
    ...(item.sourceLocation === undefined ? {} : { sourceLocation: item.sourceLocation }),
    targetIds: item.targetIds ?? []
  }));
  const validated = (input.validated ?? []).map((item): EvidenceNodeInput => ({
    adapter: item.adapter,
    attributes: {
      outcome: item.outcome,
      projectRoot: item.projectRoot
    },
    confidence: 1,
    evidence: [
      explicitEvidence(
        item.evidenceId,
        "behavior_validation",
        item.adapter.inputSourceId,
        item.sourceLocation,
        `${item.name} behavior validation ${item.outcome}`
      )
    ],
    identity: npmIdentity(item.name, item.projectRoot),
    ...(item.sourceLocation === undefined ? {} : { sourceLocation: item.sourceLocation }),
    targetIds: item.targetIds ?? []
  }));

  return buildEvidenceGraphSet({
    declared,
    gaps,
    installed,
    locked,
    observedAction,
    used,
    validated
  });
}

function npmIdentity(
  name: string,
  projectRoot: string,
  extra: {
    readonly layerId?: string;
    readonly realmId?: string;
    readonly versionOrConstraint?: string;
  } = {}
): {
  readonly ecosystem: "npm";
  readonly layerId?: string;
  readonly normalizedName: string;
  readonly realmId?: string;
  readonly scope: string;
  readonly versionOrConstraint?: string;
} {
  return {
    ecosystem: "npm",
    ...(extra.layerId === undefined ? {} : { layerId: extra.layerId }),
    normalizedName: name,
    ...(extra.realmId === undefined ? {} : { realmId: extra.realmId }),
    scope: projectRoot,
    ...(extra.versionOrConstraint === undefined
      ? {}
      : { versionOrConstraint: extra.versionOrConstraint })
  };
}

function evidenceReference(
  kind: string,
  inputSourceId: string,
  sourceLocation: SourceLocation,
  summary: string
): EvidenceReference {
  return explicitEvidence(
    stableId("evidence", {
      inputSourceId,
      kind,
      sourceLocation: {
        column: sourceLocation.column ?? null,
        line: sourceLocation.line ?? null,
        path: sourceLocation.path
      },
      summary
    }),
    kind,
    inputSourceId,
    sourceLocation,
    summary
  );
}

function explicitEvidence(
  evidenceId: string,
  kind: string,
  inputSourceId: string,
  sourceLocation: SourceLocation | undefined,
  summary: string
): EvidenceReference {
  return {
    evidenceId,
    inputSourceId,
    kind,
    ...(sourceLocation === undefined ? {} : { sourceLocation }),
    summary
  };
}
