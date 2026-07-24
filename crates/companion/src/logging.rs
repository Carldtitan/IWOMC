//! Secret-reduced structured local logging.

use std::{
    collections::BTreeMap,
    io::{self, Write},
    time::{SystemTime, UNIX_EPOCH},
};

use serde::Serialize;
use serde_json::Value;

use crate::redaction::Redactor;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum LogLevel {
    Debug,
    Info,
    Warn,
    Error,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SafeLogRecord {
    pub timestamp_unix_ms: u128,
    pub level: LogLevel,
    pub event_code: String,
    pub message: String,
    pub fields: BTreeMap<String, Value>,
    pub redaction_policy_version: String,
}

#[must_use]
pub fn build_safe_log_record(
    redactor: &Redactor,
    level: LogLevel,
    event_code: &str,
    message: &str,
    fields: &BTreeMap<String, Value>,
) -> SafeLogRecord {
    let safe_code = if event_code.chars().all(|character| {
        character.is_ascii_lowercase()
            || character.is_ascii_digit()
            || matches!(character, '.' | '_' | '-')
    }) {
        event_code.to_owned()
    } else {
        "invalid_event_code".to_owned()
    };
    let message = redactor.redact_text(message, 2048);
    let fields = redactor
        .redact_provider_payload(&Value::Object(
            fields
                .iter()
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect(),
        ))
        .as_object()
        .map(|object| {
            object
                .iter()
                .map(|(key, value)| (key.clone(), value.clone()))
                .collect()
        })
        .unwrap_or_default();
    SafeLogRecord {
        timestamp_unix_ms: SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map_or(0, |duration| duration.as_millis()),
        level,
        event_code: safe_code,
        message: message.value,
        fields,
        redaction_policy_version: message.policy_version,
    }
}

/// Write one JSON log record after local redaction.
///
/// # Errors
///
/// Returns an I/O error without including the original log content.
pub fn write_safe_log(
    writer: &mut impl Write,
    redactor: &Redactor,
    level: LogLevel,
    event_code: &str,
    message: &str,
    fields: &BTreeMap<String, Value>,
) -> io::Result<()> {
    let record = build_safe_log_record(redactor, level, event_code, message, fields);
    serde_json::to_writer(&mut *writer, &record).map_err(io::Error::other)?;
    writer.write_all(b"\n")
}

pub fn emit_stderr(
    redactor: &Redactor,
    level: LogLevel,
    event_code: &str,
    message: &str,
    fields: &BTreeMap<String, Value>,
) {
    let _ = write_safe_log(
        &mut io::stderr().lock(),
        redactor,
        level,
        event_code,
        message,
        fields,
    );
}

#[cfg(test)]
mod tests {
    use std::collections::BTreeMap;

    use serde_json::json;

    use super::{LogLevel, write_safe_log};
    use crate::{
        credentials::{SecretKey, VersionedSecretKey},
        redaction::Redactor,
    };

    #[test]
    fn structured_logs_never_emit_seeded_plaintext() {
        let redactor = Redactor::new(
            VersionedSecretKey {
                version: 1,
                key: SecretKey::from_bytes([1; 32]),
            },
            &[],
        )
        .expect("policy");
        let secret = "sk-test_FAKE_51HACKATHON_NOT_A_REAL_KEY_000000";
        let mut fields = BTreeMap::new();
        fields.insert("authorization".to_owned(), json!(secret));
        let mut output = Vec::new();
        write_safe_log(
            &mut output,
            &redactor,
            LogLevel::Error,
            "provider.failed",
            &format!("provider failed using {secret}"),
            &fields,
        )
        .expect("log write");
        let output = String::from_utf8(output).expect("JSON log must be UTF-8");
        assert!(!output.contains(secret));
        assert!(output.contains("redacted"));
    }
}
