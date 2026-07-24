export type GraphKind =
  "declared" | "installed" | "locked" | "observed_action" | "resolved" | "used" | "validated";

export type SupportLevel = "full_native" | "native_validation" | "observed_only" | "unsupported";

export interface SourceLocation {
  readonly column?: number;
  readonly endColumn?: number;
  readonly endLine?: number;
  readonly line?: number;
  readonly path: string;
}

export interface AdapterInputIdentity {
  readonly adapterId: string;
  readonly adapterVersion: string;
  readonly inputSourceId: string;
  readonly supportLevel: SupportLevel;
}

export interface ResourceIdentity {
  readonly architecture?: string;
  readonly ecosystem: string;
  readonly layerId?: string;
  readonly normalizedName: string;
  readonly packageSource?: string;
  readonly platform?: string;
  readonly realmId?: string;
  readonly scope?: string;
  readonly versionOrConstraint?: string;
}

export interface EvidenceReference {
  readonly evidenceId: string;
  readonly inputSourceId: string;
  readonly kind: string;
  readonly sourceLocation?: SourceLocation;
  readonly summary: string;
}

export interface Attribution {
  readonly actorId?: string;
  readonly actorType: "agent" | "human" | "mixed" | "unknown";
  readonly confidence: number;
}

export type EvidenceAttribute = boolean | number | string | readonly string[];

export interface EvidenceNodeInput {
  readonly adapter: AdapterInputIdentity;
  readonly attributes?: Readonly<Record<string, EvidenceAttribute>>;
  readonly attribution?: Attribution;
  readonly confidence: number;
  readonly evidence: readonly EvidenceReference[];
  readonly identity: ResourceIdentity;
  readonly observedAt?: string;
  readonly sourceLocation?: SourceLocation;
  readonly targetIds?: readonly string[];
}

export interface EvidenceEdgeInput {
  readonly adapter: AdapterInputIdentity;
  readonly confidence: number;
  readonly evidence: readonly EvidenceReference[];
  readonly fromIdentity: ResourceIdentity;
  readonly kind: string;
  readonly sourceLocation?: SourceLocation;
  readonly toIdentity: ResourceIdentity;
}

export interface EvidenceNode extends EvidenceNodeInput {
  readonly nodeId: string;
}

export interface EvidenceEdge {
  readonly adapter: AdapterInputIdentity;
  readonly confidence: number;
  readonly edgeId: string;
  readonly evidence: readonly EvidenceReference[];
  readonly fromNodeId: string;
  readonly kind: string;
  readonly sourceLocation?: SourceLocation;
  readonly toNodeId: string;
}

export interface EvidenceGraph {
  readonly edges: readonly EvidenceEdge[];
  readonly kind: GraphKind;
  readonly nodes: readonly EvidenceNode[];
}

export interface CaptureGap {
  readonly adapter?: AdapterInputIdentity;
  readonly code: string;
  readonly gapId?: string;
  readonly message: string;
  readonly sourceLocation?: SourceLocation;
}

export interface EvidenceGraphSetInput {
  readonly declared?: readonly EvidenceNodeInput[];
  readonly edges?: Partial<Record<GraphKind, readonly EvidenceEdgeInput[]>>;
  readonly gaps?: readonly CaptureGap[];
  readonly installed?: readonly EvidenceNodeInput[];
  readonly locked?: readonly EvidenceNodeInput[];
  readonly observedAction?: readonly EvidenceNodeInput[];
  readonly resolved?: readonly EvidenceNodeInput[];
  readonly used?: readonly EvidenceNodeInput[];
  readonly validated?: readonly EvidenceNodeInput[];
}

export interface EvidenceGraphSet {
  readonly all: readonly EvidenceGraph[];
  readonly declared: EvidenceGraph;
  readonly gaps: readonly Required<CaptureGap>[];
  readonly installed: EvidenceGraph;
  readonly locked: EvidenceGraph;
  readonly observedAction: EvidenceGraph;
  readonly resolved: EvidenceGraph;
  readonly used: EvidenceGraph;
  readonly validated: EvidenceGraph;
}

export interface FindingConfidence {
  readonly attribution: number;
  readonly necessity: number;
  readonly observation: number;
  readonly semantics: number;
  readonly validation: number;
}

export interface Finding {
  readonly affectedIdentities: readonly ResourceIdentity[];
  readonly affectedTargetIds: readonly string[];
  readonly assertion: string;
  readonly category: string;
  readonly confidence: FindingConfidence;
  readonly counterEvidence: readonly EvidenceReference[];
  readonly findingId: string;
  readonly gapIds: readonly string[];
  readonly nextEvidenceNeeded: readonly string[];
  readonly plausibleAlternatives: readonly string[];
  readonly ruleId: string;
  readonly ruleVersion: string;
  readonly severity: "blocking" | "error" | "info" | "warning";
  readonly supportLevel: SupportLevel;
  readonly supportingEvidence: readonly EvidenceReference[];
}

export interface ReconciliationUncertainty {
  readonly code:
    | "failed_install_without_effect"
    | "incomplete_capture"
    | "installed_without_use"
    | "unsupported_evidence"
    | "use_without_installed_effect";
  readonly evidence: readonly EvidenceReference[];
  readonly identity: ResourceIdentity;
  readonly uncertaintyId: string;
}

export interface ReconciliationResult {
  readonly findings: readonly Finding[];
  readonly gaps: readonly Required<CaptureGap>[];
  readonly uncertainties: readonly ReconciliationUncertainty[];
}
