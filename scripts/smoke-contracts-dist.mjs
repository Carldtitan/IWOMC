import {
  canonicalProtocolDigest,
  parseProtocolDocument
} from "../packages/contracts/dist/protocol.js";

const workspace = {
  schemaVersion: 1,
  kind: "workspace",
  workspaceId: "dist-smoke-workspace",
  name: "Built package smoke test",
  createdAt: "2026-01-02T03:04:05Z",
  retentionClass: "standard"
};

const parsed = parseProtocolDocument(workspace);
const digest = await canonicalProtocolDigest(parsed);

if (!digest.startsWith("sha256:") || digest.length !== 71) {
  throw new Error("built contracts package returned an invalid canonical digest");
}
