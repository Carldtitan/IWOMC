import {
  attributesCanonicalValue,
  canonicalIdentity,
  compareText,
  identityCanonicalValue,
  isEvidenceAttributeArray,
  sourceLocationCanonicalValue,
  stableId
} from "./canonical.js";
import type {
  AdapterInputIdentity,
  Attribution,
  CaptureGap,
  EvidenceAttribute,
  EvidenceEdge,
  EvidenceEdgeInput,
  EvidenceGraph,
  EvidenceGraphSet,
  EvidenceGraphSetInput,
  EvidenceNode,
  EvidenceNodeInput,
  EvidenceReference,
  GraphKind,
  SourceLocation
} from "./types.js";

const graphKinds: readonly GraphKind[] = Object.freeze([
  "declared",
  "locked",
  "resolved",
  "installed",
  "used",
  "observed_action",
  "validated"
]);

export function buildEvidenceGraphSet(input: EvidenceGraphSetInput): EvidenceGraphSet {
  const sourceNodes: Readonly<Record<GraphKind, readonly EvidenceNodeInput[]>> = {
    declared: input.declared ?? [],
    installed: input.installed ?? [],
    locked: input.locked ?? [],
    observed_action: input.observedAction ?? [],
    resolved: input.resolved ?? [],
    used: input.used ?? [],
    validated: input.validated ?? []
  };

  const graphs = new Map<GraphKind, EvidenceGraph>();
  for (const kind of graphKinds) {
    graphs.set(kind, buildGraph(kind, sourceNodes[kind], input.edges?.[kind] ?? []));
  }
  const gaps = Object.freeze(
    (input.gaps ?? [])
      .map((item) => freezeGap(item))
      .sort((left, right) => compareText(left.gapId, right.gapId))
  );
  const graph = (kind: GraphKind): EvidenceGraph => {
    const value = graphs.get(kind);
    if (value === undefined) {
      throw new Error(`Internal graph construction failure: ${kind}`);
    }
    return value;
  };
  const all = Object.freeze(graphKinds.map((kind) => graph(kind)));

  return Object.freeze({
    all,
    declared: graph("declared"),
    gaps,
    installed: graph("installed"),
    locked: graph("locked"),
    observedAction: graph("observed_action"),
    resolved: graph("resolved"),
    used: graph("used"),
    validated: graph("validated")
  });
}

function buildGraph(
  kind: GraphKind,
  inputs: readonly EvidenceNodeInput[],
  edgeInputs: readonly EvidenceEdgeInput[]
): EvidenceGraph {
  const nodes = inputs.map((input) => freezeNode(kind, input));
  const nodeIdByIdentity = new Map<string, string>();
  for (const node of nodes) {
    const identityId = stableId("identity", identityCanonicalValue(node.identity));
    nodeIdByIdentity.set(identityId, node.nodeId);
  }
  const edges = edgeInputs.map((edge) => freezeEdge(kind, edge, nodeIdByIdentity));

  return Object.freeze({
    edges: Object.freeze(edges.sort((left, right) => compareText(left.edgeId, right.edgeId))),
    kind,
    nodes: Object.freeze(nodes.sort((left, right) => compareText(left.nodeId, right.nodeId)))
  });
}

function freezeNode(kind: GraphKind, input: EvidenceNodeInput): EvidenceNode {
  const identity = canonicalIdentity(input.identity);
  const adapter = freezeAdapter(input.adapter);
  const sourceLocation = freezeSourceLocation(input.sourceLocation);
  const evidence = freezeEvidence(input.evidence);
  const attributes = freezeAttributes(input.attributes);
  const attribution = freezeAttribution(input.attribution);
  const targetIds = Object.freeze([...(input.targetIds ?? [])].sort(compareText));
  const nodeId = stableId("node", {
    adapter: {
      adapterId: adapter.adapterId,
      adapterVersion: adapter.adapterVersion,
      inputSourceId: adapter.inputSourceId,
      supportLevel: adapter.supportLevel
    },
    attributes: attributesCanonicalValue(attributes),
    evidenceIds: evidence.map((item) => item.evidenceId),
    graph: kind,
    identity: identityCanonicalValue(identity),
    sourceLocation: sourceLocationCanonicalValue(sourceLocation)
  });
  return Object.freeze({
    adapter,
    ...(attributes === undefined ? {} : { attributes }),
    ...(attribution === undefined ? {} : { attribution }),
    confidence: clampConfidence(input.confidence),
    evidence,
    identity,
    nodeId,
    ...(input.observedAt === undefined ? {} : { observedAt: input.observedAt }),
    ...(sourceLocation === undefined ? {} : { sourceLocation }),
    targetIds
  });
}

function freezeEdge(
  graphKind: GraphKind,
  input: EvidenceEdgeInput,
  nodeIdByIdentity: ReadonlyMap<string, string>
): EvidenceEdge {
  const fromIdentity = canonicalIdentity(input.fromIdentity);
  const toIdentity = canonicalIdentity(input.toIdentity);
  const fromIdentityId = stableId("identity", identityCanonicalValue(fromIdentity));
  const toIdentityId = stableId("identity", identityCanonicalValue(toIdentity));
  const fromNodeId = nodeIdByIdentity.get(fromIdentityId) ?? fromIdentityId;
  const toNodeId = nodeIdByIdentity.get(toIdentityId) ?? toIdentityId;
  const adapter = freezeAdapter(input.adapter);
  const sourceLocation = freezeSourceLocation(input.sourceLocation);
  const evidence = freezeEvidence(input.evidence);
  const edgeId = stableId("edge", {
    adapter: {
      adapterId: adapter.adapterId,
      adapterVersion: adapter.adapterVersion,
      inputSourceId: adapter.inputSourceId
    },
    fromNodeId,
    graphKind,
    kind: input.kind,
    sourceLocation: sourceLocationCanonicalValue(sourceLocation),
    toNodeId
  });
  return Object.freeze({
    adapter,
    confidence: clampConfidence(input.confidence),
    edgeId,
    evidence,
    fromNodeId,
    kind: input.kind,
    ...(sourceLocation === undefined ? {} : { sourceLocation }),
    toNodeId
  });
}

function freezeEvidence(evidence: readonly EvidenceReference[]): readonly EvidenceReference[] {
  return Object.freeze(
    evidence
      .map((item): EvidenceReference =>
        Object.freeze({
          evidenceId: item.evidenceId,
          inputSourceId: item.inputSourceId,
          kind: item.kind,
          ...(item.sourceLocation === undefined
            ? {}
            : { sourceLocation: Object.freeze({ ...item.sourceLocation }) }),
          summary: item.summary
        })
      )
      .sort((left, right) => compareText(left.evidenceId, right.evidenceId))
  );
}

function freezeAttributes(
  attributes: Readonly<Record<string, EvidenceAttribute>> | undefined
): Readonly<Record<string, EvidenceAttribute>> | undefined {
  if (attributes === undefined) {
    return undefined;
  }
  return Object.freeze(
    Object.fromEntries(
      Object.entries(attributes)
        .sort(([left], [right]) => compareText(left, right))
        .map(([key, value]) => [
          key,
          isEvidenceAttributeArray(value) ? Object.freeze([...value].sort(compareText)) : value
        ])
    )
  );
}

function freezeAdapter(adapter: AdapterInputIdentity): AdapterInputIdentity {
  return Object.freeze({ ...adapter });
}

function freezeAttribution(attribution: Attribution | undefined): Attribution | undefined {
  return attribution === undefined
    ? undefined
    : Object.freeze({
        ...(attribution.actorId === undefined ? {} : { actorId: attribution.actorId }),
        actorType: attribution.actorType,
        confidence: clampConfidence(attribution.confidence)
      });
}

function freezeSourceLocation(location: SourceLocation | undefined): SourceLocation | undefined {
  return location === undefined ? undefined : Object.freeze({ ...location });
}

function freezeGap(gap: CaptureGap): Required<CaptureGap> {
  const adapter =
    gap.adapter ??
    Object.freeze({
      adapterId: "unknown",
      adapterVersion: "unknown",
      inputSourceId: "unknown",
      supportLevel: "unsupported" as const
    });
  const sourceLocation = freezeSourceLocation(gap.sourceLocation) ?? Object.freeze({ path: "" });
  const gapId =
    gap.gapId ??
    stableId("gap", {
      adapterId: adapter.adapterId,
      code: gap.code,
      inputSourceId: adapter.inputSourceId,
      message: gap.message,
      sourceLocation: sourceLocationCanonicalValue(sourceLocation)
    });
  return Object.freeze({
    adapter: freezeAdapter(adapter),
    code: gap.code,
    gapId,
    message: gap.message,
    sourceLocation
  });
}

function clampConfidence(value: number): number {
  return Math.min(1, Math.max(0, value));
}
