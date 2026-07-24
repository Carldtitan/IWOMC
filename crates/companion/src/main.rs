use std::{collections::BTreeMap, error::Error, fs};

use environment_reconciler_companion::{
    build_info,
    config::CompanionConfig,
    credentials::{DeviceKeyManager, OsCredentialStore},
    health::{ComponentState, HealthReporter},
    logging::{LogLevel, emit_stderr},
    redaction::Redactor,
    shutdown::ShutdownToken,
    spool::{EncryptedSpool, SpoolLimits},
};
use serde_json::json;

fn main() -> Result<(), Box<dyn Error>> {
    let config = CompanionConfig::from_environment()?;
    fs::create_dir_all(&config.data_directory)?;
    let key_manager = DeviceKeyManager::new(OsCredentialStore::new(&config.credential_service));
    let keys = key_manager.load_or_create()?;
    let redactor = Redactor::new(keys.equality_hmac, &[])?;
    let spool = EncryptedSpool::open(
        &config.spool_path,
        SpoolLimits {
            maximum_encrypted_payload_bytes: config.max_spool_bytes,
            maximum_pending_events: config.max_pending_events,
            maximum_batch_events: config.batch_size,
        },
        keys.encryption,
        keys.signing,
        redactor,
    )?;
    spool.verify_integrity()?;
    let health = HealthReporter::default();
    health.set_component("credential_store", ComponentState::Healthy, None);
    health.set_component("spool", ComponentState::Healthy, None);
    let stats = spool.stats()?;
    health.set_queue_depth(stats.pending_events, stats.pending_batches);

    let info = build_info();
    emit_stderr(
        spool.redactor(),
        LogLevel::Info,
        "companion.starting",
        "environment reconciler companion starting",
        &BTreeMap::from([
            ("protocolVersion".to_owned(), json!(info.protocol_version)),
            ("version".to_owned(), json!(info.version)),
        ]),
    );

    if std::env::args().any(|argument| argument == "--health-once") {
        println!("{}", serde_json::to_string(&health.snapshot())?);
        return Ok(());
    }

    let shutdown = ShutdownToken::default();
    let signal_token = shutdown.clone();
    ctrlc::set_handler(move || signal_token.request())?;
    while !shutdown.wait_timeout(config.health_interval) {
        emit_stderr(
            spool.redactor(),
            LogLevel::Debug,
            "companion.health",
            "periodic companion health",
            &BTreeMap::from([("health".to_owned(), json!(health.snapshot()))]),
        );
    }
    emit_stderr(
        spool.redactor(),
        LogLevel::Info,
        "companion.stopped",
        "graceful shutdown completed",
        &BTreeMap::new(),
    );
    Ok(())
}
