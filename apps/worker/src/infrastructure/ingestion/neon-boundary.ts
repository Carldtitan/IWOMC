import type {
  DeviceAuthenticationPort,
  IngestMetadataPort,
  ProjectAuthorizationPort
} from "../../domain/ingestion/ports.js";

/**
 * Transactional boundary a real Hyperdrive-compatible PostgreSQL driver must
 * implement. In particular, `commitStoredBatch` must compare-and-advance the
 * stream anchor and insert the idempotency record in one database transaction.
 *
 * The Worker currently has a Hyperdrive binding but no PostgreSQL client
 * dependency, so this module deliberately does not pretend to persist data.
 */
export interface NeonIngestionDriver
  extends DeviceAuthenticationPort, IngestMetadataPort, ProjectAuthorizationPort {}

export class NeonIngestionAdapter
  implements DeviceAuthenticationPort, IngestMetadataPort, ProjectAuthorizationPort
{
  readonly #driver: NeonIngestionDriver;

  constructor(driver: NeonIngestionDriver) {
    this.#driver = driver;
  }

  authenticate: DeviceAuthenticationPort["authenticate"] = (...arguments_) =>
    this.#driver.authenticate(...arguments_);

  authorizeDevice: ProjectAuthorizationPort["authorizeDevice"] = (...arguments_) =>
    this.#driver.authorizeDevice(...arguments_);

  commitStoredBatch: IngestMetadataPort["commitStoredBatch"] = (...arguments_) =>
    this.#driver.commitStoredBatch(...arguments_);

  findBatch: IngestMetadataPort["findBatch"] = (...arguments_) =>
    this.#driver.findBatch(...arguments_);

  loadStreamState: IngestMetadataPort["loadStreamState"] = (...arguments_) =>
    this.#driver.loadStreamState(...arguments_);

  markEnqueued: IngestMetadataPort["markEnqueued"] = (...arguments_) =>
    this.#driver.markEnqueued(...arguments_);
}
