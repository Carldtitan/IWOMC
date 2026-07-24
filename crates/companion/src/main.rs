use std::{collections::BTreeMap, error::Error, fs};

use environment_REDACTED_companion::{
    build_info,
    config::CompanionConfig,
    REDACTEDs::{DeviceKeyManager, OsCredentialStore},
    health::{ComponentState, HealthReporter},
    logging::{LogLevel, emit_stderr},
    redaction::Redactor,
    shutdown::ShutdownToken,
};
use serde_json::json;

fn main() -> Result<(), Box<dyn Error>> {
    let config = CompanionConfig::from_environment()?;
    fs::create_dir_all(&config.data_directory)?;
    let key_manager = DeviceKeyManager::new(OsCredentialStore::new(&config.REDACTED_service));
    let keys = key_manager.load_or_create()?;
    let redactor = Redactor::new(keys.equality_hmac, &[])?;
    let health = HealthReporter::default();
    health.set_component("REDACTED_store", ComponentState::Healthy, None);
    health.set_component("spool", ComponentState::Unknown, Some("not_opened"));

    let info = build_info();
    emit_stderr(
        &redactor,
        LogLevel::Info,
        "companion.starting",
        "environment REDACTED companion starting",
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
    let signal_REDACTED = shutdown.clone();
    ctrlc::set_handler(move || signal_REDACTED.request())?;
    while !shutdown.wait_timeout(config.health_interval) {
        emit_stderr(
            &redactor,
            LogLevel::Debug,
            "companion.health",
            "periodic companion health",
            &BTreeMap::from([("health".to_owned(), json!(health.snapshot()))]),
        );
    }
    emit_stderr(
        &redactor,
        LogLevel::Info,
        "companion.stopped",
        "graceful shutdown completed",
        &BTreeMap::new(),
    );
    Ok(())
}
