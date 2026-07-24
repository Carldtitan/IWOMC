import type { DeviceStatusResult } from "../../api/ingestion/types.js";
import type {
  CommitStoredBatchResult,
  DeviceAuthenticationPort,
  IngestMetadataPort,
  ProjectAuthorizationPort
} from "../../domain/ingestion/ports.js";
import type {
  DeviceBatchPrincipal,
  StoredBatchRecord,
  StreamChainState
} from "../../domain/ingestion/types.js";
import { constantTimeEqual, sha256Base64Url } from "../../security/crypto.js";

const credentialPrefix = "er_device_v1";
const sha256Pattern = /^sha256:[0-9a-f]{64}$/u;
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export interface PostgresQueryResult<Row> {
  readonly rowCount: number | null;
  readonly rows: readonly Row[];
}

/**
 * Narrow connection surface used by the driver. Keeping this boundary small
 * makes transaction behavior testable without a live database.
 */
export interface PostgresConnection {
  close(): Promise<void>;
  query<Row>(text: string, values?: readonly unknown[]): Promise<PostgresQueryResult<Row>>;
}

export interface PostgresConnectionFactory {
  connect(): Promise<PostgresConnection>;
}

export interface HyperdrivePostgresIngestionOptions {
  readonly authorizationClass?: string;
  readonly encryptionKeyVersion?: string;
  readonly retentionClass?: string;
}

/**
 * Durable ingestion metadata driver for a Cloudflare Hyperdrive PostgreSQL
 * binding. R2 is written before this driver is called; this driver atomically
 * records that immutable object, advances the stream chain, and reserves the
 * batch idempotency key.
 */
export class HyperdrivePostgresIngestionDriver
  implements DeviceAuthenticationPort, IngestMetadataPort, ProjectAuthorizationPort
{
  readonly #authorizationClass: string;
  readonly #connections: PostgresConnectionFactory;
  readonly #encryptionKeyVersion: string;
  readonly #retentionClass: string;

  constructor(
    connections: PostgresConnectionFactory,
    options: HyperdrivePostgresIngestionOptions = {}
  ) {
    this.#connections = connections;
    this.#authorizationClass = nonEmptyOption(
      options.authorizationClass,
      "device-ingestion",
      "authorizationClass"
    );
    this.#encryptionKeyVersion = nonEmptyOption(
      options.encryptionKeyVersion,
      "data-encryption-key-v1",
      "encryptionKeyVersion"
    );
    this.#retentionClass = nonEmptyOption(options.retentionClass, "mvp-default", "retentionClass");
  }

  async authenticate(credential: string, nowEpochSeconds: number): Promise<DeviceBatchPrincipal> {
    assertEpochSeconds(nowEpochSeconds);
    return this.#withConnection((connection) =>
      this.#authenticateWithConnection(connection, credential, nowEpochSeconds)
    );
  }

  async authorizeDevice(input: {
    readonly deviceId: string;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<boolean> {
    assertUuid(input.deviceId, "deviceId");
    assertUuid(input.projectId, "projectId");
    assertUuid(input.workspaceId, "workspaceId");
    return this.#withConnection(async (connection) => {
      const result = await connection.query<{ readonly allowed: unknown }>(
        `SELECT EXISTS (
           SELECT 1
           FROM projects AS p
           JOIN devices AS d
             ON d.workspace_id = p.workspace_id
            AND d.id = $3
           WHERE p.workspace_id = $1
             AND p.id = $2
             AND p.status = 'active'
             AND d.revoked_at IS NULL
             AND d.state IN ('paired', 'online', 'offline')
         ) AS allowed`,
        [input.workspaceId, input.projectId, input.deviceId]
      );
      return requireBoolean(requireSingleRow(result, "project authorization").allowed, "allowed");
    });
  }

  async findBatch(input: {
    readonly batchId: string;
    readonly deviceId: string;
    readonly projectId: string;
    readonly workspaceId: string;
  }): Promise<StoredBatchRecord | undefined> {
    assertNonEmpty(input.batchId, "batchId");
    assertUuid(input.deviceId, "deviceId");
    assertUuid(input.projectId, "projectId");
    assertUuid(input.workspaceId, "workspaceId");
    return this.#withConnection((connection) => this.#findScopedBatch(connection, input));
  }

  async loadStreamState(input: {
    readonly deviceId: string;
    readonly projectId: string;
    readonly streamId: string;
    readonly workspaceId: string;
  }): Promise<StreamChainState | undefined> {
    assertUuid(input.deviceId, "deviceId");
    assertUuid(input.projectId, "projectId");
    assertUuid(input.streamId, "streamId");
    assertUuid(input.workspaceId, "workspaceId");
    return this.#withConnection(async (connection) => {
      const result = await connection.query<StreamRow>(
        `SELECT last_monotonic_sequence, chain_head
         FROM event_streams
         WHERE workspace_id = $1
           AND project_id = $2
           AND device_id = $3
           AND id = $4
         LIMIT 1`,
        [input.workspaceId, input.projectId, input.deviceId, input.streamId]
      );
      const row = result.rows[0];
      return row === undefined ? undefined : streamStateFromRow(row);
    });
  }

  async commitStoredBatch(input: {
    readonly expectedStreamState: StreamChainState | undefined;
    readonly record: StoredBatchRecord;
  }): Promise<CommitStoredBatchResult> {
    assertStoredBatchRecord(input.record);
    if (input.expectedStreamState !== undefined) {
      assertStreamState(input.expectedStreamState);
    }

    const connection = await this.#connections.connect();
    let transactionOpen = false;
    try {
      await connection.query("BEGIN");
      transactionOpen = true;

      const streamResult = await connection.query<StreamRow>(
        `SELECT last_monotonic_sequence, chain_head
         FROM event_streams
         WHERE workspace_id = $1
           AND project_id = $2
           AND device_id = $3
           AND id = $4
           AND closed_at IS NULL
         FOR UPDATE`,
        [
          input.record.workspaceId,
          input.record.projectId,
          input.record.deviceId,
          input.record.streamId
        ]
      );
      const lockedStream = streamResult.rows[0];
      if (lockedStream === undefined) {
        await connection.query("ROLLBACK");
        transactionOpen = false;
        return { kind: "out_of_order" };
      }

      const existing = await this.#findWorkspaceBatch(
        connection,
        input.record.workspaceId,
        input.record.batchId
      );
      if (existing !== undefined) {
        await connection.query("COMMIT");
        transactionOpen = false;
        return classifyExistingBatch(existing, input.record);
      }

      if (
        !streamMatchesExpected(lockedStream, input.expectedStreamState) ||
        input.record.firstSequence !==
          requireSafeInteger(lockedStream.last_monotonic_sequence, "last_monotonic_sequence") + 1
      ) {
        await connection.query("ROLLBACK");
        transactionOpen = false;
        return { kind: "out_of_order" };
      }

      const objectMetadataId = crypto.randomUUID();
      await connection.query(
        `INSERT INTO object_metadata (
           id,
           workspace_id,
           object_key,
           object_version_id,
           object_type,
           schema_version,
           ciphertext_digest,
           plaintext_digest,
           ciphertext_bytes,
           compression,
           encryption_algorithm,
           encryption_key_version,
           retention_class,
           authorization_class,
           state
         ) VALUES (
           $1, $2, $3, $4, 'event-batch', 'ingest-object-v1',
           $5, $6, $7, 'gzip', 'AES-256-GCM', $8, $9, $10, 'available'
         )`,
        [
          objectMetadataId,
          input.record.workspaceId,
          input.record.objectKey,
          input.record.objectVersionId,
          input.record.ciphertextDigest,
          input.record.logicalDigest,
          input.record.ciphertextBytes,
          this.#encryptionKeyVersion,
          this.#retentionClass,
          this.#authorizationClass
        ]
      );
      await connection.query(
        `INSERT INTO ingest_batches (
           id,
           workspace_id,
           project_id,
           device_id,
           event_stream_id,
           batch_id,
           logical_digest,
           object_metadata_id,
           object_key,
           object_version_id,
           first_sequence,
           last_sequence,
           chain_head,
           state
         ) VALUES (
           $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           'stored_not_enqueued'
         )`,
        [
          crypto.randomUUID(),
          input.record.workspaceId,
          input.record.projectId,
          input.record.deviceId,
          input.record.streamId,
          input.record.batchId,
          input.record.logicalDigest,
          objectMetadataId,
          input.record.objectKey,
          input.record.objectVersionId,
          input.record.firstSequence,
          input.record.lastSequence,
          input.record.chainHead
        ]
      );
      const expectedDatabaseChainHead =
        input.expectedStreamState === undefined ? null : input.expectedStreamState.chainHead;
      const updateResult = await connection.query(
        `UPDATE event_streams
         SET last_monotonic_sequence = $1,
             chain_head = $2,
             updated_at = now()
         WHERE workspace_id = $3
           AND project_id = $4
           AND device_id = $5
           AND id = $6
           AND last_monotonic_sequence = $7
           AND chain_head IS NOT DISTINCT FROM $8`,
        [
          input.record.lastSequence,
          input.record.chainHead,
          input.record.workspaceId,
          input.record.projectId,
          input.record.deviceId,
          input.record.streamId,
          input.expectedStreamState?.lastSequence ?? 0,
          expectedDatabaseChainHead
        ]
      );
      if (updateResult.rowCount !== 1) {
        throw new StreamCompareAndSwapError();
      }
      await connection.query("COMMIT");
      transactionOpen = false;
      return { kind: "created", record: input.record };
    } catch (error) {
      if (transactionOpen) {
        await rollbackIgnoringFailure(connection);
        transactionOpen = false;
      }
      if (error instanceof StreamCompareAndSwapError) {
        return { kind: "out_of_order" };
      }
      if (postgresErrorCode(error) === "23505") {
        const existing = await this.#findWorkspaceBatch(
          connection,
          input.record.workspaceId,
          input.record.batchId
        );
        return existing === undefined
          ? { kind: "conflict" }
          : classifyExistingBatch(existing, input.record);
      }
      throw error;
    } finally {
      if (transactionOpen) {
        await rollbackIgnoringFailure(connection);
      }
      await connection.close();
    }
  }

  async markEnqueued(input: {
    readonly batchId: string;
    readonly logicalDigest: `sha256:${string}`;
    readonly workspaceId: string;
  }): Promise<void> {
    assertNonEmpty(input.batchId, "batchId");
    assertDigest(input.logicalDigest, "logicalDigest");
    assertUuid(input.workspaceId, "workspaceId");
    await this.#withConnection(async (connection) => {
      const result = await connection.query(
        `UPDATE ingest_batches
         SET state = 'enqueued',
             enqueued_at = COALESCE(enqueued_at, now()),
             updated_at = now()
         WHERE workspace_id = $1
           AND batch_id = $2
           AND logical_digest = $3`,
        [input.workspaceId, input.batchId, input.logicalDigest]
      );
      if (result.rowCount !== 1) {
        throw new Error("Stored ingestion batch was not found or its digest did not match.");
      }
    });
  }

  async getDeviceStatus(input: {
    readonly credential: string;
    readonly deviceId: string;
    readonly nowEpochMilliseconds: number;
  }): Promise<DeviceStatusResult> {
    assertUuid(input.deviceId, "deviceId");
    if (!Number.isSafeInteger(input.nowEpochMilliseconds) || input.nowEpochMilliseconds < 0) {
      throw new RangeError("nowEpochMilliseconds must be a non-negative safe integer.");
    }
    return this.#withConnection(async (connection) => {
      const principal = await this.#authenticateWithConnection(
        connection,
        input.credential,
        Math.floor(input.nowEpochMilliseconds / 1000)
      );
      if (principal.deviceId !== input.deviceId) {
        throw new Error("The credential does not belong to the requested device.");
      }
      const result = await connection.query<DeviceStatusRow>(
        `SELECT
           d.state,
           d.revoked_at,
           (
             SELECT count(*)
             FROM ingest_batches AS b
             WHERE b.workspace_id = d.workspace_id
               AND b.device_id = d.id
               AND b.state = 'stored_not_enqueued'
           ) AS pending_stored_batches,
           (
             SELECT max(s.last_monotonic_sequence)
             FROM event_streams AS s
             WHERE s.workspace_id = d.workspace_id
               AND s.device_id = d.id
           ) AS last_accepted_sequence
         FROM devices AS d
         WHERE d.workspace_id = $1
           AND d.id = $2
         LIMIT 1`,
        [principal.workspaceId, principal.deviceId]
      );
      const row = requireSingleRow(result, "device status");
      const lastAcceptedSequence =
        row.last_accepted_sequence === null || row.last_accepted_sequence === undefined
          ? undefined
          : requireSafeInteger(row.last_accepted_sequence, "last_accepted_sequence");
      const base = {
        deviceId: principal.deviceId,
        pendingStoredBatches: requireNonNegativeInteger(
          row.pending_stored_batches,
          "pending_stored_batches"
        ),
        state:
          row.revoked_at !== null && row.revoked_at !== undefined
            ? ("revoked" as const)
            : requireString(row.state, "state") === "offline"
              ? ("offline" as const)
              : ("active" as const)
      };
      return lastAcceptedSequence === undefined ? base : { ...base, lastAcceptedSequence };
    });
  }

  async #authenticateWithConnection(
    connection: PostgresConnection,
    credential: string,
    nowEpochSeconds: number
  ): Promise<DeviceBatchPrincipal> {
    const parsed = parseCredential(credential);
    const result = await connection.query<CredentialRow>(
      `SELECT
         c.workspace_id,
         c.device_id,
         c.credential_digest,
         c.public_signing_key,
         c.key_algorithm,
         c.key_version,
         c.expires_at,
         c.revoked_at AS credential_revoked_at,
         d.revoked_at AS device_revoked_at,
         d.state AS device_state
       FROM device_credentials AS c
       JOIN devices AS d
         ON d.workspace_id = c.workspace_id
        AND d.id = c.device_id
       WHERE c.id = $1
       LIMIT 1`,
      [parsed.credentialId]
    );
    const row = result.rows[0];
    if (row === undefined) {
      throw new Error("Invalid device credential.");
    }
    const actualDigest = await sha256Base64Url(parsed.secret);
    const expectedDigest = requireString(row.credential_digest, "credential_digest");
    if (!(await constantTimeEqual(actualDigest, expectedDigest))) {
      throw new Error("Invalid device credential.");
    }
    if (
      (row.credential_revoked_at !== null && row.credential_revoked_at !== undefined) ||
      (row.device_revoked_at !== null && row.device_revoked_at !== undefined) ||
      !["paired", "online", "offline"].includes(requireString(row.device_state, "device_state"))
    ) {
      throw new Error("Device credential is revoked.");
    }
    const expiresAt = optionalEpochSeconds(row.expires_at, "expires_at");
    if (expiresAt !== undefined && expiresAt < nowEpochSeconds) {
      throw new Error("Device credential is expired.");
    }
    if (requireString(row.key_algorithm, "key_algorithm") !== "Ed25519") {
      throw new Error("Unsupported device signing key algorithm.");
    }
    const publicSigningKey = requireEd25519PublicKey(row.public_signing_key);
    const workspaceId = requireUuid(row.workspace_id, "workspace_id");
    const deviceId = requireUuid(row.device_id, "device_id");
    await connection.query(
      `UPDATE devices
       SET last_seen_at = to_timestamp($1),
           updated_at = now()
       WHERE workspace_id = $2
         AND id = $3`,
      [nowEpochSeconds, workspaceId, deviceId]
    );
    return {
      deviceId,
      publicSigningKey,
      signingKeyVersion: requirePositiveInteger(row.key_version, "key_version"),
      workspaceId
    };
  }

  async #findScopedBatch(
    connection: PostgresConnection,
    input: {
      readonly batchId: string;
      readonly deviceId: string;
      readonly projectId: string;
      readonly workspaceId: string;
    }
  ): Promise<StoredBatchRecord | undefined> {
    const result = await connection.query<StoredBatchRow>(
      `${storedBatchSelect}
       WHERE b.workspace_id = $1
         AND b.project_id = $2
         AND b.device_id = $3
         AND b.batch_id = $4
       LIMIT 1`,
      [input.workspaceId, input.projectId, input.deviceId, input.batchId]
    );
    const row = result.rows[0];
    return row === undefined ? undefined : storedBatchFromRow(row);
  }

  async #findWorkspaceBatch(
    connection: PostgresConnection,
    workspaceId: string,
    batchId: string
  ): Promise<StoredBatchRecord | undefined> {
    const result = await connection.query<StoredBatchRow>(
      `${storedBatchSelect}
       WHERE b.workspace_id = $1
         AND b.batch_id = $2
       LIMIT 1`,
      [workspaceId, batchId]
    );
    const row = result.rows[0];
    return row === undefined ? undefined : storedBatchFromRow(row);
  }

  async #withConnection<T>(work: (connection: PostgresConnection) => Promise<T>): Promise<T> {
    const connection = await this.#connections.connect();
    try {
      return await work(connection);
    } finally {
      await connection.close();
    }
  }
}

const storedBatchSelect = `SELECT
  b.workspace_id,
  b.project_id,
  b.device_id,
  b.event_stream_id,
  b.batch_id,
  b.logical_digest,
  b.object_key,
  b.object_version_id,
  b.first_sequence,
  b.last_sequence,
  b.chain_head,
  b.state,
  o.ciphertext_digest,
  o.ciphertext_bytes
FROM ingest_batches AS b
JOIN object_metadata AS o
  ON o.workspace_id = b.workspace_id
 AND o.id = b.object_metadata_id`;

interface CredentialRow {
  readonly credential_digest: unknown;
  readonly credential_revoked_at: unknown;
  readonly device_id: unknown;
  readonly device_revoked_at: unknown;
  readonly device_state: unknown;
  readonly expires_at: unknown;
  readonly key_algorithm: unknown;
  readonly key_version: unknown;
  readonly public_signing_key: unknown;
  readonly workspace_id: unknown;
}

interface DeviceStatusRow {
  readonly last_accepted_sequence: unknown;
  readonly pending_stored_batches: unknown;
  readonly revoked_at: unknown;
  readonly state: unknown;
}

interface StoredBatchRow {
  readonly batch_id: unknown;
  readonly chain_head: unknown;
  readonly ciphertext_bytes: unknown;
  readonly ciphertext_digest: unknown;
  readonly device_id: unknown;
  readonly event_stream_id: unknown;
  readonly first_sequence: unknown;
  readonly last_sequence: unknown;
  readonly logical_digest: unknown;
  readonly object_key: unknown;
  readonly object_version_id: unknown;
  readonly project_id: unknown;
  readonly state: unknown;
  readonly workspace_id: unknown;
}

interface StreamRow {
  readonly chain_head: unknown;
  readonly last_monotonic_sequence: unknown;
}

class StreamCompareAndSwapError extends Error {}

function parseCredential(credential: string): { credentialId: string; secret: string } {
  const parts = credential.split(".");
  const credentialId = parts[1];
  const secret = parts[2];
  if (
    parts.length !== 3 ||
    parts[0] !== credentialPrefix ||
    credentialId === undefined ||
    !uuidPattern.test(credentialId) ||
    secret === undefined ||
    !/^[A-Za-z0-9_-]{20,256}$/u.test(secret)
  ) {
    throw new Error("Invalid device credential.");
  }
  return { credentialId, secret };
}

function streamStateFromRow(row: StreamRow): StreamChainState | undefined {
  const lastSequence = requireNonNegativeInteger(
    row.last_monotonic_sequence,
    "last_monotonic_sequence"
  );
  if (lastSequence === 0 && (row.chain_head === null || row.chain_head === undefined)) {
    return undefined;
  }
  return {
    chainHead: requireDigest(row.chain_head, "chain_head"),
    lastSequence
  };
}

function streamMatchesExpected(row: StreamRow, expected: StreamChainState | undefined): boolean {
  const lastSequence = requireNonNegativeInteger(
    row.last_monotonic_sequence,
    "last_monotonic_sequence"
  );
  if (expected === undefined) {
    return lastSequence === 0 && (row.chain_head === null || row.chain_head === undefined);
  }
  return (
    lastSequence === expected.lastSequence &&
    requireDigest(row.chain_head, "chain_head") === expected.chainHead
  );
}

function storedBatchFromRow(row: StoredBatchRow): StoredBatchRecord {
  const state = requireString(row.state, "state");
  if (state !== "stored_not_enqueued" && state !== "enqueued") {
    throw new Error("Database returned an invalid ingest batch state.");
  }
  return {
    batchId: requireString(row.batch_id, "batch_id"),
    chainHead: requireDigest(row.chain_head, "chain_head"),
    ciphertextBytes: requireNonNegativeInteger(row.ciphertext_bytes, "ciphertext_bytes"),
    ciphertextDigest: requireDigest(row.ciphertext_digest, "ciphertext_digest"),
    deviceId: requireUuid(row.device_id, "device_id"),
    firstSequence: requirePositiveInteger(row.first_sequence, "first_sequence"),
    lastSequence: requirePositiveInteger(row.last_sequence, "last_sequence"),
    logicalDigest: requireDigest(row.logical_digest, "logical_digest"),
    objectKey: requireString(row.object_key, "object_key"),
    objectVersionId: requireString(row.object_version_id, "object_version_id"),
    projectId: requireUuid(row.project_id, "project_id"),
    state,
    streamId: requireUuid(row.event_stream_id, "event_stream_id"),
    workspaceId: requireUuid(row.workspace_id, "workspace_id")
  };
}

function classifyExistingBatch(
  existing: StoredBatchRecord,
  proposed: StoredBatchRecord
): CommitStoredBatchResult {
  return existing.workspaceId === proposed.workspaceId &&
    existing.projectId === proposed.projectId &&
    existing.deviceId === proposed.deviceId &&
    existing.streamId === proposed.streamId &&
    existing.logicalDigest === proposed.logicalDigest
    ? { kind: "duplicate", record: existing }
    : { kind: "conflict" };
}

function assertStoredBatchRecord(record: StoredBatchRecord): void {
  assertUuid(record.workspaceId, "record.workspaceId");
  assertUuid(record.projectId, "record.projectId");
  assertUuid(record.deviceId, "record.deviceId");
  assertUuid(record.streamId, "record.streamId");
  assertNonEmpty(record.batchId, "record.batchId");
  assertNonEmpty(record.objectKey, "record.objectKey");
  assertNonEmpty(record.objectVersionId, "record.objectVersionId");
  assertDigest(record.logicalDigest, "record.logicalDigest");
  assertDigest(record.ciphertextDigest, "record.ciphertextDigest");
  assertDigest(record.chainHead, "record.chainHead");
  requireNonNegativeInteger(record.ciphertextBytes, "record.ciphertextBytes");
  requirePositiveInteger(record.firstSequence, "record.firstSequence");
  requirePositiveInteger(record.lastSequence, "record.lastSequence");
  if (record.lastSequence < record.firstSequence) {
    throw new RangeError("record.lastSequence must not precede record.firstSequence.");
  }
  if (record.state !== "stored_not_enqueued") {
    throw new Error("A newly committed batch must be stored_not_enqueued.");
  }
}

function assertStreamState(state: StreamChainState): void {
  assertDigest(state.chainHead, "expectedStreamState.chainHead");
  requirePositiveInteger(state.lastSequence, "expectedStreamState.lastSequence");
}

function requireSingleRow<Row>(result: PostgresQueryResult<Row>, operation: string): Row {
  const row = result.rows[0];
  if (row === undefined) {
    throw new Error(`PostgreSQL returned no row for ${operation}.`);
  }
  return row;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.length === 0) {
    throw new Error(`PostgreSQL returned an invalid ${field}.`);
  }
  return value;
}

function requireBoolean(value: unknown, field: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(`PostgreSQL returned an invalid ${field}.`);
  }
  return value;
}

function requireDigest(value: unknown, field: string): `sha256:${string}` {
  const digest = requireString(value, field);
  if (!sha256Pattern.test(digest)) {
    throw new Error(`PostgreSQL returned an invalid ${field}.`);
  }
  return digest as `sha256:${string}`;
}

function requireUuid(value: unknown, field: string): string {
  const id = requireString(value, field);
  assertUuid(id, field);
  return id;
}

function requireSafeInteger(value: unknown, field: string): number {
  const numberValue =
    typeof value === "number"
      ? value
      : typeof value === "string" && /^-?[0-9]+$/u.test(value)
        ? Number(value)
        : Number.NaN;
  if (!Number.isSafeInteger(numberValue)) {
    throw new Error(`PostgreSQL returned an invalid ${field}.`);
  }
  return numberValue;
}

function requireNonNegativeInteger(value: unknown, field: string): number {
  const parsed = requireSafeInteger(value, field);
  if (parsed < 0) {
    throw new Error(`PostgreSQL returned a negative ${field}.`);
  }
  return parsed;
}

function requirePositiveInteger(value: unknown, field: string): number {
  const parsed = requireSafeInteger(value, field);
  if (parsed <= 0) {
    throw new Error(`PostgreSQL returned a non-positive ${field}.`);
  }
  return parsed;
}

function requireEd25519PublicKey(value: unknown): string {
  const encoded = requireString(value, "public_signing_key");
  try {
    const decoded = atob(encoded);
    if (decoded.length !== 32) {
      throw new Error("invalid length");
    }
  } catch {
    throw new Error("PostgreSQL returned an invalid Ed25519 public signing key.");
  }
  return encoded;
}

function optionalEpochSeconds(value: unknown, field: string): number | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }
  const milliseconds =
    value instanceof Date
      ? value.getTime()
      : typeof value === "string" || typeof value === "number"
        ? new Date(value).getTime()
        : Number.NaN;
  if (!Number.isFinite(milliseconds)) {
    throw new Error(`PostgreSQL returned an invalid ${field}.`);
  }
  return Math.floor(milliseconds / 1000);
}

function assertUuid(value: string, field: string): void {
  if (!uuidPattern.test(value)) {
    throw new Error(`${field} must be a UUID.`);
  }
}

function assertDigest(value: string, field: string): void {
  if (!sha256Pattern.test(value)) {
    throw new Error(`${field} must be a SHA-256 digest.`);
  }
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) {
    throw new Error(`${field} must not be empty.`);
  }
}

function assertEpochSeconds(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError("nowEpochSeconds must be a non-negative safe integer.");
  }
}

function nonEmptyOption(value: string | undefined, fallback: string, field: string): string {
  const resolved = value ?? fallback;
  assertNonEmpty(resolved, field);
  return resolved;
}

function postgresErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return undefined;
  }
  const code = (error as { readonly code?: unknown }).code;
  return typeof code === "string" ? code : undefined;
}

async function rollbackIgnoringFailure(connection: PostgresConnection): Promise<void> {
  await connection.query("ROLLBACK").catch(() => undefined);
}
