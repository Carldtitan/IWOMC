export type CoverageCondition = "covered" | "partial" | "unavailable" | "unknown";

export type ProviderId = "codex" | "claude_code" | "cursor" | "manual" | "unknown";

export type RealmKind =
  "host" | "wsl" | "dev_container" | "remote_host" | "extension_host" | "unknown";

export type AdapterSupportLevel =
  "full_native" | "native_validation" | "observed_only" | "unsupported" | "unknown";

export interface ProviderCoverage {
  readonly capabilities: readonly string[];
  readonly condition: CoverageCondition;
  readonly gaps: readonly string[];
  readonly providerId: ProviderId;
  readonly providerVersion?: string;
  readonly sessionBoundary: "automatic" | "manual" | "unknown";
  readonly surface: string;
}

export interface RealmCoverage {
  readonly condition: CoverageCondition;
  readonly gaps: readonly string[];
  readonly label: string;
  readonly realmId: string;
  readonly realmKind: RealmKind;
}

export interface PermissionCoverage {
  readonly condition: CoverageCondition;
  readonly gaps: readonly string[];
  readonly grantedCapabilities: readonly string[];
  readonly profile: "repository_scoped" | "reduced" | "unknown";
}

export interface UploadCoverage {
  readonly gaps: readonly string[];
  readonly pendingBatches?: number;
  readonly state: "online" | "offline_buffering" | "blocked" | "unknown";
}

export interface AdapterCoverage {
  readonly adapterId: string;
  readonly adapterVersion?: string;
  readonly condition: CoverageCondition;
  readonly ecosystem: string;
  readonly gaps: readonly string[];
  readonly managerVersion?: string;
  readonly supportLevel: AdapterSupportLevel;
}

export interface CaptureCoverage {
  readonly adapters: readonly AdapterCoverage[];
  readonly generatedAtEpochSeconds: number;
  readonly permission: PermissionCoverage;
  readonly provider: ProviderCoverage;
  readonly realms: readonly RealmCoverage[];
  readonly upload: UploadCoverage;
}

export type CoverageAssessment = "incomplete" | "within_reported_coverage";

export function unconfirmedCaptureCoverage(input: {
  readonly generatedAtEpochSeconds: number;
  readonly providerSurface: string;
  readonly realmKind: RealmKind;
  readonly realmLabel: string;
}): CaptureCoverage {
  const manualBoundary = input.providerSurface === "Manual boundary";
  return {
    adapters: [
      {
        adapterId: "unreported",
        condition: "unknown",
        ecosystem: "unreported",
        gaps: ["No ecosystem adapter capability report has been received."],
        supportLevel: "unknown"
      }
    ],
    generatedAtEpochSeconds: input.generatedAtEpochSeconds,
    permission: {
      condition: "unknown",
      gaps: ["Companion permission coverage has not been reported."],
      grantedCapabilities: [],
      profile: "unknown"
    },
    provider: {
      capabilities: manualBoundary ? ["manual_session_boundary"] : [],
      condition: manualBoundary ? "partial" : "unknown",
      gaps: [
        manualBoundary
          ? "No structured provider event surface is active."
          : "Provider hook capabilities and version have not been reported."
      ],
      providerId: providerIdForSurface(input.providerSurface),
      sessionBoundary: manualBoundary ? "manual" : "unknown",
      surface: input.providerSurface
    },
    realms: [
      {
        condition: "unknown",
        gaps: ["Companion realm discovery has not been reported."],
        label: input.realmLabel,
        realmId: "extension-host",
        realmKind: input.realmKind
      }
    ],
    upload: {
      gaps: ["Durable upload health has not been reported."],
      state: "unknown"
    }
  };
}

export function assessCoverage(coverage: CaptureCoverage): CoverageAssessment {
  const providerCovered = coverage.provider.condition === "covered";
  const realmsCovered =
    coverage.realms.length > 0 && coverage.realms.every((realm) => realm.condition === "covered");
  const permissionsCovered = coverage.permission.condition === "covered";
  const uploadCovered = coverage.upload.state === "online";
  const adaptersCovered =
    coverage.adapters.length > 0 &&
    coverage.adapters.every(
      (adapter) =>
        adapter.condition === "covered" &&
        (adapter.supportLevel === "full_native" || adapter.supportLevel === "native_validation")
    );

  return providerCovered && realmsCovered && permissionsCovered && uploadCovered && adaptersCovered
    ? "within_reported_coverage"
    : "incomplete";
}

export function coverageGaps(coverage: CaptureCoverage): readonly string[] {
  const gaps = [
    ...coverage.provider.gaps,
    ...coverage.realms.flatMap((realm) => realm.gaps),
    ...coverage.permission.gaps,
    ...coverage.upload.gaps,
    ...coverage.adapters.flatMap((adapter) => adapter.gaps)
  ];
  if (coverage.realms.length === 0) {
    gaps.push("No realm coverage has been reported.");
  }
  if (coverage.adapters.length === 0) {
    gaps.push("No ecosystem adapter coverage has been reported.");
  }
  if (coverage.upload.state === "offline_buffering") {
    gaps.push(
      coverage.upload.pendingBatches === undefined
        ? "Cloud upload is offline; redacted batches may be buffering locally."
        : `Cloud upload is offline; ${coverage.upload.pendingBatches} redacted batch(es) are buffering locally.`
    );
  }
  return [...new Set(gaps)];
}

export function formatCoverageReport(coverage: CaptureCoverage): string {
  const providerVersion =
    coverage.provider.providerVersion === undefined
      ? "version unreported"
      : `version ${coverage.provider.providerVersion}`;
  const realms =
    coverage.realms.length === 0
      ? "none reported"
      : coverage.realms
          .map((realm) => `${realm.label} [${realm.realmKind}, ${realm.condition}]`)
          .join(", ");
  const adapters =
    coverage.adapters.length === 0
      ? "none reported"
      : coverage.adapters
          .map((adapter) => {
            const manager =
              adapter.managerVersion === undefined
                ? "manager version unreported"
                : `manager ${adapter.managerVersion}`;
            return `${adapter.ecosystem}/${adapter.adapterId} [${adapter.supportLevel}, ${manager}, ${adapter.condition}]`;
          })
          .join(", ");
  const pending =
    coverage.upload.pendingBatches === undefined
      ? "pending count unreported"
      : `${coverage.upload.pendingBatches} pending`;
  const gaps = coverageGaps(coverage);
  const overall =
    assessCoverage(coverage) === "within_reported_coverage"
      ? "Observed within the named reported coverage; this is not a global all-clear."
      : "Coverage is incomplete; do not interpret missing findings as a clean environment.";

  return [
    overall,
    `Provider: ${coverage.provider.providerId} via ${coverage.provider.surface} (${providerVersion}, ${coverage.provider.condition}, ${coverage.provider.sessionBoundary} boundaries).`,
    `Realms: ${realms}.`,
    `Permissions: ${coverage.permission.profile} (${coverage.permission.condition}); granted: ${
      coverage.permission.grantedCapabilities.length === 0
        ? "none reported"
        : coverage.permission.grantedCapabilities.join(", ")
    }.`,
    `Upload: ${coverage.upload.state} (${pending}).`,
    `Adapters: ${adapters}.`,
    `Known gaps: ${gaps.length === 0 ? "none reported for these named dimensions" : gaps.join(" | ")}.`
  ].join("\n");
}

function providerIdForSurface(surface: string): ProviderId {
  const normalized = surface.toLowerCase();
  if (normalized.includes("codex")) return "codex";
  if (normalized.includes("claude")) return "claude_code";
  if (normalized.includes("cursor")) return "cursor";
  if (surface === "Manual boundary") return "manual";
  return "unknown";
}
