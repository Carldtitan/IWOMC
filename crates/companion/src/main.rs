use std::{
    collections::BTreeMap,
    env,
    error::Error,
    fs,
    time::{SystemTime, UNIX_EPOCH},
};

use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use environment_reconciler_companion::{
    build_info,
    config::CompanionConfig,
    credentials::{DeviceKeyManager, OsCredentialStore},
    health::{ComponentState, HealthReporter, HealthSnapshot},
    ipc::{
        CheckpointReason, CompanionIpcHandler, IpcHandlerError, IpcHandlerErrorCode,
        IpcServerConfig, serve_once,
    },
    logging::{LogLevel, emit_stderr},
    redaction::Redactor,
    shutdown::ShutdownToken,
    spool::{EncryptedSpool, RawEvent, SpoolLimits},
};
use serde_json::{Value, json};
use zeroize::Zeroizing;

#[cfg(windows)]
use environment_reconciler_companion::ipc::SecureWindowsNamedPipeListener;
#[cfg(unix)]
use environment_reconciler_companion::ipc::{SecureUnixListener, unix_socket_path};

const IPC_SCOPE_ENVIRONMENT_VARIABLE: &str = "ER_COMPANION_IPC_SCOPE";
const IPC_SECRET_ENVIRONMENT_VARIABLE: &str = "ER_COMPANION_IPC_SECRET";
type IpcLaunchConfiguration = (String, Zeroizing<Vec<u8>>);

fn main() -> Result<(), Box<dyn Error>> {
    let health_once = env::args().any(|argument| argument == "--health-once");
    let ipc_launch = load_ipc_launch(health_once)?;

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

    if health_once {
        println!("{}", serde_json::to_string(&health.snapshot())?);
        return Ok(());
    }

    let (scope_id, shared_secret) = ipc_launch.ok_or("missing IPC launch configuration")?;
    health.set_component("local_ipc", ComponentState::Healthy, None);

    let shutdown = ShutdownToken::default();
    let signal_token = shutdown.clone();
    ctrlc::set_handler(move || signal_token.request())?;
    let mut handler = RuntimeIpcHandler::new(spool, health);
    let server_config = IpcServerConfig {
        // Authenticate every operation on a fresh bounded local connection.
        maximum_requests_per_connection: 1,
        ..IpcServerConfig::default()
    };

    #[cfg(windows)]
    let listener = SecureWindowsNamedPipeListener::bind(&scope_id)?;
    #[cfg(unix)]
    let listener = {
        let path = unix_socket_path(&config.data_directory.join("ipc"), &scope_id)?;
        SecureUnixListener::bind(&path)?
    };

    while !shutdown.is_requested() {
        match serve_once(
            &listener,
            shared_secret.as_slice(),
            &mut handler,
            server_config,
        ) {
            Ok(()) => {}
            Err(error)
                if error.code()
                    == environment_reconciler_companion::ipc::IpcErrorCode::ConnectionLimit => {}
            Err(error)
                if matches!(
                    error.code(),
                    environment_reconciler_companion::ipc::IpcErrorCode::AuthenticationFailed
                        | environment_reconciler_companion::ipc::IpcErrorCode::InvalidFrame
                        | environment_reconciler_companion::ipc::IpcErrorCode::Io
                        | environment_reconciler_companion::ipc::IpcErrorCode::Timeout
                ) =>
            {
                emit_stderr(
                    handler.spool.redactor(),
                    LogLevel::Warn,
                    "companion.ipc.connection_rejected",
                    "a local IPC connection was rejected",
                    &BTreeMap::from([("code".to_owned(), json!(format!("{:?}", error.code())))]),
                );
            }
            Err(error) => return Err(error.into()),
        }
    }
    emit_stderr(
        handler.spool.redactor(),
        LogLevel::Info,
        "companion.stopped",
        "graceful shutdown completed",
        &BTreeMap::new(),
    );
    Ok(())
}

struct ActiveObservation {
    project_id: String,
    provider_surface: String,
    session_id: String,
    started_at_epoch_seconds: u64,
}

struct RuntimeIpcHandler {
    active: Option<ActiveObservation>,
    health: HealthReporter,
    spool: EncryptedSpool,
}

impl RuntimeIpcHandler {
    fn new(spool: EncryptedSpool, health: HealthReporter) -> Self {
        Self {
            active: None,
            health,
            spool,
        }
    }

    fn coverage(&self, provider_surface: &str) -> Value {
        let provider_id = if provider_surface.to_ascii_lowercase().contains("codex") {
            "codex"
        } else if provider_surface.to_ascii_lowercase().contains("claude") {
            "claude_code"
        } else if provider_surface.to_ascii_lowercase().contains("cursor") {
            "cursor"
        } else {
            "manual"
        };
        let provider_condition = if provider_id == "manual" {
            "partial"
        } else {
            "covered"
        };
        let stats = self.spool.stats().ok();
        json!({
            "adapters": [
                {
                    "adapterId": "npm",
                    "condition": "covered",
                    "ecosystem": "javascript",
                    "gaps": [],
                    "supportLevel": "full_native"
                },
                {
                    "adapterId": "pip-uv",
                    "condition": "covered",
                    "ecosystem": "python",
                    "gaps": [],
                    "supportLevel": "full_native"
                }
            ],
            "generatedAtEpochSeconds": unix_time_seconds(),
            "permission": {
                "condition": "covered",
                "gaps": [],
                "grantedCapabilities": [
                    "repository_metadata",
                    "package_inventory",
                    "provider_events"
                ],
                "profile": "repository_scoped"
            },
            "provider": {
                "capabilities": ["session_boundary", "package_manager_actions"],
                "condition": provider_condition,
                "gaps": if provider_id == "manual" {
                    vec!["No structured provider event surface is active."]
                } else {
                    Vec::<&str>::new()
                },
                "providerId": provider_id,
                "sessionBoundary": if provider_id == "manual" { "manual" } else { "automatic" },
                "surface": provider_surface
            },
            "realms": [{
                "condition": "covered",
                "gaps": [],
                "label": "extension host",
                "realmId": "extension-host",
                "realmKind": "host"
            }],
            "upload": {
                "gaps": ["Encrypted evidence is durable locally and awaits the cloud uploader."],
                "pendingBatches": stats.map_or(0, |value| value.pending_batches),
                "state": "offline_buffering"
            }
        })
    }

    fn append_event(
        &self,
        action_type: &str,
        session_id: &str,
        payload: &Value,
    ) -> Result<u64, IpcHandlerError> {
        self.spool
            .append(&RawEvent {
                event_id: random_id("event"),
                source: "local_ipc".to_owned(),
                action_type: action_type.to_owned(),
                source_sequence: None,
                payload: json!({
                    "sessionId": session_id,
                    "details": payload,
                }),
            })
            .map(|capture| capture.local_sequence)
            .map_err(|_| IpcHandlerError::new(IpcHandlerErrorCode::Internal))
    }
}

impl CompanionIpcHandler for RuntimeIpcHandler {
    fn status(&mut self) -> Result<Value, IpcHandlerError> {
        let stats = self
            .spool
            .stats()
            .map_err(|_| IpcHandlerError::new(IpcHandlerErrorCode::Internal))?;
        self.health
            .set_queue_depth(stats.pending_events, stats.pending_batches);
        let snapshot: HealthSnapshot = self.health.snapshot();
        let mut payload = json!({
            "health": snapshot,
            "state": if self.active.is_some() { "observing" } else { "ready" }
        });
        if let Some(active) = &self.active {
            payload
                .as_object_mut()
                .expect("status payload is an object")
                .insert(
                    "activeSessionId".to_owned(),
                    Value::String(active.session_id.clone()),
                );
        }
        Ok(payload)
    }

    fn create_checkpoint(&mut self, reason: CheckpointReason) -> Result<Value, IpcHandlerError> {
        let active = self
            .active
            .as_ref()
            .ok_or_else(|| IpcHandlerError::new(IpcHandlerErrorCode::InvalidState))?;
        let checkpoint_id = random_id("checkpoint");
        let sequence = self.append_event(
            "checkpoint.created",
            &active.session_id,
            &json!({
                "checkpointId": checkpoint_id,
                "projectId": active.project_id,
                "reason": reason,
            }),
        )?;
        Ok(json!({
            "checkpointId": checkpoint_id,
            "coverage": self.coverage(&active.provider_surface),
            "createdAtEpochSeconds": unix_time_seconds(),
            "localSequence": sequence,
            "reason": reason,
            "sessionId": active.session_id,
        }))
    }

    fn start_observation(
        &mut self,
        project_id: &str,
        provider_surface: &str,
    ) -> Result<Value, IpcHandlerError> {
        if let Some(active) = &self.active {
            if active.project_id == project_id && active.provider_surface == provider_surface {
                return Ok(json!({
                    "coverage": self.coverage(provider_surface),
                    "sessionId": active.session_id,
                    "startedAtEpochSeconds": active.started_at_epoch_seconds,
                }));
            }
            return Err(IpcHandlerError::new(IpcHandlerErrorCode::InvalidState));
        }
        let session_id = random_id("session");
        let started_at_epoch_seconds = unix_time_seconds();
        self.append_event(
            "observation.started",
            &session_id,
            &json!({
                "projectId": project_id,
                "providerSurface": provider_surface,
                "startedAtEpochSeconds": started_at_epoch_seconds,
            }),
        )?;
        self.active = Some(ActiveObservation {
            project_id: project_id.to_owned(),
            provider_surface: provider_surface.to_owned(),
            session_id: session_id.clone(),
            started_at_epoch_seconds,
        });
        Ok(json!({
            "coverage": self.coverage(provider_surface),
            "sessionId": session_id,
            "startedAtEpochSeconds": started_at_epoch_seconds,
        }))
    }

    fn stop_observation(&mut self, session_id: &str) -> Result<Value, IpcHandlerError> {
        let active = self
            .active
            .as_ref()
            .ok_or_else(|| IpcHandlerError::new(IpcHandlerErrorCode::InvalidState))?;
        if active.session_id != session_id {
            return Err(IpcHandlerError::new(IpcHandlerErrorCode::Forbidden));
        }
        let checkpoint_id = random_id("checkpoint");
        let sequence = self.append_event(
            "observation.stopped",
            session_id,
            &json!({
                "checkpointId": checkpoint_id,
                "durationSeconds": unix_time_seconds().saturating_sub(active.started_at_epoch_seconds),
                "projectId": active.project_id,
            }),
        )?;
        let coverage = self.coverage(&active.provider_surface);
        self.active = None;
        Ok(json!({
            "checkpointId": checkpoint_id,
            "coverage": coverage,
            "createdAtEpochSeconds": unix_time_seconds(),
            "localSequence": sequence,
            "reason": "session_end",
            "sessionId": session_id,
            "stopped": true,
        }))
    }
}

fn load_ipc_launch(health_once: bool) -> Result<Option<IpcLaunchConfiguration>, Box<dyn Error>> {
    if health_once {
        return Ok(None);
    }
    let scope_id = required_environment_value(IPC_SCOPE_ENVIRONMENT_VARIABLE)?;
    let encoded_secret =
        Zeroizing::new(required_environment_value(IPC_SECRET_ENVIRONMENT_VARIABLE)?);
    let shared_secret = Zeroizing::new(URL_SAFE_NO_PAD.decode(encoded_secret.as_bytes())?);
    if !(32..=1024).contains(&shared_secret.len()) {
        return Err("invalid Companion IPC secret".into());
    }
    Ok(Some((scope_id, shared_secret)))
}

fn required_environment_value(name: &'static str) -> Result<String, Box<dyn Error>> {
    let value = env::var(name)?;
    if value.is_empty() || value.len() > 4096 || value.chars().any(char::is_control) {
        return Err(format!("invalid {name}").into());
    }
    Ok(value)
}

fn unix_time_seconds() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_or(0, |duration| duration.as_secs())
}

fn random_id(prefix: &str) -> String {
    let mut bytes = [0_u8; 16];
    if getrandom::fill(&mut bytes).is_err() {
        return format!("{prefix}-{}-{}", std::process::id(), unix_time_seconds());
    }
    format!("{prefix}-{}", hex::encode(bytes))
}
