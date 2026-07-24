import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique as uniqueIndex,
  uuid
} from "drizzle-orm/pg-core";

const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).defaultNow().notNull();
const requiredId = () => uuid("id").primaryKey();
const digest = (name: string) => text(name).notNull();

export const users = pgTable(
  "users",
  {
    id: requiredId(),
    githubUserId: text("github_user_id").notNull(),
    githubLogin: text("github_login").notNull(),
    displayName: text("display_name"),
    avatarUrl: text("avatar_url"),
    disabledAt: timestamp("disabled_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("users_github_user_id_uq").on(table.githubUserId),
    uniqueIndex("users_github_login_uq").on(table.githubLogin)
  ]
);

export const browserSessions = pgTable(
  "browser_sessions",
  {
    id: requiredId(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenDigest: digest("token_digest"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("browser_sessions_token_digest_uq").on(table.tokenDigest),
    index("browser_sessions_user_idx").on(table.userId),
    check("browser_sessions_expiry_ck", sql`${table.expiresAt} > ${table.createdAt}`)
  ]
);

export const githubUserCredentials = pgTable("github_user_credentials", {
  userId: uuid("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  encryptedCredentials: text("encrypted_credentials").notNull(),
  tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: updatedAt()
});

export const oauthStates = pgTable(
  "oauth_states",
  {
    id: requiredId(),
    stateDigest: digest("state_digest"),
    redirectPath: text("redirect_path").notNull(),
    codeVerifierDigest: digest("code_verifier_digest"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("oauth_states_state_digest_uq").on(table.stateDigest),
    check("oauth_states_expiry_ck", sql`${table.expiresAt} > ${table.createdAt}`)
  ]
);

export const workspaces = pgTable(
  "workspaces",
  {
    id: requiredId(),
    ownerUserId: uuid("owner_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    rawContentEnabled: boolean("raw_content_enabled").default(false).notNull(),
    defaultRetentionClass: text("default_retention_class").default("mvp-default").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("workspaces_slug_uq").on(table.slug),
    check("workspaces_slug_ck", sql`${table.slug} ~ '^[a-z0-9][a-z0-9-]{1,62}$'`)
  ]
);

export const workspaceMembers = pgTable(
  "workspace_members",
  {
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    primaryKey({ columns: [table.workspaceId, table.userId], name: "workspace_members_pk" }),
    check(
      "workspace_members_role_ck",
      sql`${table.role} in ('owner', 'maintainer', 'developer', 'reviewer', 'observer', 'member')`
    )
  ]
);

export const workspaceInvitations = pgTable(
  "workspace_invitations",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    invitedByUserId: uuid("invited_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    githubUserId: text("github_user_id"),
    emailDigest: text("email_digest"),
    tokenDigest: digest("token_digest"),
    role: text("role").default("member").notNull(),
    state: text("state").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
      onDelete: "restrict"
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("workspace_invitations_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("workspace_invitations_token_uq").on(table.tokenDigest),
    check(
      "workspace_invitations_role_ck",
      sql`${table.role} in ('owner', 'maintainer', 'developer', 'reviewer', 'observer', 'member')`
    ),
    check(
      "workspace_invitations_state_ck",
      sql`${table.state} in ('pending', 'accepted', 'revoked', 'expired')`
    )
  ]
);

export const githubInstallations = pgTable(
  "github_installations",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    installedByUserId: uuid("installed_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    githubInstallationId: text("github_installation_id").notNull(),
    accountId: text("account_id").notNull(),
    accountLogin: text("account_login").notNull(),
    permissionsDigest: digest("permissions_digest"),
    suspendedAt: timestamp("suspended_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("github_installations_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("github_installations_provider_uq").on(table.githubInstallationId)
  ]
);

export const projects = pgTable(
  "projects",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    status: text("status").default("active").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("projects_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("projects_ws_slug_uq").on(table.workspaceId, table.slug),
    check("projects_status_ck", sql`${table.status} in ('active', 'archived', 'deleted')`)
  ]
);

export const repositories = pgTable(
  "repositories",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    githubInstallationId: uuid("github_installation_id").notNull(),
    providerRepositoryId: text("provider_repository_id").notNull(),
    owner: text("owner").notNull(),
    name: text("name").notNull(),
    defaultBranch: text("default_branch").notNull(),
    visibility: text("visibility").notNull(),
    archived: boolean("archived").default(false).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("repositories_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("repositories_ws_project_uq").on(table.workspaceId, table.projectId),
    uniqueIndex("repositories_provider_id_uq").on(table.workspaceId, table.providerRepositoryId),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "repositories_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.githubInstallationId],
      foreignColumns: [githubInstallations.workspaceId, githubInstallations.id],
      name: "repositories_installation_fk"
    }).onDelete("restrict"),
    check(
      "repositories_visibility_ck",
      sql`${table.visibility} in ('private', 'internal', 'public')`
    )
  ]
);

export const devices = pgTable(
  "devices",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    enrolledByUserId: uuid("enrolled_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    displayName: text("display_name").notNull(),
    platform: text("platform").notNull(),
    companionVersion: text("companion_version"),
    state: text("state").default("unpaired").notNull(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("devices_ws_id_uq").on(table.workspaceId, table.id),
    check(
      "devices_state_ck",
      sql`${table.state} in ('unpaired', 'paired', 'online', 'offline', 'revoked')`
    )
  ]
);

export const deviceCredentials = pgTable(
  "device_credentials",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").notNull(),
    credentialDigest: text("credential_digest"),
    publicKeyFingerprint: digest("public_key_fingerprint"),
    publicSigningKey: text("public_signing_key"),
    keyAlgorithm: text("key_algorithm").notNull(),
    keyVersion: integer("key_version").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("device_credentials_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("device_credentials_credential_digest_uq").on(table.credentialDigest),
    uniqueIndex("device_credentials_fingerprint_uq").on(table.publicKeyFingerprint),
    uniqueIndex("device_credentials_version_uq").on(
      table.workspaceId,
      table.deviceId,
      table.keyVersion
    ),
    foreignKey({
      columns: [table.workspaceId, table.deviceId],
      foreignColumns: [devices.workspaceId, devices.id],
      name: "device_credentials_device_fk"
    }).onDelete("cascade"),
    check("device_credentials_version_ck", sql`${table.keyVersion} > 0`),
    check(
      "device_credentials_material_ck",
      sql`(${table.credentialDigest} is null and ${table.publicSigningKey} is null) or (${table.credentialDigest} is not null and ${table.publicSigningKey} is not null and ${table.keyAlgorithm} = 'Ed25519')`
    ),
    check(
      "device_credentials_public_key_ck",
      sql`${table.publicSigningKey} is null or octet_length(decode(${table.publicSigningKey}, 'base64')) = 32`
    )
  ]
);

export const objectMetadata = pgTable(
  "object_metadata",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    objectKey: text("object_key").notNull(),
    objectVersionId: text("object_version_id").notNull(),
    objectType: text("object_type").notNull(),
    schemaVersion: text("schema_version").notNull(),
    ciphertextDigest: digest("ciphertext_digest"),
    plaintextDigest: text("plaintext_digest"),
    ciphertextBytes: bigint("ciphertext_bytes", { mode: "number" }).notNull(),
    compression: text("compression").notNull(),
    encryptionAlgorithm: text("encryption_algorithm").notNull(),
    encryptionKeyVersion: text("encryption_key_version").notNull(),
    nonceDigest: digest("nonce_digest"),
    authenticatedMetadataDigest: digest("authenticated_metadata_digest"),
    retentionClass: text("retention_class").notNull(),
    authorizationClass: text("authorization_class").notNull(),
    state: text("state").default("pending").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    tombstoneDigest: text("tombstone_digest"),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("object_metadata_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("object_metadata_key_version_uq").on(
      table.workspaceId,
      table.objectKey,
      table.objectVersionId
    ),
    uniqueIndex("object_metadata_ciphertext_uq").on(table.workspaceId, table.ciphertextDigest),
    check("object_metadata_bytes_ck", sql`${table.ciphertextBytes} >= 0`),
    check(
      "object_metadata_type_ck",
      sql`${table.objectType} in ('event-batch', 'inventory', 'source-bundle', 'candidate-patch', 'validation-diagnostic', 'attestation', 'braintrust-outbox', 'raw-opt-in')`
    ),
    check(
      "object_metadata_state_ck",
      sql`${table.state} in ('pending', 'available', 'deleting', 'deleted', 'tombstoned')`
    ),
    check("object_metadata_encryption_ck", sql`${table.encryptionAlgorithm} = 'AES-256-GCM'`)
  ]
);

export const realms = pgTable(
  "realms",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    deviceId: uuid("device_id").notNull(),
    kind: text("kind").notNull(),
    stableIdentityDigest: digest("stable_identity_digest"),
    displayName: text("display_name").notNull(),
    operatingSystem: text("operating_system").notNull(),
    architecture: text("architecture").notNull(),
    active: boolean("active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("realms_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("realms_identity_uq").on(
      table.workspaceId,
      table.deviceId,
      table.stableIdentityDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.deviceId],
      foreignColumns: [devices.workspaceId, devices.id],
      name: "realms_device_fk"
    }).onDelete("cascade"),
    check(
      "realms_kind_ck",
      sql`${table.kind} in ('host', 'wsl', 'container', 'remote', 'ide-host', 'sandbox')`
    )
  ]
);

export const environmentLayers = pgTable(
  "environment_layers",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    realmId: uuid("realm_id").notNull(),
    kind: text("kind").notNull(),
    pathDigest: digest("path_digest"),
    manager: text("manager"),
    runtime: text("runtime"),
    active: boolean("active").default(true).notNull(),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("environment_layers_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("environment_layers_identity_uq").on(
      table.workspaceId,
      table.realmId,
      table.kind,
      table.pathDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.realmId],
      foreignColumns: [realms.workspaceId, realms.id],
      name: "environment_layers_realm_fk"
    }).onDelete("cascade"),
    check(
      "environment_layers_kind_ck",
      sql`${table.kind} in ('system', 'user', 'project', 'virtual-environment', 'toolchain', 'container')`
    )
  ]
);

export const providerSessions = pgTable(
  "provider_sessions",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    deviceId: uuid("device_id").notNull(),
    realmId: uuid("realm_id").notNull(),
    provider: text("provider").notNull(),
    providerSessionIdDigest: digest("provider_session_id_digest"),
    state: text("state").default("registered").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("provider_sessions_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("provider_sessions_provider_id_uq").on(
      table.workspaceId,
      table.provider,
      table.providerSessionIdDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "provider_sessions_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.deviceId],
      foreignColumns: [devices.workspaceId, devices.id],
      name: "provider_sessions_device_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.realmId],
      foreignColumns: [realms.workspaceId, realms.id],
      name: "provider_sessions_realm_fk"
    }).onDelete("restrict"),
    check(
      "provider_sessions_provider_ck",
      sql`${table.provider} in ('codex', 'claude-code', 'cursor', 'unknown')`
    ),
    check(
      "provider_sessions_state_ck",
      sql`${table.state} in ('registered', 'observing', 'draining', 'checkpointing', 'partial_capture', 'ended')`
    )
  ]
);

export const capabilityReports = pgTable(
  "capability_reports",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    providerSessionId: uuid("provider_session_id"),
    deviceId: uuid("device_id").notNull(),
    provider: text("provider").notNull(),
    adapterVersion: text("adapter_version").notNull(),
    schemaVersion: text("schema_version").notNull(),
    supportLevel: text("support_level").notNull(),
    capabilityDigest: digest("capability_digest"),
    observedAt: timestamp("observed_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("capability_reports_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("capability_reports_identity_uq").on(
      table.workspaceId,
      table.projectId,
      table.deviceId,
      table.provider,
      table.capabilityDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "capability_reports_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.deviceId],
      foreignColumns: [devices.workspaceId, devices.id],
      name: "capability_reports_device_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.providerSessionId],
      foreignColumns: [providerSessions.workspaceId, providerSessions.id],
      name: "capability_reports_session_fk"
    }).onDelete("restrict"),
    check(
      "capability_reports_support_ck",
      sql`${table.supportLevel} in ('full_native', 'observed_only', 'unsupported', 'unknown')`
    )
  ]
);

export const supportRegistryEntries = pgTable(
  "support_registry_entries",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    ecosystem: text("ecosystem").notNull(),
    tool: text("tool").notNull(),
    formatVersion: text("format_version").notNull(),
    adapterVersion: text("adapter_version").notNull(),
    supportLevel: text("support_level").notNull(),
    capabilityDigest: digest("capability_digest"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull(),
    validUntil: timestamp("valid_until", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("support_registry_entries_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("support_registry_entries_identity_uq").on(
      table.workspaceId,
      table.projectId,
      table.ecosystem,
      table.tool,
      table.formatVersion,
      table.adapterVersion
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "support_registry_entries_project_fk"
    }).onDelete("cascade"),
    check(
      "support_registry_entries_support_ck",
      sql`${table.supportLevel} in ('full_native', 'observed_only', 'unsupported')`
    )
  ]
);

export const captureGaps = pgTable(
  "capture_gaps",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    providerSessionId: uuid("provider_session_id"),
    capabilityReportId: uuid("capability_report_id"),
    gapCode: text("gap_code").notNull(),
    realmId: uuid("realm_id"),
    severity: text("severity").notNull(),
    firstObservedAt: timestamp("first_observed_at", { withTimezone: true }).notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    evidenceDigest: digest("evidence_digest"),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("capture_gaps_ws_id_uq").on(table.workspaceId, table.id),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "capture_gaps_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.providerSessionId],
      foreignColumns: [providerSessions.workspaceId, providerSessions.id],
      name: "capture_gaps_session_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.capabilityReportId],
      foreignColumns: [capabilityReports.workspaceId, capabilityReports.id],
      name: "capture_gaps_capability_fk"
    }).onDelete("restrict"),
    check("capture_gaps_severity_ck", sql`${table.severity} in ('info', 'warning', 'blocking')`)
  ]
);

export const eventStreams = pgTable(
  "event_streams",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    providerSessionId: uuid("provider_session_id").notNull(),
    deviceId: uuid("device_id").notNull(),
    realmId: uuid("realm_id").notNull(),
    streamIdentityDigest: digest("stream_identity_digest"),
    schemaVersion: text("schema_version").notNull(),
    lastSourceSequence: bigint("last_source_sequence", { mode: "number" }),
    lastMonotonicSequence: bigint("last_monotonic_sequence", { mode: "number" })
      .default(0)
      .notNull(),
    chainHead: text("chain_head"),
    closedAt: timestamp("closed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("event_streams_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("event_streams_identity_uq").on(table.workspaceId, table.streamIdentityDigest),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "event_streams_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.providerSessionId],
      foreignColumns: [providerSessions.workspaceId, providerSessions.id],
      name: "event_streams_session_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.deviceId],
      foreignColumns: [devices.workspaceId, devices.id],
      name: "event_streams_device_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.realmId],
      foreignColumns: [realms.workspaceId, realms.id],
      name: "event_streams_realm_fk"
    }).onDelete("restrict")
  ]
);

export const ingestBatches = pgTable(
  "ingest_batches",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    deviceId: uuid("device_id").notNull(),
    eventStreamId: uuid("event_stream_id").notNull(),
    batchId: text("batch_id").notNull(),
    logicalDigest: digest("logical_digest"),
    objectMetadataId: uuid("object_metadata_id").notNull(),
    objectKey: text("object_key").notNull(),
    objectVersionId: text("object_version_id").notNull(),
    firstSequence: bigint("first_sequence", { mode: "number" }).notNull(),
    lastSequence: bigint("last_sequence", { mode: "number" }).notNull(),
    chainHead: digest("chain_head"),
    state: text("state").default("stored_not_enqueued").notNull(),
    enqueuedAt: timestamp("enqueued_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("ingest_batches_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("ingest_batches_identity_uq").on(table.workspaceId, table.batchId),
    uniqueIndex("ingest_batches_object_uq").on(table.workspaceId, table.objectMetadataId),
    uniqueIndex("ingest_batches_stream_sequence_uq").on(
      table.workspaceId,
      table.eventStreamId,
      table.firstSequence,
      table.lastSequence
    ),
    index("ingest_batches_project_created_idx").on(
      table.workspaceId,
      table.projectId,
      table.createdAt
    ),
    index("ingest_batches_delivery_idx").on(table.workspaceId, table.state, table.createdAt),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "ingest_batches_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.deviceId],
      foreignColumns: [devices.workspaceId, devices.id],
      name: "ingest_batches_device_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.eventStreamId],
      foreignColumns: [eventStreams.workspaceId, eventStreams.id],
      name: "ingest_batches_stream_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.objectMetadataId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "ingest_batches_object_fk"
    }).onDelete("restrict"),
    check(
      "ingest_batches_sequence_ck",
      sql`${table.firstSequence} > 0 and ${table.lastSequence} >= ${table.firstSequence}`
    ),
    check("ingest_batches_state_ck", sql`${table.state} in ('stored_not_enqueued', 'enqueued')`)
  ]
);

export const eventHeaders = pgTable(
  "event_headers",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    eventStreamId: uuid("event_stream_id").notNull(),
    eventId: text("event_id").notNull(),
    ingestBatchId: text("ingest_batch_id").notNull(),
    batchEventIndex: integer("batch_event_index").notNull(),
    sourceSequence: bigint("source_sequence", { mode: "number" }),
    monotonicSequence: bigint("monotonic_sequence", { mode: "number" }).notNull(),
    eventType: text("event_type").notNull(),
    actorKind: text("actor_kind").notNull(),
    actorConfidence: numeric("actor_confidence", { precision: 5, scale: 4 }).notNull(),
    payloadDigest: digest("payload_digest"),
    payloadObjectId: uuid("payload_object_id"),
    previousEventDigest: text("previous_event_digest"),
    eventDigest: digest("event_digest"),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("event_headers_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("event_headers_event_id_uq").on(table.workspaceId, table.eventId),
    uniqueIndex("event_headers_stream_source_seq_uq").on(
      table.workspaceId,
      table.eventStreamId,
      table.sourceSequence
    ),
    uniqueIndex("event_headers_stream_monotonic_uq").on(
      table.workspaceId,
      table.eventStreamId,
      table.monotonicSequence
    ),
    uniqueIndex("event_headers_batch_index_uq").on(
      table.workspaceId,
      table.ingestBatchId,
      table.batchEventIndex
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "event_headers_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.eventStreamId],
      foreignColumns: [eventStreams.workspaceId, eventStreams.id],
      name: "event_headers_stream_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.payloadObjectId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "event_headers_payload_object_fk"
    }).onDelete("restrict"),
    check("event_headers_batch_index_ck", sql`${table.batchEventIndex} >= 0`),
    check("event_headers_monotonic_ck", sql`${table.monotonicSequence} >= 0`),
    check(
      "event_headers_actor_kind_ck",
      sql`${table.actorKind} in ('agent', 'human', 'mixed', 'unknown', 'system')`
    ),
    check(
      "event_headers_actor_confidence_ck",
      sql`${table.actorConfidence} >= 0 and ${table.actorConfidence} <= 1`
    )
  ]
);

export const eventAnchors = pgTable(
  "event_anchors",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    eventStreamId: uuid("event_stream_id").notNull(),
    anchorSequence: bigint("anchor_sequence", { mode: "number" }).notNull(),
    eventDigest: digest("event_digest"),
    signatureDigest: digest("signature_digest"),
    credentialVersion: integer("credential_version").notNull(),
    anchoredAt: timestamp("anchored_at", { withTimezone: true }).notNull(),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("event_anchors_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("event_anchors_stream_seq_uq").on(
      table.workspaceId,
      table.eventStreamId,
      table.anchorSequence
    ),
    foreignKey({
      columns: [table.workspaceId, table.eventStreamId],
      foreignColumns: [eventStreams.workspaceId, eventStreams.id],
      name: "event_anchors_stream_fk"
    }).onDelete("cascade"),
    check("event_anchors_sequence_ck", sql`${table.anchorSequence} >= 0`)
  ]
);

export const checkpoints = pgTable(
  "checkpoints",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    repositoryId: uuid("repository_id").notNull(),
    providerSessionId: uuid("provider_session_id"),
    trigger: text("trigger").notNull(),
    sourceCommitSha: text("source_commit_sha").notNull(),
    workingTreeDigest: text("working_tree_digest"),
    state: text("state").default("capturing").notNull(),
    coverageDigest: digest("coverage_digest"),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("checkpoints_ws_id_uq").on(table.workspaceId, table.id),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "checkpoints_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.repositoryId],
      foreignColumns: [repositories.workspaceId, repositories.id],
      name: "checkpoints_repository_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.providerSessionId],
      foreignColumns: [providerSessions.workspaceId, providerSessions.id],
      name: "checkpoints_session_fk"
    }).onDelete("restrict"),
    check(
      "checkpoints_state_ck",
      sql`${table.state} in ('capturing', 'complete', 'partial', 'failed', 'superseded')`
    )
  ]
);

export const snapshots = pgTable(
  "snapshots",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    checkpointId: uuid("checkpoint_id").notNull(),
    realmId: uuid("realm_id").notNull(),
    environmentLayerId: uuid("environment_layer_id"),
    kind: text("kind").notNull(),
    contentDigest: digest("content_digest"),
    objectMetadataId: uuid("object_metadata_id"),
    stable: boolean("stable").notNull(),
    stabilizationAttempts: integer("stabilization_attempts").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("snapshots_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("snapshots_checkpoint_identity_uq").on(
      table.workspaceId,
      table.checkpointId,
      table.realmId,
      table.environmentLayerId,
      table.kind
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "snapshots_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.checkpointId],
      foreignColumns: [checkpoints.workspaceId, checkpoints.id],
      name: "snapshots_checkpoint_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.realmId],
      foreignColumns: [realms.workspaceId, realms.id],
      name: "snapshots_realm_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.environmentLayerId],
      foreignColumns: [environmentLayers.workspaceId, environmentLayers.id],
      name: "snapshots_layer_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.objectMetadataId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "snapshots_object_fk"
    }).onDelete("restrict"),
    check("snapshots_stabilization_ck", sql`${table.stabilizationAttempts} > 0`)
  ]
);

export const inventoryFacts = pgTable(
  "inventory_facts",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    snapshotId: uuid("snapshot_id").notNull(),
    realmId: uuid("realm_id").notNull(),
    environmentLayerId: uuid("environment_layer_id").notNull(),
    ecosystem: text("ecosystem").notNull(),
    packageName: text("package_name").notNull(),
    packageVersion: text("package_version"),
    packageIdentityDigest: digest("package_identity_digest"),
    evidenceDigest: digest("evidence_digest"),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("inventory_facts_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("inventory_facts_identity_uq").on(
      table.workspaceId,
      table.snapshotId,
      table.packageIdentityDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "inventory_facts_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.snapshotId],
      foreignColumns: [snapshots.workspaceId, snapshots.id],
      name: "inventory_facts_snapshot_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.realmId],
      foreignColumns: [realms.workspaceId, realms.id],
      name: "inventory_facts_realm_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.environmentLayerId],
      foreignColumns: [environmentLayers.workspaceId, environmentLayers.id],
      name: "inventory_facts_layer_fk"
    }).onDelete("restrict")
  ]
);

export const sourceInputs = pgTable(
  "source_inputs",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    repositoryId: uuid("repository_id").notNull(),
    checkpointId: uuid("checkpoint_id"),
    commitSha: text("commit_sha").notNull(),
    treeDigest: digest("tree_digest"),
    sourceInputDigest: digest("source_input_digest"),
    submoduleIdentityDigest: text("submodule_identity_digest"),
    lfsIdentityDigest: text("lfs_identity_digest"),
    supportGapDigest: text("support_gap_digest"),
    state: text("state").default("pending").notNull(),
    createdAt: createdAt(),
    finalizedAt: timestamp("finalized_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("source_inputs_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("source_inputs_digest_uq").on(table.workspaceId, table.sourceInputDigest),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "source_inputs_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.repositoryId],
      foreignColumns: [repositories.workspaceId, repositories.id],
      name: "source_inputs_repository_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.checkpointId],
      foreignColumns: [checkpoints.workspaceId, checkpoints.id],
      name: "source_inputs_checkpoint_fk"
    }).onDelete("restrict"),
    check(
      "source_inputs_state_ck",
      sql`${table.state} in ('pending', 'available', 'rejected', 'expired', 'deleted')`
    )
  ]
);

export const sourceBundles = pgTable(
  "source_bundles",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    sourceInputId: uuid("source_input_id").notNull(),
    objectMetadataId: uuid("object_metadata_id").notNull(),
    bundleDigest: digest("bundle_digest"),
    ignorePolicyVersion: text("ignore_policy_version").notNull(),
    secretScanVersion: text("secret_scan_version").notNull(),
    fileCount: integer("file_count").notNull(),
    uncompressedBytes: bigint("uncompressed_bytes", { mode: "number" }).notNull(),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("source_bundles_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("source_bundles_source_uq").on(table.workspaceId, table.sourceInputId),
    uniqueIndex("source_bundles_digest_uq").on(table.workspaceId, table.bundleDigest),
    foreignKey({
      columns: [table.workspaceId, table.sourceInputId],
      foreignColumns: [sourceInputs.workspaceId, sourceInputs.id],
      name: "source_bundles_source_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.objectMetadataId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "source_bundles_object_fk"
    }).onDelete("restrict"),
    check("source_bundles_file_count_ck", sql`${table.fileCount} >= 0`),
    check("source_bundles_bytes_ck", sql`${table.uncompressedBytes} >= 0`)
  ]
);

export const findings = pgTable(
  "findings",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    checkpointId: uuid("checkpoint_id").notNull(),
    ruleId: text("rule_id").notNull(),
    ruleVersion: text("rule_version").notNull(),
    kind: text("kind").notNull(),
    state: text("state").default("open").notNull(),
    supportLevel: text("support_level").notNull(),
    confidenceEvidence: numeric("confidence_evidence", { precision: 5, scale: 4 }).notNull(),
    confidenceAttribution: numeric("confidence_attribution", {
      precision: 5,
      scale: 4
    }).notNull(),
    confidenceCompleteness: numeric("confidence_completeness", {
      precision: 5,
      scale: 4
    }).notNull(),
    evidenceSetDigest: digest("evidence_set_digest"),
    gapSetDigest: digest("gap_set_digest"),
    supersededByFindingId: uuid("superseded_by_finding_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("findings_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("findings_checkpoint_rule_uq").on(
      table.workspaceId,
      table.checkpointId,
      table.ruleId,
      table.ruleVersion,
      table.evidenceSetDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "findings_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.checkpointId],
      foreignColumns: [checkpoints.workspaceId, checkpoints.id],
      name: "findings_checkpoint_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.supersededByFindingId],
      foreignColumns: [table.workspaceId, table.id],
      name: "findings_superseded_by_fk"
    }).onDelete("restrict"),
    check(
      "findings_state_ck",
      sql`${table.state} in ('open', 'needs_evidence', 'accepted', 'rejected', 'superseded')`
    ),
    check(
      "findings_support_ck",
      sql`${table.supportLevel} in ('full_native', 'observed_only', 'unsupported')`
    ),
    check(
      "findings_confidence_ck",
      sql`${table.confidenceEvidence} between 0 and 1 and ${table.confidenceAttribution} between 0 and 1 and ${table.confidenceCompleteness} between 0 and 1`
    )
  ]
);

export const findingEvidence = pgTable(
  "finding_evidence",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    findingId: uuid("finding_id").notNull(),
    eventHeaderId: uuid("event_header_id"),
    snapshotId: uuid("snapshot_id"),
    evidenceType: text("evidence_type").notNull(),
    evidenceDigest: digest("evidence_digest"),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("finding_evidence_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("finding_evidence_identity_uq").on(
      table.workspaceId,
      table.findingId,
      table.evidenceDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.findingId],
      foreignColumns: [findings.workspaceId, findings.id],
      name: "finding_evidence_finding_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.eventHeaderId],
      foreignColumns: [eventHeaders.workspaceId, eventHeaders.id],
      name: "finding_evidence_event_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.snapshotId],
      foreignColumns: [snapshots.workspaceId, snapshots.id],
      name: "finding_evidence_snapshot_fk"
    }).onDelete("restrict")
  ]
);

export const comments = pgTable(
  "comments",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    findingId: uuid("finding_id").notNull(),
    authorUserId: uuid("author_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    body: text("body").notNull(),
    bodyDigest: digest("body_digest"),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("comments_ws_id_uq").on(table.workspaceId, table.id),
    foreignKey({
      columns: [table.workspaceId, table.findingId],
      foreignColumns: [findings.workspaceId, findings.id],
      name: "comments_finding_fk"
    }).onDelete("cascade"),
    check("comments_body_ck", sql`length(${table.body}) between 1 and 10000`)
  ]
);

export const consentGrants = pgTable(
  "consent_grants",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    grantedByUserId: uuid("granted_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    consentClass: text("consent_class").notNull(),
    policyVersion: text("policy_version").notNull(),
    state: text("state").default("active").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("consent_grants_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("consent_grants_active_identity_uq").on(
      table.workspaceId,
      table.projectId,
      table.grantedByUserId,
      table.consentClass,
      table.policyVersion
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "consent_grants_project_fk"
    }).onDelete("cascade"),
    check("consent_grants_state_ck", sql`${table.state} in ('active', 'revoked', 'expired')`)
  ]
);

export const rawContentAccessGrants = pgTable(
  "raw_content_access_grants",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    consentGrantId: uuid("consent_grant_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    objectMetadataId: uuid("object_metadata_id").notNull(),
    purposeCode: text("purpose_code").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("raw_content_access_grants_ws_id_uq").on(table.workspaceId, table.id),
    foreignKey({
      columns: [table.workspaceId, table.consentGrantId],
      foreignColumns: [consentGrants.workspaceId, consentGrants.id],
      name: "raw_content_access_grants_consent_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.objectMetadataId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "raw_content_access_grants_object_fk"
    }).onDelete("restrict"),
    check("raw_content_access_grants_expiry_ck", sql`${table.expiresAt} > ${table.createdAt}`)
  ]
);

export const behaviorContracts = pgTable(
  "behavior_contracts",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    version: integer("version").notNull(),
    contractDigest: digest("contract_digest"),
    commandSetDigest: digest("command_set_digest"),
    schemaVersion: text("schema_version").notNull(),
    state: text("state").default("draft").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    acceptedByUserId: uuid("accepted_by_user_id").references(() => users.id, {
      onDelete: "restrict"
    }),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("behavior_contracts_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("behavior_contracts_project_version_uq").on(
      table.workspaceId,
      table.projectId,
      table.version
    ),
    uniqueIndex("behavior_contracts_project_digest_uq").on(
      table.workspaceId,
      table.projectId,
      table.contractDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "behavior_contracts_project_fk"
    }).onDelete("cascade"),
    check("behavior_contracts_version_ck", sql`${table.version} > 0`),
    check(
      "behavior_contracts_state_ck",
      sql`${table.state} in ('draft', 'accepted', 'superseded', 'retired')`
    )
  ]
);

export const policies = pgTable(
  "policies",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    version: integer("version").notNull(),
    policyDigest: digest("policy_digest"),
    schemaVersion: text("schema_version").notNull(),
    hardConstraintsDigest: digest("hard_constraints_digest"),
    objectivesDigest: digest("objectives_digest"),
    state: text("state").default("draft").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("policies_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("policies_scope_version_uq").on(table.workspaceId, table.projectId, table.version),
    uniqueIndex("policies_scope_digest_uq").on(
      table.workspaceId,
      table.projectId,
      table.policyDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "policies_project_fk"
    }).onDelete("cascade"),
    check("policies_version_ck", sql`${table.version} > 0`),
    check("policies_state_ck", sql`${table.state} in ('draft', 'active', 'superseded', 'retired')`)
  ]
);

export const validationTargets = pgTable(
  "validation_targets",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    targetDigest: digest("target_digest"),
    operatingSystem: text("operating_system").notNull(),
    architecture: text("architecture").notNull(),
    imageReference: text("image_reference").notNull(),
    imageDigest: digest("image_digest"),
    required: boolean("required").default(true).notNull(),
    policyId: uuid("policy_id").notNull(),
    state: text("state").default("active").notNull(),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("validation_targets_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("validation_targets_project_digest_uq").on(
      table.workspaceId,
      table.projectId,
      table.targetDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "validation_targets_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.policyId],
      foreignColumns: [policies.workspaceId, policies.id],
      name: "validation_targets_policy_fk"
    }).onDelete("restrict"),
    check("validation_targets_state_ck", sql`${table.state} in ('active', 'superseded', 'retired')`)
  ]
);

export const candidates = pgTable(
  "candidates",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    findingId: uuid("finding_id").notNull(),
    sourceInputId: uuid("source_input_id").notNull(),
    policyId: uuid("policy_id").notNull(),
    behaviorContractId: uuid("behavior_contract_id").notNull(),
    candidateDigest: digest("candidate_digest"),
    patchObjectMetadataId: uuid("patch_object_metadata_id"),
    state: text("state").default("draft").notNull(),
    stateVersion: integer("state_version").default(0).notNull(),
    lastTransitionKey: text("last_transition_key"),
    generatedBy: text("generated_by").notNull(),
    generatorVersion: text("generator_version").notNull(),
    staleAt: timestamp("stale_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("candidates_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("candidates_project_digest_uq").on(
      table.workspaceId,
      table.projectId,
      table.candidateDigest
    ),
    uniqueIndex("candidates_transition_key_uq").on(table.workspaceId, table.lastTransitionKey),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "candidates_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.findingId],
      foreignColumns: [findings.workspaceId, findings.id],
      name: "candidates_finding_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.sourceInputId],
      foreignColumns: [sourceInputs.workspaceId, sourceInputs.id],
      name: "candidates_source_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.policyId],
      foreignColumns: [policies.workspaceId, policies.id],
      name: "candidates_policy_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.behaviorContractId],
      foreignColumns: [behaviorContracts.workspaceId, behaviorContracts.id],
      name: "candidates_contract_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.patchObjectMetadataId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "candidates_patch_object_fk"
    }).onDelete("restrict"),
    check(
      "candidates_state_ck",
      sql`${table.state} in ('draft', 'static_rejected', 'ready_for_validation', 'validating', 'validation_failed', 'inconclusive', 'verified', 'stale', 'approved', 'applied')`
    ),
    check("candidates_state_version_ck", sql`${table.stateVersion} >= 0`)
  ]
);

export const candidateOperations = pgTable(
  "candidate_operations",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    candidateId: uuid("candidate_id").notNull(),
    findingEvidenceId: uuid("finding_evidence_id").notNull(),
    ordinal: integer("ordinal").notNull(),
    adapterId: text("adapter_id").notNull(),
    adapterVersion: text("adapter_version").notNull(),
    operationKind: text("operation_kind").notNull(),
    operationDigest: digest("operation_digest"),
    nativeManager: text("native_manager").notNull(),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("candidate_operations_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("candidate_operations_ordinal_uq").on(
      table.workspaceId,
      table.candidateId,
      table.ordinal
    ),
    uniqueIndex("candidate_operations_digest_uq").on(
      table.workspaceId,
      table.candidateId,
      table.operationDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.candidateId],
      foreignColumns: [candidates.workspaceId, candidates.id],
      name: "candidate_operations_candidate_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.findingEvidenceId],
      foreignColumns: [findingEvidence.workspaceId, findingEvidence.id],
      name: "candidate_operations_evidence_fk"
    }).onDelete("restrict"),
    check("candidate_operations_ordinal_ck", sql`${table.ordinal} >= 0`)
  ]
);

export const validationBatches = pgTable(
  "validation_batches",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    candidateId: uuid("candidate_id").notNull(),
    sourceInputId: uuid("source_input_id").notNull(),
    policyId: uuid("policy_id").notNull(),
    behaviorContractId: uuid("behavior_contract_id").notNull(),
    workflowIdempotencyKey: text("workflow_idempotency_key").notNull(),
    targetSetDigest: digest("target_set_digest"),
    state: text("state").default("queued").notNull(),
    createdAt: createdAt(),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("validation_batches_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("validation_batches_workflow_key_uq").on(
      table.workspaceId,
      table.workflowIdempotencyKey
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "validation_batches_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.candidateId],
      foreignColumns: [candidates.workspaceId, candidates.id],
      name: "validation_batches_candidate_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.sourceInputId],
      foreignColumns: [sourceInputs.workspaceId, sourceInputs.id],
      name: "validation_batches_source_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.policyId],
      foreignColumns: [policies.workspaceId, policies.id],
      name: "validation_batches_policy_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.behaviorContractId],
      foreignColumns: [behaviorContracts.workspaceId, behaviorContracts.id],
      name: "validation_batches_contract_fk"
    }).onDelete("restrict"),
    check(
      "validation_batches_state_ck",
      sql`${table.state} in ('queued', 'running', 'complete', 'failed', 'cancelled')`
    )
  ]
);

export const validationJobs = pgTable(
  "validation_jobs",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    validationBatchId: uuid("validation_batch_id").notNull(),
    candidateId: uuid("candidate_id").notNull(),
    validationTargetId: uuid("validation_target_id").notNull(),
    sourceInputId: uuid("source_input_id").notNull(),
    immutableInputDigest: digest("immutable_input_digest"),
    dedupDigest: digest("dedup_digest"),
    state: text("state").default("queued").notNull(),
    stateVersion: integer("state_version").default(0).notNull(),
    lastTransitionKey: text("last_transition_key"),
    terminalOutcome: text("terminal_outcome"),
    sandboxId: text("sandbox_id"),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    completedAt: timestamp("completed_at", { withTimezone: true })
  },
  (table) => [
    uniqueIndex("validation_jobs_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("validation_jobs_candidate_target_uq").on(
      table.workspaceId,
      table.candidateId,
      table.validationTargetId,
      table.immutableInputDigest
    ),
    uniqueIndex("validation_jobs_dedup_uq").on(table.workspaceId, table.dedupDigest),
    uniqueIndex("validation_jobs_transition_key_uq").on(table.workspaceId, table.lastTransitionKey),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "validation_jobs_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.validationBatchId],
      foreignColumns: [validationBatches.workspaceId, validationBatches.id],
      name: "validation_jobs_batch_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.candidateId],
      foreignColumns: [candidates.workspaceId, candidates.id],
      name: "validation_jobs_candidate_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.validationTargetId],
      foreignColumns: [validationTargets.workspaceId, validationTargets.id],
      name: "validation_jobs_target_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.sourceInputId],
      foreignColumns: [sourceInputs.workspaceId, sourceInputs.id],
      name: "validation_jobs_source_fk"
    }).onDelete("restrict"),
    check(
      "validation_jobs_state_ck",
      sql`${table.state} in ('queued', 'provisioning', 'preflight', 'source_prepare', 'resolve', 'install', 'build', 'test', 'smoke', 'benchmark', 'evidence_persist', 'cleanup', 'terminal')`
    ),
    check(
      "validation_jobs_outcome_ck",
      sql`${table.terminalOutcome} is null or ${table.terminalOutcome} in ('passed', 'failed', 'inconclusive', 'infrastructure', 'unsupported', 'timed_out', 'security_blocked', 'cancelled')`
    ),
    check("validation_jobs_state_version_ck", sql`${table.stateVersion} >= 0`)
  ]
);

export const validationPhases = pgTable(
  "validation_phases",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    validationJobId: uuid("validation_job_id").notNull(),
    phase: text("phase").notNull(),
    attempt: integer("attempt").notNull(),
    outcome: text("outcome").notNull(),
    inputDigest: digest("input_digest"),
    outputDigest: digest("output_digest"),
    diagnosticObjectMetadataId: uuid("diagnostic_object_metadata_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("validation_phases_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("validation_phases_job_phase_attempt_uq").on(
      table.workspaceId,
      table.validationJobId,
      table.phase,
      table.attempt
    ),
    foreignKey({
      columns: [table.workspaceId, table.validationJobId],
      foreignColumns: [validationJobs.workspaceId, validationJobs.id],
      name: "validation_phases_job_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.diagnosticObjectMetadataId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "validation_phases_diagnostic_fk"
    }).onDelete("restrict"),
    check("validation_phases_attempt_ck", sql`${table.attempt} > 0`),
    check(
      "validation_phases_outcome_ck",
      sql`${table.outcome} in ('running', 'passed', 'failed', 'inconclusive', 'skipped', 'timed_out', 'infrastructure', 'unsupported', 'security_blocked')`
    )
  ]
);

export const validationCacheEntries = pgTable(
  "validation_cache_entries",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    cacheKeyDigest: digest("cache_key_digest"),
    attestationId: uuid("attestation_id"),
    state: text("state").default("available").notNull(),
    hitCount: integer("hit_count").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("validation_cache_entries_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("validation_cache_entries_key_uq").on(table.workspaceId, table.cacheKeyDigest),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "validation_cache_entries_project_fk"
    }).onDelete("cascade"),
    check(
      "validation_cache_entries_state_ck",
      sql`${table.state} in ('available', 'invalidated', 'expired')`
    ),
    check("validation_cache_entries_hit_count_ck", sql`${table.hitCount} >= 0`)
  ]
);

export const jobDedupKeys = pgTable(
  "job_dedup_keys",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    validationJobId: uuid("validation_job_id").notNull(),
    dedupKey: text("dedup_key").notNull(),
    requestDigest: digest("request_digest"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("job_dedup_keys_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("job_dedup_keys_key_uq").on(table.workspaceId, table.dedupKey),
    foreignKey({
      columns: [table.workspaceId, table.validationJobId],
      foreignColumns: [validationJobs.workspaceId, validationJobs.id],
      name: "job_dedup_keys_job_fk"
    }).onDelete("cascade")
  ]
);

export const concurrencyLeases = pgTable(
  "concurrency_leases",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    leaseKey: text("lease_key").notNull(),
    holderId: text("holder_id").notNull(),
    resourceClass: text("resource_class").notNull(),
    state: text("state").default("active").notNull(),
    acquiredAt: timestamp("acquired_at", { withTimezone: true }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    releasedAt: timestamp("released_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("concurrency_leases_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("concurrency_leases_key_uq").on(table.workspaceId, table.leaseKey),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "concurrency_leases_project_fk"
    }).onDelete("cascade"),
    check("concurrency_leases_state_ck", sql`${table.state} in ('active', 'released', 'expired')`),
    check("concurrency_leases_expiry_ck", sql`${table.expiresAt} > ${table.acquiredAt}`)
  ]
);

export const attestations = pgTable(
  "attestations",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    validationJobId: uuid("validation_job_id").notNull(),
    attestationDigest: digest("attestation_digest"),
    objectMetadataId: uuid("object_metadata_id").notNull(),
    sourceInputDigest: digest("source_input_digest"),
    candidateDigest: digest("candidate_digest"),
    targetDigest: digest("target_digest"),
    policyDigest: digest("policy_digest"),
    behaviorContractDigest: digest("behavior_contract_digest"),
    outcome: text("outcome").notNull(),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("attestations_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("attestations_digest_uq").on(table.workspaceId, table.attestationDigest),
    uniqueIndex("attestations_job_uq").on(table.workspaceId, table.validationJobId),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "attestations_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.validationJobId],
      foreignColumns: [validationJobs.workspaceId, validationJobs.id],
      name: "attestations_job_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.objectMetadataId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "attestations_object_fk"
    }).onDelete("restrict"),
    check(
      "attestations_outcome_ck",
      sql`${table.outcome} in ('passed', 'failed', 'inconclusive', 'infrastructure', 'unsupported', 'timed_out', 'security_blocked')`
    )
  ]
);

export const recommendations = pgTable(
  "recommendations",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    candidateId: uuid("candidate_id").notNull(),
    attestationSetDigest: digest("attestation_set_digest"),
    state: text("state").default("draft").notNull(),
    stateVersion: integer("state_version").default(0).notNull(),
    lastTransitionKey: text("last_transition_key"),
    sourceInputDigest: digest("source_input_digest"),
    policyDigest: digest("policy_digest"),
    behaviorContractDigest: digest("behavior_contract_digest"),
    targetSetDigest: digest("target_set_digest"),
    invalidatedAt: timestamp("invalidated_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("recommendations_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("recommendations_candidate_uq").on(table.workspaceId, table.candidateId),
    uniqueIndex("recommendations_transition_key_uq").on(table.workspaceId, table.lastTransitionKey),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "recommendations_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.candidateId],
      foreignColumns: [candidates.workspaceId, candidates.id],
      name: "recommendations_candidate_fk"
    }).onDelete("restrict"),
    check(
      "recommendations_state_ck",
      sql`${table.state} in ('draft', 'reviewable', 'approved', 'applied', 'invalidated', 'rejected', 'superseded')`
    ),
    check("recommendations_state_version_ck", sql`${table.stateVersion} >= 0`)
  ]
);

export const approvals = pgTable(
  "approvals",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    recommendationId: uuid("recommendation_id").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    decision: text("decision").notNull(),
    approvalPolicyVersion: text("approval_policy_version").notNull(),
    objectDigest: digest("object_digest"),
    reasonCode: text("reason_code"),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("approvals_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("approvals_recommendation_user_uq").on(
      table.workspaceId,
      table.recommendationId,
      table.userId
    ),
    foreignKey({
      columns: [table.workspaceId, table.recommendationId],
      foreignColumns: [recommendations.workspaceId, recommendations.id],
      name: "approvals_recommendation_fk"
    }).onDelete("cascade"),
    check("approvals_decision_ck", sql`${table.decision} in ('approved', 'rejected')`)
  ]
);

export const secretReferences = pgTable(
  "secret_references",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").notNull(),
    referenceName: text("reference_name").notNull(),
    provider: text("provider").notNull(),
    providerReferenceDigest: digest("provider_reference_digest"),
    secretKind: text("secret_kind").notNull(),
    versionDigest: digest("version_digest"),
    allowedHostDigests: jsonb("allowed_host_digests").$type<readonly string[]>().notNull(),
    allowedTargetDigest: text("allowed_target_digest"),
    state: text("state").default("active").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("secret_references_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("secret_references_name_uq").on(
      table.workspaceId,
      table.projectId,
      table.referenceName
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "secret_references_project_fk"
    }).onDelete("cascade"),
    check(
      "secret_references_state_ck",
      sql`${table.state} in ('active', 'rotated', 'revoked', 'expired')`
    )
  ]
);

export const externalOperations = pgTable(
  "external_operations",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    operationKey: text("operation_key").notNull(),
    provider: text("provider").notNull(),
    operationKind: text("operation_kind").notNull(),
    requestFingerprint: digest("request_fingerprint"),
    state: text("state").default("reserved").notNull(),
    providerResourceId: text("provider_resource_id"),
    providerRequestId: text("provider_request_id"),
    acceptedResultDigest: text("accepted_result_digest"),
    attemptCount: integer("attempt_count").default(0).notNull(),
    costMicros: bigint("cost_micros", { mode: "number" }).default(0).notNull(),
    reconciliationState: text("reconciliation_state").default("not_started").notNull(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("external_operations_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("external_operations_key_uq").on(table.workspaceId, table.operationKey),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "external_operations_project_fk"
    }).onDelete("cascade"),
    check(
      "external_operations_provider_ck",
      sql`${table.provider} in ('fireworks', 'daytona', 'braintrust', 'github', 'r2', 'queue')`
    ),
    check(
      "external_operations_state_ck",
      sql`${table.state} in ('reserved', 'in_progress', 'succeeded', 'failed', 'reconciling', 'cancelled')`
    ),
    check(
      "external_operations_reconciliation_ck",
      sql`${table.reconciliationState} in ('not_started', 'not_supported', 'pending', 'matched', 'not_found', 'conflict', 'complete')`
    ),
    check("external_operations_attempt_count_ck", sql`${table.attemptCount} >= 0`),
    check("external_operations_cost_ck", sql`${table.costMicros} >= 0`)
  ]
);

export const braintrustTraceOutbox = pgTable(
  "braintrust_trace_outbox",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    traceId: text("trace_id").notNull(),
    payloadObjectMetadataId: uuid("payload_object_metadata_id").notNull(),
    payloadDigest: digest("payload_digest"),
    state: text("state").default("pending").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull(),
    exportedAt: timestamp("exported_at", { withTimezone: true }),
    failureClass: text("failure_class"),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("braintrust_trace_outbox_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("braintrust_trace_outbox_trace_uq").on(table.workspaceId, table.traceId),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "braintrust_trace_outbox_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.payloadObjectMetadataId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "braintrust_trace_outbox_object_fk"
    }).onDelete("restrict"),
    check(
      "braintrust_trace_outbox_state_ck",
      sql`${table.state} in ('pending', 'exporting', 'exported', 'failed', 'abandoned')`
    ),
    check("braintrust_trace_outbox_attempt_ck", sql`${table.attemptCount} >= 0`)
  ]
);

export const modelPromptVersions = pgTable(
  "model_prompt_versions",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    templateId: text("template_id").notNull(),
    version: integer("version").notNull(),
    promptDigest: digest("prompt_digest"),
    responseSchemaDigest: digest("response_schema_digest"),
    modelId: text("model_id").notNull(),
    state: text("state").default("active").notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "restrict"
    }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("model_prompt_versions_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("model_prompt_versions_identity_uq").on(
      table.workspaceId,
      table.projectId,
      table.templateId,
      table.version
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "model_prompt_versions_project_fk"
    }).onDelete("cascade"),
    check("model_prompt_versions_version_ck", sql`${table.version} > 0`),
    check(
      "model_prompt_versions_state_ck",
      sql`${table.state} in ('active', 'superseded', 'retired')`
    )
  ]
);

export const evaluationRuns = pgTable(
  "evaluation_runs",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    projectId: uuid("project_id"),
    modelPromptVersionId: uuid("model_prompt_version_id").notNull(),
    evaluationSuiteId: text("evaluation_suite_id").notNull(),
    evaluationSuiteVersion: text("evaluation_suite_version").notNull(),
    runDigest: digest("run_digest"),
    state: text("state").default("running").notNull(),
    caseCount: integer("case_count").default(0).notNull(),
    passedCount: integer("passed_count").default(0).notNull(),
    failedCount: integer("failed_count").default(0).notNull(),
    resultObjectMetadataId: uuid("result_object_metadata_id"),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("evaluation_runs_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("evaluation_runs_digest_uq").on(table.workspaceId, table.runDigest),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "evaluation_runs_project_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.modelPromptVersionId],
      foreignColumns: [modelPromptVersions.workspaceId, modelPromptVersions.id],
      name: "evaluation_runs_prompt_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.resultObjectMetadataId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "evaluation_runs_object_fk"
    }).onDelete("restrict"),
    check(
      "evaluation_runs_state_ck",
      sql`${table.state} in ('running', 'passed', 'failed', 'cancelled')`
    ),
    check(
      "evaluation_runs_counts_ck",
      sql`${table.caseCount} >= 0 and ${table.passedCount} >= 0 and ${table.failedCount} >= 0 and ${table.passedCount} + ${table.failedCount} <= ${table.caseCount}`
    )
  ]
);

export const cleanupLeases = pgTable(
  "cleanup_leases",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    validationJobId: uuid("validation_job_id").notNull(),
    externalOperationId: uuid("external_operation_id"),
    sandboxId: text("sandbox_id").notNull(),
    leaseKey: text("lease_key").notNull(),
    holderId: text("holder_id").notNull(),
    state: text("state").default("active").notNull(),
    attemptCount: integer("attempt_count").default(0).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    confirmedDeletedAt: timestamp("confirmed_deleted_at", { withTimezone: true }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("cleanup_leases_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("cleanup_leases_key_uq").on(table.workspaceId, table.leaseKey),
    uniqueIndex("cleanup_leases_sandbox_uq").on(table.workspaceId, table.sandboxId),
    foreignKey({
      columns: [table.workspaceId, table.validationJobId],
      foreignColumns: [validationJobs.workspaceId, validationJobs.id],
      name: "cleanup_leases_job_fk"
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.workspaceId, table.externalOperationId],
      foreignColumns: [externalOperations.workspaceId, externalOperations.id],
      name: "cleanup_leases_operation_fk"
    }).onDelete("restrict"),
    check(
      "cleanup_leases_state_ck",
      sql`${table.state} in ('active', 'released', 'confirmed_deleted', 'expired', 'failed', 'escalated')`
    ),
    check("cleanup_leases_attempt_ck", sql`${table.attemptCount} >= 0`)
  ]
);

export const retentionPolicies = pgTable(
  "retention_policies",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    retentionClass: text("retention_class").notNull(),
    version: integer("version").notNull(),
    durationSeconds: bigint("duration_seconds", { mode: "number" }).notNull(),
    objectType: text("object_type").notNull(),
    state: text("state").default("active").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    activatedAt: timestamp("activated_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("retention_policies_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("retention_policies_class_version_uq").on(
      table.workspaceId,
      table.retentionClass,
      table.version
    ),
    check("retention_policies_version_ck", sql`${table.version} > 0`),
    check("retention_policies_duration_ck", sql`${table.durationSeconds} > 0`),
    check(
      "retention_policies_state_ck",
      sql`${table.state} in ('draft', 'active', 'superseded', 'retired')`
    )
  ]
);

export const exportJobs = pgTable(
  "export_jobs",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    scopeDigest: digest("scope_digest"),
    state: text("state").default("queued").notNull(),
    outputObjectMetadataId: uuid("output_object_metadata_id"),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("export_jobs_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("export_jobs_idempotency_uq").on(table.workspaceId, table.idempotencyKey),
    foreignKey({
      columns: [table.workspaceId, table.outputObjectMetadataId],
      foreignColumns: [objectMetadata.workspaceId, objectMetadata.id],
      name: "export_jobs_object_fk"
    }).onDelete("restrict"),
    check(
      "export_jobs_state_ck",
      sql`${table.state} in ('queued', 'running', 'complete', 'failed', 'expired', 'cancelled')`
    )
  ]
);

export const deletionJobs = pgTable(
  "deletion_jobs",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    requestedByUserId: uuid("requested_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    idempotencyKey: text("idempotency_key").notNull(),
    scopeType: text("scope_type").notNull(),
    scopeId: text("scope_id").notNull(),
    scopeDigest: digest("scope_digest"),
    state: text("state").default("queued").notNull(),
    deletedObjectCount: integer("deleted_object_count").default(0).notNull(),
    failureDigest: text("failure_digest"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt()
  },
  (table) => [
    uniqueIndex("deletion_jobs_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("deletion_jobs_idempotency_uq").on(table.workspaceId, table.idempotencyKey),
    check(
      "deletion_jobs_state_ck",
      sql`${table.state} in ('queued', 'running', 'complete', 'partial', 'failed', 'cancelled')`
    ),
    check("deletion_jobs_count_ck", sql`${table.deletedObjectCount} >= 0`)
  ]
);

export const deletionTombstones = pgTable(
  "deletion_tombstones",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    deletionJobId: uuid("deletion_job_id").notNull(),
    objectType: text("object_type").notNull(),
    objectIdDigest: digest("object_id_digest"),
    priorContentDigest: text("prior_content_digest"),
    reasonCode: text("reason_code").notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }).notNull(),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("deletion_tombstones_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("deletion_tombstones_object_uq").on(
      table.workspaceId,
      table.objectType,
      table.objectIdDigest
    ),
    foreignKey({
      columns: [table.workspaceId, table.deletionJobId],
      foreignColumns: [deletionJobs.workspaceId, deletionJobs.id],
      name: "deletion_tombstones_job_fk"
    }).onDelete("restrict")
  ]
);

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    githubInstallationId: uuid("github_installation_id").notNull(),
    provider: text("provider").default("github").notNull(),
    deliveryId: text("delivery_id").notNull(),
    eventType: text("event_type").notNull(),
    payloadDigest: digest("payload_digest"),
    state: text("state").default("received").notNull(),
    receivedAt: timestamp("received_at", { withTimezone: true }).defaultNow().notNull(),
    processedAt: timestamp("processed_at", { withTimezone: true }),
    createdAt: createdAt()
  },
  (table) => [
    uniqueIndex("webhook_deliveries_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("webhook_deliveries_provider_delivery_uq").on(table.provider, table.deliveryId),
    foreignKey({
      columns: [table.workspaceId, table.githubInstallationId],
      foreignColumns: [githubInstallations.workspaceId, githubInstallations.id],
      name: "webhook_deliveries_installation_fk"
    }).onDelete("cascade"),
    check(
      "webhook_deliveries_state_ck",
      sql`${table.state} in ('received', 'processing', 'processed', 'ignored', 'failed')`
    )
  ]
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: requiredId(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "restrict" }),
    projectId: uuid("project_id"),
    actorType: text("actor_type").notNull(),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "restrict" }),
    actorDeviceId: uuid("actor_device_id"),
    actorPseudonymDigest: text("actor_pseudonym_digest"),
    category: text("category").notNull(),
    action: text("action").notNull(),
    objectType: text("object_type").notNull(),
    objectId: text("object_id").notNull(),
    objectDigest: digest("object_digest"),
    outcome: text("outcome").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).defaultNow().notNull(),
    metadataDigest: digest("metadata_digest")
  },
  (table) => [
    uniqueIndex("audit_log_ws_id_uq").on(table.workspaceId, table.id),
    uniqueIndex("audit_log_idempotency_uq").on(table.workspaceId, table.idempotencyKey),
    index("audit_log_object_idx").on(
      table.workspaceId,
      table.objectType,
      table.objectId,
      table.occurredAt
    ),
    foreignKey({
      columns: [table.workspaceId, table.projectId],
      foreignColumns: [projects.workspaceId, projects.id],
      name: "audit_log_project_fk"
    }).onDelete("restrict"),
    foreignKey({
      columns: [table.workspaceId, table.actorDeviceId],
      foreignColumns: [devices.workspaceId, devices.id],
      name: "audit_log_device_fk"
    }).onDelete("restrict"),
    check(
      "audit_log_actor_type_ck",
      sql`${table.actorType} in ('user', 'device', 'system', 'provider')`
    ),
    check(
      "audit_log_actor_binding_ck",
      sql`(${table.actorType} = 'user' and ${table.actorUserId} is not null) or (${table.actorType} = 'device' and ${table.actorDeviceId} is not null) or (${table.actorType} in ('system', 'provider') and ${table.actorPseudonymDigest} is not null)`
    ),
    check(
      "audit_log_category_ck",
      sql`${table.category} in ('authentication', 'installation', 'policy', 'behavior_contract', 'approval', 'collaboration', 'membership', 'device', 'integration', 'privacy', 'external_side_effect', 'github_write', 'retention', 'export', 'deletion', 'cleanup')`
    ),
    check("audit_log_outcome_ck", sql`${table.outcome} in ('succeeded', 'failed', 'denied')`)
  ]
);
