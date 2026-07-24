//! Canonical protocol validation and hashing shared with the cloud control plane.

use std::{error::Error, fmt, sync::LazyLock};

use serde_json::Value;
use sha2::{Digest, Sha256};

pub mod generated;

const PROTOCOL_SCHEMA: &str =
    include_str!("../../../../packages/contracts/schema/v1/protocol.bundle.schema.json");
static PROTOCOL_VALIDATOR: LazyLock<Result<jsonschema::Validator, String>> = LazyLock::new(|| {
    let schema: Value = serde_json::from_str(PROTOCOL_SCHEMA)
        .map_err(|error| format!("invalid embedded schema: {error}"))?;
    jsonschema::options()
        .should_validate_formats(true)
        .build(&schema)
        .map_err(|error| format!("schema compilation failed: {error}"))
});

/// A protocol document failed JSON decoding, schema validation, or canonicalization.
#[derive(Debug)]
pub struct ContractError {
    code: ContractErrorCode,
    message: String,
}

/// Stable, non-REDACTED-bearing classification for contract failures.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ContractErrorCode {
    InvalidJson,
    InvalidSchema,
    InvalidValue,
    UnsupportedSchemaVersion,
    CanonicalizationFailed,
}

impl ContractError {
    fn new(code: ContractErrorCode, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    /// Returns the stable error classification without exposing input content.
    #[must_use]
    pub const fn code(&self) -> ContractErrorCode {
        self.code
    }
}

impl fmt::Display for ContractError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl Error for ContractError {}

/// Parse a JSON document and validate it against the embedded canonical schema.
///
/// # Errors
///
/// Returns a classified [`ContractError`] when JSON decoding, version negotiation, schema
/// compilation, or document validation fails.
pub fn parse_and_validate(bytes: &[u8]) -> Result<Value, ContractError> {
    let value = serde_json::from_slice(bytes).map_err(|error| {
        ContractError::new(
            ContractErrorCode::InvalidJson,
            format!(
                "invalid protocol JSON at line {} column {}",
                error.line(),
                error.column()
            ),
        )
    })?;
    validate_value(&value)?;
    Ok(value)
}

/// Parse, validate, canonicalize, and decode a document into the generated Rust wire type.
///
/// Canonicalization normalizes equivalent JSON number spellings before Serde decodes integer
/// fields, while leaving timestamp strings byte-for-byte unchanged.
///
/// # Errors
///
/// Returns a classified [`ContractError`] when validation, canonicalization, or generated-type
/// decoding fails.
pub fn parse_typed(bytes: &[u8]) -> Result<generated::ProtocolDocumentV1, ContractError> {
    let value = parse_and_validate(bytes)?;
    let canonical = canonical_json(&value)?;
    serde_json::from_slice(&canonical).map_err(|_| {
        ContractError::new(
            ContractErrorCode::InvalidValue,
            "validated protocol document could not be decoded by generated types",
        )
    })
}

/// Validate an already parsed JSON document against the embedded canonical schema.
///
/// # Errors
///
/// Returns a classified [`ContractError`] for an unsupported version, an invalid embedded schema,
/// or a document that does not satisfy the canonical schema.
pub fn validate_value(value: &Value) -> Result<(), ContractError> {
    let supported_version = value
        .get("schemaVersion")
        .and_then(Value::as_number)
        .is_some_and(|number| {
            number.as_u64() == Some(1) || number.as_i64() == Some(1) || number.as_f64() == Some(1.0)
        });
    if !supported_version {
        return Err(ContractError::new(
            ContractErrorCode::UnsupportedSchemaVersion,
            "unsupported protocol schema version",
        ));
    }

    let validator = PROTOCOL_VALIDATOR
        .as_ref()
        .map_err(|message| ContractError::new(ContractErrorCode::InvalidSchema, message.clone()))?;

    validator.validate(value).map_err(|_| {
        ContractError::new(
            ContractErrorCode::InvalidValue,
            "protocol schema validation failed",
        )
    })
}

/// Serialize a JSON value using RFC 8785 JSON Canonicalization Scheme bytes.
///
/// # Errors
///
/// Returns [`ContractErrorCode::CanonicalizationFailed`] when the value cannot be represented by
/// the canonicalizer.
pub fn canonical_json(value: &Value) -> Result<Vec<u8>, ContractError> {
    serde_json_canonicalizer::to_vec(value).map_err(|_| {
        ContractError::new(
            ContractErrorCode::CanonicalizationFailed,
            "protocol canonicalization failed",
        )
    })
}

/// Compute the protocol's lowercase, prefixed SHA-256 content identity.
///
/// # Errors
///
/// Returns a [`ContractError`] when canonical serialization fails.
pub fn canonical_sha256(value: &Value) -> Result<String, ContractError> {
    let bytes = canonical_json(value)?;
    let digest = Sha256::digest(bytes);
    Ok(format!("sha256:{}", hex::encode(digest)))
}

#[cfg(test)]
mod tests {
    use serde::Deserialize;
    use serde_json::Value;

    use super::{
        ContractErrorCode, canonical_sha256, generated::ProtocolDocumentV1, parse_typed,
        validate_value,
    };

    const VALID_FIXTURES: &str =
        include_str!("../../../../tests/contract/fixtures/valid/protocol-documents.v1.json");
    const INVALID_FIXTURES: &str =
        include_str!("../../../../tests/contract/fixtures/invalid/protocol-documents.v1.json");
    const ADDITIVE_FIXTURES: &str =
        include_str!("../../../../tests/contract/fixtures/compatibility/additive-session.v1.json");

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ValidFixtureSet {
        document_count: usize,
        documents: Vec<ValidFixture>,
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct ValidFixture {
        wire_kind: String,
        canonical_digest: String,
        document: Value,
    }

    #[derive(Debug, Deserialize)]
    struct InvalidFixtureSet {
        cases: Vec<InvalidFixture>,
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct InvalidFixture {
        case_id: String,
        expected_error_code: String,
        document: Value,
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct AdditiveFixtureSet {
        base_document: Value,
        document_with_optional_field: Value,
        numeric_version_encodings: Vec<NumericVersionFixture>,
        timestamp_documents: Vec<TimestampFixture>,
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct NumericVersionFixture {
        encoding: String,
        json: String,
        canonical_digest: String,
    }

    #[derive(Debug, Deserialize)]
    #[serde(rename_all = "camelCase")]
    struct TimestampFixture {
        encoding: String,
        canonical_digest: String,
        document: Value,
    }

    fn assert_graph_variant(wire_kind: &str, document: &ProtocolDocumentV1) {
        let correct = matches!(
            (wire_kind, document),
            ("declared_graph", ProtocolDocumentV1::DeclaredGraph(_))
                | ("locked_graph", ProtocolDocumentV1::LockedGraph(_))
                | ("resolved_graph", ProtocolDocumentV1::ResolvedGraph(_))
                | ("installed_graph", ProtocolDocumentV1::InstalledGraph(_))
                | ("used_graph", ProtocolDocumentV1::UsedGraph(_))
                | (
                    "observed_action_graph",
                    ProtocolDocumentV1::ObservedActionGraph(_)
                )
                | ("validated_graph", ProtocolDocumentV1::ValidatedGraph(_))
        );
        if wire_kind.ends_with("_graph") {
            assert!(correct, "wrong generated Rust variant for {wire_kind}");
        }
    }

    #[test]
    fn rust_types_round_trip_every_public_wire_payload() {
        let fixture_set: ValidFixtureSet =
            serde_json::from_str(VALID_FIXTURES).expect("valid fixture file must parse");

        assert_eq!(fixture_set.document_count, 67);
        assert_eq!(fixture_set.documents.len(), fixture_set.document_count);

        for fixture in fixture_set.documents {
            validate_value(&fixture.document).unwrap_or_else(|error| {
                panic!("{} failed schema validation: {error}", fixture.wire_kind)
            });
            let typed: ProtocolDocumentV1 = serde_json::from_value(fixture.document.clone())
                .unwrap_or_else(|error| {
                    panic!(
                        "{} failed generated Rust decoding: {error}",
                        fixture.wire_kind
                    )
                });
            assert_graph_variant(&fixture.wire_kind, &typed);
            let round_tripped = serde_json::to_value(typed).unwrap_or_else(|error| {
                panic!(
                    "{} failed generated Rust encoding: {error}",
                    fixture.wire_kind
                )
            });

            validate_value(&round_tripped).unwrap_or_else(|error| {
                panic!(
                    "{} produced an invalid Rust round trip: {error}",
                    fixture.wire_kind
                )
            });
            assert_eq!(
                canonical_sha256(&round_tripped).expect("fixture must canonicalize"),
                fixture.canonical_digest,
                "{}",
                fixture.wire_kind
            );
        }
    }

    #[test]
    fn rust_runtime_rejects_all_negative_golden_fixtures() {
        let fixture_set: InvalidFixtureSet =
            serde_json::from_str(INVALID_FIXTURES).expect("invalid fixture file must parse");

        for fixture in fixture_set.cases {
            let error = validate_value(&fixture.document)
                .expect_err("negative fixture must not satisfy the protocol schema");
            let expected = if fixture.expected_error_code == "unsupported_schema_version" {
                ContractErrorCode::UnsupportedSchemaVersion
            } else {
                ContractErrorCode::InvalidValue
            };
            assert_eq!(error.code(), expected, "{}", fixture.case_id);
        }
    }

    #[test]
    fn rust_runtime_accepts_the_additive_optional_field_fixture() {
        let fixtures: AdditiveFixtureSet =
            serde_json::from_str(ADDITIVE_FIXTURES).expect("additive fixture file must parse");

        for document in [
            fixtures.base_document,
            fixtures.document_with_optional_field,
        ] {
            validate_value(&document).expect("additive fixture must satisfy the protocol schema");
            let typed: ProtocolDocumentV1 =
                serde_json::from_value(document.clone()).expect("additive fixture must decode");
            assert_eq!(
                serde_json::to_value(typed).expect("additive fixture must encode"),
                document
            );
        }

        for fixture in fixtures.numeric_version_encodings {
            let typed = parse_typed(fixture.json.as_bytes()).unwrap_or_else(|error| {
                panic!(
                    "{} schema-version encoding failed: {error}",
                    fixture.encoding
                )
            });
            let round_tripped =
                serde_json::to_value(typed).expect("numeric schema-version fixture must encode");
            assert_eq!(
                canonical_sha256(&round_tripped).expect("numeric fixture must canonicalize"),
                fixture.canonical_digest,
                "{}",
                fixture.encoding
            );
        }

        for fixture in fixtures.timestamp_documents {
            let bytes =
                serde_json::to_vec(&fixture.document).expect("timestamp fixture must encode");
            let typed = parse_typed(&bytes).unwrap_or_else(|error| {
                panic!("{} timestamp fixture failed: {error}", fixture.encoding)
            });
            let round_tripped =
                serde_json::to_value(typed).expect("timestamp fixture must round trip");
            assert_eq!(round_tripped, fixture.document, "{}", fixture.encoding);
            assert_eq!(
                canonical_sha256(&round_tripped).expect("timestamp fixture must canonicalize"),
                fixture.canonical_digest,
                "{}",
                fixture.encoding
            );
        }
    }
}
