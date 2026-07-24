import { useEffect, useState, type ReactNode } from "react";

import { useWorkspacePolling, type WorkspacePollingState } from "./hooks/use-workspace-polling.js";

type View = "overview" | "sessions" | "findings" | "validations" | "settings";
type DetailTab = "evidence" | "candidate" | "validation";
type ReplayState = "idle" | "capturing" | "reconciling" | "validating" | "complete";
type SponsorRunState =
  | { readonly phase: "idle" }
  | { readonly phase: "running" }
  | { readonly message: string; readonly phase: "failed" }
  | { readonly phase: "complete"; readonly result: SponsorRunResult };

interface SponsorRunResult {
  readonly braintrust: {
    readonly status: string;
    readonly traceId?: string;
  };
  readonly daytona: {
    readonly cleanupConfirmed: boolean;
    readonly commandPassed: boolean;
    readonly durationMs: number;
    readonly sandboxCreated: boolean;
    readonly status: string;
  };
  readonly fireworks: {
    readonly model?: string;
    readonly reason?: string;
    readonly status: "live" | "unavailable";
  };
  readonly overall: string;
  readonly runId: string;
}

const localSystemStatus = {
  health: "unknown",
  summary: "Local workspace ready",
  updatedAt: "1970-01-01T00:00:00Z"
} as const;

function Icon({ children }: { readonly children: ReactNode }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" width="18" height="18">
      {children}
    </svg>
  );
}

const icons = {
  overview: (
    <Icon>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </Icon>
  ),
  sessions: (
    <Icon>
      <path d="M4 6h16M4 12h10M4 18h13" />
      <circle cx="19" cy="12" r="2" />
    </Icon>
  ),
  findings: (
    <Icon>
      <path d="M12 3 2.8 19h18.4L12 3Z" />
      <path d="M12 9v4M12 16.5v.1" />
    </Icon>
  ),
  validations: (
    <Icon>
      <path d="M4 12.5 9 17l11-11" />
    </Icon>
  ),
  settings: (
    <Icon>
      <circle cx="12" cy="12" r="3" />
      <path d="M19 13.5v-3l-2-.7-.6-1.4.9-1.9-2.1-2.1-1.9.9-1.4-.6-.7-2h-3l-.7 2-1.4.6-1.9-.9-2.1 2.1.9 1.9-.6 1.4-2 .7v3l2 .7.6 1.4-.9 1.9 2.1 2.1 1.9-.9 REDACTED 2h3l.7-2 1.4-.6 1.9.9 2.1-2.1-.9-1.9.6-1.4 2-.7Z" />
    </Icon>
  )
};

const navItems: { id: View; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "sessions", label: "Agent sessions" },
  { id: "findings", label: "Findings" },
  { id: "validations", label: "Validations" },
  { id: "settings", label: "Project settings" }
];

const replayLabels: Record<ReplayState, string> = {
  idle: "Replay verified run",
  capturing: "Capturing action…",
  reconciling: "Building evidence graphs…",
  validating: "Validating in Daytona…",
  complete: "Replay complete"
};

function StatusPill({
  children,
  tone = "neutral"
}: {
  readonly children: ReactNode;
  readonly tone?: "good" | "warning" | "danger" | "neutral" | "info";
}) {
  return <span className={`pill pill-${tone}`}>{children}</span>;
}

function SystemStatus({ polling }: { readonly polling: WorkspacePollingState }) {
  const reported = polling.page?.systemStatus;
  const label = (() => {
    switch (polling.phase) {
      case "demo":
        return "Local workspace · live proof available";
      case "loading":
        return "Connecting to live system status…";
      case "partial":
        return `Partial live status · ${reported?.summary ?? "coverage is incomplete"}`;
      case "stale":
        return `Stale live status · ${reported?.summary ?? "last update unavailable"}`;
      case "error":
        return "Local workspace · live status unavailable";
      case "live":
        return reported?.summary ?? "Live status available within current coverage";
    }
  })();
  const lastUpdate =
    polling.lastSuccessfulPollAt === undefined
      ? undefined
      : new Date(polling.lastSuccessfulPollAt).toLocaleTimeString();
  return (
    <div
      className={`system-status system-status-${polling.phase}`}
      title={lastUpdate === undefined ? label : `${label}. Last successful poll at ${lastUpdate}.`}
    >
      <span className="live-dot" />
      {label}
    </div>
  );
}

function Sidebar({
  current,
  onNavigate,
  sponsorRun
}: {
  readonly current: View;
  readonly onNavigate: (view: View) => void;
  readonly sponsorRun: SponsorRunState;
}) {
  const liveResult = sponsorRun.phase === "complete" ? sponsorRun.result : undefined;
  const integrations = [
    {
      className: "daytona",
      label: "Daytona",
      mark: "D",
      status:
        liveResult === undefined
          ? "Not tested in this page session"
          : liveResult.daytona.status === "succeeded" && liveResult.daytona.cleanupConfirmed
            ? "Confirmed by live proof"
            : `Live proof: ${liveResult.daytona.status}`,
      tone:
        liveResult === undefined
          ? "unknown"
          : liveResult.daytona.status === "succeeded" && liveResult.daytona.cleanupConfirmed
            ? "confirmed"
            : "unavailable"
    },
    {
      className: "fireworks",
      label: "Fireworks",
      mark: "F",
      status:
        liveResult === undefined
          ? "Not tested in this page session"
          : liveResult.fireworks.status === "live"
            ? "Confirmed by live proof"
            : "Unavailable for the latest proof",
      tone:
        liveResult === undefined
          ? "unknown"
          : liveResult.fireworks.status === "live"
            ? "confirmed"
            : "unavailable"
    },
    {
      className: "braintrust",
      label: "Braintrust",
      mark: "B",
      status:
        liveResult === undefined
          ? "Not tested in this page session"
          : liveResult.braintrust.status === "exported"
            ? "Confirmed by live proof"
            : "Trace export deferred",
      tone:
        liveResult === undefined
          ? "unknown"
          : liveResult.braintrust.status === "exported"
            ? "confirmed"
            : "unavailable"
    }
  ] as const;

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">I</div>
        <div>
          <strong>IWOMC</strong>
          <span>Environment Reconciler</span>
        </div>
      </div>

      <div className="workspace-switcher">
        <span className="workspace-avatar">CP</span>
        <span>
          <small>Workspace</small>
          <strong>Carl&apos;s workspace</strong>
        </span>
        <span className="chevron">⌄</span>
      </div>

      <nav aria-label="Product navigation">
        <p className="nav-label">Project</p>
        {navItems.map((item) => (
          <button
            className={current === item.id ? "nav-item active" : "nav-item"}
            key={item.id}
            onClick={() => onNavigate(item.id)}
            type="button"
          >
            {icons[item.id]}
            {item.label}
            {item.id === "findings" && <span className="nav-count">1</span>}
          </button>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <p className="nav-label">Integrations</p>
        {integrations.map((integration) => (
          <div className="integration-line" key={integration.label}>
            <span className={`integration-logo ${integration.className}`}>{integration.mark}</span>
            {integration.label}
            <span
              aria-label={`${integration.label}: ${integration.status}`}
              className={`live-dot integration-dot-${integration.tone}`}
              title={integration.status}
            />
          </div>
        ))}
        <div className="REDACTED-card">
          <span className="REDACTED-avatar">CP</span>
          <span>
            <strong>REDACTED</strong>
            <small>Owner</small>
          </span>
          <button aria-label="User menu" type="button">
            ···
          </button>
        </div>
      </div>
    </aside>
  );
}

function MetricCard({
  label,
  value,
  note,
  tone
}: {
  readonly label: string;
  readonly value: string;
  readonly note: string;
  readonly tone: "good" | "warning" | "info";
}) {
  return (
    <article className="metric-card">
      <div className={`metric-icon metric-${tone}`}>
        {tone === "good" ? "✓" : tone === "warning" ? "!" : "↗"}
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{note}</small>
      </div>
    </article>
  );
}

function Timeline() {
  const events = [
    {
      time: "10:42:08",
      title: "Codex started a local session",
      detail: "Surface: Codex CLI · Realm: repository",
      kind: "agent"
    },
    {
      time: "10:43:17",
      title: "npm install completed",
      detail: "@iwomc/hidden-runtime · exit 0 · local layer",
      kind: "action"
    },
    {
      time: "10:43:18",
      title: "Installed-state delta captured",
      detail: "1 package added · manifest unchanged",
      kind: "capture"
    },
    {
      time: "10:44:02",
      title: "Runtime use observed",
      detail: "Static import in src/message.mjs",
      kind: "capture"
    },
    {
      time: "10:45:11",
      title: "Session ended · checkpoint reconciled",
      detail: "7 graphs · 1 material disagreement",
      kind: "result"
    }
  ];

  return (
    <section className="panel timeline-panel">
      <div className="panel-heading">
        <div>
          <p className="section-kicker">Latest session</p>
          <h2>Causal timeline</h2>
        </div>
        <StatusPill tone="good">Capture complete</StatusPill>
      </div>
      <div className="timeline">
        {events.map((event) => (
          <div className="timeline-event" key={`${event.time}-${event.title}`}>
            <time>{event.time}</time>
            <span className={`timeline-dot timeline-${event.kind}`} />
            <div>
              <strong>{event.title}</strong>
              <span>{event.detail}</span>
            </div>
          </div>
        ))}
      </div>
      <button className="text-button" type="button">
        Open full session <span>→</span>
      </button>
    </section>
  );
}

function EvidenceTab() {
  return (
    <div className="detail-body">
      <div className="statement">
        <span className="statement-icon success">✓</span>
        <div>
          <strong>Package was used by project code</strong>
          <p>
            Static executable import of <code>@iwomc/hidden-runtime</code> in{" "}
            <code>src/message.mjs:1</code>.
          </p>
          <div className="confidence-row">
            <span>Necessity</span>
            <span className="confidence-bar">
              <i style={{ width: "94%" }} />
            </span>
            <strong>0.94</strong>
          </div>
        </div>
      </div>
      <div className="statement">
        <span className="statement-icon info">↳</span>
        <div>
          <strong>Install effect is attributable to the agent action</strong>
          <p>Codex tool call → descendant npm process → exit 0 → post-action inventory delta.</p>
          <div className="evidence-tags">
            <span>provider event</span>
            <span>process ancestry</span>
            <span>installed delta</span>
          </div>
        </div>
      </div>
      <div className="statement">
        <span className="statement-icon danger">×</span>
        <div>
          <strong>Repository does not declare the package</strong>
          <p>
            No matching dependency exists in <code>package.json</code> or{" "}
            <code>package-lock.json</code>.
          </p>
        </div>
      </div>
      <div className="coverage-note">
        <span>i</span>
        <p>
          <strong>Proof scope:</strong> local Windows realm, npm project layer, Codex CLI 0.24.
          Actor attribution and dependency necessity are scored independently.
        </p>
      </div>
    </div>
  );
}

function CandidateTab() {
  return (
    <div className="detail-body">
      <div className="candidate-summary">
        <div>
          <p className="section-kicker">Evidence-grounded proposal · guard accepted</p>
          <h3>Declare the observed runtime dependency</h3>
          <p>
            Native npm operation, constrained to the existing manager. The final lockfile was
            generated by npm inside Daytona, not written by the model.
          </p>
        </div>
        <StatusPill tone="good">Policy REDACTEDed</StatusPill>
      </div>
      <div className="diff-card">
        <div className="diff-header">
          <span>package.json</span>
          <span className="diff-stats">+1 −0</span>
        </div>
        <pre>
          <span className="diff-context">{`  "dependencies": {`}</span>
          <span className="diff-add">
            {`+   "@iwomc/hidden-runtime": "file:./vendor/hidden-runtime"`}
          </span>
          <span className="diff-context">{`  }`}</span>
        </pre>
      </div>
      <div className="guard-grid">
        {[
          "Existing npm manager retained",
          "Evidence IDs grounded",
          "Manifest and lock agree",
          "No REDACTED-shaped content",
          "Allowed path scope",
          "Diff budget: 2 files"
        ].map((guard) => (
          <span key={guard}>
            <b>✓</b> {guard}
          </span>
        ))}
      </div>
    </div>
  );
}

function ValidationTab() {
  const phases = ["Source", "npm ci", "Graph", "Test", "Cleanup"];
  return (
    <div className="detail-body">
      <div className="validation-header">
        <div>
          <p className="section-kicker">Daytona · node:22-bookworm · amd64</p>
          <h3>Clean reconstruction proof</h3>
        </div>
        <StatusPill tone="good">Scoped verification</StatusPill>
      </div>
      <div className="matrix">
        <div className="matrix-row matrix-labels">
          <strong>Run</strong>
          {phases.map((phase) => (
            <span key={phase}>{phase}</span>
          ))}
          <strong>Outcome</strong>
        </div>
        <div className="matrix-row">
          <strong>Unchanged baseline</strong>
          <span className="phase-REDACTED">✓</span>
          <span className="phase-REDACTED">✓</span>
          <span className="phase-REDACTED">✓</span>
          <span className="phase-fail">×</span>
          <span className="phase-REDACTED">✓</span>
          <StatusPill tone="danger">Reproduced</StatusPill>
        </div>
        <div className="matrix-row">
          <strong>Candidate</strong>
          <span className="phase-REDACTED">✓</span>
          <span className="phase-REDACTED">✓</span>
          <span className="phase-REDACTED">✓</span>
          <span className="phase-REDACTED">✓</span>
          <span className="phase-REDACTED">✓</span>
          <StatusPill tone="good">Passed</StatusPill>
        </div>
      </div>
      <dl className="attestation">
        <div>
          <dt>Source input</dt>
          <dd>sha256:891c…7b31</dd>
        </div>
        <div>
          <dt>Candidate patch</dt>
          <dd>sha256:2f04…c90e</dd>
        </div>
        <div>
          <dt>Behavior contract</dt>
          <dd>npm test · accepted</dd>
        </div>
        <div>
          <dt>Sandbox cleanup</dt>
          <dd className="good-text">2/2 confirmed deleted</dd>
        </div>
      </dl>
    </div>
  );
}

function FindingDetail() {
  const [tab, setTab] = useState<DetailTab>("evidence");

  return (
    <section className="panel finding-panel">
      <div className="finding-title-row">
        <div className="finding-severity">!</div>
        <div>
          <div className="finding-meta">
            <StatusPill tone="warning">High confidence</StatusPill>
            <span>dependency.used_but_undeclared</span>
          </div>
          <h2>Runtime dependency exists only on this machine</h2>
          <p>
            <code>@iwomc/hidden-runtime</code> is installed and used, but absent from repository
            intent.
          </p>
        </div>
        <button className="icon-button" aria-label="Finding actions" type="button">
          ···
        </button>
      </div>
      <div className="tabs" role="tablist" aria-label="Finding details">
        {(["evidence", "candidate", "validation"] as const).map((item) => (
          <button
            aria-selected={tab === item}
            className={tab === item ? "active" : ""}
            key={item}
            onClick={() => setTab(item)}
            role="tab"
            type="button"
          >
            {item[0]!.toUpperCase() + item.slice(1)}
            {item === "validation" && <span className="tab-check">✓</span>}
          </button>
        ))}
      </div>
      {tab === "evidence" && <EvidenceTab />}
      {tab === "candidate" && <CandidateTab />}
      {tab === "validation" && <ValidationTab />}
      <div className="finding-footer">
        <span>Finding #fnd_7f29 · updated 2 min ago</span>
        <div>
          <button className="secondary-button" type="button">
            Reject
          </button>
          <button className="primary-button" type="button">
            Open verified PR <span>↗</span>
          </button>
        </div>
      </div>
    </section>
  );
}

function Overview({
  onSponsorRun,
  replayState,
  sponsorRun,
  onReplay
}: {
  readonly onSponsorRun: () => void;
  readonly replayState: ReplayState;
  readonly sponsorRun: SponsorRunState;
  readonly onReplay: () => void;
}) {
  return (
    <>
      <div className="page-heading">
        <div>
          <h1>1 environment issue</h1>
          <p>An agent used a package that this repository does not declare.</p>
        </div>
        <div className="heading-actions">
          <button
            className="secondary-button live-proof-button"
            disabled={sponsorRun.phase === "running"}
            onClick={onSponsorRun}
            type="button"
          >
            {sponsorRun.phase === "running" ? (
              <span className="spinner light-spinner" />
            ) : (
              <span aria-hidden="true" className="button-mark">
                D
              </span>
            )}
            {sponsorRun.phase === "running" ? "Running live proof…" : "Run live proof"}
          </button>
          <button
            className="run-button"
            disabled={!["idle", "complete"].includes(replayState)}
            onClick={onReplay}
            type="button"
          >
            <span className={replayState !== "idle" && replayState !== "complete" ? "spinner" : ""}>
              {replayState === "idle" || replayState === "complete" ? "▶" : ""}
            </span>
            {replayLabels[replayState]}
          </button>
        </div>
      </div>

      <div className="scope-bar">
        <div className="repo-avatar">GH</div>
        <div>
          <strong>REDACTED / IWOMC</strong>
          <span>main · 8f31c2a</span>
        </div>
        <span className="scope-divider" />
        <StatusPill tone="good">Codex connected</StatusPill>
        <StatusPill>Windows · repository realm</StatusPill>
        <button type="button">Change scope</button>
      </div>

      <SponsorProof run={sponsorRun} />

      <div className="reconciliation-flow" aria-label="Environment reconciliation">
        <span>
          <b>1</b>Agent installed package
        </span>
        <i>→</i>
        <span>
          <b>2</b>Manifest is missing it
        </span>
        <i>→</i>
        <span>
          <b>3</b>Verify the fix
        </span>
      </div>

      <div className="metrics">
        <MetricCard
          label="Capture coverage"
          value="Complete"
          note="No gaps in latest session"
          tone="good"
        />
        <MetricCard
          label="Open findings"
          value="1 material"
          note="1 needs your review"
          tone="warning"
        />
        <MetricCard
          label="Clean validation"
          value="1 / 1 target"
          note="Candidate REDACTEDed in Daytona"
          tone="good"
        />
        <MetricCard
          label="Environment drift"
          value="1 package"
          note="Local state not in repository"
          tone="info"
        />
      </div>

      <div className="overview-grid">
        <Timeline />
        <section className="panel coverage-panel">
          <div className="panel-heading">
            <div>
              <p className="section-kicker">Proof coverage</p>
              <h2>What we actually saw</h2>
            </div>
          </div>
          <div className="coverage-list">
            {[
              ["Codex events", "complete", "good"],
              ["Process ancestry", "complete", "good"],
              ["npm inventory", "native", "good"],
              ["Repository intent", "parsed", "good"],
              ["Linux target", "validated", "good"],
              ["Other local realms", "not in scope", "neutral"]
            ].map(([label, status, tone]) => (
              <div key={label}>
                <span>{label}</span>
                <StatusPill tone={tone as "good" | "neutral"}>{status}</StatusPill>
              </div>
            ))}
          </div>
          <p className="coverage-footnote">
            IWOMC does not turn missing observation into a green status.
          </p>
        </section>
      </div>

      <FindingDetail />
    </>
  );
}

function SponsorProof({ run }: { readonly run: SponsorRunState }) {
  if (run.phase === "idle") {
    return (
      <section className="sponsor-proof">
        <div>
          <p className="section-kicker">Live sponsor proof</p>
          <strong>Ready to test the sponsor connections</strong>
          <span>
            Daytona runs and cleans up · Braintrust records · Fireworks reports availability
          </span>
        </div>
        <StatusPill tone="info">Not run yet</StatusPill>
      </section>
    );
  }
  if (run.phase === "running") {
    return (
      <section className="sponsor-proof sponsor-proof-running" aria-live="polite">
        <div>
          <p className="section-kicker">Live sponsor proof</p>
          <strong>Running a bounded command on a disposable computer…</strong>
          <span>
            Daytona runs and cleans up · Braintrust records · Fireworks reports availability
          </span>
        </div>
        <StatusPill tone="warning">Running</StatusPill>
      </section>
    );
  }
  if (run.phase === "failed") {
    return (
      <section className="sponsor-proof sponsor-proof-failed" aria-live="polite">
        <div>
          <p className="section-kicker">Live sponsor proof</p>
          <strong>Sponsor proof needs anREDACTED try</strong>
          <span>{run.message}</span>
        </div>
        <StatusPill tone="danger">Failed safely</StatusPill>
      </section>
    );
  }
  const { result } = run;
  const daytonaPassed =
    result.daytona.commandPassed &&
    result.daytona.sandboxCreated &&
    result.daytona.cleanupConfirmed;
  return (
    <section className="sponsor-proof sponsor-proof-complete" aria-live="polite">
      <div>
        <p className="section-kicker">Live sponsor proof · {result.runId.slice(0, 8)}</p>
        <strong>Sponsor proof succeeded</strong>
        <div className="sponsor-result-grid">
          <span>
            <b>Daytona</b>
            {daytonaPassed
              ? `Command REDACTEDed · deleted · ${Math.round(result.daytona.durationMs / 1000)}s`
              : result.daytona.status}
          </span>
          <span>
            <b>Braintrust</b>
            {result.braintrust.status}
            {result.braintrust.traceId === undefined
              ? ""
              : ` · trace ${result.braintrust.traceId.slice(0, 8)}`}
          </span>
          <span>
            <b>Fireworks</b>
            {result.fireworks.status === "live"
              ? (result.fireworks.reason ?? "Live constrained reasoning")
              : "Unavailable for this run"}
          </span>
        </div>
      </div>
      <StatusPill tone={result.overall === "succeeded" ? "good" : "warning"}>
        {result.overall}
      </StatusPill>
    </section>
  );
}

function Placeholder({
  view,
  onReturn
}: {
  readonly view: Exclude<View, "overview">;
  readonly onReturn: () => void;
}) {
  const copy: Record<Exclude<View, "overview">, [string, string]> = {
    sessions: [
      "Agent sessions",
      "Inspect provider events and causally linked environment actions."
    ],
    findings: ["All findings", "Review active, superseded, and evidence-blocked disagreements."],
    validations: [
      "Validation runs",
      "Compare clean baselines and candidates across required targets."
    ],
    settings: [
      "Project settings",
      "Manage behavior, policies, devices, integrations, and retention."
    ]
  };
  return (
    <div className="placeholder panel">
      <span className="placeholder-icon">{icons[view]}</span>
      <h1>{copy[view][0]}</h1>
      <p>{copy[view][1]}</p>
      <button className="secondary-button" onClick={onReturn} type="button">
        Return to overview
      </button>
    </div>
  );
}

export function App() {
  const [view, setView] = useState<View>("overview");
  const [replayState, setReplayState] = useState<ReplayState>("idle");
  const [sponsorRun, setSponsorRun] = useState<SponsorRunState>({ phase: "idle" });
  const workspaceId = configuredEnvironmentValue(import.meta.env.VITE_RECONCILER_WORKSPACE_ID);
  const projectId = configuredEnvironmentValue(import.meta.env.VITE_RECONCILER_PROJECT_ID);
  const configuredApiBaseUrl = configuredEnvironmentValue(
    import.meta.env.VITE_RECONCILER_API_BASE_URL
  );
  const polling = useWorkspacePolling({
    apiBaseUrl: configuredApiBaseUrl || window.location.origin,
    enabled: workspaceId.length > 0 && projectId.length > 0,
    initialSystemStatus: localSystemStatus,
    projectId: projectId || "local-project",
    workspaceId: workspaceId || "local-workspace"
  });

  useEffect(() => {
    if (replayState === "idle" || replayState === "complete") {
      return;
    }
    const next: Record<Exclude<ReplayState, "idle" | "complete">, ReplayState> = {
      capturing: "reconciling",
      reconciling: "validating",
      validating: "complete"
    };
    const delay = replayState === "validating" ? 1_500 : 900;
    const timer = window.setTimeout(() => setReplayState(next[replayState]), delay);
    return () => window.clearTimeout(timer);
  }, [replayState]);

  const runSponsorProof = async () => {
    setSponsorRun({ phase: "running" });
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 100_000);
    try {
      const response = await fetch(`${demoApiBaseUrl(configuredApiBaseUrl)}/v1/demo/sponsor-run`, {
        body: "{}",
        headers: { "content-type": "application/json" },
        method: "POST",
        signal: controller.signal
      });
      const payload: unknown = await response.json();
      if (!response.ok || !isSponsorRunResult(payload)) {
        throw new Error(`Live sponsor endpoint returned HTTP ${response.status}.`);
      }
      setSponsorRun({ phase: "complete", result: payload });
    } catch (error) {
      setSponsorRun({
        message:
          error instanceof DOMException && error.name === "AbortError"
            ? "The live run exceeded 100 seconds and was stopped."
            : error instanceof Error
              ? error.message
              : "The live sponsor endpoint was unavailable.",
        phase: "failed"
      });
    } finally {
      window.clearTimeout(timeout);
    }
  };

  return (
    <div className="app-shell">
      <Sidebar current={view} onNavigate={setView} sponsorRun={sponsorRun} />
      <main className="main-content">
        <header className="topbar">
          <div className="compact-brand">
            <span className="brand-mark">I</span>
            <span>
              <strong>IWOMC</strong>
              <small>Environment check</small>
            </span>
          </div>
          <SystemStatus polling={polling} />
        </header>
        <div className="page-content">
          {view === "overview" ? (
            <Overview
              onReplay={() => setReplayState("capturing")}
              onSponsorRun={() => void runSponsorProof()}
              replayState={replayState}
              sponsorRun={sponsorRun}
            />
          ) : (
            <Placeholder view={view} onReturn={() => setView("overview")} />
          )}
        </div>
      </main>
    </div>
  );
}

function configuredEnvironmentValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function demoApiBaseUrl(configured: string): string {
  if (configured.length > 0) {
    return configured.replace(/\/+$/u, "");
  }
  return window.location.port === "5173"
    ? `${window.location.protocol}//${window.location.hostname}:8790`
    : window.location.origin;
}

function isSponsorRunResult(value: unknown): value is SponsorRunResult {
  if (!isRecord(value)) {
    return false;
  }
  const daytona = value.daytona;
  const braintrust = value.braintrust;
  const fireworks = value.fireworks;
  return (
    typeof value.runId === "string" &&
    typeof value.overall === "string" &&
    isRecord(daytona) &&
    typeof daytona.status === "string" &&
    typeof daytona.sandboxCreated === "boolean" &&
    typeof daytona.commandPassed === "boolean" &&
    typeof daytona.cleanupConfirmed === "boolean" &&
    typeof daytona.durationMs === "number" &&
    isRecord(braintrust) &&
    typeof braintrust.status === "string" &&
    isRecord(fireworks) &&
    (fireworks.status === "live" || fireworks.status === "unavailable")
  );
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
