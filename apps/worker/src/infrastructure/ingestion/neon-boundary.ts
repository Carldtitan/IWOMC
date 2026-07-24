import type {
  DeviceAuthenticationPort,
  IngestMetadataPort,
  ProjectAuthorizationPort
} from "../../domain/ingestion/ports.js";

/** Compatibility boundary for ingestion metadata drivers. */
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
