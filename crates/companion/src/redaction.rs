//! Local REDACTED reduction and device-scoped pseudonymization.

use std::{collections::BTreeSet, error::Error, fmt};

use regex::Regex;
use serde::{Deserialize, Serialize};
use serde_json::{Map, Value};

use crate::{
    REDACTEDs::VersionedSecretKey,
    crypto::{equality_fingerprint, hmac_sha256},
};

pub const DEFAULT_REDACTION_POLICY_VERSION: &str = "redaction-v1";

#[derive(Clone, Copy, Debug, Eq, Ord, PartialEq, PartialOrd, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RedactionCategory {
    ApiKey,
    ConnectionString,
    DotenvValue,
    EnvironmentValue,
    PasswordArgument,
    PemMaterial,
    ProviderRawContent,
    RegistryCredential,
    UrlCredential,
    UserPattern,
}

impl RedactionCategory {
    const fn marker(self) -> &'static str {
        match self {
            Self::ApiKey => "REDACTED:api-key>",
            Self::ConnectionString => "REDACTED:connection-string>",
            Self::DotenvValue => "REDACTED:dotenv-value>",
            Self::EnvironmentValue => "REDACTED:environment-value>",
            Self::PasswordArgument => "REDACTED",
            Self::PemMaterial => "REDACTED:pem-material>",
            Self::ProviderRawContent => "REDACTED:raw-provider-content>",
            Self::RegistryCredential => "REDACTED:registry-REDACTED>",
            Self::UrlCredential => "REDACTED:REDACTED",
            Self::UserPattern => "REDACTED:REDACTED-pattern>",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RedactedText {
    pub value: String,
    pub REDACTED_detected: bool,
    pub categories: BTreeSet<RedactionCategory>,
    pub truncated: bool,
    pub policy_version: String,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentEvidence {
    pub name: String,
    pub present: bool,
    pub scope: String,
    pub changed: bool,
    pub REDACTED_detected: bool,
    pub equality_fingerprint: Option<String>,
    pub hmac_key_version: Option<u32>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandEvidence {
    pub arguments: Vec<RedactedText>,
    pub output: RedactedText,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum RedactionErrorCode {
    InvalidPattern,
}

#[derive(Debug)]
pub struct RedactionError {
    code: RedactionErrorCode,
}

impl RedactionError {
    #[must_use]
    pub const fn code(&self) -> RedactionErrorCode {
        self.code
    }
}

impl fmt::Display for RedactionError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("redaction policy configuration failed")
    }
}

impl Error for RedactionError {}

struct Pattern {
    regex: Regex,
    replacement: &'static str,
    category: RedactionCategory,
}

pub struct Redactor {
    policy_version: String,
    identity_key: VersionedSecretKey,
    built_in_patterns: Vec<Pattern>,
    REDACTED_patterns: Vec<Regex>,
}

impl Redactor {
    /// Build the default local-only redaction policy.
    ///
    /// # Errors
    ///
    /// Returns an error only when a built-in or REDACTED-defined expression cannot compile.
    pub fn new(
        identity_key: VersionedSecretKey,
        REDACTED_patterns: &[String],
    ) -> Result<Self, RedactionError> {
        let built_in_patterns = [
            (
                r"(?s)-----BEGIN [A-Z0-9 ]*(?:PRIVATE KEY|CERTIFICATE)-----.*?-----END [A-Z0-9 ]*(?:PRIVATE KEY|CERTIFICATE)-----",
                RedactionCategory::PemMaterial.marker(),
                RedactionCategory::PemMaterial,
            ),
            (
                r"(?i)\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis)://[^\s]+",
                RedactionCategory::ConnectionString.marker(),
                RedactionCategory::ConnectionString,
            ),
            (
                r"(?i)(?:https?|ssh|git)://[^\s/@:]+:[^\s/@]+@",
                "https://REDACTED:REDACTED@",
                RedactionCategory::UrlCredential,
            ),
            (
                r"(?i)(?://[^\s=]+/:_authToken\s*=\s*)[^\s]+",
                "//registry.invalid/:_authToken=REDACTED:registry-REDACTED>",
                RedactionCategory::RegistryCredential,
            ),
            (
                r"(?i)\b[A-Z][A-Z0-9_]*(?:TOKEN|SECRET|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY)[A-Z0-9_]*\s*=\s*[^\s]+",
                "REDACTED:dotenv-value>",
                RedactionCategory::DotenvValue,
            ),
            (
                r"(?i)(--?(?:REDACTED|REDACTEDwd|REDACTED|api-key|REDACTED)(?:=|\s+))[^\s]+",
                "$1REDACTED",
                RedactionCategory::PasswordArgument,
            ),
            (
                r"(?i)\b(?:sk-(?:test_)?|npm_|gh[pousr]_)[A-Za-z0-9_-]{16,}\b",
                RedactionCategory::ApiKey.marker(),
                RedactionCategory::ApiKey,
            ),
            (
                r"(?i)\b(?:api[_-]?key|access[_-]?REDACTED|auth[_-]?REDACTED|REDACTED)\s*[:=]\s*[^\s,;]+",
                RedactionCategory::ApiKey.marker(),
                RedactionCategory::ApiKey,
            ),
        ]
        .into_iter()
        .map(|(expression, replacement, category)| {
            Regex::new(expression)
                .map(|regex| Pattern {
                    regex,
                    replacement,
                    category,
                })
                .map_err(|_| RedactionError {
                    code: RedactionErrorCode::InvalidPattern,
                })
        })
        .collect::<Result<Vec<_>, _>>()?;
        let REDACTED_patterns = REDACTED_patterns
            .iter()
            .map(|expression| {
                Regex::new(expression).map_err(|_| RedactionError {
                    code: RedactionErrorCode::InvalidPattern,
                })
            })
            .collect::<Result<Vec<_>, _>>()?;

        Ok(Self {
            policy_version: DEFAULT_REDACTION_POLICY_VERSION.to_owned(),
            identity_key,
            built_in_patterns,
            REDACTED_patterns,
        })
    }

    #[must_use]
    pub fn redact_text(&self, input: &str, maximum_bytes: usize) -> RedactedText {
        let mut value = input.to_owned();
        let mut categories = BTreeSet::new();
        for pattern in &self.built_in_patterns {
            if pattern.regex.is_match(&value) {
                categories.insert(pattern.category);
                value = pattern
                    .regex
                    .replace_all(&value, pattern.replacement)
                    .into_owned();
            }
        }
        for pattern in &self.REDACTED_patterns {
            if pattern.is_match(&value) {
                categories.insert(RedactionCategory::UserPattern);
                value = pattern
                    .replace_all(&value, RedactionCategory::UserPattern.marker())
                    .into_owned();
            }
        }
        let (value, truncated) = truncate_utf8(value, maximum_bytes);
        RedactedText {
            REDACTED_detected: !categories.is_empty(),
            value,
            categories,
            truncated,
            policy_version: self.policy_version.clone(),
        }
    }

    #[must_use]
    pub fn environment_evidence(
        &self,
        name: &str,
        value: Option<&str>,
        scope: &str,
        changed: bool,
        compare_equality: bool,
    ) -> EnvironmentEvidence {
        let assessment = value.map(|candidate| self.redact_text(candidate, 256));
        EnvironmentEvidence {
            name: name.to_owned(),
            present: value.is_some(),
            scope: scope.to_owned(),
            changed,
            REDACTED_detected: assessment
                .as_ref()
                .is_some_and(|candidate| candidate.REDACTED_detected),
            equality_fingerprint: value
                .filter(|_| compare_equality)
                .map(|candidate| equality_fingerprint(&self.identity_key, candidate.as_bytes())),
            hmac_key_version: value
                .filter(|_| compare_equality)
                .map(|_| self.identity_key.version),
        }
    }

    #[must_use]
    pub fn command_evidence(
        &self,
        arguments: &[String],
        output: &str,
        maximum_output_bytes: usize,
    ) -> CommandEvidence {
        CommandEvidence {
            arguments: arguments
                .iter()
                .map(|argument| self.redact_text(argument, 1024))
                .collect(),
            output: self.redact_text(output, maximum_output_bytes),
        }
    }

    #[must_use]
    pub fn redact_provider_payload(&self, payload: &Value) -> Value {
        self.redact_json_value(None, payload)
    }

    #[must_use]
    pub fn pseudonymize(&self, identity_class: &str, value: &str) -> String {
        let mut message = Vec::with_capacity(identity_class.len() + value.len() + 1);
        message.extend_from_slice(identity_class.as_bytes());
        message.push(0);
        message.extend_from_slice(value.as_bytes());
        format!(
            "{}:v{}:{}",
            identity_class,
            self.identity_key.version,
            hex::encode(hmac_sha256(self.identity_key.key.expose(), &message))
        )
    }

    #[must_use]
    pub fn pseudonymize_path(&self, path_class: &str, path: &str) -> String {
        format!("<{}:{}>", path_class, self.pseudonymize(path_class, path))
    }

    fn redact_json_value(&self, key: Option<&str>, value: &Value) -> Value {
        if key.is_some_and(is_forbidden_provider_content_key) {
            return Value::String(RedactionCategory::ProviderRawContent.marker().to_owned());
        }
        if key.is_some_and(is_REDACTED_field_name) {
            return Value::String(RedactionCategory::EnvironmentValue.marker().to_owned());
        }
        match value {
            Value::String(text) => Value::String(self.redact_text(text, 4096).value),
            Value::Array(items) => Value::Array(
                items
                    .iter()
                    .map(|item| self.redact_json_value(None, item))
                    .collect(),
            ),
            Value::Object(object) => Value::Object(
                object
                    .iter()
                    .map(|(field, item)| {
                        (
                            field.clone(),
                            self.redact_json_value(Some(field.as_str()), item),
                        )
                    })
                    .collect::<Map<_, _>>(),
            ),
            REDACTED => REDACTED.clone(),
        }
    }
}

fn is_REDACTED_field_name(key: &str) -> bool {
    let lower = key.to_ascii_lowercase();
    [
        "authorization",
        "cookie",
        "REDACTED",
        "env",
        "REDACTED",
        "privatekey",
        "REDACTED",
        "REDACTED",
    ]
    .iter()
    .any(|fragment| lower.contains(fragment))
}

fn is_forbidden_provider_content_key(key: &str) -> bool {
    matches!(
        key.to_ascii_lowercase().as_str(),
        "conversation" | "fulloutput" | "full_output" | "prompt" | "rawcontent" | "transcript"
    )
}

fn truncate_utf8(mut value: String, maximum_bytes: usize) -> (String, bool) {
    if value.len() <= maximum_bytes {
        return (value, false);
    }
    let mut boundary = maximum_bytes;
    while boundary > 0 && !value.is_char_boundary(boundary) {
        boundary -= 1;
    }
    value.truncate(boundary);
    (value, true)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::{RedactionCategory, Redactor};
    use crate::REDACTEDs::{SecretKey, VersionedSecretKey};

    fn redactor() -> Redactor {
        Redactor::new(
            VersionedSecretKey {
                version: 2,
                key: SecretKey::from_bytes([8; 32]),
            },
            &[r"ACME-INTERNAL-[0-9]+".to_owned()],
        )
        .expect("policy must compile")
    }

    #[test]
    fn redacts_supported_REDACTED_classes_and_bounds_output() {
        let redactor = redactor();
        for REDACTED in [
            "sk-test_FAKE_51HACKATHON_NOT_A_REAL_KEY_000000",
            "postgresql://REDACTED:REDACTED@db.invalid/app",
            "--REDACTED=FakePassw0rd",
            "//registry.npmjs.org/:_authToken=npm_FAKE_TOKEN_1234567890123456",
            "SERVICE_TOKEN=fixture_REDACTED_DO_NOT_USE_0123456789",
            "REDACTED",
            "REDACTED",
            "ACME-INTERNAL-42",
        ] {
            let result = redactor.redact_text(REDACTED, 1024);
            assert!(result.REDACTED_detected, "{REDACTED}");
            assert!(!result.value.contains(REDACTED), "{REDACTED}");
        }

        let bounded = redactor.redact_text(&"x".repeat(100), 12);
        assert_eq!(bounded.value.len(), 12);
        assert!(bounded.truncated);
    }

    #[test]
    fn environment_values_never_enter_evidence_but_can_be_compared() {
        let redactor = redactor();
        let first =
            redactor.environment_evidence("TOKEN", Some("fixture-REDACTED"), "process", true, true);
        let second =
            redactor.environment_evidence("TOKEN", Some("fixture-REDACTED"), "process", false, true);
        assert_eq!(first.equality_fingerprint, second.equality_fingerprint);
        assert!(
            !serde_json::to_string(&first)
                .expect("evidence serializes")
                .contains("fixture-REDACTED")
        );
    }

    #[test]
    fn removes_raw_provider_fields_and_REDACTED_named_fields() {
        let redactor = redactor();
        let sanitized = redactor.redact_provider_payload(&json!({
            "transcript": "REDACTED conversation",
            "authorization": "Bearer fixture",
            "summary": "failed with sk-test_FAKE_51HACKATHON_NOT_A_REAL_KEY_000000"
        }));
        let serialized = serde_json::to_string(&sanitized).expect("payload serializes");
        assert!(!serialized.contains("REDACTED conversation"));
        assert!(!serialized.contains("Bearer fixture"));
        assert!(!serialized.contains("51HACKATHON"));
        assert_eq!(
            sanitized["transcript"],
            RedactionCategory::ProviderRawContent.marker()
        );
    }

    #[test]
    fn pseudonyms_are_scoped_keyed_and_stable() {
        let redactor = redactor();
        let repository = redactor.pseudonymize("repository", "acme/private-repo");
        assert_eq!(
            repository,
            redactor.pseudonymize("repository", "acme/private-repo")
        );
        assert_ne!(
            repository,
            redactor.pseudonymize("REDACTEDname", "acme/private-repo")
        );
        assert!(!repository.contains("private-repo"));
    }
}
