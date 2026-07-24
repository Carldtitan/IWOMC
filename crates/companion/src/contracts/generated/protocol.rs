#![allow(clippy::all, clippy::pedantic)]
/// Error types.
pub mod error {
    /// Error from a `TryFrom` or `FromStr` implementation.
    pub struct ConversionError(::std::borrow::Cow<'static, str>);
    impl ::std::error::Error for ConversionError {}
    impl ::std::fmt::Display for ConversionError {
        fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> Result<(), ::std::fmt::Error> {
            ::std::fmt::Display::fmt(&self.0, f)
        }
    }
    impl ::std::fmt::Debug for ConversionError {
        fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> Result<(), ::std::fmt::Error> {
            ::std::fmt::Debug::fmt(&self.0, f)
        }
    }
    impl From<&'static str> for ConversionError {
        fn from(value: &'static str) -> Self {
            Self(value.into())
        }
    }
    impl From<String> for ConversionError {
        fn from(value: String) -> Self {
            Self(value.into())
        }
    }
}
///`ActionEnvelope`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "actionId",
///    "attribution",
///    "effectAssessment",
///    "eventIds",
///    "gapIds",
///    "kind",
///    "overlappingActionIds",
///    "postSnapshotState",
///    "preSnapshotState",
///    "projectId",
///    "providerEventState",
///    "realmId",
///    "schemaVersion",
///    "stabilization",
///    "workspaceId"
///  ],
///  "properties": {
///    "actionId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "attribution": {
///      "$ref": "#/$defs/ActorAttribution"
///    },
///    "effectAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "eventIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 2048,
///      "minItems": 1
///    },
///    "gapIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256
///    },
///    "kind": {
///      "enum": [
///        "action_envelope"
///      ]
///    },
///    "layerId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "overlappingActionIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256
///    },
///    "postSnapshotId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "postSnapshotState": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "preSnapshotId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "preSnapshotState": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "providerEventId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "providerEventState": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "stabilization": {
///      "type": "string",
///      "enum": [
///        "stable",
///        "timed_out",
///        "overlapping"
///      ]
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ActionEnvelope {
    #[serde(rename = "actionId")]
    pub action_id: EntityId,
    pub attribution: ActorAttribution,
    #[serde(rename = "effectAssessment")]
    pub effect_assessment: Assessment,
    #[serde(rename = "eventIds")]
    pub event_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "gapIds")]
    pub gap_ids: ::std::vec::Vec<EntityId>,
    pub kind: ActionEnvelopeKind,
    #[serde(
        rename = "layerId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub layer_id: ::std::option::Option<EntityId>,
    #[serde(rename = "overlappingActionIds")]
    pub overlapping_action_ids: ::std::vec::Vec<EntityId>,
    #[serde(
        rename = "postSnapshotId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub post_snapshot_id: ::std::option::Option<EntityId>,
    #[serde(rename = "postSnapshotState")]
    pub post_snapshot_state: Assessment,
    #[serde(
        rename = "preSnapshotId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub pre_snapshot_id: ::std::option::Option<EntityId>,
    #[serde(rename = "preSnapshotState")]
    pub pre_snapshot_state: Assessment,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(
        rename = "providerEventId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub provider_event_id: ::std::option::Option<EntityId>,
    #[serde(rename = "providerEventState")]
    pub provider_event_state: Assessment,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub stabilization: ActionEnvelopeStabilization,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ActionEnvelopeKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "action_envelope"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ActionEnvelopeKind {
    #[serde(rename = "action_envelope")]
    ActionEnvelope,
}
impl ::std::fmt::Display for ActionEnvelopeKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ActionEnvelope => f.write_str("action_envelope"),
        }
    }
}
impl ::std::str::FromStr for ActionEnvelopeKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "action_envelope" => Ok(Self::ActionEnvelope),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ActionEnvelopeKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ActionEnvelopeKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ActionEnvelopeKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ActionEnvelopeStabilization`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "stable",
///    "timed_out",
///    "overlapping"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ActionEnvelopeStabilization {
    #[serde(rename = "stable")]
    Stable,
    #[serde(rename = "timed_out")]
    TimedOut,
    #[serde(rename = "overlapping")]
    Overlapping,
}
impl ::std::fmt::Display for ActionEnvelopeStabilization {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Stable => f.write_str("stable"),
            Self::TimedOut => f.write_str("timed_out"),
            Self::Overlapping => f.write_str("overlapping"),
        }
    }
}
impl ::std::str::FromStr for ActionEnvelopeStabilization {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "stable" => Ok(Self::Stable),
            "timed_out" => Ok(Self::TimedOut),
            "overlapping" => Ok(Self::Overlapping),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ActionEnvelopeStabilization {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ActionEnvelopeStabilization {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ActionEnvelopeStabilization {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ActorAttribution`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "approval",
///    "classification",
///    "confidence",
///    "executorActor",
///    "factors",
///    "initiatorActor"
///  ],
///  "properties": {
///    "approval": {
///      "$ref": "#/$defs/ApprovalEvidence"
///    },
///    "classification": {
///      "type": "string",
///      "enum": [
///        "human",
///        "agent",
///        "subagent",
///        "system",
///        "mixed",
///        "unknown"
///      ]
///    },
///    "confidence": {
///      "$ref": "#/$defs/Confidence"
///    },
///    "executorActor": {
///      "$ref": "#/$defs/ActorReference"
///    },
///    "factors": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 128
///    },
///    "initiatorActor": {
///      "$ref": "#/$defs/ActorReference"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ActorAttribution {
    pub approval: ApprovalEvidence,
    pub classification: ActorAttributionClassification,
    pub confidence: Confidence,
    #[serde(rename = "executorActor")]
    pub executor_actor: ActorReference,
    pub factors: ::std::vec::Vec<ShortString>,
    #[serde(rename = "initiatorActor")]
    pub initiator_actor: ActorReference,
}
///`ActorAttributionClassification`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "human",
///    "agent",
///    "subagent",
///    "system",
///    "mixed",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ActorAttributionClassification {
    #[serde(rename = "human")]
    Human,
    #[serde(rename = "agent")]
    Agent,
    #[serde(rename = "subagent")]
    Subagent,
    #[serde(rename = "system")]
    System,
    #[serde(rename = "mixed")]
    Mixed,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for ActorAttributionClassification {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Human => f.write_str("human"),
            Self::Agent => f.write_str("agent"),
            Self::Subagent => f.write_str("subagent"),
            Self::System => f.write_str("system"),
            Self::Mixed => f.write_str("mixed"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for ActorAttributionClassification {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "human" => Ok(Self::Human),
            "agent" => Ok(Self::Agent),
            "subagent" => Ok(Self::Subagent),
            "system" => Ok(Self::System),
            "mixed" => Ok(Self::Mixed),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ActorAttributionClassification {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ActorAttributionClassification {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ActorAttributionClassification {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ActorReference`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "actorClass",
///    "identityState"
///  ],
///  "properties": {
///    "actorClass": {
///      "type": "string",
///      "enum": [
///        "human",
///        "agent",
///        "subagent",
///        "system",
///        "mixed",
///        "unknown"
///      ]
///    },
///    "identityState": {
///      "type": "string",
///      "enum": [
///        "pseudonymous",
///        "unknown",
///        "not_applicable"
///      ]
///    },
///    "provider": {
///      "$ref": "#/$defs/ProviderName"
///    },
///    "pseudonymousId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ActorReference {
    #[serde(rename = "actorClass")]
    pub actor_class: ActorReferenceActorClass,
    #[serde(rename = "identityState")]
    pub identity_state: ActorReferenceIdentityState,
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub provider: ::std::option::Option<ProviderName>,
    #[serde(
        rename = "pseudonymousId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub pseudonymous_id: ::std::option::Option<EntityId>,
}
///`ActorReferenceActorClass`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "human",
///    "agent",
///    "subagent",
///    "system",
///    "mixed",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ActorReferenceActorClass {
    #[serde(rename = "human")]
    Human,
    #[serde(rename = "agent")]
    Agent,
    #[serde(rename = "subagent")]
    Subagent,
    #[serde(rename = "system")]
    System,
    #[serde(rename = "mixed")]
    Mixed,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for ActorReferenceActorClass {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Human => f.write_str("human"),
            Self::Agent => f.write_str("agent"),
            Self::Subagent => f.write_str("subagent"),
            Self::System => f.write_str("system"),
            Self::Mixed => f.write_str("mixed"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for ActorReferenceActorClass {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "human" => Ok(Self::Human),
            "agent" => Ok(Self::Agent),
            "subagent" => Ok(Self::Subagent),
            "system" => Ok(Self::System),
            "mixed" => Ok(Self::Mixed),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ActorReferenceActorClass {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ActorReferenceActorClass {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ActorReferenceActorClass {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ActorReferenceIdentityState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "pseudonymous",
///    "unknown",
///    "not_applicable"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ActorReferenceIdentityState {
    #[serde(rename = "pseudonymous")]
    Pseudonymous,
    #[serde(rename = "unknown")]
    Unknown,
    #[serde(rename = "not_applicable")]
    NotApplicable,
}
impl ::std::fmt::Display for ActorReferenceIdentityState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Pseudonymous => f.write_str("pseudonymous"),
            Self::Unknown => f.write_str("unknown"),
            Self::NotApplicable => f.write_str("not_applicable"),
        }
    }
}
impl ::std::str::FromStr for ActorReferenceIdentityState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "pseudonymous" => Ok(Self::Pseudonymous),
            "unknown" => Ok(Self::Unknown),
            "not_applicable" => Ok(Self::NotApplicable),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ActorReferenceIdentityState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ActorReferenceIdentityState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ActorReferenceIdentityState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`AdapterInventoryResult`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "adapterId",
///    "adapterVersion",
///    "assessment",
///    "diagnosticCodes",
///    "graphObjectIds",
///    "supportLevel"
///  ],
///  "properties": {
///    "adapterId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "adapterVersion": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "assessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "diagnosticCodes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256
///    },
///    "graphObjectIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256
///    },
///    "supportLevel": {
///      "$ref": "#/$defs/SupportLevel"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct AdapterInventoryResult {
    #[serde(rename = "adapterId")]
    pub adapter_id: EntityId,
    #[serde(rename = "adapterVersion")]
    pub adapter_version: ShortString,
    pub assessment: Assessment,
    #[serde(rename = "diagnosticCodes")]
    pub diagnostic_codes: ::std::vec::Vec<ShortString>,
    #[serde(rename = "graphObjectIds")]
    pub graph_object_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "supportLevel")]
    pub support_level: SupportLevel,
}
///`ApiErrorResponse`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "error",
///    "kind",
///    "occurredAt",
///    "requestId",
///    "schemaVersion"
///  ],
///  "properties": {
///    "error": {
///      "$ref": "#/$defs/ProtocolError"
///    },
///    "kind": {
///      "enum": [
///        "api_error_response"
///      ]
///    },
///    "occurredAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "requestId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ApiErrorResponse {
    pub error: ProtocolError,
    pub kind: ApiErrorResponseKind,
    #[serde(rename = "occurredAt")]
    pub occurred_at: Rfc3339Timestamp,
    #[serde(rename = "requestId")]
    pub request_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`ApiErrorResponseKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "api_error_response"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ApiErrorResponseKind {
    #[serde(rename = "api_error_response")]
    ApiErrorResponse,
}
impl ::std::fmt::Display for ApiErrorResponseKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ApiErrorResponse => f.write_str("api_error_response"),
        }
    }
}
impl ::std::str::FromStr for ApiErrorResponseKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "api_error_response" => Ok(Self::ApiErrorResponse),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ApiErrorResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ApiErrorResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ApiErrorResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`AppliedCandidateState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "approvalId",
///    "attestationId",
///    "externalOperationId",
///    "state"
///  ],
///  "properties": {
///    "approvalId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "attestationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "externalOperationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "state": {
///      "enum": [
///        "applied"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct AppliedCandidateState {
    #[serde(rename = "approvalId")]
    pub approval_id: EntityId,
    #[serde(rename = "attestationId")]
    pub attestation_id: EntityId,
    #[serde(rename = "externalOperationId")]
    pub external_operation_id: EntityId,
    pub state: AppliedCandidateStateState,
}
///`AppliedCandidateStateState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "applied"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AppliedCandidateStateState {
    #[serde(rename = "applied")]
    Applied,
}
impl ::std::fmt::Display for AppliedCandidateStateState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Applied => f.write_str("applied"),
        }
    }
}
impl ::std::str::FromStr for AppliedCandidateStateState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "applied" => Ok(Self::Applied),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AppliedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AppliedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AppliedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Approval`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "actorId",
///    "actorRole",
///    "approvalId",
///    "attestationId",
///    "candidateId",
///    "candidatePatchDigest",
///    "commentAssessment",
///    "decidedAt",
///    "decision",
///    "idempotencyKey",
///    "kind",
///    "projectId",
///    "recommendationId",
///    "schemaVersion",
///    "sourceInputDigest",
///    "workspaceId"
///  ],
///  "properties": {
///    "actorId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "actorRole": {
///      "type": "string",
///      "enum": [
///        "owner",
///        "maintainer"
///      ]
///    },
///    "approvalId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "attestationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "candidateId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "candidatePatchDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "comment": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "commentAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "decidedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "decision": {
///      "type": "string",
///      "enum": [
///        "approved",
///        "rejected",
///        "revoked"
///      ]
///    },
///    "idempotencyKey": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "approval"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "recommendationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sourceInputDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Approval {
    #[serde(rename = "actorId")]
    pub actor_id: EntityId,
    #[serde(rename = "actorRole")]
    pub actor_role: ApprovalActorRole,
    #[serde(rename = "approvalId")]
    pub approval_id: EntityId,
    #[serde(rename = "attestationId")]
    pub attestation_id: EntityId,
    #[serde(rename = "candidateId")]
    pub candidate_id: EntityId,
    #[serde(rename = "candidatePatchDigest")]
    pub candidate_patch_digest: Sha256Digest,
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub comment: ::std::option::Option<BoundedString>,
    #[serde(rename = "commentAssessment")]
    pub comment_assessment: Assessment,
    #[serde(rename = "decidedAt")]
    pub decided_at: Rfc3339Timestamp,
    pub decision: ApprovalDecision,
    #[serde(rename = "idempotencyKey")]
    pub idempotency_key: EntityId,
    pub kind: ApprovalKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "recommendationId")]
    pub recommendation_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sourceInputDigest")]
    pub source_input_digest: Sha256Digest,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ApprovalActorRole`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "owner",
///    "maintainer"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ApprovalActorRole {
    #[serde(rename = "owner")]
    Owner,
    #[serde(rename = "maintainer")]
    Maintainer,
}
impl ::std::fmt::Display for ApprovalActorRole {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Owner => f.write_str("owner"),
            Self::Maintainer => f.write_str("maintainer"),
        }
    }
}
impl ::std::str::FromStr for ApprovalActorRole {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "owner" => Ok(Self::Owner),
            "maintainer" => Ok(Self::Maintainer),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ApprovalActorRole {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ApprovalActorRole {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ApprovalActorRole {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ApprovalDecision`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "approved",
///    "rejected",
///    "revoked"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ApprovalDecision {
    #[serde(rename = "approved")]
    Approved,
    #[serde(rename = "rejected")]
    Rejected,
    #[serde(rename = "revoked")]
    Revoked,
}
impl ::std::fmt::Display for ApprovalDecision {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Approved => f.write_str("approved"),
            Self::Rejected => f.write_str("rejected"),
            Self::Revoked => f.write_str("revoked"),
        }
    }
}
impl ::std::str::FromStr for ApprovalDecision {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "approved" => Ok(Self::Approved),
            "rejected" => Ok(Self::Rejected),
            "revoked" => Ok(Self::Revoked),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ApprovalDecision {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ApprovalDecision {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ApprovalDecision {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ApprovalEvidence`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "actor",
///    "decision",
///    "modifiedBeforeExecution"
///  ],
///  "properties": {
///    "actor": {
///      "$ref": "#/$defs/ActorReference"
///    },
///    "decision": {
///      "type": "string",
///      "enum": [
///        "approved",
///        "denied",
///        "not_required",
///        "unknown"
///      ]
///    },
///    "modifiedBeforeExecution": {
///      "type": "boolean"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ApprovalEvidence {
    pub actor: ActorReference,
    pub decision: ApprovalEvidenceDecision,
    #[serde(rename = "modifiedBeforeExecution")]
    pub modified_before_execution: bool,
}
///`ApprovalEvidenceDecision`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "approved",
///    "denied",
///    "not_required",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ApprovalEvidenceDecision {
    #[serde(rename = "approved")]
    Approved,
    #[serde(rename = "denied")]
    Denied,
    #[serde(rename = "not_required")]
    NotRequired,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for ApprovalEvidenceDecision {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Approved => f.write_str("approved"),
            Self::Denied => f.write_str("denied"),
            Self::NotRequired => f.write_str("not_required"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for ApprovalEvidenceDecision {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "approved" => Ok(Self::Approved),
            "denied" => Ok(Self::Denied),
            "not_required" => Ok(Self::NotRequired),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ApprovalEvidenceDecision {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ApprovalEvidenceDecision {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ApprovalEvidenceDecision {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ApprovalKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "approval"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ApprovalKind {
    #[serde(rename = "approval")]
    Approval,
}
impl ::std::fmt::Display for ApprovalKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Approval => f.write_str("approval"),
        }
    }
}
impl ::std::str::FromStr for ApprovalKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "approval" => Ok(Self::Approval),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ApprovalKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ApprovalKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ApprovalKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ApprovedCandidateState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "approvalId",
///    "attestationId",
///    "state"
///  ],
///  "properties": {
///    "approvalId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "attestationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "state": {
///      "enum": [
///        "approved"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ApprovedCandidateState {
    #[serde(rename = "approvalId")]
    pub approval_id: EntityId,
    #[serde(rename = "attestationId")]
    pub attestation_id: EntityId,
    pub state: ApprovedCandidateStateState,
}
///`ApprovedCandidateStateState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "approved"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ApprovedCandidateStateState {
    #[serde(rename = "approved")]
    Approved,
}
impl ::std::fmt::Display for ApprovedCandidateStateState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Approved => f.write_str("approved"),
        }
    }
}
impl ::std::str::FromStr for ApprovedCandidateStateState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "approved" => Ok(Self::Approved),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ApprovedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ApprovedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ApprovedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Assessment`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "evidenceReferenceIds",
///    "reasonCodes",
///    "state"
///  ],
///  "properties": {
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512
///    },
///    "reasonCodes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 128
///    },
///    "state": {
///      "$ref": "#/$defs/AssessmentState"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Assessment {
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "reasonCodes")]
    pub reason_codes: ::std::vec::Vec<ShortString>,
    pub state: AssessmentState,
}
///`AssessmentState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "known",
///    "unknown",
///    "partial",
///    "not_applicable",
///    "unsupported",
///    "inconclusive"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AssessmentState {
    #[serde(rename = "known")]
    Known,
    #[serde(rename = "unknown")]
    Unknown,
    #[serde(rename = "partial")]
    Partial,
    #[serde(rename = "not_applicable")]
    NotApplicable,
    #[serde(rename = "unsupported")]
    Unsupported,
    #[serde(rename = "inconclusive")]
    Inconclusive,
}
impl ::std::fmt::Display for AssessmentState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Known => f.write_str("known"),
            Self::Unknown => f.write_str("unknown"),
            Self::Partial => f.write_str("partial"),
            Self::NotApplicable => f.write_str("not_applicable"),
            Self::Unsupported => f.write_str("unsupported"),
            Self::Inconclusive => f.write_str("inconclusive"),
        }
    }
}
impl ::std::str::FromStr for AssessmentState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "known" => Ok(Self::Known),
            "unknown" => Ok(Self::Unknown),
            "partial" => Ok(Self::Partial),
            "not_applicable" => Ok(Self::NotApplicable),
            "unsupported" => Ok(Self::Unsupported),
            "inconclusive" => Ok(Self::Inconclusive),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AssessmentState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AssessmentState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AssessmentState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`AttestedTarget`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "cacheAssessment",
///    "immutableBase",
///    "targetDigest",
///    "targetId",
///    "validationJobDigest"
///  ],
///  "properties": {
///    "cacheAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "cacheIdentity": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "immutableBase": {
///      "$ref": "#/$defs/ImmutableBaseIdentity"
///    },
///    "targetDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "targetId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "validationJobDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct AttestedTarget {
    #[serde(rename = "cacheAssessment")]
    pub cache_assessment: Assessment,
    #[serde(
        rename = "cacheIdentity",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub cache_identity: ::std::option::Option<Sha256Digest>,
    #[serde(rename = "immutableBase")]
    pub immutable_base: ImmutableBaseIdentity,
    #[serde(rename = "targetDigest")]
    pub target_digest: Sha256Digest,
    #[serde(rename = "targetId")]
    pub target_id: EntityId,
    #[serde(rename = "validationJobDigest")]
    pub validation_job_digest: Sha256Digest,
}
///`AuditEvent`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "action",
///    "actorId",
///    "actorType",
///    "auditEventId",
///    "idempotencyKeyAssessment",
///    "kind",
///    "metadata",
///    "newStateDigestAssessment",
///    "occurredAt",
///    "priorStateDigestAssessment",
///    "projectAssessment",
///    "schemaVersion",
///    "targetId",
///    "targetType",
///    "workspaceId"
///  ],
///  "properties": {
///    "action": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "actorId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "actorType": {
///      "type": "string",
///      "enum": [
///        "REDACTED",
///        "device",
///        "service",
///        "provider"
///      ]
///    },
///    "auditEventId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "idempotencyKey": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "idempotencyKeyAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "kind": {
///      "enum": [
///        "audit_event"
///      ]
///    },
///    "metadata": {
///      "$ref": "#/$defs/StringMap"
///    },
///    "newStateDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "newStateDigestAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "occurredAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "priorStateDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "priorStateDigestAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "projectAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "targetId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "targetType": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct AuditEvent {
    pub action: ShortString,
    #[serde(rename = "actorId")]
    pub actor_id: EntityId,
    #[serde(rename = "actorType")]
    pub actor_type: AuditEventActorType,
    #[serde(rename = "auditEventId")]
    pub audit_event_id: EntityId,
    #[serde(
        rename = "idempotencyKey",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub idempotency_key: ::std::option::Option<EntityId>,
    #[serde(rename = "idempotencyKeyAssessment")]
    pub idempotency_key_assessment: Assessment,
    pub kind: AuditEventKind,
    pub metadata: StringMap,
    #[serde(
        rename = "newStateDigest",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub new_state_digest: ::std::option::Option<Sha256Digest>,
    #[serde(rename = "newStateDigestAssessment")]
    pub new_state_digest_assessment: Assessment,
    #[serde(rename = "occurredAt")]
    pub occurred_at: Rfc3339Timestamp,
    #[serde(
        rename = "priorStateDigest",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub prior_state_digest: ::std::option::Option<Sha256Digest>,
    #[serde(rename = "priorStateDigestAssessment")]
    pub prior_state_digest_assessment: Assessment,
    #[serde(rename = "projectAssessment")]
    pub project_assessment: Assessment,
    #[serde(
        rename = "projectId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub project_id: ::std::option::Option<EntityId>,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "targetId")]
    pub target_id: EntityId,
    #[serde(rename = "targetType")]
    pub target_type: ShortString,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`AuditEventActorType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "REDACTED",
///    "device",
///    "service",
///    "provider"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AuditEventActorType {
    #[serde(rename = "REDACTED")]
    User,
    #[serde(rename = "device")]
    Device,
    #[serde(rename = "service")]
    Service,
    #[serde(rename = "provider")]
    Provider,
}
impl ::std::fmt::Display for AuditEventActorType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::User => f.write_str("REDACTED"),
            Self::Device => f.write_str("device"),
            Self::Service => f.write_str("service"),
            Self::Provider => f.write_str("provider"),
        }
    }
}
impl ::std::str::FromStr for AuditEventActorType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "REDACTED" => Ok(Self::User),
            "device" => Ok(Self::Device),
            "service" => Ok(Self::Service),
            "provider" => Ok(Self::Provider),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AuditEventActorType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AuditEventActorType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AuditEventActorType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`AuditEventKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "audit_event"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum AuditEventKind {
    #[serde(rename = "audit_event")]
    AuditEvent,
}
impl ::std::fmt::Display for AuditEventKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::AuditEvent => f.write_str("audit_event"),
        }
    }
}
impl ::std::str::FromStr for AuditEventKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "audit_event" => Ok(Self::AuditEvent),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for AuditEventKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for AuditEventKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for AuditEventKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Base64`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 16384,
///  "minLength": 4,
///  "pattern": "^[A-Za-z0-9+/]+={0,2}$"
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct Base64(::std::string::String);
impl ::std::ops::Deref for Base64 {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<Base64> for ::std::string::String {
    fn from(value: Base64) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for Base64 {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 16384usize {
            return Err("longer than 16384 characters".into());
        }
        if value.chars().count() < 4usize {
            return Err("shorter than 4 characters".into());
        }
        static PATTERN: ::std::sync::LazyLock<::regress::Regex> =
            ::std::sync::LazyLock::new(|| ::regress::Regex::new("^[A-Za-z0-9+/]+={0,2}$").unwrap());
        if PATTERN.find(value).is_none() {
            return Err("doesn't match pattern \"^[A-Za-z0-9+/]+={0,2}$\"".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for Base64 {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for Base64 {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for Base64 {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for Base64 {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`Base64Url`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 16384,
///  "minLength": 4,
///  "pattern": "^[A-Za-z0-9_-]+={0,2}$"
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct Base64Url(::std::string::String);
impl ::std::ops::Deref for Base64Url {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<Base64Url> for ::std::string::String {
    fn from(value: Base64Url) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for Base64Url {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 16384usize {
            return Err("longer than 16384 characters".into());
        }
        if value.chars().count() < 4usize {
            return Err("shorter than 4 characters".into());
        }
        static PATTERN: ::std::sync::LazyLock<::regress::Regex> =
            ::std::sync::LazyLock::new(|| ::regress::Regex::new("^[A-Za-z0-9_-]+={0,2}$").unwrap());
        if PATTERN.find(value).is_none() {
            return Err("doesn't match pattern \"^[A-Za-z0-9_-]+={0,2}$\"".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for Base64Url {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for Base64Url {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for Base64Url {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for Base64Url {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`BehaviorAssertion`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "assertionId",
///    "expected",
///    "kind",
///    "operator",
///    "required",
///    "subject"
///  ],
///  "properties": {
///    "assertionId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "expected": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "kind": {
///      "type": "string",
///      "enum": [
///        "exit_status",
///        "file_exists",
///        "file_absent",
///        "stdout_matches",
///        "stderr_matches",
///        "http_status",
///        "duration_under",
///        "dependency_graph"
///      ]
///    },
///    "operator": {
///      "type": "string",
///      "enum": [
///        "equals",
///        "not_equals",
///        "contains",
///        "matches",
///        "exists",
///        "absent",
///        "less_than",
///        "greater_than"
///      ]
///    },
///    "required": {
///      "type": "boolean"
///    },
///    "subject": {
///      "$ref": "#/$defs/BoundedString"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct BehaviorAssertion {
    #[serde(rename = "assertionId")]
    pub assertion_id: EntityId,
    pub expected: BoundedString,
    pub kind: BehaviorAssertionKind,
    pub operator: BehaviorAssertionOperator,
    pub required: bool,
    pub subject: BoundedString,
}
///`BehaviorAssertionKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "exit_status",
///    "file_exists",
///    "file_absent",
///    "stdout_matches",
///    "stderr_matches",
///    "http_status",
///    "duration_under",
///    "dependency_graph"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum BehaviorAssertionKind {
    #[serde(rename = "exit_status")]
    ExitStatus,
    #[serde(rename = "file_exists")]
    FileExists,
    #[serde(rename = "file_absent")]
    FileAbsent,
    #[serde(rename = "stdout_matches")]
    StdoutMatches,
    #[serde(rename = "stderr_matches")]
    StderrMatches,
    #[serde(rename = "http_status")]
    HttpStatus,
    #[serde(rename = "duration_under")]
    DurationUnder,
    #[serde(rename = "dependency_graph")]
    DependencyGraph,
}
impl ::std::fmt::Display for BehaviorAssertionKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ExitStatus => f.write_str("exit_status"),
            Self::FileExists => f.write_str("file_exists"),
            Self::FileAbsent => f.write_str("file_absent"),
            Self::StdoutMatches => f.write_str("stdout_matches"),
            Self::StderrMatches => f.write_str("stderr_matches"),
            Self::HttpStatus => f.write_str("http_status"),
            Self::DurationUnder => f.write_str("duration_under"),
            Self::DependencyGraph => f.write_str("dependency_graph"),
        }
    }
}
impl ::std::str::FromStr for BehaviorAssertionKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "exit_status" => Ok(Self::ExitStatus),
            "file_exists" => Ok(Self::FileExists),
            "file_absent" => Ok(Self::FileAbsent),
            "stdout_matches" => Ok(Self::StdoutMatches),
            "stderr_matches" => Ok(Self::StderrMatches),
            "http_status" => Ok(Self::HttpStatus),
            "duration_under" => Ok(Self::DurationUnder),
            "dependency_graph" => Ok(Self::DependencyGraph),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for BehaviorAssertionKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for BehaviorAssertionKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for BehaviorAssertionKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`BehaviorAssertionOperator`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "equals",
///    "not_equals",
///    "contains",
///    "matches",
///    "exists",
///    "absent",
///    "less_than",
///    "greater_than"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum BehaviorAssertionOperator {
    #[serde(rename = "equals")]
    Equals,
    #[serde(rename = "not_equals")]
    NotEquals,
    #[serde(rename = "contains")]
    Contains,
    #[serde(rename = "matches")]
    Matches,
    #[serde(rename = "exists")]
    Exists,
    #[serde(rename = "absent")]
    Absent,
    #[serde(rename = "less_than")]
    LessThan,
    #[serde(rename = "greater_than")]
    GreaterThan,
}
impl ::std::fmt::Display for BehaviorAssertionOperator {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Equals => f.write_str("equals"),
            Self::NotEquals => f.write_str("not_equals"),
            Self::Contains => f.write_str("contains"),
            Self::Matches => f.write_str("matches"),
            Self::Exists => f.write_str("exists"),
            Self::Absent => f.write_str("absent"),
            Self::LessThan => f.write_str("less_than"),
            Self::GreaterThan => f.write_str("greater_than"),
        }
    }
}
impl ::std::str::FromStr for BehaviorAssertionOperator {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "equals" => Ok(Self::Equals),
            "not_equals" => Ok(Self::NotEquals),
            "contains" => Ok(Self::Contains),
            "matches" => Ok(Self::Matches),
            "exists" => Ok(Self::Exists),
            "absent" => Ok(Self::Absent),
            "less_than" => Ok(Self::LessThan),
            "greater_than" => Ok(Self::GreaterThan),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for BehaviorAssertionOperator {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for BehaviorAssertionOperator {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for BehaviorAssertionOperator {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`BehaviorContract`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "contractDigest",
///    "contractId",
///    "createdAt",
///    "invalidatedBySourceIds",
///    "kind",
///    "projectId",
///    "reviewAssessment",
///    "reviewState",
///    "schemaVersion",
///    "sourceInputDigest",
///    "steps",
///    "updatedAt",
///    "version",
///    "workspaceId"
///  ],
///  "properties": {
///    "acceptedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "acceptedBy": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "contractDigest": {
///      "description": "RFC 8785 SHA-256 digest of this object with contractDigest omitted.",
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "contractId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "invalidatedBySourceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512
///    },
///    "kind": {
///      "enum": [
///        "behavior_contract"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "reviewAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "reviewState": {
///      "type": "string",
///      "enum": [
///        "discovered",
///        "needs_review",
///        "accepted",
///        "invalidated"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sourceInputDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "steps": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/BehaviorStep"
///      },
///      "maxItems": 1024,
///      "minItems": 1
///    },
///    "updatedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "version": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct BehaviorContract {
    #[serde(
        rename = "acceptedAt",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub accepted_at: ::std::option::Option<Rfc3339Timestamp>,
    #[serde(
        rename = "acceptedBy",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub accepted_by: ::std::option::Option<EntityId>,
    ///RFC 8785 SHA-256 digest of this object with contractDigest omitted.
    #[serde(rename = "contractDigest")]
    pub contract_digest: Sha256Digest,
    #[serde(rename = "contractId")]
    pub contract_id: EntityId,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "invalidatedBySourceIds")]
    pub invalidated_by_source_ids: ::std::vec::Vec<EntityId>,
    pub kind: BehaviorContractKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "reviewAssessment")]
    pub review_assessment: Assessment,
    #[serde(rename = "reviewState")]
    pub review_state: BehaviorContractReviewState,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sourceInputDigest")]
    pub source_input_digest: Sha256Digest,
    pub steps: ::std::vec::Vec<BehaviorStep>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Rfc3339Timestamp,
    pub version: ::std::num::NonZeroU64,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`BehaviorContractKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "behavior_contract"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum BehaviorContractKind {
    #[serde(rename = "behavior_contract")]
    BehaviorContract,
}
impl ::std::fmt::Display for BehaviorContractKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::BehaviorContract => f.write_str("behavior_contract"),
        }
    }
}
impl ::std::str::FromStr for BehaviorContractKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "behavior_contract" => Ok(Self::BehaviorContract),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for BehaviorContractKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for BehaviorContractKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for BehaviorContractKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`BehaviorContractReviewState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "discovered",
///    "needs_review",
///    "accepted",
///    "invalidated"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum BehaviorContractReviewState {
    #[serde(rename = "discovered")]
    Discovered,
    #[serde(rename = "needs_review")]
    NeedsReview,
    #[serde(rename = "accepted")]
    Accepted,
    #[serde(rename = "invalidated")]
    Invalidated,
}
impl ::std::fmt::Display for BehaviorContractReviewState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Discovered => f.write_str("discovered"),
            Self::NeedsReview => f.write_str("needs_review"),
            Self::Accepted => f.write_str("accepted"),
            Self::Invalidated => f.write_str("invalidated"),
        }
    }
}
impl ::std::str::FromStr for BehaviorContractReviewState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "discovered" => Ok(Self::Discovered),
            "needs_review" => Ok(Self::NeedsReview),
            "accepted" => Ok(Self::Accepted),
            "invalidated" => Ok(Self::Invalidated),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for BehaviorContractReviewState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for BehaviorContractReviewState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for BehaviorContractReviewState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`BehaviorStep`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "arguments",
///    "assertions",
///    "discoveryEvidenceReferenceIds",
///    "discoveryFingerprint",
///    "enabled",
///    "executable",
///    "expectedExitStatuses",
///    "kind",
///    "order",
///    "realmAssessment",
///    "required",
///    "REDACTEDReferenceIds",
///    "stepId",
///    "targetSelector",
///    "timeoutSeconds",
///    "workingDirectory"
///  ],
///  "properties": {
///    "arguments": {
///      "type": "array",
///      "items": {
///        "type": "string",
///        "maxLength": 4096
///      },
///      "maxItems": 256
///    },
///    "assertions": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/BehaviorAssertion"
///      },
///      "maxItems": 256
///    },
///    "discoveryEvidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512
///    },
///    "discoveryFingerprint": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "enabled": {
///      "type": "boolean"
///    },
///    "executable": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "expectedExitStatuses": {
///      "type": "array",
///      "items": {
///        "type": "integer",
///        "maximum": 2147483647.0,
///        "minimum": -2147483648.0
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "kind": {
///      "type": "string",
///      "enum": [
///        "resolve",
///        "install",
///        "build",
///        "lint",
///        "typecheck",
///        "test",
///        "smoke",
///        "benchmark"
///      ]
///    },
///    "order": {
///      "type": "integer",
///      "maximum": 100000.0,
///      "minimum": 0.0
///    },
///    "realmAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "required": {
///      "type": "boolean"
///    },
///    "REDACTEDReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 64
///    },
///    "stepId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "targetSelector": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "timeoutSeconds": {
///      "type": "integer",
///      "maximum": 86400.0,
///      "minimum": 1.0
///    },
///    "workingDirectory": {
///      "$ref": "#/$defs/RelativePath"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct BehaviorStep {
    pub arguments: ::std::vec::Vec<BehaviorStepArgumentsItem>,
    pub assertions: ::std::vec::Vec<BehaviorAssertion>,
    #[serde(rename = "discoveryEvidenceReferenceIds")]
    pub discovery_evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "discoveryFingerprint")]
    pub discovery_fingerprint: Sha256Digest,
    pub enabled: bool,
    pub executable: ShortString,
    #[serde(rename = "expectedExitStatuses")]
    pub expected_exit_statuses: ::std::vec::Vec<i32>,
    pub kind: BehaviorStepKind,
    pub order: i64,
    #[serde(rename = "realmAssessment")]
    pub realm_assessment: Assessment,
    #[serde(
        rename = "realmId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub realm_id: ::std::option::Option<EntityId>,
    pub required: bool,
    #[serde(rename = "REDACTEDReferenceIds")]
    pub REDACTED_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "stepId")]
    pub step_id: EntityId,
    #[serde(rename = "targetSelector")]
    pub target_selector: ShortString,
    #[serde(rename = "timeoutSeconds")]
    pub timeout_seconds: ::std::num::NonZeroU64,
    #[serde(rename = "workingDirectory")]
    pub working_directory: RelativePath,
}
///`BehaviorStepArgumentsItem`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 4096
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct BehaviorStepArgumentsItem(::std::string::String);
impl ::std::ops::Deref for BehaviorStepArgumentsItem {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<BehaviorStepArgumentsItem> for ::std::string::String {
    fn from(value: BehaviorStepArgumentsItem) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for BehaviorStepArgumentsItem {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 4096usize {
            return Err("longer than 4096 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for BehaviorStepArgumentsItem {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for BehaviorStepArgumentsItem {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for BehaviorStepArgumentsItem {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for BehaviorStepArgumentsItem {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`BehaviorStepKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "resolve",
///    "install",
///    "build",
///    "lint",
///    "typecheck",
///    "test",
///    "smoke",
///    "benchmark"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum BehaviorStepKind {
    #[serde(rename = "resolve")]
    Resolve,
    #[serde(rename = "install")]
    Install,
    #[serde(rename = "build")]
    Build,
    #[serde(rename = "lint")]
    Lint,
    #[serde(rename = "typecheck")]
    Typecheck,
    #[serde(rename = "test")]
    Test,
    #[serde(rename = "smoke")]
    Smoke,
    #[serde(rename = "benchmark")]
    Benchmark,
}
impl ::std::fmt::Display for BehaviorStepKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Resolve => f.write_str("resolve"),
            Self::Install => f.write_str("install"),
            Self::Build => f.write_str("build"),
            Self::Lint => f.write_str("lint"),
            Self::Typecheck => f.write_str("typecheck"),
            Self::Test => f.write_str("test"),
            Self::Smoke => f.write_str("smoke"),
            Self::Benchmark => f.write_str("benchmark"),
        }
    }
}
impl ::std::str::FromStr for BehaviorStepKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "resolve" => Ok(Self::Resolve),
            "install" => Ok(Self::Install),
            "build" => Ok(Self::Build),
            "lint" => Ok(Self::Lint),
            "typecheck" => Ok(Self::Typecheck),
            "test" => Ok(Self::Test),
            "smoke" => Ok(Self::Smoke),
            "benchmark" => Ok(Self::Benchmark),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for BehaviorStepKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for BehaviorStepKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for BehaviorStepKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`BoundedString`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 16384
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct BoundedString(::std::string::String);
impl ::std::ops::Deref for BoundedString {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<BoundedString> for ::std::string::String {
    fn from(value: BoundedString) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for BoundedString {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 16384usize {
            return Err("longer than 16384 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for BoundedString {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for BoundedString {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for BoundedString {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for BoundedString {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`BraintrustOutboxRecord`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "attemptCount",
///    "createdAt",
///    "encryptedPayloadDigest",
///    "encryptedPayloadObjectId",
///    "kind",
///    "lastErrorCodeAssessment",
///    "nextAttemptAtAssessment",
///    "outboxRecordId",
///    "schemaVersion",
///    "state",
///    "traceId",
///    "updatedAt",
///    "workspaceId"
///  ],
///  "properties": {
///    "attemptCount": {
///      "type": "integer",
///      "maximum": 1000.0,
///      "minimum": 0.0
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "encryptedPayloadDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "encryptedPayloadObjectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "braintrust_outbox_record"
///      ]
///    },
///    "lastErrorCode": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "lastErrorCodeAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "nextAttemptAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "nextAttemptAtAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "outboxRecordId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "pending",
///        "exporting",
///        "exported",
///        "retry_wait",
///        "failed_terminal"
///      ]
///    },
///    "traceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "updatedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct BraintrustOutboxRecord {
    #[serde(rename = "attemptCount")]
    pub attempt_count: i64,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "encryptedPayloadDigest")]
    pub encrypted_payload_digest: Sha256Digest,
    #[serde(rename = "encryptedPayloadObjectId")]
    pub encrypted_payload_object_id: EntityId,
    pub kind: BraintrustOutboxRecordKind,
    #[serde(
        rename = "lastErrorCode",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub last_error_code: ::std::option::Option<ShortString>,
    #[serde(rename = "lastErrorCodeAssessment")]
    pub last_error_code_assessment: Assessment,
    #[serde(
        rename = "nextAttemptAt",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub next_attempt_at: ::std::option::Option<Rfc3339Timestamp>,
    #[serde(rename = "nextAttemptAtAssessment")]
    pub next_attempt_at_assessment: Assessment,
    #[serde(rename = "outboxRecordId")]
    pub outbox_record_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub state: BraintrustOutboxRecordState,
    #[serde(rename = "traceId")]
    pub trace_id: EntityId,
    #[serde(rename = "updatedAt")]
    pub updated_at: Rfc3339Timestamp,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`BraintrustOutboxRecordKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "braintrust_outbox_record"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum BraintrustOutboxRecordKind {
    #[serde(rename = "braintrust_outbox_record")]
    BraintrustOutboxRecord,
}
impl ::std::fmt::Display for BraintrustOutboxRecordKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::BraintrustOutboxRecord => f.write_str("braintrust_outbox_record"),
        }
    }
}
impl ::std::str::FromStr for BraintrustOutboxRecordKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "braintrust_outbox_record" => Ok(Self::BraintrustOutboxRecord),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for BraintrustOutboxRecordKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for BraintrustOutboxRecordKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for BraintrustOutboxRecordKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`BraintrustOutboxRecordState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "pending",
///    "exporting",
///    "exported",
///    "retry_wait",
///    "failed_terminal"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum BraintrustOutboxRecordState {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "exporting")]
    Exporting,
    #[serde(rename = "exported")]
    Exported,
    #[serde(rename = "retry_wait")]
    RetryWait,
    #[serde(rename = "failed_terminal")]
    FailedTerminal,
}
impl ::std::fmt::Display for BraintrustOutboxRecordState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Pending => f.write_str("pending"),
            Self::Exporting => f.write_str("exporting"),
            Self::Exported => f.write_str("exported"),
            Self::RetryWait => f.write_str("retry_wait"),
            Self::FailedTerminal => f.write_str("failed_terminal"),
        }
    }
}
impl ::std::str::FromStr for BraintrustOutboxRecordState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "pending" => Ok(Self::Pending),
            "exporting" => Ok(Self::Exporting),
            "exported" => Ok(Self::Exported),
            "retry_wait" => Ok(Self::RetryWait),
            "failed_terminal" => Ok(Self::FailedTerminal),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for BraintrustOutboxRecordState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for BraintrustOutboxRecordState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for BraintrustOutboxRecordState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ByteCount`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "integer",
///  "maximum": 9007199254740991.0,
///  "minimum": 0.0
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct ByteCount(pub i64);
impl ::std::ops::Deref for ByteCount {
    type Target = i64;
    fn deref(&self) -> &i64 {
        &self.0
    }
}
impl ::std::convert::From<ByteCount> for i64 {
    fn from(value: ByteCount) -> Self {
        value.0
    }
}
impl ::std::convert::From<i64> for ByteCount {
    fn from(value: i64) -> Self {
        Self(value)
    }
}
impl ::std::str::FromStr for ByteCount {
    type Err = <i64 as ::std::str::FromStr>::Err;
    fn from_str(value: &str) -> ::std::result::Result<Self, Self::Err> {
        Ok(Self(value.parse()?))
    }
}
impl ::std::convert::TryFrom<&str> for ByteCount {
    type Error = <i64 as ::std::str::FromStr>::Err;
    fn try_from(value: &str) -> ::std::result::Result<Self, Self::Error> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<String> for ByteCount {
    type Error = <i64 as ::std::str::FromStr>::Err;
    fn try_from(value: String) -> ::std::result::Result<Self, Self::Error> {
        value.parse()
    }
}
impl ::std::fmt::Display for ByteCount {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        self.0.fmt(f)
    }
}
///`CacheArtifact`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "artifactClass",
///    "contentDigest",
///    "integrityState",
///    "objectId"
///  ],
///  "properties": {
///    "artifactClass": {
///      "type": "string",
///      "enum": [
///        "integrity_checked_download",
///        "immutable_toolchain",
///        "source_mirror",
///        "complete_attestation"
///      ]
///    },
///    "contentDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "integrityState": {
///      "enum": [
///        "verified"
///      ]
///    },
///    "objectId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CacheArtifact {
    #[serde(rename = "artifactClass")]
    pub artifact_class: CacheArtifactArtifactClass,
    #[serde(rename = "contentDigest")]
    pub content_digest: Sha256Digest,
    #[serde(rename = "integrityState")]
    pub integrity_state: CacheArtifactIntegrityState,
    #[serde(rename = "objectId")]
    pub object_id: EntityId,
}
///`CacheArtifactArtifactClass`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "integrity_checked_download",
///    "immutable_toolchain",
///    "source_mirror",
///    "complete_attestation"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CacheArtifactArtifactClass {
    #[serde(rename = "integrity_checked_download")]
    IntegrityCheckedDownload,
    #[serde(rename = "immutable_toolchain")]
    ImmutableToolchain,
    #[serde(rename = "source_mirror")]
    SourceMirror,
    #[serde(rename = "complete_attestation")]
    CompleteAttestation,
}
impl ::std::fmt::Display for CacheArtifactArtifactClass {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::IntegrityCheckedDownload => f.write_str("integrity_checked_download"),
            Self::ImmutableToolchain => f.write_str("immutable_toolchain"),
            Self::SourceMirror => f.write_str("source_mirror"),
            Self::CompleteAttestation => f.write_str("complete_attestation"),
        }
    }
}
impl ::std::str::FromStr for CacheArtifactArtifactClass {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "integrity_checked_download" => Ok(Self::IntegrityCheckedDownload),
            "immutable_toolchain" => Ok(Self::ImmutableToolchain),
            "source_mirror" => Ok(Self::SourceMirror),
            "complete_attestation" => Ok(Self::CompleteAttestation),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CacheArtifactArtifactClass {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CacheArtifactArtifactClass {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CacheArtifactArtifactClass {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CacheArtifactIntegrityState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "verified"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CacheArtifactIntegrityState {
    #[serde(rename = "verified")]
    Verified,
}
impl ::std::fmt::Display for CacheArtifactIntegrityState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Verified => f.write_str("verified"),
        }
    }
}
impl ::std::str::FromStr for CacheArtifactIntegrityState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "verified" => Ok(Self::Verified),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CacheArtifactIntegrityState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CacheArtifactIntegrityState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CacheArtifactIntegrityState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CandidateLifecycle`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "candidateId",
///    "candidatePatchAssessment",
///    "candidatePlanId",
///    "createdAt",
///    "currentState",
///    "invalidationInputDigests",
///    "kind",
///    "projectId",
///    "schemaVersion",
///    "transitions",
///    "updatedAt",
///    "workspaceId"
///  ],
///  "properties": {
///    "candidateId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "candidatePatchAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "candidatePatchId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "candidatePlanId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "currentState": {
///      "$ref": "#/$defs/CandidateState"
///    },
///    "invalidationInputDigests": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/Sha256Digest"
///      },
///      "maxItems": 1024
///    },
///    "kind": {
///      "enum": [
///        "candidate_lifecycle"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "transitions": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/CandidateTransition"
///      },
///      "maxItems": 1024
///    },
///    "updatedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CandidateLifecycle {
    #[serde(rename = "candidateId")]
    pub candidate_id: EntityId,
    #[serde(rename = "candidatePatchAssessment")]
    pub candidate_patch_assessment: Assessment,
    #[serde(
        rename = "candidatePatchId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub candidate_patch_id: ::std::option::Option<EntityId>,
    #[serde(rename = "candidatePlanId")]
    pub candidate_plan_id: EntityId,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "currentState")]
    pub current_state: CandidateState,
    #[serde(rename = "invalidationInputDigests")]
    pub invalidation_input_digests: ::std::vec::Vec<Sha256Digest>,
    pub kind: CandidateLifecycleKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub transitions: ::std::vec::Vec<CandidateTransition>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Rfc3339Timestamp,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`CandidateLifecycleKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "candidate_lifecycle"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CandidateLifecycleKind {
    #[serde(rename = "candidate_lifecycle")]
    CandidateLifecycle,
}
impl ::std::fmt::Display for CandidateLifecycleKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CandidateLifecycle => f.write_str("candidate_lifecycle"),
        }
    }
}
impl ::std::str::FromStr for CandidateLifecycleKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "candidate_lifecycle" => Ok(Self::CandidateLifecycle),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CandidateLifecycleKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CandidateLifecycleKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CandidateLifecycleKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CandidateOperation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "$ref": "#/$defs/CandidatePackageOperation"
///    },
///    {
///      "$ref": "#/$defs/RuntimeSelectionOperation"
///    },
///    {
///      "$ref": "#/$defs/LockfileOperation"
///    },
///    {
///      "$ref": "#/$defs/ConfigurationEditOperation"
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum CandidateOperation {
    CandidatePackageOperation(CandidatePackageOperation),
    RuntimeSelectionOperation(RuntimeSelectionOperation),
    LockfileOperation(LockfileOperation),
    ConfigurationEditOperation(ConfigurationEditOperation),
}
impl ::std::convert::From<CandidatePackageOperation> for CandidateOperation {
    fn from(value: CandidatePackageOperation) -> Self {
        Self::CandidatePackageOperation(value)
    }
}
impl ::std::convert::From<RuntimeSelectionOperation> for CandidateOperation {
    fn from(value: RuntimeSelectionOperation) -> Self {
        Self::RuntimeSelectionOperation(value)
    }
}
impl ::std::convert::From<LockfileOperation> for CandidateOperation {
    fn from(value: LockfileOperation) -> Self {
        Self::LockfileOperation(value)
    }
}
impl ::std::convert::From<ConfigurationEditOperation> for CandidateOperation {
    fn from(value: ConfigurationEditOperation) -> Self {
        Self::ConfigurationEditOperation(value)
    }
}
///`CandidatePackageOperation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "ecosystem",
///    "evidenceReferenceIds",
///    "findingIds",
///    "manager",
///    "operationId",
///    "operationKind",
///    "packageName",
///    "realmId",
///    "requestedVersion",
///    "scope"
///  ],
///  "properties": {
///    "ecosystem": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512,
///      "minItems": 1
///    },
///    "findingIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "manager": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "operationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "operationKind": {
///      "type": "string",
///      "enum": [
///        "package_add",
///        "package_remove",
///        "package_update"
///      ]
///    },
///    "packageName": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "requestedVersion": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "scope": {
///      "$ref": "#/$defs/ShortString"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CandidatePackageOperation {
    pub ecosystem: ShortString,
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "findingIds")]
    pub finding_ids: ::std::vec::Vec<EntityId>,
    pub manager: ShortString,
    #[serde(rename = "operationId")]
    pub operation_id: EntityId,
    #[serde(rename = "operationKind")]
    pub operation_kind: CandidatePackageOperationOperationKind,
    #[serde(rename = "packageName")]
    pub package_name: ShortString,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    #[serde(rename = "requestedVersion")]
    pub requested_version: ShortString,
    pub scope: ShortString,
}
///`CandidatePackageOperationOperationKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "package_add",
///    "package_remove",
///    "package_update"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CandidatePackageOperationOperationKind {
    #[serde(rename = "package_add")]
    PackageAdd,
    #[serde(rename = "package_remove")]
    PackageRemove,
    #[serde(rename = "package_update")]
    PackageUpdate,
}
impl ::std::fmt::Display for CandidatePackageOperationOperationKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::PackageAdd => f.write_str("package_add"),
            Self::PackageRemove => f.write_str("package_remove"),
            Self::PackageUpdate => f.write_str("package_update"),
        }
    }
}
impl ::std::str::FromStr for CandidatePackageOperationOperationKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "package_add" => Ok(Self::PackageAdd),
            "package_remove" => Ok(Self::PackageRemove),
            "package_update" => Ok(Self::PackageUpdate),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CandidatePackageOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CandidatePackageOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CandidatePackageOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CandidatePatch`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "candidatePatchId",
///    "candidatePlanId",
///    "createdAt",
///    "files",
///    "guardResults",
///    "kind",
///    "materializerVersions",
///    "operations",
///    "patchDigest",
///    "patchObjectId",
///    "projectId",
///    "resultingTreeDigest",
///    "schemaVersion",
///    "sourceInputDigest",
///    "workspaceId"
///  ],
///  "properties": {
///    "candidatePatchId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "candidatePlanId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "files": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/PatchFile"
///      },
///      "maxItems": 4096,
///      "minItems": 1
///    },
///    "guardResults": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/PatchGuardResult"
///      },
///      "maxItems": 64,
///      "minItems": 1
///    },
///    "kind": {
///      "enum": [
///        "candidate_patch"
///      ]
///    },
///    "materializerVersions": {
///      "$ref": "#/$defs/VersionMap"
///    },
///    "operations": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/CandidateOperation"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "patchDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "patchObjectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "resultingTreeDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sourceInputDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CandidatePatch {
    #[serde(rename = "candidatePatchId")]
    pub candidate_patch_id: EntityId,
    #[serde(rename = "candidatePlanId")]
    pub candidate_plan_id: EntityId,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    pub files: ::std::vec::Vec<PatchFile>,
    #[serde(rename = "guardResults")]
    pub guard_results: ::std::vec::Vec<PatchGuardResult>,
    pub kind: CandidatePatchKind,
    #[serde(rename = "materializerVersions")]
    pub materializer_versions: VersionMap,
    pub operations: ::std::vec::Vec<CandidateOperation>,
    #[serde(rename = "patchDigest")]
    pub patch_digest: Sha256Digest,
    #[serde(rename = "patchObjectId")]
    pub patch_object_id: EntityId,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "resultingTreeDigest")]
    pub resulting_tree_digest: Sha256Digest,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sourceInputDigest")]
    pub source_input_digest: Sha256Digest,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`CandidatePatchKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "candidate_patch"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CandidatePatchKind {
    #[serde(rename = "candidate_patch")]
    CandidatePatch,
}
impl ::std::fmt::Display for CandidatePatchKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CandidatePatch => f.write_str("candidate_patch"),
        }
    }
}
impl ::std::str::FromStr for CandidatePatchKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "candidate_patch" => Ok(Self::CandidatePatch),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CandidatePatchKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CandidatePatchKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CandidatePatchKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CandidatePlan`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "affectedFiles",
///    "assumptions",
///    "behaviorContractDigest",
///    "candidatePlanId",
///    "createdAt",
///    "evidenceReferenceIds",
///    "expectedGraphChanges",
///    "expectedValidationImpact",
///    "findingIds",
///    "generationSource",
///    "kind",
///    "operations",
///    "policyDigest",
///    "projectId",
///    "proposedValidationProbes",
///    "rationale",
///    "risks",
///    "schemaVersion",
///    "sourceInputDigest",
///    "workspaceId"
///  ],
///  "properties": {
///    "affectedFiles": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/RelativePath"
///      },
///      "maxItems": 4096,
///      "minItems": 1
///    },
///    "assumptions": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/BoundedString"
///      },
///      "maxItems": 256
///    },
///    "behaviorContractDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "candidatePlanId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 2048,
///      "minItems": 1
///    },
///    "expectedGraphChanges": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ExpectedGraphChange"
///      },
///      "maxItems": 1024
///    },
///    "expectedValidationImpact": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ExpectedValidationImpact"
///      },
///      "maxItems": 1024
///    },
///    "findingIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "generationSource": {
///      "type": "string",
///      "enum": [
///        "fireworks",
///        "deterministic_rule",
///        "REDACTED_authored"
///      ]
///    },
///    "kind": {
///      "enum": [
///        "candidate_plan"
///      ]
///    },
///    "operations": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/CandidateOperation"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "policyDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "proposedValidationProbes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ProbeProposal"
///      },
///      "maxItems": 256
///    },
///    "rationale": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "risks": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/BoundedString"
///      },
///      "maxItems": 256
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sourceInputDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CandidatePlan {
    #[serde(rename = "affectedFiles")]
    pub affected_files: ::std::vec::Vec<RelativePath>,
    pub assumptions: ::std::vec::Vec<BoundedString>,
    #[serde(rename = "behaviorContractDigest")]
    pub behavior_contract_digest: Sha256Digest,
    #[serde(rename = "candidatePlanId")]
    pub candidate_plan_id: EntityId,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "expectedGraphChanges")]
    pub expected_graph_changes: ::std::vec::Vec<ExpectedGraphChange>,
    #[serde(rename = "expectedValidationImpact")]
    pub expected_validation_impact: ::std::vec::Vec<ExpectedValidationImpact>,
    #[serde(rename = "findingIds")]
    pub finding_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "generationSource")]
    pub generation_source: CandidatePlanGenerationSource,
    pub kind: CandidatePlanKind,
    pub operations: ::std::vec::Vec<CandidateOperation>,
    #[serde(rename = "policyDigest")]
    pub policy_digest: Sha256Digest,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "proposedValidationProbes")]
    pub proposed_validation_probes: ::std::vec::Vec<ProbeProposal>,
    pub rationale: BoundedString,
    pub risks: ::std::vec::Vec<BoundedString>,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sourceInputDigest")]
    pub source_input_digest: Sha256Digest,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`CandidatePlanGenerationSource`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "fireworks",
///    "deterministic_rule",
///    "REDACTED_authored"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CandidatePlanGenerationSource {
    #[serde(rename = "fireworks")]
    Fireworks,
    #[serde(rename = "deterministic_rule")]
    DeterministicRule,
    #[serde(rename = "REDACTED_authored")]
    UserAuthored,
}
impl ::std::fmt::Display for CandidatePlanGenerationSource {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Fireworks => f.write_str("fireworks"),
            Self::DeterministicRule => f.write_str("deterministic_rule"),
            Self::UserAuthored => f.write_str("REDACTED_authored"),
        }
    }
}
impl ::std::str::FromStr for CandidatePlanGenerationSource {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "fireworks" => Ok(Self::Fireworks),
            "deterministic_rule" => Ok(Self::DeterministicRule),
            "REDACTED_authored" => Ok(Self::UserAuthored),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CandidatePlanGenerationSource {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CandidatePlanGenerationSource {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CandidatePlanGenerationSource {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CandidatePlanKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "candidate_plan"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CandidatePlanKind {
    #[serde(rename = "candidate_plan")]
    CandidatePlan,
}
impl ::std::fmt::Display for CandidatePlanKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CandidatePlan => f.write_str("candidate_plan"),
        }
    }
}
impl ::std::str::FromStr for CandidatePlanKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "candidate_plan" => Ok(Self::CandidatePlan),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CandidatePlanKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CandidatePlanKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CandidatePlanKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CandidateState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "$ref": "#/$defs/VerifiedCandidateState"
///    },
///    {
///      "$ref": "#/$defs/UnverifiedCandidateState"
///    },
///    {
///      "$ref": "#/$defs/ApprovedCandidateState"
///    },
///    {
///      "$ref": "#/$defs/AppliedCandidateState"
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum CandidateState {
    VerifiedCandidateState(VerifiedCandidateState),
    UnverifiedCandidateState(UnverifiedCandidateState),
    ApprovedCandidateState(ApprovedCandidateState),
    AppliedCandidateState(AppliedCandidateState),
}
impl ::std::convert::From<VerifiedCandidateState> for CandidateState {
    fn from(value: VerifiedCandidateState) -> Self {
        Self::VerifiedCandidateState(value)
    }
}
impl ::std::convert::From<UnverifiedCandidateState> for CandidateState {
    fn from(value: UnverifiedCandidateState) -> Self {
        Self::UnverifiedCandidateState(value)
    }
}
impl ::std::convert::From<ApprovedCandidateState> for CandidateState {
    fn from(value: ApprovedCandidateState) -> Self {
        Self::ApprovedCandidateState(value)
    }
}
impl ::std::convert::From<AppliedCandidateState> for CandidateState {
    fn from(value: AppliedCandidateState) -> Self {
        Self::AppliedCandidateState(value)
    }
}
///`CandidateTransition`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "actorId",
///    "fromState",
///    "idempotencyKey",
///    "occurredAt",
///    "reasonCodes",
///    "toState",
///    "transitionId"
///  ],
///  "properties": {
///    "actorId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "fromState": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "idempotencyKey": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "occurredAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "reasonCodes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256
///    },
///    "toState": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "transitionId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CandidateTransition {
    #[serde(rename = "actorId")]
    pub actor_id: EntityId,
    #[serde(rename = "fromState")]
    pub from_state: ShortString,
    #[serde(rename = "idempotencyKey")]
    pub idempotency_key: EntityId,
    #[serde(rename = "occurredAt")]
    pub occurred_at: Rfc3339Timestamp,
    #[serde(rename = "reasonCodes")]
    pub reason_codes: ::std::vec::Vec<ShortString>,
    #[serde(rename = "toState")]
    pub to_state: ShortString,
    #[serde(rename = "transitionId")]
    pub transition_id: EntityId,
}
///`CapabilityProfilePublishRequest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "deviceId",
///    "kind",
///    "profile",
///    "projectId",
///    "publishedAt",
///    "schemaVersion",
///    "signature",
///    "workspaceId"
///  ],
///  "properties": {
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "capability_profile_publish_request"
///      ]
///    },
///    "profile": {
///      "$ref": "#/$defs/ProviderCapabilityProfile"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "publishedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "signature": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CapabilityProfilePublishRequest {
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    pub kind: CapabilityProfilePublishRequestKind,
    pub profile: ProviderCapabilityProfile,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "publishedAt")]
    pub published_at: Rfc3339Timestamp,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub signature: Base64Url,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`CapabilityProfilePublishRequestKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "capability_profile_publish_request"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CapabilityProfilePublishRequestKind {
    #[serde(rename = "capability_profile_publish_request")]
    CapabilityProfilePublishRequest,
}
impl ::std::fmt::Display for CapabilityProfilePublishRequestKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CapabilityProfilePublishRequest => {
                f.write_str("capability_profile_publish_request")
            }
        }
    }
}
impl ::std::str::FromStr for CapabilityProfilePublishRequestKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "capability_profile_publish_request" => Ok(Self::CapabilityProfilePublishRequest),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CapabilityProfilePublishRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CapabilityProfilePublishRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CapabilityProfilePublishRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CapabilityState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "supported",
///    "partial",
///    "unavailable",
///    "unknown",
///    "not_applicable",
///    "unsupported"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CapabilityState {
    #[serde(rename = "supported")]
    Supported,
    #[serde(rename = "partial")]
    Partial,
    #[serde(rename = "unavailable")]
    Unavailable,
    #[serde(rename = "unknown")]
    Unknown,
    #[serde(rename = "not_applicable")]
    NotApplicable,
    #[serde(rename = "unsupported")]
    Unsupported,
}
impl ::std::fmt::Display for CapabilityState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Supported => f.write_str("supported"),
            Self::Partial => f.write_str("partial"),
            Self::Unavailable => f.write_str("unavailable"),
            Self::Unknown => f.write_str("unknown"),
            Self::NotApplicable => f.write_str("not_applicable"),
            Self::Unsupported => f.write_str("unsupported"),
        }
    }
}
impl ::std::str::FromStr for CapabilityState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "supported" => Ok(Self::Supported),
            "partial" => Ok(Self::Partial),
            "unavailable" => Ok(Self::Unavailable),
            "unknown" => Ok(Self::Unknown),
            "not_applicable" => Ok(Self::NotApplicable),
            "unsupported" => Ok(Self::Unsupported),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CapabilityState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CapabilityState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CapabilityState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CaptureGap`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "deviceId",
///    "gapId",
///    "gapType",
///    "impact",
///    "kind",
///    "projectId",
///    "realmId",
///    "reasonCode",
///    "resolutionState",
///    "schemaVersion",
///    "scope",
///    "startedAt",
///    "workspaceId"
///  ],
///  "properties": {
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "endedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "gapId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "gapType": {
///      "type": "string",
///      "enum": [
///        "provider_event_loss",
///        "observer_disabled",
///        "permission_denied",
///        "snapshot_missing",
///        "stabilization_timeout",
///        "realm_unobserved",
///        "unsupported_surface",
///        "unknown"
///      ]
///    },
///    "impact": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "kind": {
///      "enum": [
///        "capture_gap"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "reasonCode": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "resolutionState": {
///      "type": "string",
///      "enum": [
///        "open",
///        "resolved",
///        "not_resolvable"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "scope": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "startedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CaptureGap {
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    #[serde(
        rename = "endedAt",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub ended_at: ::std::option::Option<Rfc3339Timestamp>,
    #[serde(rename = "gapId")]
    pub gap_id: EntityId,
    #[serde(rename = "gapType")]
    pub gap_type: CaptureGapGapType,
    pub impact: Assessment,
    pub kind: CaptureGapKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    #[serde(rename = "reasonCode")]
    pub reason_code: ShortString,
    #[serde(rename = "resolutionState")]
    pub resolution_state: CaptureGapResolutionState,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub scope: ShortString,
    #[serde(rename = "startedAt")]
    pub started_at: Rfc3339Timestamp,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`CaptureGapCreatedNotification`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "gap",
///    "type"
///  ],
///  "properties": {
///    "gap": {
///      "$ref": "#/$defs/CaptureGapSummary"
///    },
///    "type": {
///      "enum": [
///        "capture_gap.created"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CaptureGapCreatedNotification {
    pub gap: CaptureGapSummary,
    #[serde(rename = "type")]
    pub type_: CaptureGapCreatedNotificationType,
}
///`CaptureGapCreatedNotificationType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "capture_gap.created"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CaptureGapCreatedNotificationType {
    #[serde(rename = "capture_gap.created")]
    CaptureGapCreated,
}
impl ::std::fmt::Display for CaptureGapCreatedNotificationType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CaptureGapCreated => f.write_str("capture_gap.created"),
        }
    }
}
impl ::std::str::FromStr for CaptureGapCreatedNotificationType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "capture_gap.created" => Ok(Self::CaptureGapCreated),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CaptureGapCreatedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CaptureGapCreatedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CaptureGapCreatedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CaptureGapGapType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "provider_event_loss",
///    "observer_disabled",
///    "permission_denied",
///    "snapshot_missing",
///    "stabilization_timeout",
///    "realm_unobserved",
///    "unsupported_surface",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CaptureGapGapType {
    #[serde(rename = "provider_event_loss")]
    ProviderEventLoss,
    #[serde(rename = "observer_disabled")]
    ObserverDisabled,
    #[serde(rename = "permission_denied")]
    PermissionDenied,
    #[serde(rename = "snapshot_missing")]
    SnapshotMissing,
    #[serde(rename = "stabilization_timeout")]
    StabilizationTimeout,
    #[serde(rename = "realm_unobserved")]
    RealmUnobserved,
    #[serde(rename = "unsupported_surface")]
    UnsupportedSurface,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for CaptureGapGapType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ProviderEventLoss => f.write_str("provider_event_loss"),
            Self::ObserverDisabled => f.write_str("observer_disabled"),
            Self::PermissionDenied => f.write_str("permission_denied"),
            Self::SnapshotMissing => f.write_str("snapshot_missing"),
            Self::StabilizationTimeout => f.write_str("stabilization_timeout"),
            Self::RealmUnobserved => f.write_str("realm_unobserved"),
            Self::UnsupportedSurface => f.write_str("unsupported_surface"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for CaptureGapGapType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "provider_event_loss" => Ok(Self::ProviderEventLoss),
            "observer_disabled" => Ok(Self::ObserverDisabled),
            "permission_denied" => Ok(Self::PermissionDenied),
            "snapshot_missing" => Ok(Self::SnapshotMissing),
            "stabilization_timeout" => Ok(Self::StabilizationTimeout),
            "realm_unobserved" => Ok(Self::RealmUnobserved),
            "unsupported_surface" => Ok(Self::UnsupportedSurface),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CaptureGapGapType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CaptureGapGapType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CaptureGapGapType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CaptureGapKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "capture_gap"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CaptureGapKind {
    #[serde(rename = "capture_gap")]
    CaptureGap,
}
impl ::std::fmt::Display for CaptureGapKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CaptureGap => f.write_str("capture_gap"),
        }
    }
}
impl ::std::str::FromStr for CaptureGapKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "capture_gap" => Ok(Self::CaptureGap),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CaptureGapKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CaptureGapKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CaptureGapKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CaptureGapResolutionState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "open",
///    "resolved",
///    "not_resolvable"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CaptureGapResolutionState {
    #[serde(rename = "open")]
    Open,
    #[serde(rename = "resolved")]
    Resolved,
    #[serde(rename = "not_resolvable")]
    NotResolvable,
}
impl ::std::fmt::Display for CaptureGapResolutionState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Open => f.write_str("open"),
            Self::Resolved => f.write_str("resolved"),
            Self::NotResolvable => f.write_str("not_resolvable"),
        }
    }
}
impl ::std::str::FromStr for CaptureGapResolutionState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "open" => Ok(Self::Open),
            "resolved" => Ok(Self::Resolved),
            "not_resolvable" => Ok(Self::NotResolvable),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CaptureGapResolutionState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CaptureGapResolutionState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CaptureGapResolutionState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CaptureGapSummary`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "captureGapId",
///    "reasonCode",
///    "sessionId",
///    "severity",
///    "startedAt"
///  ],
///  "properties": {
///    "captureGapId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "reasonCode": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "sessionId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "severity": {
///      "type": "string",
///      "enum": [
///        "info",
///        "warning",
///        "blocking"
///      ]
///    },
///    "startedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CaptureGapSummary {
    #[serde(rename = "captureGapId")]
    pub capture_gap_id: EntityId,
    #[serde(rename = "reasonCode")]
    pub reason_code: ShortString,
    #[serde(rename = "sessionId")]
    pub session_id: EntityId,
    pub severity: CaptureGapSummarySeverity,
    #[serde(rename = "startedAt")]
    pub started_at: Rfc3339Timestamp,
}
///`CaptureGapSummarySeverity`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "info",
///    "warning",
///    "blocking"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CaptureGapSummarySeverity {
    #[serde(rename = "info")]
    Info,
    #[serde(rename = "warning")]
    Warning,
    #[serde(rename = "blocking")]
    Blocking,
}
impl ::std::fmt::Display for CaptureGapSummarySeverity {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Info => f.write_str("info"),
            Self::Warning => f.write_str("warning"),
            Self::Blocking => f.write_str("blocking"),
        }
    }
}
impl ::std::str::FromStr for CaptureGapSummarySeverity {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "info" => Ok(Self::Info),
            "warning" => Ok(Self::Warning),
            "blocking" => Ok(Self::Blocking),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CaptureGapSummarySeverity {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CaptureGapSummarySeverity {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CaptureGapSummarySeverity {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ChainAnchorPublishRequest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "chainAnchorId",
///    "chainHash",
///    "createdAt",
///    "deviceId",
///    "kind",
///    "projectId",
///    "schemaVersion",
///    "sequence",
///    "signature",
///    "streamId",
///    "workspaceId"
///  ],
///  "properties": {
///    "chainAnchorId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "chainHash": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "chain_anchor_publish_request"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sequence": {
///      "$ref": "#/$defs/DecimalCounter"
///    },
///    "signature": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "streamId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ChainAnchorPublishRequest {
    #[serde(rename = "chainAnchorId")]
    pub chain_anchor_id: EntityId,
    #[serde(rename = "chainHash")]
    pub chain_hash: Sha256Digest,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    pub kind: ChainAnchorPublishRequestKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub sequence: DecimalCounter,
    pub signature: Base64Url,
    #[serde(rename = "streamId")]
    pub stream_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ChainAnchorPublishRequestKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "chain_anchor_publish_request"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ChainAnchorPublishRequestKind {
    #[serde(rename = "chain_anchor_publish_request")]
    ChainAnchorPublishRequest,
}
impl ::std::fmt::Display for ChainAnchorPublishRequestKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ChainAnchorPublishRequest => f.write_str("chain_anchor_publish_request"),
        }
    }
}
impl ::std::str::FromStr for ChainAnchorPublishRequestKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "chain_anchor_publish_request" => Ok(Self::ChainAnchorPublishRequest),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ChainAnchorPublishRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ChainAnchorPublishRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ChainAnchorPublishRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CheckpointCreateCommand`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "reason",
///    "type"
///  ],
///  "properties": {
///    "reason": {
///      "type": "string",
///      "enum": [
///        "manual",
///        "session_end"
///      ]
///    },
///    "type": {
///      "enum": [
///        "checkpoint.create"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CheckpointCreateCommand {
    pub reason: CheckpointCreateCommandReason,
    #[serde(rename = "type")]
    pub type_: CheckpointCreateCommandType,
}
///`CheckpointCreateCommandReason`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "manual",
///    "session_end"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CheckpointCreateCommandReason {
    #[serde(rename = "manual")]
    Manual,
    #[serde(rename = "session_end")]
    SessionEnd,
}
impl ::std::fmt::Display for CheckpointCreateCommandReason {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Manual => f.write_str("manual"),
            Self::SessionEnd => f.write_str("session_end"),
        }
    }
}
impl ::std::str::FromStr for CheckpointCreateCommandReason {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "manual" => Ok(Self::Manual),
            "session_end" => Ok(Self::SessionEnd),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CheckpointCreateCommandReason {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CheckpointCreateCommandReason {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CheckpointCreateCommandReason {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CheckpointCreateCommandType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "checkpoint.create"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CheckpointCreateCommandType {
    #[serde(rename = "checkpoint.create")]
    CheckpointCreate,
}
impl ::std::fmt::Display for CheckpointCreateCommandType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CheckpointCreate => f.write_str("checkpoint.create"),
        }
    }
}
impl ::std::str::FromStr for CheckpointCreateCommandType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "checkpoint.create" => Ok(Self::CheckpointCreate),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CheckpointCreateCommandType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CheckpointCreateCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CheckpointCreateCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CheckpointCreateRequest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "idempotencyKey",
///    "kind",
///    "projectId",
///    "reason",
///    "schemaVersion",
///    "sessionIds",
///    "snapshotIds",
///    "sourceInputId",
///    "workspaceId"
///  ],
///  "properties": {
///    "idempotencyKey": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "checkpoint_create_request"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "reason": {
///      "type": "string",
///      "enum": [
///        "manual",
///        "session_end",
///        "pull_request",
///        "source_change"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sessionIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 1024
///    },
///    "snapshotIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 1024
///    },
///    "sourceInputId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CheckpointCreateRequest {
    #[serde(rename = "idempotencyKey")]
    pub idempotency_key: EntityId,
    pub kind: CheckpointCreateRequestKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    pub reason: CheckpointCreateRequestReason,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sessionIds")]
    pub session_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "snapshotIds")]
    pub snapshot_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "sourceInputId")]
    pub source_input_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`CheckpointCreateRequestKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "checkpoint_create_request"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CheckpointCreateRequestKind {
    #[serde(rename = "checkpoint_create_request")]
    CheckpointCreateRequest,
}
impl ::std::fmt::Display for CheckpointCreateRequestKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CheckpointCreateRequest => f.write_str("checkpoint_create_request"),
        }
    }
}
impl ::std::str::FromStr for CheckpointCreateRequestKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "checkpoint_create_request" => Ok(Self::CheckpointCreateRequest),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CheckpointCreateRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CheckpointCreateRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CheckpointCreateRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CheckpointCreateRequestReason`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "manual",
///    "session_end",
///    "pull_request",
///    "source_change"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CheckpointCreateRequestReason {
    #[serde(rename = "manual")]
    Manual,
    #[serde(rename = "session_end")]
    SessionEnd,
    #[serde(rename = "pull_request")]
    PullRequest,
    #[serde(rename = "source_change")]
    SourceChange,
}
impl ::std::fmt::Display for CheckpointCreateRequestReason {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Manual => f.write_str("manual"),
            Self::SessionEnd => f.write_str("session_end"),
            Self::PullRequest => f.write_str("pull_request"),
            Self::SourceChange => f.write_str("source_change"),
        }
    }
}
impl ::std::str::FromStr for CheckpointCreateRequestReason {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "manual" => Ok(Self::Manual),
            "session_end" => Ok(Self::SessionEnd),
            "pull_request" => Ok(Self::PullRequest),
            "source_change" => Ok(Self::SourceChange),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CheckpointCreateRequestReason {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CheckpointCreateRequestReason {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CheckpointCreateRequestReason {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CheckpointCreateResponse`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "checkpointId",
///    "createdAt",
///    "deduplicated",
///    "kind",
///    "schemaVersion",
///    "state"
///  ],
///  "properties": {
///    "checkpointId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "deduplicated": {
///      "type": "boolean"
///    },
///    "kind": {
///      "enum": [
///        "checkpoint_create_response"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "queued",
///        "reconciling",
///        "complete",
///        "failed"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CheckpointCreateResponse {
    #[serde(rename = "checkpointId")]
    pub checkpoint_id: EntityId,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    pub deduplicated: bool,
    pub kind: CheckpointCreateResponseKind,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub state: CheckpointCreateResponseState,
}
///`CheckpointCreateResponseKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "checkpoint_create_response"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CheckpointCreateResponseKind {
    #[serde(rename = "checkpoint_create_response")]
    CheckpointCreateResponse,
}
impl ::std::fmt::Display for CheckpointCreateResponseKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CheckpointCreateResponse => f.write_str("checkpoint_create_response"),
        }
    }
}
impl ::std::str::FromStr for CheckpointCreateResponseKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "checkpoint_create_response" => Ok(Self::CheckpointCreateResponse),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CheckpointCreateResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CheckpointCreateResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CheckpointCreateResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CheckpointCreateResponseState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "queued",
///    "reconciling",
///    "complete",
///    "failed"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CheckpointCreateResponseState {
    #[serde(rename = "queued")]
    Queued,
    #[serde(rename = "reconciling")]
    Reconciling,
    #[serde(rename = "complete")]
    Complete,
    #[serde(rename = "failed")]
    Failed,
}
impl ::std::fmt::Display for CheckpointCreateResponseState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Queued => f.write_str("queued"),
            Self::Reconciling => f.write_str("reconciling"),
            Self::Complete => f.write_str("complete"),
            Self::Failed => f.write_str("failed"),
        }
    }
}
impl ::std::str::FromStr for CheckpointCreateResponseState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "queued" => Ok(Self::Queued),
            "reconciling" => Ok(Self::Reconciling),
            "complete" => Ok(Self::Complete),
            "failed" => Ok(Self::Failed),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CheckpointCreateResponseState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CheckpointCreateResponseState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CheckpointCreateResponseState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CleanupFailedOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "cleanupStatus",
///    "outcome",
///    "precedingOutcome"
///  ],
///  "properties": {
///    "cleanupStatus": {
///      "enum": [
///        "cleanup_failed"
///      ]
///    },
///    "outcome": {
///      "enum": [
///        "cleanup_failed"
///      ]
///    },
///    "precedingOutcome": {
///      "type": "string",
///      "enum": [
///        "REDACTEDed",
///        "project_or_candidate_failed",
///        "infrastructure_failed",
///        "resource_budget_failed",
///        "timed_out",
///        "security_blocked",
///        "unsupported_target_or_capability",
///        "inconclusive"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CleanupFailedOutcome {
    #[serde(rename = "cleanupStatus")]
    pub cleanup_status: CleanupFailedOutcomeCleanupStatus,
    pub outcome: CleanupFailedOutcomeOutcome,
    #[serde(rename = "precedingOutcome")]
    pub preceding_outcome: CleanupFailedOutcomePrecedingOutcome,
}
///`CleanupFailedOutcomeCleanupStatus`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "cleanup_failed"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CleanupFailedOutcomeCleanupStatus {
    #[serde(rename = "cleanup_failed")]
    CleanupFailed,
}
impl ::std::fmt::Display for CleanupFailedOutcomeCleanupStatus {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CleanupFailed => f.write_str("cleanup_failed"),
        }
    }
}
impl ::std::str::FromStr for CleanupFailedOutcomeCleanupStatus {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "cleanup_failed" => Ok(Self::CleanupFailed),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CleanupFailedOutcomeCleanupStatus {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CleanupFailedOutcomeCleanupStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CleanupFailedOutcomeCleanupStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CleanupFailedOutcomeOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "cleanup_failed"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CleanupFailedOutcomeOutcome {
    #[serde(rename = "cleanup_failed")]
    CleanupFailed,
}
impl ::std::fmt::Display for CleanupFailedOutcomeOutcome {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CleanupFailed => f.write_str("cleanup_failed"),
        }
    }
}
impl ::std::str::FromStr for CleanupFailedOutcomeOutcome {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "cleanup_failed" => Ok(Self::CleanupFailed),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CleanupFailedOutcomeOutcome {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CleanupFailedOutcomeOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CleanupFailedOutcomeOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CleanupFailedOutcomePrecedingOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "REDACTEDed",
///    "project_or_candidate_failed",
///    "infrastructure_failed",
///    "resource_budget_failed",
///    "timed_out",
///    "security_blocked",
///    "unsupported_target_or_capability",
///    "inconclusive"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CleanupFailedOutcomePrecedingOutcome {
    #[serde(rename = "REDACTEDed")]
    Passed,
    #[serde(rename = "project_or_candidate_failed")]
    ProjectOrCandidateFailed,
    #[serde(rename = "infrastructure_failed")]
    InfrastructureFailed,
    #[serde(rename = "resource_budget_failed")]
    ResourceBudgetFailed,
    #[serde(rename = "timed_out")]
    TimedOut,
    #[serde(rename = "security_blocked")]
    SecurityBlocked,
    #[serde(rename = "unsupported_target_or_capability")]
    UnsupportedTargetOrCapability,
    #[serde(rename = "inconclusive")]
    Inconclusive,
}
impl ::std::fmt::Display for CleanupFailedOutcomePrecedingOutcome {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Passed => f.write_str("REDACTEDed"),
            Self::ProjectOrCandidateFailed => f.write_str("project_or_candidate_failed"),
            Self::InfrastructureFailed => f.write_str("infrastructure_failed"),
            Self::ResourceBudgetFailed => f.write_str("resource_budget_failed"),
            Self::TimedOut => f.write_str("timed_out"),
            Self::SecurityBlocked => f.write_str("security_blocked"),
            Self::UnsupportedTargetOrCapability => f.write_str("unsupported_target_or_capability"),
            Self::Inconclusive => f.write_str("inconclusive"),
        }
    }
}
impl ::std::str::FromStr for CleanupFailedOutcomePrecedingOutcome {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "REDACTEDed" => Ok(Self::Passed),
            "project_or_candidate_failed" => Ok(Self::ProjectOrCandidateFailed),
            "infrastructure_failed" => Ok(Self::InfrastructureFailed),
            "resource_budget_failed" => Ok(Self::ResourceBudgetFailed),
            "timed_out" => Ok(Self::TimedOut),
            "security_blocked" => Ok(Self::SecurityBlocked),
            "unsupported_target_or_capability" => Ok(Self::UnsupportedTargetOrCapability),
            "inconclusive" => Ok(Self::Inconclusive),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CleanupFailedOutcomePrecedingOutcome {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CleanupFailedOutcomePrecedingOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CleanupFailedOutcomePrecedingOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CompanionCommand`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "$ref": "#/$defs/StatusGetCommand"
///    },
///    {
///      "$ref": "#/$defs/WorkspaceEnrollCommand"
///    },
///    {
///      "$ref": "#/$defs/ProjectBindCommand"
///    },
///    {
///      "$ref": "#/$defs/ObservationStartCommand"
///    },
///    {
///      "$ref": "#/$defs/ObservationStopCommand"
///    },
///    {
///      "$ref": "#/$defs/CheckpointCreateCommand"
///    },
///    {
///      "$ref": "#/$defs/CoverageDiagnoseCommand"
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum CompanionCommand {
    StatusGetCommand(StatusGetCommand),
    WorkspaceEnrollCommand(WorkspaceEnrollCommand),
    ProjectBindCommand(ProjectBindCommand),
    ObservationStartCommand(ObservationStartCommand),
    ObservationStopCommand(ObservationStopCommand),
    CheckpointCreateCommand(CheckpointCreateCommand),
    CoverageDiagnoseCommand(CoverageDiagnoseCommand),
}
impl ::std::convert::From<StatusGetCommand> for CompanionCommand {
    fn from(value: StatusGetCommand) -> Self {
        Self::StatusGetCommand(value)
    }
}
impl ::std::convert::From<WorkspaceEnrollCommand> for CompanionCommand {
    fn from(value: WorkspaceEnrollCommand) -> Self {
        Self::WorkspaceEnrollCommand(value)
    }
}
impl ::std::convert::From<ProjectBindCommand> for CompanionCommand {
    fn from(value: ProjectBindCommand) -> Self {
        Self::ProjectBindCommand(value)
    }
}
impl ::std::convert::From<ObservationStartCommand> for CompanionCommand {
    fn from(value: ObservationStartCommand) -> Self {
        Self::ObservationStartCommand(value)
    }
}
impl ::std::convert::From<ObservationStopCommand> for CompanionCommand {
    fn from(value: ObservationStopCommand) -> Self {
        Self::ObservationStopCommand(value)
    }
}
impl ::std::convert::From<CheckpointCreateCommand> for CompanionCommand {
    fn from(value: CheckpointCreateCommand) -> Self {
        Self::CheckpointCreateCommand(value)
    }
}
impl ::std::convert::From<CoverageDiagnoseCommand> for CompanionCommand {
    fn from(value: CoverageDiagnoseCommand) -> Self {
        Self::CoverageDiagnoseCommand(value)
    }
}
///`CompanionFailure`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "error",
///    "result"
///  ],
///  "properties": {
///    "error": {
///      "$ref": "#/$defs/ProtocolError"
///    },
///    "result": {
///      "enum": [
///        "failure"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CompanionFailure {
    pub error: ProtocolError,
    pub result: CompanionFailureResult,
}
///`CompanionFailureResult`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "failure"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CompanionFailureResult {
    #[serde(rename = "failure")]
    Failure,
}
impl ::std::fmt::Display for CompanionFailureResult {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Failure => f.write_str("failure"),
        }
    }
}
impl ::std::str::FromStr for CompanionFailureResult {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "failure" => Ok(Self::Failure),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CompanionFailureResult {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CompanionFailureResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CompanionFailureResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CompanionNotification`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "kind",
///    "notificationId",
///    "payload",
///    "schemaVersion",
///    "sentAt"
///  ],
///  "properties": {
///    "kind": {
///      "enum": [
///        "companion_notification"
///      ]
///    },
///    "notificationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "payload": {
///      "$ref": "#/$defs/CompanionNotificationPayload"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sentAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CompanionNotification {
    pub kind: CompanionNotificationKind,
    #[serde(rename = "notificationId")]
    pub notification_id: EntityId,
    pub payload: CompanionNotificationPayload,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sentAt")]
    pub sent_at: Rfc3339Timestamp,
}
///`CompanionNotificationKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "companion_notification"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CompanionNotificationKind {
    #[serde(rename = "companion_notification")]
    CompanionNotification,
}
impl ::std::fmt::Display for CompanionNotificationKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CompanionNotification => f.write_str("companion_notification"),
        }
    }
}
impl ::std::str::FromStr for CompanionNotificationKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "companion_notification" => Ok(Self::CompanionNotification),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CompanionNotificationKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CompanionNotificationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CompanionNotificationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CompanionNotificationPayload`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "$ref": "#/$defs/StatusChangedNotification"
///    },
///    {
///      "$ref": "#/$defs/SessionChangedNotification"
///    },
///    {
///      "$ref": "#/$defs/CaptureGapCreatedNotification"
///    },
///    {
///      "$ref": "#/$defs/FindingAvailableNotification"
///    },
///    {
///      "$ref": "#/$defs/UploadChangedNotification"
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum CompanionNotificationPayload {
    StatusChangedNotification(StatusChangedNotification),
    SessionChangedNotification(SessionChangedNotification),
    CaptureGapCreatedNotification(CaptureGapCreatedNotification),
    FindingAvailableNotification(FindingAvailableNotification),
    UploadChangedNotification(UploadChangedNotification),
}
impl ::std::convert::From<StatusChangedNotification> for CompanionNotificationPayload {
    fn from(value: StatusChangedNotification) -> Self {
        Self::StatusChangedNotification(value)
    }
}
impl ::std::convert::From<SessionChangedNotification> for CompanionNotificationPayload {
    fn from(value: SessionChangedNotification) -> Self {
        Self::SessionChangedNotification(value)
    }
}
impl ::std::convert::From<CaptureGapCreatedNotification> for CompanionNotificationPayload {
    fn from(value: CaptureGapCreatedNotification) -> Self {
        Self::CaptureGapCreatedNotification(value)
    }
}
impl ::std::convert::From<FindingAvailableNotification> for CompanionNotificationPayload {
    fn from(value: FindingAvailableNotification) -> Self {
        Self::FindingAvailableNotification(value)
    }
}
impl ::std::convert::From<UploadChangedNotification> for CompanionNotificationPayload {
    fn from(value: UploadChangedNotification) -> Self {
        Self::UploadChangedNotification(value)
    }
}
///`CompanionRequest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "challengeSignature",
///    "command",
///    "deviceId",
///    "kind",
///    "requestId",
///    "schemaVersion",
///    "sentAt",
///    "startupChallengeId"
///  ],
///  "properties": {
///    "challengeSignature": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "command": {
///      "$ref": "#/$defs/CompanionCommand"
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "companion_request"
///      ]
///    },
///    "requestId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sentAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "startupChallengeId": {
///      "$ref": "#/$defs/OpaqueTokenId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CompanionRequest {
    #[serde(rename = "challengeSignature")]
    pub challenge_signature: Base64Url,
    pub command: CompanionCommand,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    pub kind: CompanionRequestKind,
    #[serde(rename = "requestId")]
    pub request_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sentAt")]
    pub sent_at: Rfc3339Timestamp,
    #[serde(rename = "startupChallengeId")]
    pub startup_challenge_id: OpaqueTokenId,
}
///`CompanionRequestKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "companion_request"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CompanionRequestKind {
    #[serde(rename = "companion_request")]
    CompanionRequest,
}
impl ::std::fmt::Display for CompanionRequestKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CompanionRequest => f.write_str("companion_request"),
        }
    }
}
impl ::std::str::FromStr for CompanionRequestKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "companion_request" => Ok(Self::CompanionRequest),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CompanionRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CompanionRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CompanionRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CompanionResponse`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "kind",
///    "outcome",
///    "requestId",
///    "schemaVersion",
///    "sentAt"
///  ],
///  "properties": {
///    "kind": {
///      "enum": [
///        "companion_response"
///      ]
///    },
///    "outcome": {
///      "$ref": "#/$defs/CompanionResponseOutcome"
///    },
///    "requestId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sentAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CompanionResponse {
    pub kind: CompanionResponseKind,
    pub outcome: CompanionResponseOutcome,
    #[serde(rename = "requestId")]
    pub request_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sentAt")]
    pub sent_at: Rfc3339Timestamp,
}
///`CompanionResponseKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "companion_response"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CompanionResponseKind {
    #[serde(rename = "companion_response")]
    CompanionResponse,
}
impl ::std::fmt::Display for CompanionResponseKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CompanionResponse => f.write_str("companion_response"),
        }
    }
}
impl ::std::str::FromStr for CompanionResponseKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "companion_response" => Ok(Self::CompanionResponse),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CompanionResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CompanionResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CompanionResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CompanionResponseOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "$ref": "#/$defs/CompanionSuccess"
///    },
///    {
///      "$ref": "#/$defs/CompanionFailure"
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum CompanionResponseOutcome {
    Success(CompanionSuccess),
    Failure(CompanionFailure),
}
impl ::std::convert::From<CompanionSuccess> for CompanionResponseOutcome {
    fn from(value: CompanionSuccess) -> Self {
        Self::Success(value)
    }
}
impl ::std::convert::From<CompanionFailure> for CompanionResponseOutcome {
    fn from(value: CompanionFailure) -> Self {
        Self::Failure(value)
    }
}
///`CompanionStatus`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "activeProject",
///    "activeSession",
///    "companionVersion",
///    "coverage",
///    "deviceEnrollment",
///    "kind",
///    "pendingUploadBatches",
///    "protocolVersion",
///    "schemaVersion",
///    "state",
///    "updatedAt"
///  ],
///  "properties": {
///    "activeProject": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "activeProjectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "activeSession": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "activeSessionId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "companionVersion": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "coverage": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "deviceEnrollment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "kind": {
///      "enum": [
///        "companion_status"
///      ]
///    },
///    "pendingUploadBatches": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 0.0
///    },
///    "protocolVersion": {
///      "type": "integer",
///      "enum": [
///        1
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "disconnected",
///        "observing",
///        "offline_buffering",
///        "capture_gap",
///        "finding",
///        "validating",
///        "verified",
///        "error"
///      ]
///    },
///    "updatedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CompanionStatus {
    #[serde(rename = "activeProject")]
    pub active_project: Assessment,
    #[serde(
        rename = "activeProjectId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub active_project_id: ::std::option::Option<EntityId>,
    #[serde(rename = "activeSession")]
    pub active_session: Assessment,
    #[serde(
        rename = "activeSessionId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub active_session_id: ::std::option::Option<EntityId>,
    #[serde(rename = "companionVersion")]
    pub companion_version: ShortString,
    pub coverage: Assessment,
    #[serde(rename = "deviceEnrollment")]
    pub device_enrollment: Assessment,
    pub kind: CompanionStatusKind,
    #[serde(rename = "pendingUploadBatches")]
    pub pending_upload_batches: i64,
    #[serde(rename = "protocolVersion")]
    pub protocol_version: CompanionStatusProtocolVersion,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub state: CompanionStatusState,
    #[serde(rename = "updatedAt")]
    pub updated_at: Rfc3339Timestamp,
}
///`CompanionStatusKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "companion_status"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CompanionStatusKind {
    #[serde(rename = "companion_status")]
    CompanionStatus,
}
impl ::std::fmt::Display for CompanionStatusKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CompanionStatus => f.write_str("companion_status"),
        }
    }
}
impl ::std::str::FromStr for CompanionStatusKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "companion_status" => Ok(Self::CompanionStatus),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CompanionStatusKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CompanionStatusKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CompanionStatusKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CompanionStatusProtocolVersion`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "integer",
///  "enum": [
///    1
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct CompanionStatusProtocolVersion(i64);
impl ::std::ops::Deref for CompanionStatusProtocolVersion {
    type Target = i64;
    fn deref(&self) -> &i64 {
        &self.0
    }
}
impl ::std::convert::From<CompanionStatusProtocolVersion> for i64 {
    fn from(value: CompanionStatusProtocolVersion) -> Self {
        value.0
    }
}
impl ::std::convert::TryFrom<i64> for CompanionStatusProtocolVersion {
    type Error = self::error::ConversionError;
    fn try_from(value: i64) -> ::std::result::Result<Self, self::error::ConversionError> {
        if ![1_i64].contains(&value) {
            Err("invalid value".into())
        } else {
            Ok(Self(value))
        }
    }
}
impl<'de> ::serde::Deserialize<'de> for CompanionStatusProtocolVersion {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        Self::try_from(<i64>::deserialize(deserializer)?)
            .map_err(|e| <D::Error as ::serde::de::Error>::custom(e.to_string()))
    }
}
///`CompanionStatusState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "disconnected",
///    "observing",
///    "offline_buffering",
///    "capture_gap",
///    "finding",
///    "validating",
///    "verified",
///    "error"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CompanionStatusState {
    #[serde(rename = "disconnected")]
    Disconnected,
    #[serde(rename = "observing")]
    Observing,
    #[serde(rename = "offline_buffering")]
    OfflineBuffering,
    #[serde(rename = "capture_gap")]
    CaptureGap,
    #[serde(rename = "finding")]
    Finding,
    #[serde(rename = "validating")]
    Validating,
    #[serde(rename = "verified")]
    Verified,
    #[serde(rename = "error")]
    Error,
}
impl ::std::fmt::Display for CompanionStatusState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Disconnected => f.write_str("disconnected"),
            Self::Observing => f.write_str("observing"),
            Self::OfflineBuffering => f.write_str("offline_buffering"),
            Self::CaptureGap => f.write_str("capture_gap"),
            Self::Finding => f.write_str("finding"),
            Self::Validating => f.write_str("validating"),
            Self::Verified => f.write_str("verified"),
            Self::Error => f.write_str("error"),
        }
    }
}
impl ::std::str::FromStr for CompanionStatusState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "disconnected" => Ok(Self::Disconnected),
            "observing" => Ok(Self::Observing),
            "offline_buffering" => Ok(Self::OfflineBuffering),
            "capture_gap" => Ok(Self::CaptureGap),
            "finding" => Ok(Self::Finding),
            "validating" => Ok(Self::Validating),
            "verified" => Ok(Self::Verified),
            "error" => Ok(Self::Error),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CompanionStatusState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CompanionStatusState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CompanionStatusState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CompanionSuccess`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "resourceAssessment",
///    "result",
///    "status"
///  ],
///  "properties": {
///    "resourceAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "resourceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "result": {
///      "enum": [
///        "success"
///      ]
///    },
///    "status": {
///      "$ref": "#/$defs/CompanionStatus"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CompanionSuccess {
    #[serde(rename = "resourceAssessment")]
    pub resource_assessment: Assessment,
    #[serde(
        rename = "resourceId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub resource_id: ::std::option::Option<EntityId>,
    pub result: CompanionSuccessResult,
    pub status: CompanionStatus,
}
///`CompanionSuccessResult`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "success"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CompanionSuccessResult {
    #[serde(rename = "success")]
    Success,
}
impl ::std::fmt::Display for CompanionSuccessResult {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Success => f.write_str("success"),
        }
    }
}
impl ::std::str::FromStr for CompanionSuccessResult {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "success" => Ok(Self::Success),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CompanionSuccessResult {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CompanionSuccessResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CompanionSuccessResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ConcurrencyLease`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "acquiredAt",
///    "expiresAt",
///    "heartbeatAt",
///    "holderOperationId",
///    "kind",
///    "leaseId",
///    "resourceIdentity",
///    "schemaVersion",
///    "scope",
///    "state",
///    "workspaceId"
///  ],
///  "properties": {
///    "acquiredAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "expiresAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "heartbeatAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "holderOperationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "concurrency_lease"
///      ]
///    },
///    "leaseId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "resourceIdentity": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "scope": {
///      "type": "string",
///      "enum": [
///        "workspace",
///        "repository",
///        "target",
///        "registry"
///      ]
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "active",
///        "releasing",
///        "released",
///        "expired"
///      ]
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ConcurrencyLease {
    #[serde(rename = "acquiredAt")]
    pub acquired_at: Rfc3339Timestamp,
    #[serde(rename = "expiresAt")]
    pub expires_at: Rfc3339Timestamp,
    #[serde(rename = "heartbeatAt")]
    pub heartbeat_at: Rfc3339Timestamp,
    #[serde(rename = "holderOperationId")]
    pub holder_operation_id: EntityId,
    pub kind: ConcurrencyLeaseKind,
    #[serde(rename = "leaseId")]
    pub lease_id: EntityId,
    #[serde(rename = "resourceIdentity")]
    pub resource_identity: ShortString,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub scope: ConcurrencyLeaseScope,
    pub state: ConcurrencyLeaseState,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ConcurrencyLeaseKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "concurrency_lease"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ConcurrencyLeaseKind {
    #[serde(rename = "concurrency_lease")]
    ConcurrencyLease,
}
impl ::std::fmt::Display for ConcurrencyLeaseKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ConcurrencyLease => f.write_str("concurrency_lease"),
        }
    }
}
impl ::std::str::FromStr for ConcurrencyLeaseKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "concurrency_lease" => Ok(Self::ConcurrencyLease),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ConcurrencyLeaseKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ConcurrencyLeaseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ConcurrencyLeaseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ConcurrencyLeaseScope`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "workspace",
///    "repository",
///    "target",
///    "registry"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ConcurrencyLeaseScope {
    #[serde(rename = "workspace")]
    Workspace,
    #[serde(rename = "repository")]
    Repository,
    #[serde(rename = "target")]
    Target,
    #[serde(rename = "registry")]
    Registry,
}
impl ::std::fmt::Display for ConcurrencyLeaseScope {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Workspace => f.write_str("workspace"),
            Self::Repository => f.write_str("repository"),
            Self::Target => f.write_str("target"),
            Self::Registry => f.write_str("registry"),
        }
    }
}
impl ::std::str::FromStr for ConcurrencyLeaseScope {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "workspace" => Ok(Self::Workspace),
            "repository" => Ok(Self::Repository),
            "target" => Ok(Self::Target),
            "registry" => Ok(Self::Registry),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ConcurrencyLeaseScope {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ConcurrencyLeaseScope {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ConcurrencyLeaseScope {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ConcurrencyLeaseState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "active",
///    "releasing",
///    "released",
///    "expired"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ConcurrencyLeaseState {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "releasing")]
    Releasing,
    #[serde(rename = "released")]
    Released,
    #[serde(rename = "expired")]
    Expired,
}
impl ::std::fmt::Display for ConcurrencyLeaseState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Active => f.write_str("active"),
            Self::Releasing => f.write_str("releasing"),
            Self::Released => f.write_str("released"),
            Self::Expired => f.write_str("expired"),
        }
    }
}
impl ::std::str::FromStr for ConcurrencyLeaseState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "active" => Ok(Self::Active),
            "releasing" => Ok(Self::Releasing),
            "released" => Ok(Self::Released),
            "expired" => Ok(Self::Expired),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ConcurrencyLeaseState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ConcurrencyLeaseState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ConcurrencyLeaseState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Confidence`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "number",
///  "maximum": 1.0,
///  "minimum": 0.0
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct Confidence(pub f64);
impl ::std::ops::Deref for Confidence {
    type Target = f64;
    fn deref(&self) -> &f64 {
        &self.0
    }
}
impl ::std::convert::From<Confidence> for f64 {
    fn from(value: Confidence) -> Self {
        value.0
    }
}
impl ::std::convert::From<f64> for Confidence {
    fn from(value: f64) -> Self {
        Self(value)
    }
}
impl ::std::str::FromStr for Confidence {
    type Err = <f64 as ::std::str::FromStr>::Err;
    fn from_str(value: &str) -> ::std::result::Result<Self, Self::Err> {
        Ok(Self(value.parse()?))
    }
}
impl ::std::convert::TryFrom<&str> for Confidence {
    type Error = <f64 as ::std::str::FromStr>::Err;
    fn try_from(value: &str) -> ::std::result::Result<Self, Self::Error> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<String> for Confidence {
    type Error = <f64 as ::std::str::FromStr>::Err;
    fn try_from(value: String) -> ::std::result::Result<Self, Self::Error> {
        value.parse()
    }
}
impl ::std::fmt::Display for Confidence {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        self.0.fmt(f)
    }
}
///`ConfigurationEditOperation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "editKind",
///    "evidenceReferenceIds",
///    "filePath",
///    "findingIds",
///    "newValue",
///    "operationId",
///    "operationKind",
///    "realmId",
///    "semanticPath"
///  ],
///  "properties": {
///    "editKind": {
///      "type": "string",
///      "enum": [
///        "set",
///        "remove",
///        "append",
///        "merge"
///      ]
///    },
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512,
///      "minItems": 1
///    },
///    "filePath": {
///      "$ref": "#/$defs/RelativePath"
///    },
///    "findingIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "newValue": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "operationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "operationKind": {
///      "enum": [
///        "configuration_edit"
///      ]
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "semanticPath": {
///      "$ref": "#/$defs/ShortString"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ConfigurationEditOperation {
    #[serde(rename = "editKind")]
    pub edit_kind: ConfigurationEditOperationEditKind,
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "filePath")]
    pub file_path: RelativePath,
    #[serde(rename = "findingIds")]
    pub finding_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "newValue")]
    pub new_value: BoundedString,
    #[serde(rename = "operationId")]
    pub operation_id: EntityId,
    #[serde(rename = "operationKind")]
    pub operation_kind: ConfigurationEditOperationOperationKind,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    #[serde(rename = "semanticPath")]
    pub semantic_path: ShortString,
}
///`ConfigurationEditOperationEditKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "set",
///    "remove",
///    "append",
///    "merge"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ConfigurationEditOperationEditKind {
    #[serde(rename = "set")]
    Set,
    #[serde(rename = "remove")]
    Remove,
    #[serde(rename = "append")]
    Append,
    #[serde(rename = "merge")]
    Merge,
}
impl ::std::fmt::Display for ConfigurationEditOperationEditKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Set => f.write_str("set"),
            Self::Remove => f.write_str("remove"),
            Self::Append => f.write_str("append"),
            Self::Merge => f.write_str("merge"),
        }
    }
}
impl ::std::str::FromStr for ConfigurationEditOperationEditKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "set" => Ok(Self::Set),
            "remove" => Ok(Self::Remove),
            "append" => Ok(Self::Append),
            "merge" => Ok(Self::Merge),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ConfigurationEditOperationEditKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ConfigurationEditOperationEditKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ConfigurationEditOperationEditKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ConfigurationEditOperationOperationKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "configuration_edit"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ConfigurationEditOperationOperationKind {
    #[serde(rename = "configuration_edit")]
    ConfigurationEdit,
}
impl ::std::fmt::Display for ConfigurationEditOperationOperationKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ConfigurationEdit => f.write_str("configuration_edit"),
        }
    }
}
impl ::std::str::FromStr for ConfigurationEditOperationOperationKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "configuration_edit" => Ok(Self::ConfigurationEdit),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ConfigurationEditOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ConfigurationEditOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ConfigurationEditOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`CoverageDiagnoseCommand`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "type"
///  ],
///  "properties": {
///    "type": {
///      "enum": [
///        "coverage.diagnose"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct CoverageDiagnoseCommand {
    #[serde(rename = "type")]
    pub type_: CoverageDiagnoseCommandType,
}
///`CoverageDiagnoseCommandType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "coverage.diagnose"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum CoverageDiagnoseCommandType {
    #[serde(rename = "coverage.diagnose")]
    CoverageDiagnose,
}
impl ::std::fmt::Display for CoverageDiagnoseCommandType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::CoverageDiagnose => f.write_str("coverage.diagnose"),
        }
    }
}
impl ::std::str::FromStr for CoverageDiagnoseCommandType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "coverage.diagnose" => Ok(Self::CoverageDiagnose),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for CoverageDiagnoseCommandType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for CoverageDiagnoseCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for CoverageDiagnoseCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`DecimalCounter`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 32,
///  "pattern": "^(?:0|[1-9][0-9]*)$"
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct DecimalCounter(::std::string::String);
impl ::std::ops::Deref for DecimalCounter {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<DecimalCounter> for ::std::string::String {
    fn from(value: DecimalCounter) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for DecimalCounter {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 32usize {
            return Err("longer than 32 characters".into());
        }
        static PATTERN: ::std::sync::LazyLock<::regress::Regex> =
            ::std::sync::LazyLock::new(|| ::regress::Regex::new("^(?:0|[1-9][0-9]*)$").unwrap());
        if PATTERN.find(value).is_none() {
            return Err("doesn't match pattern \"^(?:0|[1-9][0-9]*)$\"".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for DecimalCounter {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for DecimalCounter {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for DecimalCounter {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for DecimalCounter {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`DeclaredGraph`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "graph",
///    "kind",
///    "schemaVersion"
///  ],
///  "properties": {
///    "graph": {
///      "$ref": "#/$defs/GraphBody"
///    },
///    "kind": {
///      "enum": [
///        "declared_graph"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DeclaredGraph {
    pub graph: GraphBody,
    pub kind: DeclaredGraphKind,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`DeclaredGraphKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "declared_graph"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum DeclaredGraphKind {
    #[serde(rename = "declared_graph")]
    DeclaredGraph,
}
impl ::std::fmt::Display for DeclaredGraphKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::DeclaredGraph => f.write_str("declared_graph"),
        }
    }
}
impl ::std::str::FromStr for DeclaredGraphKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "declared_graph" => Ok(Self::DeclaredGraph),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for DeclaredGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for DeclaredGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for DeclaredGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Device`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "architecture",
///    "REDACTEDVersion",
///    "deviceId",
///    "displayName",
///    "enrolledAt",
///    "kind",
///    "platform",
///    "schemaVersion",
///    "signingPublicKey",
///    "status",
///    "workspaceId"
///  ],
///  "properties": {
///    "architecture": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "REDACTEDVersion": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "displayName": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "enrolledAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "kind": {
///      "enum": [
///        "device"
///      ]
///    },
///    "platform": {
///      "type": "string",
///      "enum": [
///        "windows",
///        "linux",
///        "macos"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "signingPublicKey": {
///      "$ref": "#/$defs/Base64"
///    },
///    "status": {
///      "type": "string",
///      "enum": [
///        "paired",
///        "online",
///        "offline",
///        "revoked"
///      ]
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Device {
    pub architecture: ShortString,
    #[serde(rename = "REDACTEDVersion")]
    pub REDACTED_version: ::std::num::NonZeroU64,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    #[serde(rename = "displayName")]
    pub display_name: ShortString,
    #[serde(rename = "enrolledAt")]
    pub enrolled_at: Rfc3339Timestamp,
    pub kind: DeviceKind,
    pub platform: DevicePlatform,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "signingPublicKey")]
    pub signing_public_key: Base64,
    pub status: DeviceStatus,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`DeviceEnrollmentRequest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "companionVersion",
///    "deviceName",
///    "devicePublicKey",
///    "enrollmentToken",
///    "kind",
///    "platform",
///    "schemaVersion"
///  ],
///  "properties": {
///    "companionVersion": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "deviceName": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "devicePublicKey": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "enrollmentToken": {
///      "$ref": "#/$defs/OpaqueTokenId"
///    },
///    "kind": {
///      "enum": [
///        "device_enrollment_request"
///      ]
///    },
///    "platform": {
///      "type": "string",
///      "enum": [
///        "windows",
///        "linux",
///        "macos"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DeviceEnrollmentRequest {
    #[serde(rename = "companionVersion")]
    pub companion_version: ShortString,
    #[serde(rename = "deviceName")]
    pub device_name: ShortString,
    #[serde(rename = "devicePublicKey")]
    pub device_public_key: Base64Url,
    #[serde(rename = "enrollmentToken")]
    pub enrollment_REDACTED: OpaqueTokenId,
    pub kind: DeviceEnrollmentRequestKind,
    pub platform: DeviceEnrollmentRequestPlatform,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`DeviceEnrollmentRequestKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "device_enrollment_request"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum DeviceEnrollmentRequestKind {
    #[serde(rename = "device_enrollment_request")]
    DeviceEnrollmentRequest,
}
impl ::std::fmt::Display for DeviceEnrollmentRequestKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::DeviceEnrollmentRequest => f.write_str("device_enrollment_request"),
        }
    }
}
impl ::std::str::FromStr for DeviceEnrollmentRequestKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "device_enrollment_request" => Ok(Self::DeviceEnrollmentRequest),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for DeviceEnrollmentRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for DeviceEnrollmentRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for DeviceEnrollmentRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`DeviceEnrollmentRequestPlatform`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "windows",
///    "linux",
///    "macos"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum DeviceEnrollmentRequestPlatform {
    #[serde(rename = "windows")]
    Windows,
    #[serde(rename = "linux")]
    Linux,
    #[serde(rename = "macos")]
    Macos,
}
impl ::std::fmt::Display for DeviceEnrollmentRequestPlatform {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Windows => f.write_str("windows"),
            Self::Linux => f.write_str("linux"),
            Self::Macos => f.write_str("macos"),
        }
    }
}
impl ::std::str::FromStr for DeviceEnrollmentRequestPlatform {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "windows" => Ok(Self::Windows),
            "linux" => Ok(Self::Linux),
            "macos" => Ok(Self::Macos),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for DeviceEnrollmentRequestPlatform {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for DeviceEnrollmentRequestPlatform {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for DeviceEnrollmentRequestPlatform {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`DeviceEnrollmentResponse`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "REDACTEDExpiresAt",
///    "deviceCredential",
///    "deviceId",
///    "issuedAt",
///    "kind",
///    "schemaVersion",
///    "serverPublicKey",
///    "workspaceId"
///  ],
///  "properties": {
///    "REDACTEDExpiresAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "deviceCredential": {
///      "$ref": "#/$defs/OpaqueTokenId"
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "issuedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "kind": {
///      "enum": [
///        "device_enrollment_response"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "serverPublicKey": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DeviceEnrollmentResponse {
    #[serde(rename = "REDACTEDExpiresAt")]
    pub REDACTED_expires_at: Rfc3339Timestamp,
    #[serde(rename = "deviceCredential")]
    pub device_REDACTED: OpaqueTokenId,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    #[serde(rename = "issuedAt")]
    pub issued_at: Rfc3339Timestamp,
    pub kind: DeviceEnrollmentResponseKind,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "serverPublicKey")]
    pub server_public_key: Base64Url,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`DeviceEnrollmentResponseKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "device_enrollment_response"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum DeviceEnrollmentResponseKind {
    #[serde(rename = "device_enrollment_response")]
    DeviceEnrollmentResponse,
}
impl ::std::fmt::Display for DeviceEnrollmentResponseKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::DeviceEnrollmentResponse => f.write_str("device_enrollment_response"),
        }
    }
}
impl ::std::str::FromStr for DeviceEnrollmentResponseKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "device_enrollment_response" => Ok(Self::DeviceEnrollmentResponse),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for DeviceEnrollmentResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for DeviceEnrollmentResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for DeviceEnrollmentResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`DeviceKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "device"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum DeviceKind {
    #[serde(rename = "device")]
    Device,
}
impl ::std::fmt::Display for DeviceKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Device => f.write_str("device"),
        }
    }
}
impl ::std::str::FromStr for DeviceKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "device" => Ok(Self::Device),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for DeviceKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for DeviceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for DeviceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`DevicePlatform`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "windows",
///    "linux",
///    "macos"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum DevicePlatform {
    #[serde(rename = "windows")]
    Windows,
    #[serde(rename = "linux")]
    Linux,
    #[serde(rename = "macos")]
    Macos,
}
impl ::std::fmt::Display for DevicePlatform {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Windows => f.write_str("windows"),
            Self::Linux => f.write_str("linux"),
            Self::Macos => f.write_str("macos"),
        }
    }
}
impl ::std::str::FromStr for DevicePlatform {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "windows" => Ok(Self::Windows),
            "linux" => Ok(Self::Linux),
            "macos" => Ok(Self::Macos),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for DevicePlatform {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for DevicePlatform {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for DevicePlatform {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`DeviceStatus`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "paired",
///    "online",
///    "offline",
///    "revoked"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum DeviceStatus {
    #[serde(rename = "paired")]
    Paired,
    #[serde(rename = "online")]
    Online,
    #[serde(rename = "offline")]
    Offline,
    #[serde(rename = "revoked")]
    Revoked,
}
impl ::std::fmt::Display for DeviceStatus {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Paired => f.write_str("paired"),
            Self::Online => f.write_str("online"),
            Self::Offline => f.write_str("offline"),
            Self::Revoked => f.write_str("revoked"),
        }
    }
}
impl ::std::str::FromStr for DeviceStatus {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "paired" => Ok(Self::Paired),
            "online" => Ok(Self::Online),
            "offline" => Ok(Self::Offline),
            "revoked" => Ok(Self::Revoked),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for DeviceStatus {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for DeviceStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for DeviceStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`DigestReference`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "digest",
///    "id"
///  ],
///  "properties": {
///    "digest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "id": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct DigestReference {
    pub digest: Sha256Digest,
    pub id: EntityId,
}
///`DurationMs`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "integer",
///  "maximum": 9007199254740991.0,
///  "minimum": 0.0
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct DurationMs(pub i64);
impl ::std::ops::Deref for DurationMs {
    type Target = i64;
    fn deref(&self) -> &i64 {
        &self.0
    }
}
impl ::std::convert::From<DurationMs> for i64 {
    fn from(value: DurationMs) -> Self {
        value.0
    }
}
impl ::std::convert::From<i64> for DurationMs {
    fn from(value: i64) -> Self {
        Self(value)
    }
}
impl ::std::str::FromStr for DurationMs {
    type Err = <i64 as ::std::str::FromStr>::Err;
    fn from_str(value: &str) -> ::std::result::Result<Self, Self::Err> {
        Ok(Self(value.parse()?))
    }
}
impl ::std::convert::TryFrom<&str> for DurationMs {
    type Error = <i64 as ::std::str::FromStr>::Err;
    fn try_from(value: &str) -> ::std::result::Result<Self, Self::Error> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<String> for DurationMs {
    type Error = <i64 as ::std::str::FromStr>::Err;
    fn try_from(value: String) -> ::std::result::Result<Self, Self::Error> {
        value.parse()
    }
}
impl ::std::fmt::Display for DurationMs {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        self.0.fmt(f)
    }
}
///`EntityId`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 160,
///  "minLength": 1,
///  "pattern": "^[A-Za-z0-9][A-Za-z0-9._:-]*$"
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct EntityId(::std::string::String);
impl ::std::ops::Deref for EntityId {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<EntityId> for ::std::string::String {
    fn from(value: EntityId) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for EntityId {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 160usize {
            return Err("longer than 160 characters".into());
        }
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        static PATTERN: ::std::sync::LazyLock<::regress::Regex> =
            ::std::sync::LazyLock::new(|| {
                ::regress::Regex::new("^[A-Za-z0-9][A-Za-z0-9._:-]*$").unwrap()
            });
        if PATTERN.find(value).is_none() {
            return Err("doesn't match pattern \"^[A-Za-z0-9][A-Za-z0-9._:-]*$\"".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for EntityId {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EntityId {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EntityId {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for EntityId {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`EnvironmentFingerprint`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "$ref": "#/$defs/EnvironmentFingerprintComparable"
///    },
///    {
///      "$ref": "#/$defs/EnvironmentFingerprintUnavailable"
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum EnvironmentFingerprint {
    Comparable(EnvironmentFingerprintComparable),
    Unavailable(EnvironmentFingerprintUnavailable),
}
impl ::std::convert::From<EnvironmentFingerprintComparable> for EnvironmentFingerprint {
    fn from(value: EnvironmentFingerprintComparable) -> Self {
        Self::Comparable(value)
    }
}
impl ::std::convert::From<EnvironmentFingerprintUnavailable> for EnvironmentFingerprint {
    fn from(value: EnvironmentFingerprintUnavailable) -> Self {
        Self::Unavailable(value)
    }
}
///`EnvironmentFingerprintComparable`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "fingerprint",
///    "keyVersion",
///    "state"
///  ],
///  "properties": {
///    "fingerprint": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "keyVersion": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    },
///    "state": {
///      "enum": [
///        "comparable"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct EnvironmentFingerprintComparable {
    pub fingerprint: Sha256Digest,
    #[serde(rename = "keyVersion")]
    pub key_version: ::std::num::NonZeroU64,
    pub state: EnvironmentFingerprintComparableState,
}
///`EnvironmentFingerprintComparableState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "comparable"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EnvironmentFingerprintComparableState {
    #[serde(rename = "comparable")]
    Comparable,
}
impl ::std::fmt::Display for EnvironmentFingerprintComparableState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Comparable => f.write_str("comparable"),
        }
    }
}
impl ::std::str::FromStr for EnvironmentFingerprintComparableState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "comparable" => Ok(Self::Comparable),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EnvironmentFingerprintComparableState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EnvironmentFingerprintComparableState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EnvironmentFingerprintComparableState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`EnvironmentFingerprintUnavailable`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "reasonCode",
///    "state"
///  ],
///  "properties": {
///    "reasonCode": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "unknown",
///        "not_applicable",
///        "unsupported"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct EnvironmentFingerprintUnavailable {
    #[serde(rename = "reasonCode")]
    pub reason_code: ShortString,
    pub state: EnvironmentFingerprintUnavailableState,
}
///`EnvironmentFingerprintUnavailableState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "unknown",
///    "not_applicable",
///    "unsupported"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EnvironmentFingerprintUnavailableState {
    #[serde(rename = "unknown")]
    Unknown,
    #[serde(rename = "not_applicable")]
    NotApplicable,
    #[serde(rename = "unsupported")]
    Unsupported,
}
impl ::std::fmt::Display for EnvironmentFingerprintUnavailableState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Unknown => f.write_str("unknown"),
            Self::NotApplicable => f.write_str("not_applicable"),
            Self::Unsupported => f.write_str("unsupported"),
        }
    }
}
impl ::std::str::FromStr for EnvironmentFingerprintUnavailableState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "unknown" => Ok(Self::Unknown),
            "not_applicable" => Ok(Self::NotApplicable),
            "unsupported" => Ok(Self::Unsupported),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EnvironmentFingerprintUnavailableState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EnvironmentFingerprintUnavailableState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EnvironmentFingerprintUnavailableState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`EnvironmentVariableObservation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "change",
///    "fingerprint",
///    "name",
///    "present",
///    "scope",
///    "REDACTEDDetected"
///  ],
///  "properties": {
///    "change": {
///      "type": "string",
///      "enum": [
///        "added",
///        "removed",
///        "changed",
///        "unchanged",
///        "unknown"
///      ]
///    },
///    "fingerprint": {
///      "$ref": "#/$defs/EnvironmentFingerprint"
///    },
///    "name": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "present": {
///      "type": "boolean"
///    },
///    "scope": {
///      "type": "string",
///      "enum": [
///        "process",
///        "session",
///        "project",
///        "REDACTED",
///        "system",
///        "unknown"
///      ]
///    },
///    "REDACTEDDetected": {
///      "type": "boolean"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct EnvironmentVariableObservation {
    pub change: EnvironmentVariableObservationChange,
    pub fingerprint: EnvironmentFingerprint,
    pub name: ShortString,
    pub present: bool,
    pub scope: EnvironmentVariableObservationScope,
    #[serde(rename = "REDACTEDDetected")]
    pub REDACTED_detected: bool,
}
///`EnvironmentVariableObservationChange`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "added",
///    "removed",
///    "changed",
///    "unchanged",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EnvironmentVariableObservationChange {
    #[serde(rename = "added")]
    Added,
    #[serde(rename = "removed")]
    Removed,
    #[serde(rename = "changed")]
    Changed,
    #[serde(rename = "unchanged")]
    Unchanged,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for EnvironmentVariableObservationChange {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Added => f.write_str("added"),
            Self::Removed => f.write_str("removed"),
            Self::Changed => f.write_str("changed"),
            Self::Unchanged => f.write_str("unchanged"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for EnvironmentVariableObservationChange {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "added" => Ok(Self::Added),
            "removed" => Ok(Self::Removed),
            "changed" => Ok(Self::Changed),
            "unchanged" => Ok(Self::Unchanged),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EnvironmentVariableObservationChange {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EnvironmentVariableObservationChange {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EnvironmentVariableObservationChange {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`EnvironmentVariableObservationScope`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "process",
///    "session",
///    "project",
///    "REDACTED",
///    "system",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EnvironmentVariableObservationScope {
    #[serde(rename = "process")]
    Process,
    #[serde(rename = "session")]
    Session,
    #[serde(rename = "project")]
    Project,
    #[serde(rename = "REDACTED")]
    User,
    #[serde(rename = "system")]
    System,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for EnvironmentVariableObservationScope {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Process => f.write_str("process"),
            Self::Session => f.write_str("session"),
            Self::Project => f.write_str("project"),
            Self::User => f.write_str("REDACTED"),
            Self::System => f.write_str("system"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for EnvironmentVariableObservationScope {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "process" => Ok(Self::Process),
            "session" => Ok(Self::Session),
            "project" => Ok(Self::Project),
            "REDACTED" => Ok(Self::User),
            "system" => Ok(Self::System),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EnvironmentVariableObservationScope {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EnvironmentVariableObservationScope {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EnvironmentVariableObservationScope {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`EphemeralObjectAuthorization`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "authorizationId",
///    "expiresAt",
///    "headers",
///    "kind",
///    "method",
///    "objectId",
///    "retention",
///    "schemaVersion",
///    "sealedObjectKey",
///    "url"
///  ],
///  "properties": {
///    "authorizationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "expiresAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "headers": {
///      "$ref": "#/$defs/StringMap"
///    },
///    "kind": {
///      "enum": [
///        "ephemeral_object_authorization"
///      ]
///    },
///    "method": {
///      "type": "string",
///      "enum": [
///        "GET",
///        "PUT"
///      ]
///    },
///    "objectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "retention": {
///      "enum": [
///        "ephemeral"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sealedObjectKey": {
///      "$ref": "#/$defs/Base64"
///    },
///    "url": {
///      "$ref": "#/$defs/HttpUrl"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct EphemeralObjectAuthorization {
    #[serde(rename = "authorizationId")]
    pub authorization_id: EntityId,
    #[serde(rename = "expiresAt")]
    pub expires_at: Rfc3339Timestamp,
    pub headers: StringMap,
    pub kind: EphemeralObjectAuthorizationKind,
    pub method: EphemeralObjectAuthorizationMethod,
    #[serde(rename = "objectId")]
    pub object_id: EntityId,
    pub retention: EphemeralObjectAuthorizationRetention,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sealedObjectKey")]
    pub sealed_object_key: Base64,
    pub url: HttpUrl,
}
///`EphemeralObjectAuthorizationKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "ephemeral_object_authorization"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EphemeralObjectAuthorizationKind {
    #[serde(rename = "ephemeral_object_authorization")]
    EphemeralObjectAuthorization,
}
impl ::std::fmt::Display for EphemeralObjectAuthorizationKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::EphemeralObjectAuthorization => f.write_str("ephemeral_object_authorization"),
        }
    }
}
impl ::std::str::FromStr for EphemeralObjectAuthorizationKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "ephemeral_object_authorization" => Ok(Self::EphemeralObjectAuthorization),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EphemeralObjectAuthorizationKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EphemeralObjectAuthorizationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EphemeralObjectAuthorizationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`EphemeralObjectAuthorizationMethod`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "GET",
///    "PUT"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EphemeralObjectAuthorizationMethod {
    #[serde(rename = "GET")]
    Get,
    #[serde(rename = "PUT")]
    Put,
}
impl ::std::fmt::Display for EphemeralObjectAuthorizationMethod {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Get => f.write_str("GET"),
            Self::Put => f.write_str("PUT"),
        }
    }
}
impl ::std::str::FromStr for EphemeralObjectAuthorizationMethod {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "GET" => Ok(Self::Get),
            "PUT" => Ok(Self::Put),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EphemeralObjectAuthorizationMethod {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EphemeralObjectAuthorizationMethod {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EphemeralObjectAuthorizationMethod {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`EphemeralObjectAuthorizationRetention`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "ephemeral"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EphemeralObjectAuthorizationRetention {
    #[serde(rename = "ephemeral")]
    Ephemeral,
}
impl ::std::fmt::Display for EphemeralObjectAuthorizationRetention {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Ephemeral => f.write_str("ephemeral"),
        }
    }
}
impl ::std::str::FromStr for EphemeralObjectAuthorizationRetention {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "ephemeral" => Ok(Self::Ephemeral),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EphemeralObjectAuthorizationRetention {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EphemeralObjectAuthorizationRetention {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EphemeralObjectAuthorizationRetention {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`EvidenceLocation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "contentDigest",
///    "lineAssessment",
///    "pathAssessment",
///    "sourceId",
///    "sourceKind"
///  ],
///  "properties": {
///    "contentDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "endLine": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    },
///    "lineAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "path": {
///      "$ref": "#/$defs/RelativePath"
///    },
///    "pathAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "sourceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "sourceKind": {
///      "type": "string",
///      "enum": [
///        "observation_event",
///        "action_envelope",
///        "snapshot",
///        "source_input",
///        "repository_file",
///        "dependency_graph",
///        "validation_phase",
///        "validation_job",
///        "REDACTED_statement",
///        "system_capability"
///      ]
///    },
///    "startLine": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct EvidenceLocation {
    #[serde(rename = "contentDigest")]
    pub content_digest: Sha256Digest,
    #[serde(
        rename = "endLine",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub end_line: ::std::option::Option<::std::num::NonZeroU64>,
    #[serde(rename = "lineAssessment")]
    pub line_assessment: Assessment,
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub path: ::std::option::Option<RelativePath>,
    #[serde(rename = "pathAssessment")]
    pub path_assessment: Assessment,
    #[serde(rename = "sourceId")]
    pub source_id: EntityId,
    #[serde(rename = "sourceKind")]
    pub source_kind: EvidenceLocationSourceKind,
    #[serde(
        rename = "startLine",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub start_line: ::std::option::Option<::std::num::NonZeroU64>,
}
///`EvidenceLocationSourceKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "observation_event",
///    "action_envelope",
///    "snapshot",
///    "source_input",
///    "repository_file",
///    "dependency_graph",
///    "validation_phase",
///    "validation_job",
///    "REDACTED_statement",
///    "system_capability"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EvidenceLocationSourceKind {
    #[serde(rename = "observation_event")]
    ObservationEvent,
    #[serde(rename = "action_envelope")]
    ActionEnvelope,
    #[serde(rename = "snapshot")]
    Snapshot,
    #[serde(rename = "source_input")]
    SourceInput,
    #[serde(rename = "repository_file")]
    RepositoryFile,
    #[serde(rename = "dependency_graph")]
    DependencyGraph,
    #[serde(rename = "validation_phase")]
    ValidationPhase,
    #[serde(rename = "validation_job")]
    ValidationJob,
    #[serde(rename = "REDACTED_statement")]
    UserStatement,
    #[serde(rename = "system_capability")]
    SystemCapability,
}
impl ::std::fmt::Display for EvidenceLocationSourceKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObservationEvent => f.write_str("observation_event"),
            Self::ActionEnvelope => f.write_str("action_envelope"),
            Self::Snapshot => f.write_str("snapshot"),
            Self::SourceInput => f.write_str("source_input"),
            Self::RepositoryFile => f.write_str("repository_file"),
            Self::DependencyGraph => f.write_str("dependency_graph"),
            Self::ValidationPhase => f.write_str("validation_phase"),
            Self::ValidationJob => f.write_str("validation_job"),
            Self::UserStatement => f.write_str("REDACTED_statement"),
            Self::SystemCapability => f.write_str("system_capability"),
        }
    }
}
impl ::std::str::FromStr for EvidenceLocationSourceKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "observation_event" => Ok(Self::ObservationEvent),
            "action_envelope" => Ok(Self::ActionEnvelope),
            "snapshot" => Ok(Self::Snapshot),
            "source_input" => Ok(Self::SourceInput),
            "repository_file" => Ok(Self::RepositoryFile),
            "dependency_graph" => Ok(Self::DependencyGraph),
            "validation_phase" => Ok(Self::ValidationPhase),
            "validation_job" => Ok(Self::ValidationJob),
            "REDACTED_statement" => Ok(Self::UserStatement),
            "system_capability" => Ok(Self::SystemCapability),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EvidenceLocationSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EvidenceLocationSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EvidenceLocationSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`EvidenceReference`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "capturedAt",
///    "evidenceReferenceId",
///    "evidenceType",
///    "kind",
///    "location",
///    "projectId",
///    "redactionState",
///    "schemaVersion",
///    "statement",
///    "workspaceId"
///  ],
///  "properties": {
///    "capturedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "evidenceReferenceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "evidenceType": {
///      "type": "string",
///      "enum": [
///        "direct_observation",
///        "declared_configuration",
///        "locked_resolution",
///        "installed_inventory",
///        "runtime_use",
///        "validation_result",
///        "human_confirmation",
///        "capability_limit",
///        "capture_gap"
///      ]
///    },
///    "kind": {
///      "enum": [
///        "evidence_reference"
///      ]
///    },
///    "location": {
///      "$ref": "#/$defs/EvidenceLocation"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "redactionState": {
///      "type": "string",
///      "enum": [
///        "not_required",
///        "redacted",
///        "metadata_only"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "statement": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct EvidenceReference {
    #[serde(rename = "capturedAt")]
    pub captured_at: Rfc3339Timestamp,
    #[serde(rename = "evidenceReferenceId")]
    pub evidence_reference_id: EntityId,
    #[serde(rename = "evidenceType")]
    pub evidence_type: EvidenceReferenceEvidenceType,
    pub kind: EvidenceReferenceKind,
    pub location: EvidenceLocation,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "redactionState")]
    pub redaction_state: EvidenceReferenceRedactionState,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub statement: BoundedString,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`EvidenceReferenceEvidenceType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "direct_observation",
///    "declared_configuration",
///    "locked_resolution",
///    "installed_inventory",
///    "runtime_use",
///    "validation_result",
///    "human_confirmation",
///    "capability_limit",
///    "capture_gap"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EvidenceReferenceEvidenceType {
    #[serde(rename = "direct_observation")]
    DirectObservation,
    #[serde(rename = "declared_configuration")]
    DeclaredConfiguration,
    #[serde(rename = "locked_resolution")]
    LockedResolution,
    #[serde(rename = "installed_inventory")]
    InstalledInventory,
    #[serde(rename = "runtime_use")]
    RuntimeUse,
    #[serde(rename = "validation_result")]
    ValidationResult,
    #[serde(rename = "human_confirmation")]
    HumanConfirmation,
    #[serde(rename = "capability_limit")]
    CapabilityLimit,
    #[serde(rename = "capture_gap")]
    CaptureGap,
}
impl ::std::fmt::Display for EvidenceReferenceEvidenceType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::DirectObservation => f.write_str("direct_observation"),
            Self::DeclaredConfiguration => f.write_str("declared_configuration"),
            Self::LockedResolution => f.write_str("locked_resolution"),
            Self::InstalledInventory => f.write_str("installed_inventory"),
            Self::RuntimeUse => f.write_str("runtime_use"),
            Self::ValidationResult => f.write_str("validation_result"),
            Self::HumanConfirmation => f.write_str("human_confirmation"),
            Self::CapabilityLimit => f.write_str("capability_limit"),
            Self::CaptureGap => f.write_str("capture_gap"),
        }
    }
}
impl ::std::str::FromStr for EvidenceReferenceEvidenceType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "direct_observation" => Ok(Self::DirectObservation),
            "declared_configuration" => Ok(Self::DeclaredConfiguration),
            "locked_resolution" => Ok(Self::LockedResolution),
            "installed_inventory" => Ok(Self::InstalledInventory),
            "runtime_use" => Ok(Self::RuntimeUse),
            "validation_result" => Ok(Self::ValidationResult),
            "human_confirmation" => Ok(Self::HumanConfirmation),
            "capability_limit" => Ok(Self::CapabilityLimit),
            "capture_gap" => Ok(Self::CaptureGap),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EvidenceReferenceEvidenceType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EvidenceReferenceEvidenceType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EvidenceReferenceEvidenceType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`EvidenceReferenceKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "evidence_reference"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EvidenceReferenceKind {
    #[serde(rename = "evidence_reference")]
    EvidenceReference,
}
impl ::std::fmt::Display for EvidenceReferenceKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::EvidenceReference => f.write_str("evidence_reference"),
        }
    }
}
impl ::std::str::FromStr for EvidenceReferenceKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "evidence_reference" => Ok(Self::EvidenceReference),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EvidenceReferenceKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EvidenceReferenceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EvidenceReferenceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`EvidenceReferenceRedactionState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "not_required",
///    "redacted",
///    "metadata_only"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum EvidenceReferenceRedactionState {
    #[serde(rename = "not_required")]
    NotRequired,
    #[serde(rename = "redacted")]
    Redacted,
    #[serde(rename = "metadata_only")]
    MetadataOnly,
}
impl ::std::fmt::Display for EvidenceReferenceRedactionState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::NotRequired => f.write_str("not_required"),
            Self::Redacted => f.write_str("redacted"),
            Self::MetadataOnly => f.write_str("metadata_only"),
        }
    }
}
impl ::std::str::FromStr for EvidenceReferenceRedactionState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "not_required" => Ok(Self::NotRequired),
            "redacted" => Ok(Self::Redacted),
            "metadata_only" => Ok(Self::MetadataOnly),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for EvidenceReferenceRedactionState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for EvidenceReferenceRedactionState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for EvidenceReferenceRedactionState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ExpectedGraphChange`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "changeKind",
///    "expectedAfter",
///    "expectedBefore",
///    "findingIds",
///    "graphKind",
///    "subject"
///  ],
///  "properties": {
///    "changeKind": {
///      "type": "string",
///      "enum": [
///        "add",
///        "remove",
///        "update",
///        "resolve_contradiction",
///        "no_change_expected"
///      ]
///    },
///    "expectedAfter": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "expectedBefore": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "findingIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "graphKind": {
///      "type": "string",
///      "enum": [
///        "declared",
///        "locked",
///        "resolved",
///        "installed",
///        "used",
///        "observed_action",
///        "validated"
///      ]
///    },
///    "subject": {
///      "$ref": "#/$defs/ShortString"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ExpectedGraphChange {
    #[serde(rename = "changeKind")]
    pub change_kind: ExpectedGraphChangeChangeKind,
    #[serde(rename = "expectedAfter")]
    pub expected_after: BoundedString,
    #[serde(rename = "expectedBefore")]
    pub expected_before: BoundedString,
    #[serde(rename = "findingIds")]
    pub finding_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "graphKind")]
    pub graph_kind: ExpectedGraphChangeGraphKind,
    pub subject: ShortString,
}
///`ExpectedGraphChangeChangeKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "add",
///    "remove",
///    "update",
///    "resolve_contradiction",
///    "no_change_expected"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ExpectedGraphChangeChangeKind {
    #[serde(rename = "add")]
    Add,
    #[serde(rename = "remove")]
    Remove,
    #[serde(rename = "update")]
    Update,
    #[serde(rename = "resolve_contradiction")]
    ResolveContradiction,
    #[serde(rename = "no_change_expected")]
    NoChangeExpected,
}
impl ::std::fmt::Display for ExpectedGraphChangeChangeKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Add => f.write_str("add"),
            Self::Remove => f.write_str("remove"),
            Self::Update => f.write_str("update"),
            Self::ResolveContradiction => f.write_str("resolve_contradiction"),
            Self::NoChangeExpected => f.write_str("no_change_expected"),
        }
    }
}
impl ::std::str::FromStr for ExpectedGraphChangeChangeKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "add" => Ok(Self::Add),
            "remove" => Ok(Self::Remove),
            "update" => Ok(Self::Update),
            "resolve_contradiction" => Ok(Self::ResolveContradiction),
            "no_change_expected" => Ok(Self::NoChangeExpected),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ExpectedGraphChangeChangeKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ExpectedGraphChangeChangeKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ExpectedGraphChangeChangeKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ExpectedGraphChangeGraphKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "declared",
///    "locked",
///    "resolved",
///    "installed",
///    "used",
///    "observed_action",
///    "validated"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ExpectedGraphChangeGraphKind {
    #[serde(rename = "declared")]
    Declared,
    #[serde(rename = "locked")]
    Locked,
    #[serde(rename = "resolved")]
    Resolved,
    #[serde(rename = "installed")]
    Installed,
    #[serde(rename = "used")]
    Used,
    #[serde(rename = "observed_action")]
    ObservedAction,
    #[serde(rename = "validated")]
    Validated,
}
impl ::std::fmt::Display for ExpectedGraphChangeGraphKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Declared => f.write_str("declared"),
            Self::Locked => f.write_str("locked"),
            Self::Resolved => f.write_str("resolved"),
            Self::Installed => f.write_str("installed"),
            Self::Used => f.write_str("used"),
            Self::ObservedAction => f.write_str("observed_action"),
            Self::Validated => f.write_str("validated"),
        }
    }
}
impl ::std::str::FromStr for ExpectedGraphChangeGraphKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "declared" => Ok(Self::Declared),
            "locked" => Ok(Self::Locked),
            "resolved" => Ok(Self::Resolved),
            "installed" => Ok(Self::Installed),
            "used" => Ok(Self::Used),
            "observed_action" => Ok(Self::ObservedAction),
            "validated" => Ok(Self::Validated),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ExpectedGraphChangeGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ExpectedGraphChangeGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ExpectedGraphChangeGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ExpectedValidationImpact`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "behaviorStepIds",
///    "expectedOutcome",
///    "risk",
///    "targetId"
///  ],
///  "properties": {
///    "behaviorStepIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 1024
///    },
///    "expectedOutcome": {
///      "type": "string",
///      "enum": [
///        "improve",
///        "no_regression",
///        "unknown"
///      ]
///    },
///    "risk": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "targetId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ExpectedValidationImpact {
    #[serde(rename = "behaviorStepIds")]
    pub behavior_step_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "expectedOutcome")]
    pub expected_outcome: ExpectedValidationImpactExpectedOutcome,
    pub risk: BoundedString,
    #[serde(rename = "targetId")]
    pub target_id: EntityId,
}
///`ExpectedValidationImpactExpectedOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "improve",
///    "no_regression",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ExpectedValidationImpactExpectedOutcome {
    #[serde(rename = "improve")]
    Improve,
    #[serde(rename = "no_regression")]
    NoRegression,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for ExpectedValidationImpactExpectedOutcome {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Improve => f.write_str("improve"),
            Self::NoRegression => f.write_str("no_regression"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for ExpectedValidationImpactExpectedOutcome {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "improve" => Ok(Self::Improve),
            "no_regression" => Ok(Self::NoRegression),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ExpectedValidationImpactExpectedOutcome {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ExpectedValidationImpactExpectedOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ExpectedValidationImpactExpectedOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ExternalOperation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "acceptedResultAssessment",
///    "accumulatedCostMicrousd",
///    "attemptCount",
///    "createdAt",
///    "externalOperationId",
///    "kind",
///    "operationKey",
///    "operationKind",
///    "provider",
///    "providerResourceAssessment",
///    "reconciliationState",
///    "requestFingerprint",
///    "schemaVersion",
///    "state",
///    "updatedAt",
///    "workspaceId"
///  ],
///  "properties": {
///    "acceptedResultAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "acceptedResultDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "accumulatedCostMicrousd": {
///      "$ref": "#/$defs/DecimalCounter"
///    },
///    "attemptCount": {
///      "type": "integer",
///      "maximum": 1000.0,
///      "minimum": 0.0
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "externalOperationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "external_operation"
///      ]
///    },
///    "operationKey": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "operationKind": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "provider": {
///      "type": "string",
///      "enum": [
///        "fireworks",
///        "daytona",
///        "braintrust",
///        "github"
///      ]
///    },
///    "providerResourceAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "providerResourceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "reconciliationState": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "requestFingerprint": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "reserved",
///        "started",
///        "succeeded",
///        "failed",
///        "reconciling"
///      ]
///    },
///    "updatedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ExternalOperation {
    #[serde(rename = "acceptedResultAssessment")]
    pub accepted_result_assessment: Assessment,
    #[serde(
        rename = "acceptedResultDigest",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub accepted_result_digest: ::std::option::Option<Sha256Digest>,
    #[serde(rename = "accumulatedCostMicrousd")]
    pub accumulated_cost_microusd: DecimalCounter,
    #[serde(rename = "attemptCount")]
    pub attempt_count: i64,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "externalOperationId")]
    pub external_operation_id: EntityId,
    pub kind: ExternalOperationKind,
    #[serde(rename = "operationKey")]
    pub operation_key: EntityId,
    #[serde(rename = "operationKind")]
    pub operation_kind: ShortString,
    pub provider: ExternalOperationProvider,
    #[serde(rename = "providerResourceAssessment")]
    pub provider_resource_assessment: Assessment,
    #[serde(
        rename = "providerResourceId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub provider_resource_id: ::std::option::Option<EntityId>,
    #[serde(rename = "reconciliationState")]
    pub reconciliation_state: ShortString,
    #[serde(rename = "requestFingerprint")]
    pub request_fingerprint: Sha256Digest,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub state: ExternalOperationState,
    #[serde(rename = "updatedAt")]
    pub updated_at: Rfc3339Timestamp,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ExternalOperationKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "external_operation"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ExternalOperationKind {
    #[serde(rename = "external_operation")]
    ExternalOperation,
}
impl ::std::fmt::Display for ExternalOperationKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ExternalOperation => f.write_str("external_operation"),
        }
    }
}
impl ::std::str::FromStr for ExternalOperationKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "external_operation" => Ok(Self::ExternalOperation),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ExternalOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ExternalOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ExternalOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ExternalOperationProvider`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "fireworks",
///    "daytona",
///    "braintrust",
///    "github"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ExternalOperationProvider {
    #[serde(rename = "fireworks")]
    Fireworks,
    #[serde(rename = "daytona")]
    Daytona,
    #[serde(rename = "braintrust")]
    Braintrust,
    #[serde(rename = "github")]
    Github,
}
impl ::std::fmt::Display for ExternalOperationProvider {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Fireworks => f.write_str("fireworks"),
            Self::Daytona => f.write_str("daytona"),
            Self::Braintrust => f.write_str("braintrust"),
            Self::Github => f.write_str("github"),
        }
    }
}
impl ::std::str::FromStr for ExternalOperationProvider {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "fireworks" => Ok(Self::Fireworks),
            "daytona" => Ok(Self::Daytona),
            "braintrust" => Ok(Self::Braintrust),
            "github" => Ok(Self::Github),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ExternalOperationProvider {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ExternalOperationProvider {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ExternalOperationProvider {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ExternalOperationState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "reserved",
///    "started",
///    "succeeded",
///    "failed",
///    "reconciling"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ExternalOperationState {
    #[serde(rename = "reserved")]
    Reserved,
    #[serde(rename = "started")]
    Started,
    #[serde(rename = "succeeded")]
    Succeeded,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "reconciling")]
    Reconciling,
}
impl ::std::fmt::Display for ExternalOperationState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Reserved => f.write_str("reserved"),
            Self::Started => f.write_str("started"),
            Self::Succeeded => f.write_str("succeeded"),
            Self::Failed => f.write_str("failed"),
            Self::Reconciling => f.write_str("reconciling"),
        }
    }
}
impl ::std::str::FromStr for ExternalOperationState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "reserved" => Ok(Self::Reserved),
            "started" => Ok(Self::Started),
            "succeeded" => Ok(Self::Succeeded),
            "failed" => Ok(Self::Failed),
            "reconciling" => Ok(Self::Reconciling),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ExternalOperationState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ExternalOperationState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ExternalOperationState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`FieldIssue`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "code",
///    "keyword",
///    "path"
///  ],
///  "properties": {
///    "code": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "keyword": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "path": {
///      "type": "string",
///      "maxLength": 2048
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct FieldIssue {
    pub code: ShortString,
    pub keyword: ShortString,
    pub path: FieldIssuePath,
}
///`FieldIssuePath`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 2048
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct FieldIssuePath(::std::string::String);
impl ::std::ops::Deref for FieldIssuePath {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<FieldIssuePath> for ::std::string::String {
    fn from(value: FieldIssuePath) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for FieldIssuePath {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 2048usize {
            return Err("longer than 2048 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for FieldIssuePath {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for FieldIssuePath {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for FieldIssuePath {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for FieldIssuePath {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`FileEffect`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "contentCaptured",
///    "effect",
///    "path"
///  ],
///  "properties": {
///    "afterDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "beforeDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "contentCaptured": {
///      "enum": [
///        false
///      ]
///    },
///    "effect": {
///      "type": "string",
///      "enum": [
///        "created",
///        "modified",
///        "deleted",
///        "renamed",
///        "read",
///        "unknown"
///      ]
///    },
///    "path": {
///      "$ref": "#/$defs/RelativePath"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct FileEffect {
    #[serde(
        rename = "afterDigest",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub after_digest: ::std::option::Option<Sha256Digest>,
    #[serde(
        rename = "beforeDigest",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub before_digest: ::std::option::Option<Sha256Digest>,
    #[serde(rename = "contentCaptured")]
    pub content_captured: bool,
    pub effect: FileEffectEffect,
    pub path: RelativePath,
}
///`FileEffectEffect`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "created",
///    "modified",
///    "deleted",
///    "renamed",
///    "read",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum FileEffectEffect {
    #[serde(rename = "created")]
    Created,
    #[serde(rename = "modified")]
    Modified,
    #[serde(rename = "deleted")]
    Deleted,
    #[serde(rename = "renamed")]
    Renamed,
    #[serde(rename = "read")]
    Read,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for FileEffectEffect {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Created => f.write_str("created"),
            Self::Modified => f.write_str("modified"),
            Self::Deleted => f.write_str("deleted"),
            Self::Renamed => f.write_str("renamed"),
            Self::Read => f.write_str("read"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for FileEffectEffect {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "created" => Ok(Self::Created),
            "modified" => Ok(Self::Modified),
            "deleted" => Ok(Self::Deleted),
            "renamed" => Ok(Self::Renamed),
            "read" => Ok(Self::Read),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for FileEffectEffect {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for FileEffectEffect {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for FileEffectEffect {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Finding`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "affectedFiles",
///    "affectedRealmIds",
///    "checkpointId",
///    "coverage",
///    "createdAt",
///    "findingCode",
///    "findingId",
///    "graphReferenceIds",
///    "kind",
///    "missingEvidence",
///    "projectId",
///    "ruleVersions",
///    "schemaVersion",
///    "severity",
///    "state",
///    "statements",
///    "summary",
///    "title",
///    "updatedAt",
///    "workspaceId"
///  ],
///  "properties": {
///    "affectedFiles": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/RelativePath"
///      },
///      "maxItems": 4096
///    },
///    "affectedRealmIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256
///    },
///    "checkpointId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "coverage": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "findingCode": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "findingId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "graphReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 64
///    },
///    "kind": {
///      "enum": [
///        "finding"
///      ]
///    },
///    "missingEvidence": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "ruleVersions": {
///      "$ref": "#/$defs/VersionMap"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "severity": {
///      "type": "string",
///      "enum": [
///        "info",
///        "low",
///        "medium",
///        "high",
///        "critical"
///      ]
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "open",
///        "needs_evidence",
///        "accepted",
///        "rejected",
///        "superseded"
///      ]
///    },
///    "statements": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/FindingStatement"
///      },
///      "maxItems": 1024,
///      "minItems": 1
///    },
///    "summary": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "title": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "updatedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Finding {
    #[serde(rename = "affectedFiles")]
    pub affected_files: ::std::vec::Vec<RelativePath>,
    #[serde(rename = "affectedRealmIds")]
    pub affected_realm_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "checkpointId")]
    pub checkpoint_id: EntityId,
    pub coverage: Assessment,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "findingCode")]
    pub finding_code: ShortString,
    #[serde(rename = "findingId")]
    pub finding_id: EntityId,
    #[serde(rename = "graphReferenceIds")]
    pub graph_reference_ids: ::std::vec::Vec<EntityId>,
    pub kind: FindingKind,
    #[serde(rename = "missingEvidence")]
    pub missing_evidence: ::std::vec::Vec<ShortString>,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "ruleVersions")]
    pub rule_versions: VersionMap,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub severity: FindingSeverity,
    pub state: FindingState,
    pub statements: ::std::vec::Vec<FindingStatement>,
    pub summary: BoundedString,
    pub title: ShortString,
    #[serde(rename = "updatedAt")]
    pub updated_at: Rfc3339Timestamp,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`FindingAvailableNotification`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "findingId",
///    "type"
///  ],
///  "properties": {
///    "findingId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "type": {
///      "enum": [
///        "finding.available"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct FindingAvailableNotification {
    #[serde(rename = "findingId")]
    pub finding_id: EntityId,
    #[serde(rename = "type")]
    pub type_: FindingAvailableNotificationType,
}
///`FindingAvailableNotificationType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "finding.available"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum FindingAvailableNotificationType {
    #[serde(rename = "finding.available")]
    FindingAvailable,
}
impl ::std::fmt::Display for FindingAvailableNotificationType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::FindingAvailable => f.write_str("finding.available"),
        }
    }
}
impl ::std::str::FromStr for FindingAvailableNotificationType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "finding.available" => Ok(Self::FindingAvailable),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for FindingAvailableNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for FindingAvailableNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for FindingAvailableNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`FindingKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "finding"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum FindingKind {
    #[serde(rename = "finding")]
    Finding,
}
impl ::std::fmt::Display for FindingKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Finding => f.write_str("finding"),
        }
    }
}
impl ::std::str::FromStr for FindingKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "finding" => Ok(Self::Finding),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for FindingKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for FindingKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for FindingKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`FindingSeverity`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "info",
///    "low",
///    "medium",
///    "high",
///    "critical"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum FindingSeverity {
    #[serde(rename = "info")]
    Info,
    #[serde(rename = "low")]
    Low,
    #[serde(rename = "medium")]
    Medium,
    #[serde(rename = "high")]
    High,
    #[serde(rename = "critical")]
    Critical,
}
impl ::std::fmt::Display for FindingSeverity {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Info => f.write_str("info"),
            Self::Low => f.write_str("low"),
            Self::Medium => f.write_str("medium"),
            Self::High => f.write_str("high"),
            Self::Critical => f.write_str("critical"),
        }
    }
}
impl ::std::str::FromStr for FindingSeverity {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "info" => Ok(Self::Info),
            "low" => Ok(Self::Low),
            "medium" => Ok(Self::Medium),
            "high" => Ok(Self::High),
            "critical" => Ok(Self::Critical),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for FindingSeverity {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for FindingSeverity {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for FindingSeverity {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`FindingState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "open",
///    "needs_evidence",
///    "accepted",
///    "rejected",
///    "superseded"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum FindingState {
    #[serde(rename = "open")]
    Open,
    #[serde(rename = "needs_evidence")]
    NeedsEvidence,
    #[serde(rename = "accepted")]
    Accepted,
    #[serde(rename = "rejected")]
    Rejected,
    #[serde(rename = "superseded")]
    Superseded,
}
impl ::std::fmt::Display for FindingState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Open => f.write_str("open"),
            Self::NeedsEvidence => f.write_str("needs_evidence"),
            Self::Accepted => f.write_str("accepted"),
            Self::Rejected => f.write_str("rejected"),
            Self::Superseded => f.write_str("superseded"),
        }
    }
}
impl ::std::str::FromStr for FindingState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "open" => Ok(Self::Open),
            "needs_evidence" => Ok(Self::NeedsEvidence),
            "accepted" => Ok(Self::Accepted),
            "rejected" => Ok(Self::Rejected),
            "superseded" => Ok(Self::Superseded),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for FindingState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for FindingState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for FindingState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`FindingStatement`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "confidence",
///    "evidenceReferenceIds",
///    "statementId",
///    "statementType",
///    "text"
///  ],
///  "properties": {
///    "confidence": {
///      "$ref": "#/$defs/Confidence"
///    },
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512,
///      "minItems": 1
///    },
///    "statementId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "statementType": {
///      "type": "string",
///      "enum": [
///        "evidence",
///        "inference"
///      ]
///    },
///    "text": {
///      "$ref": "#/$defs/BoundedString"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct FindingStatement {
    pub confidence: Confidence,
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "statementId")]
    pub statement_id: EntityId,
    #[serde(rename = "statementType")]
    pub statement_type: FindingStatementStatementType,
    pub text: BoundedString,
}
///`FindingStatementStatementType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "evidence",
///    "inference"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum FindingStatementStatementType {
    #[serde(rename = "evidence")]
    Evidence,
    #[serde(rename = "inference")]
    Inference,
}
impl ::std::fmt::Display for FindingStatementStatementType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Evidence => f.write_str("evidence"),
            Self::Inference => f.write_str("inference"),
        }
    }
}
impl ::std::str::FromStr for FindingStatementStatementType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "evidence" => Ok(Self::Evidence),
            "inference" => Ok(Self::Inference),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for FindingStatementStatementType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for FindingStatementStatementType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for FindingStatementStatementType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`GitCommitSourceInput`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "archiveDigest",
///    "archiveObjectId",
///    "commitSha",
///    "createdAt",
///    "kind",
///    "lfsIdentities",
///    "projectId",
///    "repositoryId",
///    "schemaVersion",
///    "sourceInputId",
///    "submoduleIdentities",
///    "supportGapIds",
///    "treeDigest",
///    "workspaceId"
///  ],
///  "properties": {
///    "archiveDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "archiveObjectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "commitSha": {
///      "$ref": "#/$defs/GitObjectId"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "kind": {
///      "enum": [
///        "source_input_git_commit"
///      ]
///    },
///    "lfsIdentities": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/LfsIdentity"
///      },
///      "maxItems": 4096
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "repositoryId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sourceInputId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "submoduleIdentities": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/SubmoduleIdentity"
///      },
///      "maxItems": 1024
///    },
///    "supportGapIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512
///    },
///    "treeDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct GitCommitSourceInput {
    #[serde(rename = "archiveDigest")]
    pub archive_digest: Sha256Digest,
    #[serde(rename = "archiveObjectId")]
    pub archive_object_id: EntityId,
    #[serde(rename = "commitSha")]
    pub commit_sha: GitObjectId,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    pub kind: GitCommitSourceInputKind,
    #[serde(rename = "lfsIdentities")]
    pub lfs_identities: ::std::vec::Vec<LfsIdentity>,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "repositoryId")]
    pub repository_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sourceInputId")]
    pub source_input_id: EntityId,
    #[serde(rename = "submoduleIdentities")]
    pub submodule_identities: ::std::vec::Vec<SubmoduleIdentity>,
    #[serde(rename = "supportGapIds")]
    pub support_gap_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "treeDigest")]
    pub tree_digest: Sha256Digest,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`GitCommitSourceInputKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "source_input_git_commit"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum GitCommitSourceInputKind {
    #[serde(rename = "source_input_git_commit")]
    SourceInputGitCommit,
}
impl ::std::fmt::Display for GitCommitSourceInputKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::SourceInputGitCommit => f.write_str("source_input_git_commit"),
        }
    }
}
impl ::std::str::FromStr for GitCommitSourceInputKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "source_input_git_commit" => Ok(Self::SourceInputGitCommit),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for GitCommitSourceInputKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for GitCommitSourceInputKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for GitCommitSourceInputKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`GitObjectId`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "pattern": "^(?:[a-f0-9]{40}|[a-f0-9]{64})$"
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct GitObjectId(::std::string::String);
impl ::std::ops::Deref for GitObjectId {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<GitObjectId> for ::std::string::String {
    fn from(value: GitObjectId) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for GitObjectId {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        static PATTERN: ::std::sync::LazyLock<::regress::Regex> =
            ::std::sync::LazyLock::new(|| {
                ::regress::Regex::new("^(?:[a-f0-9]{40}|[a-f0-9]{64})$").unwrap()
            });
        if PATTERN.find(value).is_none() {
            return Err("doesn't match pattern \"^(?:[a-f0-9]{40}|[a-f0-9]{64})$\"".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for GitObjectId {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for GitObjectId {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for GitObjectId {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for GitObjectId {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`GraphBody`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "adapterVersions",
///    "completeness",
///    "createdAt",
///    "edges",
///    "evidenceReferenceIds",
///    "graphId",
///    "nodes",
///    "projectId",
///    "realmIds",
///    "sourceInputDigest",
///    "workspaceId"
///  ],
///  "properties": {
///    "adapterVersions": {
///      "$ref": "#/$defs/VersionMap"
///    },
///    "completeness": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "edges": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/GraphEdge"
///      },
///      "maxItems": 250000
///    },
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 10000
///    },
///    "graphId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "nodes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/GraphNode"
///      },
///      "maxItems": 100000
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "realmIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256
///    },
///    "sourceInputDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct GraphBody {
    #[serde(rename = "adapterVersions")]
    pub adapter_versions: VersionMap,
    pub completeness: Assessment,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    pub edges: ::std::vec::Vec<GraphEdge>,
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "graphId")]
    pub graph_id: EntityId,
    pub nodes: ::std::vec::Vec<GraphNode>,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "realmIds")]
    pub realm_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "sourceInputDigest")]
    pub source_input_digest: Sha256Digest,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`GraphEdge`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "attributes",
///    "constraintAssessment",
///    "edgeId",
///    "evidenceReferenceIds",
///    "fromNodeId",
///    "relationship",
///    "toNodeId"
///  ],
///  "properties": {
///    "attributes": {
///      "$ref": "#/$defs/StringMap"
///    },
///    "constraint": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "constraintAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "edgeId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512
///    },
///    "fromNodeId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "relationship": {
///      "type": "string",
///      "enum": [
///        "declares",
///        "locks",
///        "resolves",
///        "installs",
///        "uses",
///        "observes",
///        "validates",
///        "depends_on",
///        "conflicts_with",
///        "replaces"
///      ]
///    },
///    "toNodeId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct GraphEdge {
    pub attributes: StringMap,
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub constraint: ::std::option::Option<ShortString>,
    #[serde(rename = "constraintAssessment")]
    pub constraint_assessment: Assessment,
    #[serde(rename = "edgeId")]
    pub edge_id: EntityId,
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "fromNodeId")]
    pub from_node_id: EntityId,
    pub relationship: GraphEdgeRelationship,
    #[serde(rename = "toNodeId")]
    pub to_node_id: EntityId,
}
///`GraphEdgeRelationship`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "declares",
///    "locks",
///    "resolves",
///    "installs",
///    "uses",
///    "observes",
///    "validates",
///    "depends_on",
///    "conflicts_with",
///    "replaces"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum GraphEdgeRelationship {
    #[serde(rename = "declares")]
    Declares,
    #[serde(rename = "locks")]
    Locks,
    #[serde(rename = "resolves")]
    Resolves,
    #[serde(rename = "installs")]
    Installs,
    #[serde(rename = "uses")]
    Uses,
    #[serde(rename = "observes")]
    Observes,
    #[serde(rename = "validates")]
    Validates,
    #[serde(rename = "depends_on")]
    DependsOn,
    #[serde(rename = "conflicts_with")]
    ConflictsWith,
    #[serde(rename = "replaces")]
    Replaces,
}
impl ::std::fmt::Display for GraphEdgeRelationship {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Declares => f.write_str("declares"),
            Self::Locks => f.write_str("locks"),
            Self::Resolves => f.write_str("resolves"),
            Self::Installs => f.write_str("installs"),
            Self::Uses => f.write_str("uses"),
            Self::Observes => f.write_str("observes"),
            Self::Validates => f.write_str("validates"),
            Self::DependsOn => f.write_str("depends_on"),
            Self::ConflictsWith => f.write_str("conflicts_with"),
            Self::Replaces => f.write_str("replaces"),
        }
    }
}
impl ::std::str::FromStr for GraphEdgeRelationship {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "declares" => Ok(Self::Declares),
            "locks" => Ok(Self::Locks),
            "resolves" => Ok(Self::Resolves),
            "installs" => Ok(Self::Installs),
            "uses" => Ok(Self::Uses),
            "observes" => Ok(Self::Observes),
            "validates" => Ok(Self::Validates),
            "depends_on" => Ok(Self::DependsOn),
            "conflicts_with" => Ok(Self::ConflictsWith),
            "replaces" => Ok(Self::Replaces),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for GraphEdgeRelationship {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for GraphEdgeRelationship {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for GraphEdgeRelationship {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`GraphNode`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "attributes",
///    "ecosystem",
///    "evidenceReferenceIds",
///    "layerId",
///    "name",
///    "nodeId",
///    "realmId",
///    "scope",
///    "versionAssessment"
///  ],
///  "properties": {
///    "attributes": {
///      "$ref": "#/$defs/StringMap"
///    },
///    "ecosystem": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512
///    },
///    "layerId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "name": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "nodeId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "scope": {
///      "type": "string",
///      "enum": [
///        "production",
///        "development",
///        "test",
///        "build",
///        "optional",
///        "peer",
///        "global",
///        "unknown"
///      ]
///    },
///    "version": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "versionAssessment": {
///      "$ref": "#/$defs/Assessment"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct GraphNode {
    pub attributes: StringMap,
    pub ecosystem: ShortString,
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "layerId")]
    pub layer_id: EntityId,
    pub name: ShortString,
    #[serde(rename = "nodeId")]
    pub node_id: EntityId,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    pub scope: GraphNodeScope,
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub version: ::std::option::Option<ShortString>,
    #[serde(rename = "versionAssessment")]
    pub version_assessment: Assessment,
}
///`GraphNodeScope`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "production",
///    "development",
///    "test",
///    "build",
///    "optional",
///    "peer",
///    "global",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum GraphNodeScope {
    #[serde(rename = "production")]
    Production,
    #[serde(rename = "development")]
    Development,
    #[serde(rename = "test")]
    Test,
    #[serde(rename = "build")]
    Build,
    #[serde(rename = "optional")]
    Optional,
    #[serde(rename = "peer")]
    Peer,
    #[serde(rename = "global")]
    Global,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for GraphNodeScope {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Production => f.write_str("production"),
            Self::Development => f.write_str("development"),
            Self::Test => f.write_str("test"),
            Self::Build => f.write_str("build"),
            Self::Optional => f.write_str("optional"),
            Self::Peer => f.write_str("peer"),
            Self::Global => f.write_str("global"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for GraphNodeScope {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "production" => Ok(Self::Production),
            "development" => Ok(Self::Development),
            "test" => Ok(Self::Test),
            "build" => Ok(Self::Build),
            "optional" => Ok(Self::Optional),
            "peer" => Ok(Self::Peer),
            "global" => Ok(Self::Global),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for GraphNodeScope {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for GraphNodeScope {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for GraphNodeScope {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`HealthState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "healthy",
///    "degraded",
///    "unavailable",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum HealthState {
    #[serde(rename = "healthy")]
    Healthy,
    #[serde(rename = "degraded")]
    Degraded,
    #[serde(rename = "unavailable")]
    Unavailable,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for HealthState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Healthy => f.write_str("healthy"),
            Self::Degraded => f.write_str("degraded"),
            Self::Unavailable => f.write_str("unavailable"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for HealthState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "healthy" => Ok(Self::Healthy),
            "degraded" => Ok(Self::Degraded),
            "unavailable" => Ok(Self::Unavailable),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for HealthState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for HealthState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for HealthState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`HttpUrl`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "format": "uri",
///  "maxLength": 4096,
///  "pattern": "^https?://"
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct HttpUrl(::std::string::String);
impl ::std::ops::Deref for HttpUrl {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<HttpUrl> for ::std::string::String {
    fn from(value: HttpUrl) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for HttpUrl {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 4096usize {
            return Err("longer than 4096 characters".into());
        }
        static PATTERN: ::std::sync::LazyLock<::regress::Regex> =
            ::std::sync::LazyLock::new(|| ::regress::Regex::new("^https?://").unwrap());
        if PATTERN.find(value).is_none() {
            return Err("doesn't match pattern \"^https?://\"".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for HttpUrl {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for HttpUrl {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for HttpUrl {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for HttpUrl {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`ImmutableBaseIdentity`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "imageDigest",
///    "imageReference",
///    "provider",
///    "snapshotAssessment",
///    "toolchainDigest"
///  ],
///  "properties": {
///    "imageDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "imageReference": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "provider": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "snapshotAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "snapshotId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "toolchainDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ImmutableBaseIdentity {
    #[serde(rename = "imageDigest")]
    pub image_digest: Sha256Digest,
    #[serde(rename = "imageReference")]
    pub image_reference: ShortString,
    pub provider: ShortString,
    #[serde(rename = "snapshotAssessment")]
    pub snapshot_assessment: Assessment,
    #[serde(
        rename = "snapshotId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub snapshot_id: ::std::option::Option<EntityId>,
    #[serde(rename = "toolchainDigest")]
    pub toolchain_digest: Sha256Digest,
}
///`IngestAcceptedResponse`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "acceptedAt",
///    "acceptedResourceId",
///    "deduplicated",
///    "kind",
///    "requestId",
///    "schemaVersion"
///  ],
///  "properties": {
///    "acceptedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "acceptedResourceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "deduplicated": {
///      "type": "boolean"
///    },
///    "kind": {
///      "enum": [
///        "ingest_accepted_response"
///      ]
///    },
///    "requestId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct IngestAcceptedResponse {
    #[serde(rename = "acceptedAt")]
    pub accepted_at: Rfc3339Timestamp,
    #[serde(rename = "acceptedResourceId")]
    pub accepted_resource_id: EntityId,
    pub deduplicated: bool,
    pub kind: IngestAcceptedResponseKind,
    #[serde(rename = "requestId")]
    pub request_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`IngestAcceptedResponseKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "ingest_accepted_response"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum IngestAcceptedResponseKind {
    #[serde(rename = "ingest_accepted_response")]
    IngestAcceptedResponse,
}
impl ::std::fmt::Display for IngestAcceptedResponseKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::IngestAcceptedResponse => f.write_str("ingest_accepted_response"),
        }
    }
}
impl ::std::str::FromStr for IngestAcceptedResponseKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "ingest_accepted_response" => Ok(Self::IngestAcceptedResponse),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for IngestAcceptedResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for IngestAcceptedResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for IngestAcceptedResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`InstalledGraph`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "graph",
///    "kind",
///    "schemaVersion"
///  ],
///  "properties": {
///    "graph": {
///      "$ref": "#/$defs/GraphBody"
///    },
///    "kind": {
///      "enum": [
///        "installed_graph"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct InstalledGraph {
    pub graph: GraphBody,
    pub kind: InstalledGraphKind,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`InstalledGraphKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "installed_graph"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum InstalledGraphKind {
    #[serde(rename = "installed_graph")]
    InstalledGraph,
}
impl ::std::fmt::Display for InstalledGraphKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::InstalledGraph => f.write_str("installed_graph"),
        }
    }
}
impl ::std::str::FromStr for InstalledGraphKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "installed_graph" => Ok(Self::InstalledGraph),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for InstalledGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for InstalledGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for InstalledGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`InventoryScope`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "layerIds",
///    "managerIds",
///    "pathPseudonyms",
///    "realmId"
///  ],
///  "properties": {
///    "layerIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256
///    },
///    "managerIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256
///    },
///    "pathPseudonyms": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 1024
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct InventoryScope {
    #[serde(rename = "layerIds")]
    pub layer_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "managerIds")]
    pub manager_ids: ::std::vec::Vec<ShortString>,
    #[serde(rename = "pathPseudonyms")]
    pub path_pseudonyms: ::std::vec::Vec<EntityId>,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
}
///`Layer`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "coverage",
///    "kind",
///    "layerId",
///    "layerType",
///    "realmId",
///    "schemaVersion",
///    "selectors"
///  ],
///  "properties": {
///    "coverage": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "kind": {
///      "enum": [
///        "layer"
///      ]
///    },
///    "layerId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "layerType": {
///      "type": "string",
///      "enum": [
///        "system",
///        "REDACTED",
///        "project",
///        "virtual_environment",
///        "container",
///        "sandbox"
///      ]
///    },
///    "parentLayerId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "selectors": {
///      "$ref": "#/$defs/StringMap"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Layer {
    pub coverage: Assessment,
    pub kind: LayerKind,
    #[serde(rename = "layerId")]
    pub layer_id: EntityId,
    #[serde(rename = "layerType")]
    pub layer_type: LayerLayerType,
    #[serde(
        rename = "parentLayerId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub parent_layer_id: ::std::option::Option<EntityId>,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub selectors: StringMap,
}
///`LayerKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "layer"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum LayerKind {
    #[serde(rename = "layer")]
    Layer,
}
impl ::std::fmt::Display for LayerKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Layer => f.write_str("layer"),
        }
    }
}
impl ::std::str::FromStr for LayerKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "layer" => Ok(Self::Layer),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for LayerKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for LayerKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for LayerKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`LayerLayerType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "system",
///    "REDACTED",
///    "project",
///    "virtual_environment",
///    "container",
///    "sandbox"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum LayerLayerType {
    #[serde(rename = "system")]
    System,
    #[serde(rename = "REDACTED")]
    User,
    #[serde(rename = "project")]
    Project,
    #[serde(rename = "virtual_environment")]
    VirtualEnvironment,
    #[serde(rename = "container")]
    Container,
    #[serde(rename = "sandbox")]
    Sandbox,
}
impl ::std::fmt::Display for LayerLayerType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::System => f.write_str("system"),
            Self::User => f.write_str("REDACTED"),
            Self::Project => f.write_str("project"),
            Self::VirtualEnvironment => f.write_str("virtual_environment"),
            Self::Container => f.write_str("container"),
            Self::Sandbox => f.write_str("sandbox"),
        }
    }
}
impl ::std::str::FromStr for LayerLayerType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "system" => Ok(Self::System),
            "REDACTED" => Ok(Self::User),
            "project" => Ok(Self::Project),
            "virtual_environment" => Ok(Self::VirtualEnvironment),
            "container" => Ok(Self::Container),
            "sandbox" => Ok(Self::Sandbox),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for LayerLayerType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for LayerLayerType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for LayerLayerType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`LfsIdentity`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "contentState",
///    "kind",
///    "oidSha256",
///    "path",
///    "schemaVersion",
///    "size"
///  ],
///  "properties": {
///    "contentState": {
///      "type": "string",
///      "enum": [
///        "included",
///        "pointer_only",
///        "missing",
///        "unsupported"
///      ]
///    },
///    "kind": {
///      "enum": [
///        "lfs_identity"
///      ]
///    },
///    "oidSha256": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "path": {
///      "$ref": "#/$defs/RelativePath"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "size": {
///      "$ref": "#/$defs/ByteCount"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct LfsIdentity {
    #[serde(rename = "contentState")]
    pub content_state: LfsIdentityContentState,
    pub kind: LfsIdentityKind,
    #[serde(rename = "oidSha256")]
    pub oid_sha256: Sha256Digest,
    pub path: RelativePath,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub size: ByteCount,
}
///`LfsIdentityContentState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "included",
///    "pointer_only",
///    "missing",
///    "unsupported"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum LfsIdentityContentState {
    #[serde(rename = "included")]
    Included,
    #[serde(rename = "pointer_only")]
    PointerOnly,
    #[serde(rename = "missing")]
    Missing,
    #[serde(rename = "unsupported")]
    Unsupported,
}
impl ::std::fmt::Display for LfsIdentityContentState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Included => f.write_str("included"),
            Self::PointerOnly => f.write_str("pointer_only"),
            Self::Missing => f.write_str("missing"),
            Self::Unsupported => f.write_str("unsupported"),
        }
    }
}
impl ::std::str::FromStr for LfsIdentityContentState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "included" => Ok(Self::Included),
            "pointer_only" => Ok(Self::PointerOnly),
            "missing" => Ok(Self::Missing),
            "unsupported" => Ok(Self::Unsupported),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for LfsIdentityContentState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for LfsIdentityContentState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for LfsIdentityContentState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`LfsIdentityKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "lfs_identity"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum LfsIdentityKind {
    #[serde(rename = "lfs_identity")]
    LfsIdentity,
}
impl ::std::fmt::Display for LfsIdentityKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::LfsIdentity => f.write_str("lfs_identity"),
        }
    }
}
impl ::std::str::FromStr for LfsIdentityKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "lfs_identity" => Ok(Self::LfsIdentity),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for LfsIdentityKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for LfsIdentityKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for LfsIdentityKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`LocalSessionSummary`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "coverage",
///    "projectId",
///    "provider",
///    "sessionId",
///    "startedAt",
///    "state"
///  ],
///  "properties": {
///    "coverage": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "provider": {
///      "$ref": "#/$defs/ProviderName"
///    },
///    "sessionId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "startedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "registered",
///        "observing",
///        "draining",
///        "checkpointing",
///        "ended",
///        "partial_capture"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct LocalSessionSummary {
    pub coverage: Assessment,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    pub provider: ProviderName,
    #[serde(rename = "sessionId")]
    pub session_id: EntityId,
    #[serde(rename = "startedAt")]
    pub started_at: Rfc3339Timestamp,
    pub state: LocalSessionSummaryState,
}
///`LocalSessionSummaryState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "registered",
///    "observing",
///    "draining",
///    "checkpointing",
///    "ended",
///    "partial_capture"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum LocalSessionSummaryState {
    #[serde(rename = "registered")]
    Registered,
    #[serde(rename = "observing")]
    Observing,
    #[serde(rename = "draining")]
    Draining,
    #[serde(rename = "checkpointing")]
    Checkpointing,
    #[serde(rename = "ended")]
    Ended,
    #[serde(rename = "partial_capture")]
    PartialCapture,
}
impl ::std::fmt::Display for LocalSessionSummaryState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Registered => f.write_str("registered"),
            Self::Observing => f.write_str("observing"),
            Self::Draining => f.write_str("draining"),
            Self::Checkpointing => f.write_str("checkpointing"),
            Self::Ended => f.write_str("ended"),
            Self::PartialCapture => f.write_str("partial_capture"),
        }
    }
}
impl ::std::str::FromStr for LocalSessionSummaryState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "registered" => Ok(Self::Registered),
            "observing" => Ok(Self::Observing),
            "draining" => Ok(Self::Draining),
            "checkpointing" => Ok(Self::Checkpointing),
            "ended" => Ok(Self::Ended),
            "partial_capture" => Ok(Self::PartialCapture),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for LocalSessionSummaryState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for LocalSessionSummaryState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for LocalSessionSummaryState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`LockedGraph`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "graph",
///    "kind",
///    "schemaVersion"
///  ],
///  "properties": {
///    "graph": {
///      "$ref": "#/$defs/GraphBody"
///    },
///    "kind": {
///      "enum": [
///        "locked_graph"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct LockedGraph {
    pub graph: GraphBody,
    pub kind: LockedGraphKind,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`LockedGraphKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "locked_graph"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum LockedGraphKind {
    #[serde(rename = "locked_graph")]
    LockedGraph,
}
impl ::std::fmt::Display for LockedGraphKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::LockedGraph => f.write_str("locked_graph"),
        }
    }
}
impl ::std::str::FromStr for LockedGraphKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "locked_graph" => Ok(Self::LockedGraph),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for LockedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for LockedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for LockedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`LockfileOperation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "evidenceReferenceIds",
///    "findingIds",
///    "lockfilePath",
///    "manager",
///    "manifestPath",
///    "operationId",
///    "operationKind",
///    "realmId"
///  ],
///  "properties": {
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512,
///      "minItems": 1
///    },
///    "findingIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "lockfilePath": {
///      "$ref": "#/$defs/RelativePath"
///    },
///    "manager": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "manifestPath": {
///      "$ref": "#/$defs/RelativePath"
///    },
///    "operationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "operationKind": {
///      "enum": [
///        "lockfile_regenerate"
///      ]
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct LockfileOperation {
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "findingIds")]
    pub finding_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "lockfilePath")]
    pub lockfile_path: RelativePath,
    pub manager: ShortString,
    #[serde(rename = "manifestPath")]
    pub manifest_path: RelativePath,
    #[serde(rename = "operationId")]
    pub operation_id: EntityId,
    #[serde(rename = "operationKind")]
    pub operation_kind: LockfileOperationOperationKind,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
}
///`LockfileOperationOperationKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "lockfile_regenerate"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum LockfileOperationOperationKind {
    #[serde(rename = "lockfile_regenerate")]
    LockfileRegenerate,
}
impl ::std::fmt::Display for LockfileOperationOperationKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::LockfileRegenerate => f.write_str("lockfile_regenerate"),
        }
    }
}
impl ::std::str::FromStr for LockfileOperationOperationKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "lockfile_regenerate" => Ok(Self::LockfileRegenerate),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for LockfileOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for LockfileOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for LockfileOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`NetworkPolicy`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "allowedHosts",
///    "deniedHosts",
///    "mode",
///    "policyDigest",
///    "registryHosts"
///  ],
///  "properties": {
///    "allowedHosts": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 1024
///    },
///    "deniedHosts": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 1024
///    },
///    "mode": {
///      "type": "string",
///      "enum": [
///        "deny_all",
///        "allow_list",
///        "unrestricted"
///      ]
///    },
///    "policyDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "registryHosts": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct NetworkPolicy {
    #[serde(rename = "allowedHosts")]
    pub allowed_hosts: ::std::vec::Vec<ShortString>,
    #[serde(rename = "deniedHosts")]
    pub denied_hosts: ::std::vec::Vec<ShortString>,
    pub mode: NetworkPolicyMode,
    #[serde(rename = "policyDigest")]
    pub policy_digest: Sha256Digest,
    #[serde(rename = "registryHosts")]
    pub registry_hosts: ::std::vec::Vec<ShortString>,
}
///`NetworkPolicyMode`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "deny_all",
///    "allow_list",
///    "unrestricted"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum NetworkPolicyMode {
    #[serde(rename = "deny_all")]
    DenyAll,
    #[serde(rename = "allow_list")]
    AllowList,
    #[serde(rename = "unrestricted")]
    Unrestricted,
}
impl ::std::fmt::Display for NetworkPolicyMode {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::DenyAll => f.write_str("deny_all"),
            Self::AllowList => f.write_str("allow_list"),
            Self::Unrestricted => f.write_str("unrestricted"),
        }
    }
}
impl ::std::str::FromStr for NetworkPolicyMode {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "deny_all" => Ok(Self::DenyAll),
            "allow_list" => Ok(Self::AllowList),
            "unrestricted" => Ok(Self::Unrestricted),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for NetworkPolicyMode {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for NetworkPolicyMode {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for NetworkPolicyMode {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`NonCleanupFailureOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "cleanupStatus",
///    "outcome"
///  ],
///  "properties": {
///    "cleanupStatus": {
///      "enum": [
///        "deleted"
///      ]
///    },
///    "outcome": {
///      "type": "string",
///      "enum": [
///        "project_or_candidate_failed",
///        "infrastructure_failed",
///        "resource_budget_failed",
///        "timed_out",
///        "security_blocked",
///        "unsupported_target_or_capability",
///        "inconclusive"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct NonCleanupFailureOutcome {
    #[serde(rename = "cleanupStatus")]
    pub cleanup_status: NonCleanupFailureOutcomeCleanupStatus,
    pub outcome: NonCleanupFailureOutcomeOutcome,
}
///`NonCleanupFailureOutcomeCleanupStatus`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "deleted"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum NonCleanupFailureOutcomeCleanupStatus {
    #[serde(rename = "deleted")]
    Deleted,
}
impl ::std::fmt::Display for NonCleanupFailureOutcomeCleanupStatus {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Deleted => f.write_str("deleted"),
        }
    }
}
impl ::std::str::FromStr for NonCleanupFailureOutcomeCleanupStatus {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "deleted" => Ok(Self::Deleted),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for NonCleanupFailureOutcomeCleanupStatus {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for NonCleanupFailureOutcomeCleanupStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for NonCleanupFailureOutcomeCleanupStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`NonCleanupFailureOutcomeOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "project_or_candidate_failed",
///    "infrastructure_failed",
///    "resource_budget_failed",
///    "timed_out",
///    "security_blocked",
///    "unsupported_target_or_capability",
///    "inconclusive"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum NonCleanupFailureOutcomeOutcome {
    #[serde(rename = "project_or_candidate_failed")]
    ProjectOrCandidateFailed,
    #[serde(rename = "infrastructure_failed")]
    InfrastructureFailed,
    #[serde(rename = "resource_budget_failed")]
    ResourceBudgetFailed,
    #[serde(rename = "timed_out")]
    TimedOut,
    #[serde(rename = "security_blocked")]
    SecurityBlocked,
    #[serde(rename = "unsupported_target_or_capability")]
    UnsupportedTargetOrCapability,
    #[serde(rename = "inconclusive")]
    Inconclusive,
}
impl ::std::fmt::Display for NonCleanupFailureOutcomeOutcome {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ProjectOrCandidateFailed => f.write_str("project_or_candidate_failed"),
            Self::InfrastructureFailed => f.write_str("infrastructure_failed"),
            Self::ResourceBudgetFailed => f.write_str("resource_budget_failed"),
            Self::TimedOut => f.write_str("timed_out"),
            Self::SecurityBlocked => f.write_str("security_blocked"),
            Self::UnsupportedTargetOrCapability => f.write_str("unsupported_target_or_capability"),
            Self::Inconclusive => f.write_str("inconclusive"),
        }
    }
}
impl ::std::str::FromStr for NonCleanupFailureOutcomeOutcome {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "project_or_candidate_failed" => Ok(Self::ProjectOrCandidateFailed),
            "infrastructure_failed" => Ok(Self::InfrastructureFailed),
            "resource_budget_failed" => Ok(Self::ResourceBudgetFailed),
            "timed_out" => Ok(Self::TimedOut),
            "security_blocked" => Ok(Self::SecurityBlocked),
            "unsupported_target_or_capability" => Ok(Self::UnsupportedTargetOrCapability),
            "inconclusive" => Ok(Self::Inconclusive),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for NonCleanupFailureOutcomeOutcome {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for NonCleanupFailureOutcomeOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for NonCleanupFailureOutcomeOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`NonEmptyString`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 4096,
///  "minLength": 1
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct NonEmptyString(::std::string::String);
impl ::std::ops::Deref for NonEmptyString {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<NonEmptyString> for ::std::string::String {
    fn from(value: NonEmptyString) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for NonEmptyString {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 4096usize {
            return Err("longer than 4096 characters".into());
        }
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for NonEmptyString {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for NonEmptyString {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for NonEmptyString {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for NonEmptyString {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`ObjectAuthorizationClass`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "workspace_private",
///    "validation_job_scoped",
///    "system_outbox",
///    "private_alpha_raw_opt_in"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectAuthorizationClass {
    #[serde(rename = "workspace_private")]
    WorkspacePrivate,
    #[serde(rename = "validation_job_scoped")]
    ValidationJobScoped,
    #[serde(rename = "system_outbox")]
    SystemOutbox,
    #[serde(rename = "private_alpha_raw_opt_in")]
    PrivateAlphaRawOptIn,
}
impl ::std::fmt::Display for ObjectAuthorizationClass {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::WorkspacePrivate => f.write_str("workspace_private"),
            Self::ValidationJobScoped => f.write_str("validation_job_scoped"),
            Self::SystemOutbox => f.write_str("system_outbox"),
            Self::PrivateAlphaRawOptIn => f.write_str("private_alpha_raw_opt_in"),
        }
    }
}
impl ::std::str::FromStr for ObjectAuthorizationClass {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "workspace_private" => Ok(Self::WorkspacePrivate),
            "validation_job_scoped" => Ok(Self::ValidationJobScoped),
            "system_outbox" => Ok(Self::SystemOutbox),
            "private_alpha_raw_opt_in" => Ok(Self::PrivateAlphaRawOptIn),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectAuthorizationClass {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectAuthorizationClass {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectAuthorizationClass {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObjectClass`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "event_batch",
///    "snapshot",
///    "inventory",
///    "source_bundle",
///    "candidate_patch",
///    "validation_diagnostics",
///    "attestation",
///    "braintrust_outbox",
///    "raw_opt_in"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectClass {
    #[serde(rename = "event_batch")]
    EventBatch,
    #[serde(rename = "snapshot")]
    Snapshot,
    #[serde(rename = "inventory")]
    Inventory,
    #[serde(rename = "source_bundle")]
    SourceBundle,
    #[serde(rename = "candidate_patch")]
    CandidatePatch,
    #[serde(rename = "validation_diagnostics")]
    ValidationDiagnostics,
    #[serde(rename = "attestation")]
    Attestation,
    #[serde(rename = "braintrust_outbox")]
    BraintrustOutbox,
    #[serde(rename = "raw_opt_in")]
    RawOptIn,
}
impl ::std::fmt::Display for ObjectClass {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::EventBatch => f.write_str("event_batch"),
            Self::Snapshot => f.write_str("snapshot"),
            Self::Inventory => f.write_str("inventory"),
            Self::SourceBundle => f.write_str("source_bundle"),
            Self::CandidatePatch => f.write_str("candidate_patch"),
            Self::ValidationDiagnostics => f.write_str("validation_diagnostics"),
            Self::Attestation => f.write_str("attestation"),
            Self::BraintrustOutbox => f.write_str("braintrust_outbox"),
            Self::RawOptIn => f.write_str("raw_opt_in"),
        }
    }
}
impl ::std::str::FromStr for ObjectClass {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "event_batch" => Ok(Self::EventBatch),
            "snapshot" => Ok(Self::Snapshot),
            "inventory" => Ok(Self::Inventory),
            "source_bundle" => Ok(Self::SourceBundle),
            "candidate_patch" => Ok(Self::CandidatePatch),
            "validation_diagnostics" => Ok(Self::ValidationDiagnostics),
            "attestation" => Ok(Self::Attestation),
            "braintrust_outbox" => Ok(Self::BraintrustOutbox),
            "raw_opt_in" => Ok(Self::RawOptIn),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectClass {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectClass {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectClass {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObjectCompression`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "none",
///    "gzip",
///    "zstd"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectCompression {
    #[serde(rename = "none")]
    None,
    #[serde(rename = "gzip")]
    Gzip,
    #[serde(rename = "zstd")]
    Zstd,
}
impl ::std::fmt::Display for ObjectCompression {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::None => f.write_str("none"),
            Self::Gzip => f.write_str("gzip"),
            Self::Zstd => f.write_str("zstd"),
        }
    }
}
impl ::std::str::FromStr for ObjectCompression {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "none" => Ok(Self::None),
            "gzip" => Ok(Self::Gzip),
            "zstd" => Ok(Self::Zstd),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectCompression {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectCompression {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectCompression {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObjectDeletionState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "active",
///    "delete_pending",
///    "deleted",
///    "tombstoned"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectDeletionState {
    #[serde(rename = "active")]
    Active,
    #[serde(rename = "delete_pending")]
    DeletePending,
    #[serde(rename = "deleted")]
    Deleted,
    #[serde(rename = "tombstoned")]
    Tombstoned,
}
impl ::std::fmt::Display for ObjectDeletionState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Active => f.write_str("active"),
            Self::DeletePending => f.write_str("delete_pending"),
            Self::Deleted => f.write_str("deleted"),
            Self::Tombstoned => f.write_str("tombstoned"),
        }
    }
}
impl ::std::str::FromStr for ObjectDeletionState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "active" => Ok(Self::Active),
            "delete_pending" => Ok(Self::DeletePending),
            "deleted" => Ok(Self::Deleted),
            "tombstoned" => Ok(Self::Tombstoned),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectDeletionState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectDeletionState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectDeletionState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObjectFinalizeRequest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "authenticatedMetadataDigest",
///    "authorizationId",
///    "ciphertextDigest",
///    "contentDigest",
///    "contentLength",
///    "encryptionKeyVersion",
///    "idempotencyKey",
///    "kind",
///    "nonce",
///    "objectId",
///    "schemaVersion",
///    "workspaceId"
///  ],
///  "properties": {
///    "authenticatedMetadataDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "authorizationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "ciphertextDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "contentDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "contentLength": {
///      "$ref": "#/$defs/ByteCount"
///    },
///    "encryptionKeyVersion": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    },
///    "idempotencyKey": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "object_finalize_request"
///      ]
///    },
///    "nonce": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "objectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObjectFinalizeRequest {
    #[serde(rename = "authenticatedMetadataDigest")]
    pub authenticated_metadata_digest: Sha256Digest,
    #[serde(rename = "authorizationId")]
    pub authorization_id: EntityId,
    #[serde(rename = "ciphertextDigest")]
    pub ciphertext_digest: Sha256Digest,
    #[serde(rename = "contentDigest")]
    pub content_digest: Sha256Digest,
    #[serde(rename = "contentLength")]
    pub content_length: ByteCount,
    #[serde(rename = "encryptionKeyVersion")]
    pub encryption_key_version: ::std::num::NonZeroU64,
    #[serde(rename = "idempotencyKey")]
    pub idempotency_key: EntityId,
    pub kind: ObjectFinalizeRequestKind,
    pub nonce: Base64Url,
    #[serde(rename = "objectId")]
    pub object_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ObjectFinalizeRequestKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "object_finalize_request"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectFinalizeRequestKind {
    #[serde(rename = "object_finalize_request")]
    ObjectFinalizeRequest,
}
impl ::std::fmt::Display for ObjectFinalizeRequestKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObjectFinalizeRequest => f.write_str("object_finalize_request"),
        }
    }
}
impl ::std::str::FromStr for ObjectFinalizeRequestKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "object_finalize_request" => Ok(Self::ObjectFinalizeRequest),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectFinalizeRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectFinalizeRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectFinalizeRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObjectKeyExchangeRequest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "kind",
///    "objectId",
///    "oneTimeAccessToken",
///    "sandboxEphemeralPublicKey",
///    "sandboxId",
///    "schemaVersion",
///    "validationJobId",
///    "workspaceId"
///  ],
///  "properties": {
///    "kind": {
///      "enum": [
///        "object_key_exchange_request"
///      ]
///    },
///    "objectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "oneTimeAccessToken": {
///      "$ref": "#/$defs/OpaqueTokenId"
///    },
///    "sandboxEphemeralPublicKey": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "sandboxId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "validationJobId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObjectKeyExchangeRequest {
    pub kind: ObjectKeyExchangeRequestKind,
    #[serde(rename = "objectId")]
    pub object_id: EntityId,
    #[serde(rename = "oneTimeAccessToken")]
    pub one_time_access_REDACTED: OpaqueTokenId,
    #[serde(rename = "sandboxEphemeralPublicKey")]
    pub sandbox_ephemeral_public_key: Base64Url,
    #[serde(rename = "sandboxId")]
    pub sandbox_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "validationJobId")]
    pub validation_job_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ObjectKeyExchangeRequestKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "object_key_exchange_request"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectKeyExchangeRequestKind {
    #[serde(rename = "object_key_exchange_request")]
    ObjectKeyExchangeRequest,
}
impl ::std::fmt::Display for ObjectKeyExchangeRequestKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObjectKeyExchangeRequest => f.write_str("object_key_exchange_request"),
        }
    }
}
impl ::std::str::FromStr for ObjectKeyExchangeRequestKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "object_key_exchange_request" => Ok(Self::ObjectKeyExchangeRequest),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectKeyExchangeRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectKeyExchangeRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectKeyExchangeRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObjectKeyExchangeResponse`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "authenticatedMetadataDigest",
///    "expiresAt",
///    "kind",
///    "objectId",
///    "retention",
///    "schemaVersion",
///    "sealedObjectKey"
///  ],
///  "properties": {
///    "authenticatedMetadataDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "expiresAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "kind": {
///      "enum": [
///        "object_key_exchange_response"
///      ]
///    },
///    "objectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "retention": {
///      "enum": [
///        "ephemeral"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sealedObjectKey": {
///      "$ref": "#/$defs/Base64"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObjectKeyExchangeResponse {
    #[serde(rename = "authenticatedMetadataDigest")]
    pub authenticated_metadata_digest: Sha256Digest,
    #[serde(rename = "expiresAt")]
    pub expires_at: Rfc3339Timestamp,
    pub kind: ObjectKeyExchangeResponseKind,
    #[serde(rename = "objectId")]
    pub object_id: EntityId,
    pub retention: ObjectKeyExchangeResponseRetention,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sealedObjectKey")]
    pub sealed_object_key: Base64,
}
///`ObjectKeyExchangeResponseKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "object_key_exchange_response"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectKeyExchangeResponseKind {
    #[serde(rename = "object_key_exchange_response")]
    ObjectKeyExchangeResponse,
}
impl ::std::fmt::Display for ObjectKeyExchangeResponseKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObjectKeyExchangeResponse => f.write_str("object_key_exchange_response"),
        }
    }
}
impl ::std::str::FromStr for ObjectKeyExchangeResponseKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "object_key_exchange_response" => Ok(Self::ObjectKeyExchangeResponse),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectKeyExchangeResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectKeyExchangeResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectKeyExchangeResponseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObjectKeyExchangeResponseRetention`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "ephemeral"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectKeyExchangeResponseRetention {
    #[serde(rename = "ephemeral")]
    Ephemeral,
}
impl ::std::fmt::Display for ObjectKeyExchangeResponseRetention {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Ephemeral => f.write_str("ephemeral"),
        }
    }
}
impl ::std::str::FromStr for ObjectKeyExchangeResponseRetention {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "ephemeral" => Ok(Self::Ephemeral),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectKeyExchangeResponseRetention {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectKeyExchangeResponseRetention {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectKeyExchangeResponseRetention {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObjectMetadata`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "authenticatedMetadataDigest",
///    "authenticatedMetadataVersion",
///    "authorizationClass",
///    "ciphertextDigest",
///    "ciphertextLength",
///    "compression",
///    "contentDigest",
///    "contentLength",
///    "createdAt",
///    "deletedAtAssessment",
///    "deletionState",
///    "encryptionKeyVersion",
///    "encryptionVersion",
///    "integrityState",
///    "kind",
///    "mediaType",
///    "nonce",
///    "objectClass",
///    "objectId",
///    "projectId",
///    "retentionClass",
///    "schemaVersion",
///    "storageKey",
///    "tombstoneReasonCodes",
///    "workspaceId"
///  ],
///  "properties": {
///    "authenticatedMetadataDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "authenticatedMetadataVersion": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    },
///    "authorizationClass": {
///      "$ref": "#/$defs/ObjectAuthorizationClass"
///    },
///    "ciphertextDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "ciphertextLength": {
///      "$ref": "#/$defs/ByteCount"
///    },
///    "compression": {
///      "$ref": "#/$defs/ObjectCompression"
///    },
///    "contentDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "contentLength": {
///      "$ref": "#/$defs/ByteCount"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "deletedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "deletedAtAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "deletionState": {
///      "$ref": "#/$defs/ObjectDeletionState"
///    },
///    "encryptionKeyVersion": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    },
///    "encryptionVersion": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    },
///    "integrityState": {
///      "type": "string",
///      "enum": [
///        "verified",
///        "pending",
///        "failed"
///      ]
///    },
///    "kind": {
///      "enum": [
///        "object_metadata"
///      ]
///    },
///    "mediaType": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "nonce": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "objectClass": {
///      "$ref": "#/$defs/ObjectClass"
///    },
///    "objectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "retentionClass": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "storageKey": {
///      "$ref": "#/$defs/RelativePath"
///    },
///    "tombstoneReasonCodes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 64
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObjectMetadata {
    #[serde(rename = "authenticatedMetadataDigest")]
    pub authenticated_metadata_digest: Sha256Digest,
    #[serde(rename = "authenticatedMetadataVersion")]
    pub authenticated_metadata_version: ::std::num::NonZeroU64,
    #[serde(rename = "authorizationClass")]
    pub authorization_class: ObjectAuthorizationClass,
    #[serde(rename = "ciphertextDigest")]
    pub ciphertext_digest: Sha256Digest,
    #[serde(rename = "ciphertextLength")]
    pub ciphertext_length: ByteCount,
    pub compression: ObjectCompression,
    #[serde(rename = "contentDigest")]
    pub content_digest: Sha256Digest,
    #[serde(rename = "contentLength")]
    pub content_length: ByteCount,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(
        rename = "deletedAt",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub deleted_at: ::std::option::Option<Rfc3339Timestamp>,
    #[serde(rename = "deletedAtAssessment")]
    pub deleted_at_assessment: Assessment,
    #[serde(rename = "deletionState")]
    pub deletion_state: ObjectDeletionState,
    #[serde(rename = "encryptionKeyVersion")]
    pub encryption_key_version: ::std::num::NonZeroU64,
    #[serde(rename = "encryptionVersion")]
    pub encryption_version: ::std::num::NonZeroU64,
    #[serde(rename = "integrityState")]
    pub integrity_state: ObjectMetadataIntegrityState,
    pub kind: ObjectMetadataKind,
    #[serde(rename = "mediaType")]
    pub media_type: ShortString,
    pub nonce: Base64Url,
    #[serde(rename = "objectClass")]
    pub object_class: ObjectClass,
    #[serde(rename = "objectId")]
    pub object_id: EntityId,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "retentionClass")]
    pub retention_class: ShortString,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "storageKey")]
    pub storage_key: RelativePath,
    #[serde(rename = "tombstoneReasonCodes")]
    pub tombstone_reason_codes: ::std::vec::Vec<ShortString>,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ObjectMetadataIntegrityState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "verified",
///    "pending",
///    "failed"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectMetadataIntegrityState {
    #[serde(rename = "verified")]
    Verified,
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "failed")]
    Failed,
}
impl ::std::fmt::Display for ObjectMetadataIntegrityState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Verified => f.write_str("verified"),
            Self::Pending => f.write_str("pending"),
            Self::Failed => f.write_str("failed"),
        }
    }
}
impl ::std::str::FromStr for ObjectMetadataIntegrityState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "verified" => Ok(Self::Verified),
            "pending" => Ok(Self::Pending),
            "failed" => Ok(Self::Failed),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectMetadataIntegrityState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectMetadataIntegrityState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectMetadataIntegrityState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObjectMetadataKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "object_metadata"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectMetadataKind {
    #[serde(rename = "object_metadata")]
    ObjectMetadata,
}
impl ::std::fmt::Display for ObjectMetadataKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObjectMetadata => f.write_str("object_metadata"),
        }
    }
}
impl ::std::str::FromStr for ObjectMetadataKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "object_metadata" => Ok(Self::ObjectMetadata),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectMetadataKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectMetadataKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectMetadataKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObjectUploadAuthorizationRequest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "ciphertextDigest",
///    "contentDigest",
///    "contentLength",
///    "idempotencyKey",
///    "kind",
///    "mediaType",
///    "objectClass",
///    "projectId",
///    "schemaVersion",
///    "uploaderEphemeralPublicKey",
///    "workspaceId"
///  ],
///  "properties": {
///    "ciphertextDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "contentDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "contentLength": {
///      "$ref": "#/$defs/ByteCount"
///    },
///    "idempotencyKey": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "object_upload_authorization_request"
///      ]
///    },
///    "mediaType": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "objectClass": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "uploaderEphemeralPublicKey": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObjectUploadAuthorizationRequest {
    #[serde(rename = "ciphertextDigest")]
    pub ciphertext_digest: Sha256Digest,
    #[serde(rename = "contentDigest")]
    pub content_digest: Sha256Digest,
    #[serde(rename = "contentLength")]
    pub content_length: ByteCount,
    #[serde(rename = "idempotencyKey")]
    pub idempotency_key: EntityId,
    pub kind: ObjectUploadAuthorizationRequestKind,
    #[serde(rename = "mediaType")]
    pub media_type: ShortString,
    #[serde(rename = "objectClass")]
    pub object_class: ShortString,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "uploaderEphemeralPublicKey")]
    pub uploader_ephemeral_public_key: Base64Url,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ObjectUploadAuthorizationRequestKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "object_upload_authorization_request"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObjectUploadAuthorizationRequestKind {
    #[serde(rename = "object_upload_authorization_request")]
    ObjectUploadAuthorizationRequest,
}
impl ::std::fmt::Display for ObjectUploadAuthorizationRequestKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObjectUploadAuthorizationRequest => {
                f.write_str("object_upload_authorization_request")
            }
        }
    }
}
impl ::std::str::FromStr for ObjectUploadAuthorizationRequestKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "object_upload_authorization_request" => Ok(Self::ObjectUploadAuthorizationRequest),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObjectUploadAuthorizationRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObjectUploadAuthorizationRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObjectUploadAuthorizationRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationEvent`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "actionType",
///    "actor",
///    "bootId",
///    "capture",
///    "causalParentEventIds",
///    "clockUncertaintyMs",
///    "deviceId",
///    "eventHash",
///    "eventId",
///    "kind",
///    "localSequence",
///    "monotonicNanos",
///    "outcome",
///    "payload",
///    "previousEventHashState",
///    "projectId",
///    "realmId",
///    "redactionPolicyVersion",
///    "schemaVersion",
///    "sessionState",
///    "source",
///    "sourceSequenceState",
///    "sourceStreamId",
///    "timestampUtc",
///    "toolCallState",
///    "turnState",
///    "workspaceId"
///  ],
///  "properties": {
///    "actionType": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "actor": {
///      "$ref": "#/$defs/ActorAttribution"
///    },
///    "bootId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "capture": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "causalParentEventIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 128
///    },
///    "clockUncertaintyMs": {
///      "$ref": "#/$defs/DurationMs"
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "eventHash": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "eventId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "observation_event"
///      ]
///    },
///    "layerId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "localSequence": {
///      "$ref": "#/$defs/DecimalCounter"
///    },
///    "monotonicNanos": {
///      "$ref": "#/$defs/DecimalCounter"
///    },
///    "outcome": {
///      "type": "string",
///      "enum": [
///        "attempted",
///        "succeeded",
///        "failed",
///        "unknown"
///      ]
///    },
///    "payload": {
///      "$ref": "#/$defs/RedactedActionPayload"
///    },
///    "previousEventHashState": {
///      "oneOf": [
///        {
///          "type": "object",
///          "required": [
///            "digest",
///            "state"
///          ],
///          "properties": {
///            "digest": {
///              "$ref": "#/$defs/Sha256Digest"
///            },
///            "state": {
///              "enum": [
///                "known"
///              ]
///            }
///          },
///          "additionalProperties": false
///        },
///        {
///          "type": "object",
///          "required": [
///            "state"
///          ],
///          "properties": {
///            "state": {
///              "enum": [
///                "not_applicable"
///              ]
///            }
///          },
///          "additionalProperties": false
///        }
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "redactionPolicyVersion": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sessionId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "sessionState": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "source": {
///      "$ref": "#/$defs/ObservationSource"
///    },
///    "sourceSequenceState": {
///      "oneOf": [
///        {
///          "type": "object",
///          "required": [
///            "state",
///            "value"
///          ],
///          "properties": {
///            "state": {
///              "enum": [
///                "known"
///              ]
///            },
///            "value": {
///              "$ref": "#/$defs/DecimalCounter"
///            }
///          },
///          "additionalProperties": false
///        },
///        {
///          "type": "object",
///          "required": [
///            "reasonCode",
///            "state"
///          ],
///          "properties": {
///            "reasonCode": {
///              "$ref": "#/$defs/ShortString"
///            },
///            "state": {
///              "type": "string",
///              "enum": [
///                "unknown",
///                "unsupported",
///                "not_applicable"
///              ]
///            }
///          },
///          "additionalProperties": false
///        }
///      ]
///    },
///    "sourceStreamId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "timestampUtc": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "toolCallId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "toolCallState": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "turnId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "turnState": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObservationEvent {
    #[serde(rename = "actionType")]
    pub action_type: ShortString,
    pub actor: ActorAttribution,
    #[serde(rename = "bootId")]
    pub boot_id: EntityId,
    pub capture: Assessment,
    #[serde(rename = "causalParentEventIds")]
    pub causal_parent_event_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "clockUncertaintyMs")]
    pub clock_uncertainty_ms: DurationMs,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    #[serde(rename = "eventHash")]
    pub event_hash: Sha256Digest,
    #[serde(rename = "eventId")]
    pub event_id: EntityId,
    pub kind: ObservationEventKind,
    #[serde(
        rename = "layerId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub layer_id: ::std::option::Option<EntityId>,
    #[serde(rename = "localSequence")]
    pub local_sequence: DecimalCounter,
    #[serde(rename = "monotonicNanos")]
    pub monotonic_nanos: DecimalCounter,
    pub outcome: ObservationEventOutcome,
    pub payload: RedactedActionPayload,
    #[serde(rename = "previousEventHashState")]
    pub previous_event_hash_state: ObservationEventPreviousEventHashState,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    #[serde(rename = "redactionPolicyVersion")]
    pub redaction_policy_version: ShortString,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(
        rename = "sessionId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub session_id: ::std::option::Option<EntityId>,
    #[serde(rename = "sessionState")]
    pub session_state: Assessment,
    pub source: ObservationSource,
    #[serde(rename = "sourceSequenceState")]
    pub source_sequence_state: ObservationEventSourceSequenceState,
    #[serde(rename = "sourceStreamId")]
    pub source_stream_id: EntityId,
    #[serde(rename = "timestampUtc")]
    pub timestamp_utc: Rfc3339Timestamp,
    #[serde(
        rename = "toolCallId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub tool_call_id: ::std::option::Option<EntityId>,
    #[serde(rename = "toolCallState")]
    pub tool_call_state: Assessment,
    #[serde(
        rename = "turnId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub turn_id: ::std::option::Option<EntityId>,
    #[serde(rename = "turnState")]
    pub turn_state: Assessment,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ObservationEventBatchRequest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "batchId",
///    "chainEndHash",
///    "contentDigest",
///    "createdAt",
///    "deviceId",
///    "eventCount",
///    "firstSequence",
///    "kind",
///    "lastSequence",
///    "objectId",
///    "previousChainHashAssessment",
///    "projectId",
///    "schemaVersion",
///    "signature",
///    "streamId",
///    "workspaceId"
///  ],
///  "properties": {
///    "batchId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "chainEndHash": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "contentDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "eventCount": {
///      "type": "integer",
///      "maximum": 10000.0,
///      "minimum": 1.0
///    },
///    "firstSequence": {
///      "$ref": "#/$defs/DecimalCounter"
///    },
///    "kind": {
///      "enum": [
///        "observation_event_batch_request"
///      ]
///    },
///    "lastSequence": {
///      "$ref": "#/$defs/DecimalCounter"
///    },
///    "objectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "previousChainHash": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "previousChainHashAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "signature": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "streamId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObservationEventBatchRequest {
    #[serde(rename = "batchId")]
    pub batch_id: EntityId,
    #[serde(rename = "chainEndHash")]
    pub chain_end_hash: Sha256Digest,
    #[serde(rename = "contentDigest")]
    pub content_digest: Sha256Digest,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    #[serde(rename = "eventCount")]
    pub event_count: ::std::num::NonZeroU64,
    #[serde(rename = "firstSequence")]
    pub first_sequence: DecimalCounter,
    pub kind: ObservationEventBatchRequestKind,
    #[serde(rename = "lastSequence")]
    pub last_sequence: DecimalCounter,
    #[serde(rename = "objectId")]
    pub object_id: EntityId,
    #[serde(
        rename = "previousChainHash",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub previous_chain_hash: ::std::option::Option<Sha256Digest>,
    #[serde(rename = "previousChainHashAssessment")]
    pub previous_chain_hash_assessment: Assessment,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub signature: Base64Url,
    #[serde(rename = "streamId")]
    pub stream_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ObservationEventBatchRequestKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "observation_event_batch_request"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationEventBatchRequestKind {
    #[serde(rename = "observation_event_batch_request")]
    ObservationEventBatchRequest,
}
impl ::std::fmt::Display for ObservationEventBatchRequestKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObservationEventBatchRequest => f.write_str("observation_event_batch_request"),
        }
    }
}
impl ::std::str::FromStr for ObservationEventBatchRequestKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "observation_event_batch_request" => Ok(Self::ObservationEventBatchRequest),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationEventBatchRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObservationEventBatchRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObservationEventBatchRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationEventKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "observation_event"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationEventKind {
    #[serde(rename = "observation_event")]
    ObservationEvent,
}
impl ::std::fmt::Display for ObservationEventKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObservationEvent => f.write_str("observation_event"),
        }
    }
}
impl ::std::str::FromStr for ObservationEventKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "observation_event" => Ok(Self::ObservationEvent),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationEventKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObservationEventKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObservationEventKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationEventOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "attempted",
///    "succeeded",
///    "failed",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationEventOutcome {
    #[serde(rename = "attempted")]
    Attempted,
    #[serde(rename = "succeeded")]
    Succeeded,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for ObservationEventOutcome {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Attempted => f.write_str("attempted"),
            Self::Succeeded => f.write_str("succeeded"),
            Self::Failed => f.write_str("failed"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for ObservationEventOutcome {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "attempted" => Ok(Self::Attempted),
            "succeeded" => Ok(Self::Succeeded),
            "failed" => Ok(Self::Failed),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationEventOutcome {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObservationEventOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObservationEventOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationEventPreviousEventHashState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "type": "object",
///      "required": [
///        "digest",
///        "state"
///      ],
///      "properties": {
///        "digest": {
///          "$ref": "#/$defs/Sha256Digest"
///        },
///        "state": {
///          "enum": [
///            "known"
///          ]
///        }
///      },
///      "additionalProperties": false
///    },
///    {
///      "type": "object",
///      "required": [
///        "state"
///      ],
///      "properties": {
///        "state": {
///          "enum": [
///            "not_applicable"
///          ]
///        }
///      },
///      "additionalProperties": false
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(tag = "state", content = "digest")]
pub enum ObservationEventPreviousEventHashState {
    #[serde(rename = "known")]
    Known(Sha256Digest),
    #[serde(rename = "not_applicable")]
    NotApplicable,
}
impl ::std::convert::From<Sha256Digest> for ObservationEventPreviousEventHashState {
    fn from(value: Sha256Digest) -> Self {
        Self::Known(value)
    }
}
///`ObservationEventSourceSequenceState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "type": "object",
///      "required": [
///        "state",
///        "value"
///      ],
///      "properties": {
///        "state": {
///          "enum": [
///            "known"
///          ]
///        },
///        "value": {
///          "$ref": "#/$defs/DecimalCounter"
///        }
///      },
///      "additionalProperties": false
///    },
///    {
///      "type": "object",
///      "required": [
///        "reasonCode",
///        "state"
///      ],
///      "properties": {
///        "reasonCode": {
///          "$ref": "#/$defs/ShortString"
///        },
///        "state": {
///          "type": "string",
///          "enum": [
///            "unknown",
///            "unsupported",
///            "not_applicable"
///          ]
///        }
///      },
///      "additionalProperties": false
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged, deny_unknown_fields)]
pub enum ObservationEventSourceSequenceState {
    Variant0 {
        state: ObservationEventSourceSequenceStateVariant0State,
        value: DecimalCounter,
    },
    Variant1 {
        #[serde(rename = "reasonCode")]
        reason_code: ShortString,
        state: ObservationEventSourceSequenceStateVariant1State,
    },
}
///`ObservationEventSourceSequenceStateVariant0State`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "known"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationEventSourceSequenceStateVariant0State {
    #[serde(rename = "known")]
    Known,
}
impl ::std::fmt::Display for ObservationEventSourceSequenceStateVariant0State {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Known => f.write_str("known"),
        }
    }
}
impl ::std::str::FromStr for ObservationEventSourceSequenceStateVariant0State {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "known" => Ok(Self::Known),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationEventSourceSequenceStateVariant0State {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String>
    for ObservationEventSourceSequenceStateVariant0State
{
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String>
    for ObservationEventSourceSequenceStateVariant0State
{
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationEventSourceSequenceStateVariant1State`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "unknown",
///    "unsupported",
///    "not_applicable"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationEventSourceSequenceStateVariant1State {
    #[serde(rename = "unknown")]
    Unknown,
    #[serde(rename = "unsupported")]
    Unsupported,
    #[serde(rename = "not_applicable")]
    NotApplicable,
}
impl ::std::fmt::Display for ObservationEventSourceSequenceStateVariant1State {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Unknown => f.write_str("unknown"),
            Self::Unsupported => f.write_str("unsupported"),
            Self::NotApplicable => f.write_str("not_applicable"),
        }
    }
}
impl ::std::str::FromStr for ObservationEventSourceSequenceStateVariant1State {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "unknown" => Ok(Self::Unknown),
            "unsupported" => Ok(Self::Unsupported),
            "not_applicable" => Ok(Self::NotApplicable),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationEventSourceSequenceStateVariant1State {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String>
    for ObservationEventSourceSequenceStateVariant1State
{
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String>
    for ObservationEventSourceSequenceStateVariant1State
{
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationPackageOperation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "manager",
///    "operation",
///    "packageName",
///    "requestedVersion",
///    "scope"
///  ],
///  "properties": {
///    "manager": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "operation": {
///      "type": "string",
///      "enum": [
///        "install",
///        "remove",
///        "update",
///        "resolve",
///        "sync",
///        "unknown"
///      ]
///    },
///    "packageName": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "requestedVersion": {
///      "type": "string",
///      "maxLength": 512
///    },
///    "scope": {
///      "type": "string",
///      "enum": [
///        "project",
///        "workspace",
///        "virtual_environment",
///        "REDACTED",
///        "system",
///        "unknown"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObservationPackageOperation {
    pub manager: ShortString,
    pub operation: ObservationPackageOperationOperation,
    #[serde(rename = "packageName")]
    pub package_name: ShortString,
    #[serde(rename = "requestedVersion")]
    pub requested_version: ObservationPackageOperationRequestedVersion,
    pub scope: ObservationPackageOperationScope,
}
///`ObservationPackageOperationOperation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "install",
///    "remove",
///    "update",
///    "resolve",
///    "sync",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationPackageOperationOperation {
    #[serde(rename = "install")]
    Install,
    #[serde(rename = "remove")]
    Remove,
    #[serde(rename = "update")]
    Update,
    #[serde(rename = "resolve")]
    Resolve,
    #[serde(rename = "sync")]
    Sync,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for ObservationPackageOperationOperation {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Install => f.write_str("install"),
            Self::Remove => f.write_str("remove"),
            Self::Update => f.write_str("update"),
            Self::Resolve => f.write_str("resolve"),
            Self::Sync => f.write_str("sync"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for ObservationPackageOperationOperation {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "install" => Ok(Self::Install),
            "remove" => Ok(Self::Remove),
            "update" => Ok(Self::Update),
            "resolve" => Ok(Self::Resolve),
            "sync" => Ok(Self::Sync),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationPackageOperationOperation {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObservationPackageOperationOperation {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObservationPackageOperationOperation {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationPackageOperationRequestedVersion`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 512
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct ObservationPackageOperationRequestedVersion(::std::string::String);
impl ::std::ops::Deref for ObservationPackageOperationRequestedVersion {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<ObservationPackageOperationRequestedVersion> for ::std::string::String {
    fn from(value: ObservationPackageOperationRequestedVersion) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for ObservationPackageOperationRequestedVersion {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 512usize {
            return Err("longer than 512 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for ObservationPackageOperationRequestedVersion {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String>
    for ObservationPackageOperationRequestedVersion
{
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String>
    for ObservationPackageOperationRequestedVersion
{
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for ObservationPackageOperationRequestedVersion {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`ObservationPackageOperationScope`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "project",
///    "workspace",
///    "virtual_environment",
///    "REDACTED",
///    "system",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationPackageOperationScope {
    #[serde(rename = "project")]
    Project,
    #[serde(rename = "workspace")]
    Workspace,
    #[serde(rename = "virtual_environment")]
    VirtualEnvironment,
    #[serde(rename = "REDACTED")]
    User,
    #[serde(rename = "system")]
    System,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for ObservationPackageOperationScope {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Project => f.write_str("project"),
            Self::Workspace => f.write_str("workspace"),
            Self::VirtualEnvironment => f.write_str("virtual_environment"),
            Self::User => f.write_str("REDACTED"),
            Self::System => f.write_str("system"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for ObservationPackageOperationScope {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "project" => Ok(Self::Project),
            "workspace" => Ok(Self::Workspace),
            "virtual_environment" => Ok(Self::VirtualEnvironment),
            "REDACTED" => Ok(Self::User),
            "system" => Ok(Self::System),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationPackageOperationScope {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObservationPackageOperationScope {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObservationPackageOperationScope {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationSource`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "providerState",
///    "sourceKind"
///  ],
///  "properties": {
///    "provider": {
///      "$ref": "#/$defs/ProviderName"
///    },
///    "providerState": {
///      "type": "string",
///      "enum": [
///        "identified",
///        "unknown",
///        "not_applicable"
///      ]
///    },
///    "sourceKind": {
///      "type": "string",
///      "enum": [
///        "provider",
///        "process",
///        "filesystem",
///        "inventory",
///        "extension",
///        "system"
///      ]
///    },
///    "surface": {
///      "$ref": "#/$defs/ShortString"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObservationSource {
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub provider: ::std::option::Option<ProviderName>,
    #[serde(rename = "providerState")]
    pub provider_state: ObservationSourceProviderState,
    #[serde(rename = "sourceKind")]
    pub source_kind: ObservationSourceSourceKind,
    #[serde(default, skip_serializing_if = "::std::option::Option::is_none")]
    pub surface: ::std::option::Option<ShortString>,
}
///`ObservationSourceProviderState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "identified",
///    "unknown",
///    "not_applicable"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationSourceProviderState {
    #[serde(rename = "identified")]
    Identified,
    #[serde(rename = "unknown")]
    Unknown,
    #[serde(rename = "not_applicable")]
    NotApplicable,
}
impl ::std::fmt::Display for ObservationSourceProviderState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Identified => f.write_str("identified"),
            Self::Unknown => f.write_str("unknown"),
            Self::NotApplicable => f.write_str("not_applicable"),
        }
    }
}
impl ::std::str::FromStr for ObservationSourceProviderState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "identified" => Ok(Self::Identified),
            "unknown" => Ok(Self::Unknown),
            "not_applicable" => Ok(Self::NotApplicable),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationSourceProviderState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObservationSourceProviderState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObservationSourceProviderState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationSourceSourceKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "provider",
///    "process",
///    "filesystem",
///    "inventory",
///    "extension",
///    "system"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationSourceSourceKind {
    #[serde(rename = "provider")]
    Provider,
    #[serde(rename = "process")]
    Process,
    #[serde(rename = "filesystem")]
    Filesystem,
    #[serde(rename = "inventory")]
    Inventory,
    #[serde(rename = "extension")]
    Extension,
    #[serde(rename = "system")]
    System,
}
impl ::std::fmt::Display for ObservationSourceSourceKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Provider => f.write_str("provider"),
            Self::Process => f.write_str("process"),
            Self::Filesystem => f.write_str("filesystem"),
            Self::Inventory => f.write_str("inventory"),
            Self::Extension => f.write_str("extension"),
            Self::System => f.write_str("system"),
        }
    }
}
impl ::std::str::FromStr for ObservationSourceSourceKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "provider" => Ok(Self::Provider),
            "process" => Ok(Self::Process),
            "filesystem" => Ok(Self::Filesystem),
            "inventory" => Ok(Self::Inventory),
            "extension" => Ok(Self::Extension),
            "system" => Ok(Self::System),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationSourceSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObservationSourceSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObservationSourceSourceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationStartCommand`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "projectId",
///    "providerSurface",
///    "type"
///  ],
///  "properties": {
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "providerSurface": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "type": {
///      "enum": [
///        "observation.start"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObservationStartCommand {
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "providerSurface")]
    pub provider_surface: ShortString,
    #[serde(rename = "type")]
    pub type_: ObservationStartCommandType,
}
///`ObservationStartCommandType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "observation.start"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationStartCommandType {
    #[serde(rename = "observation.start")]
    ObservationStart,
}
impl ::std::fmt::Display for ObservationStartCommandType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObservationStart => f.write_str("observation.start"),
        }
    }
}
impl ::std::str::FromStr for ObservationStartCommandType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "observation.start" => Ok(Self::ObservationStart),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationStartCommandType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObservationStartCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObservationStartCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservationStopCommand`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "sessionId",
///    "type"
///  ],
///  "properties": {
///    "sessionId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "type": {
///      "enum": [
///        "observation.stop"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObservationStopCommand {
    #[serde(rename = "sessionId")]
    pub session_id: EntityId,
    #[serde(rename = "type")]
    pub type_: ObservationStopCommandType,
}
///`ObservationStopCommandType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "observation.stop"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservationStopCommandType {
    #[serde(rename = "observation.stop")]
    ObservationStop,
}
impl ::std::fmt::Display for ObservationStopCommandType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObservationStop => f.write_str("observation.stop"),
        }
    }
}
impl ::std::str::FromStr for ObservationStopCommandType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "observation.stop" => Ok(Self::ObservationStop),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservationStopCommandType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObservationStopCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObservationStopCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ObservedActionGraph`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "graph",
///    "kind",
///    "schemaVersion"
///  ],
///  "properties": {
///    "graph": {
///      "$ref": "#/$defs/GraphBody"
///    },
///    "kind": {
///      "enum": [
///        "observed_action_graph"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ObservedActionGraph {
    pub graph: GraphBody,
    pub kind: ObservedActionGraphKind,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`ObservedActionGraphKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "observed_action_graph"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ObservedActionGraphKind {
    #[serde(rename = "observed_action_graph")]
    ObservedActionGraph,
}
impl ::std::fmt::Display for ObservedActionGraphKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ObservedActionGraph => f.write_str("observed_action_graph"),
        }
    }
}
impl ::std::str::FromStr for ObservedActionGraphKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "observed_action_graph" => Ok(Self::ObservedActionGraph),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ObservedActionGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ObservedActionGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ObservedActionGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`OpaqueTokenId`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 256,
///  "minLength": 16,
///  "pattern": "^[A-Za-z0-9_-]+$"
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct OpaqueTokenId(::std::string::String);
impl ::std::ops::Deref for OpaqueTokenId {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<OpaqueTokenId> for ::std::string::String {
    fn from(value: OpaqueTokenId) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for OpaqueTokenId {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 256usize {
            return Err("longer than 256 characters".into());
        }
        if value.chars().count() < 16usize {
            return Err("shorter than 16 characters".into());
        }
        static PATTERN: ::std::sync::LazyLock<::regress::Regex> =
            ::std::sync::LazyLock::new(|| ::regress::Regex::new("^[A-Za-z0-9_-]+$").unwrap());
        if PATTERN.find(value).is_none() {
            return Err("doesn't match pattern \"^[A-Za-z0-9_-]+$\"".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for OpaqueTokenId {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for OpaqueTokenId {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for OpaqueTokenId {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for OpaqueTokenId {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`OptimalityPolicy`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "budgets",
///    "createdAt",
///    "createdBy",
///    "hardConstraints",
///    "kind",
///    "mode",
///    "objectives",
///    "policyDigest",
///    "policyId",
///    "projectId",
///    "requiredTargetIds",
///    "schemaVersion",
///    "version",
///    "workspaceId"
///  ],
///  "properties": {
///    "budgets": {
///      "$ref": "#/$defs/PolicyBudgets"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "createdBy": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "hardConstraints": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/PolicyConstraint"
///      },
///      "maxItems": 1024
///    },
///    "kind": {
///      "enum": [
///        "optimality_policy"
///      ]
///    },
///    "mode": {
///      "type": "string",
///      "enum": [
///        "default",
///        "REDACTED_defined",
///        "hybrid"
///      ]
///    },
///    "objectives": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/PolicyObjective"
///      },
///      "maxItems": 256
///    },
///    "policyDigest": {
///      "description": "RFC 8785 SHA-256 digest of this object with policyDigest omitted.",
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "policyId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "requiredTargetIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "version": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct OptimalityPolicy {
    pub budgets: PolicyBudgets,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "createdBy")]
    pub created_by: EntityId,
    #[serde(rename = "hardConstraints")]
    pub hard_constraints: ::std::vec::Vec<PolicyConstraint>,
    pub kind: OptimalityPolicyKind,
    pub mode: OptimalityPolicyMode,
    pub objectives: ::std::vec::Vec<PolicyObjective>,
    ///RFC 8785 SHA-256 digest of this object with policyDigest omitted.
    #[serde(rename = "policyDigest")]
    pub policy_digest: Sha256Digest,
    #[serde(rename = "policyId")]
    pub policy_id: EntityId,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "requiredTargetIds")]
    pub required_target_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub version: ::std::num::NonZeroU64,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`OptimalityPolicyKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "optimality_policy"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum OptimalityPolicyKind {
    #[serde(rename = "optimality_policy")]
    OptimalityPolicy,
}
impl ::std::fmt::Display for OptimalityPolicyKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::OptimalityPolicy => f.write_str("optimality_policy"),
        }
    }
}
impl ::std::str::FromStr for OptimalityPolicyKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "optimality_policy" => Ok(Self::OptimalityPolicy),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for OptimalityPolicyKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for OptimalityPolicyKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for OptimalityPolicyKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`OptimalityPolicyMode`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "default",
///    "REDACTED_defined",
///    "hybrid"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum OptimalityPolicyMode {
    #[serde(rename = "default")]
    Default,
    #[serde(rename = "REDACTED_defined")]
    UserDefined,
    #[serde(rename = "hybrid")]
    Hybrid,
}
impl ::std::fmt::Display for OptimalityPolicyMode {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Default => f.write_str("default"),
            Self::UserDefined => f.write_str("REDACTED_defined"),
            Self::Hybrid => f.write_str("hybrid"),
        }
    }
}
impl ::std::str::FromStr for OptimalityPolicyMode {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "default" => Ok(Self::Default),
            "REDACTED_defined" => Ok(Self::UserDefined),
            "hybrid" => Ok(Self::Hybrid),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for OptimalityPolicyMode {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for OptimalityPolicyMode {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for OptimalityPolicyMode {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`PassedOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "attestationDigest",
///    "cleanupStatus",
///    "outcome"
///  ],
///  "properties": {
///    "attestationDigest": {
///      "description": "RFC 8785 SHA-256 digest of this object with attestationDigest omitted.",
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "cleanupStatus": {
///      "enum": [
///        "deleted"
///      ]
///    },
///    "outcome": {
///      "enum": [
///        "REDACTEDed"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct PassedOutcome {
    ///RFC 8785 SHA-256 digest of this object with attestationDigest omitted.
    #[serde(rename = "attestationDigest")]
    pub attestation_digest: Sha256Digest,
    #[serde(rename = "cleanupStatus")]
    pub cleanup_status: PassedOutcomeCleanupStatus,
    pub outcome: PassedOutcomeOutcome,
}
///`PassedOutcomeCleanupStatus`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "deleted"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum PassedOutcomeCleanupStatus {
    #[serde(rename = "deleted")]
    Deleted,
}
impl ::std::fmt::Display for PassedOutcomeCleanupStatus {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Deleted => f.write_str("deleted"),
        }
    }
}
impl ::std::str::FromStr for PassedOutcomeCleanupStatus {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "deleted" => Ok(Self::Deleted),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for PassedOutcomeCleanupStatus {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for PassedOutcomeCleanupStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PassedOutcomeCleanupStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`PassedOutcomeOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "REDACTEDed"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum PassedOutcomeOutcome {
    #[serde(rename = "REDACTEDed")]
    Passed,
}
impl ::std::fmt::Display for PassedOutcomeOutcome {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Passed => f.write_str("REDACTEDed"),
        }
    }
}
impl ::std::str::FromStr for PassedOutcomeOutcome {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "REDACTEDed" => Ok(Self::Passed),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for PassedOutcomeOutcome {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for PassedOutcomeOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PassedOutcomeOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`PatchFile`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "afterDigestAssessment",
///    "beforeDigestAssessment",
///    "changeKind",
///    "generatedFile",
///    "operationIds",
///    "path"
///  ],
///  "properties": {
///    "afterDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "afterDigestAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "beforeDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "beforeDigestAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "changeKind": {
///      "type": "string",
///      "enum": [
///        "added",
///        "modified",
///        "deleted",
///        "renamed"
///      ]
///    },
///    "generatedFile": {
///      "type": "boolean"
///    },
///    "operationIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "path": {
///      "$ref": "#/$defs/RelativePath"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct PatchFile {
    #[serde(
        rename = "afterDigest",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub after_digest: ::std::option::Option<Sha256Digest>,
    #[serde(rename = "afterDigestAssessment")]
    pub after_digest_assessment: Assessment,
    #[serde(
        rename = "beforeDigest",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub before_digest: ::std::option::Option<Sha256Digest>,
    #[serde(rename = "beforeDigestAssessment")]
    pub before_digest_assessment: Assessment,
    #[serde(rename = "changeKind")]
    pub change_kind: PatchFileChangeKind,
    #[serde(rename = "generatedFile")]
    pub generated_file: bool,
    #[serde(rename = "operationIds")]
    pub operation_ids: ::std::vec::Vec<EntityId>,
    pub path: RelativePath,
}
///`PatchFileChangeKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "added",
///    "modified",
///    "deleted",
///    "renamed"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum PatchFileChangeKind {
    #[serde(rename = "added")]
    Added,
    #[serde(rename = "modified")]
    Modified,
    #[serde(rename = "deleted")]
    Deleted,
    #[serde(rename = "renamed")]
    Renamed,
}
impl ::std::fmt::Display for PatchFileChangeKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Added => f.write_str("added"),
            Self::Modified => f.write_str("modified"),
            Self::Deleted => f.write_str("deleted"),
            Self::Renamed => f.write_str("renamed"),
        }
    }
}
impl ::std::str::FromStr for PatchFileChangeKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "added" => Ok(Self::Added),
            "modified" => Ok(Self::Modified),
            "deleted" => Ok(Self::Deleted),
            "renamed" => Ok(Self::Renamed),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for PatchFileChangeKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for PatchFileChangeKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PatchFileChangeKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`PatchGuardResult`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "evidenceReferenceIds",
///    "guard",
///    "reasonCodes",
///    "state"
///  ],
///  "properties": {
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512
///    },
///    "guard": {
///      "type": "string",
///      "enum": [
///        "schema",
///        "path_scope",
///        "REDACTED_scan",
///        "diff_size",
///        "semantic_parse",
///        "manifest_lock_coherence",
///        "generated_file",
///        "policy",
///        "operation_traceability",
///        "static_contradiction"
///      ]
///    },
///    "reasonCodes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "REDACTEDed",
///        "failed",
///        "inconclusive",
///        "unsupported"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct PatchGuardResult {
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    pub guard: PatchGuardResultGuard,
    #[serde(rename = "reasonCodes")]
    pub reason_codes: ::std::vec::Vec<ShortString>,
    pub state: PatchGuardResultState,
}
///`PatchGuardResultGuard`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "schema",
///    "path_scope",
///    "REDACTED_scan",
///    "diff_size",
///    "semantic_parse",
///    "manifest_lock_coherence",
///    "generated_file",
///    "policy",
///    "operation_traceability",
///    "static_contradiction"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum PatchGuardResultGuard {
    #[serde(rename = "schema")]
    Schema,
    #[serde(rename = "path_scope")]
    PathScope,
    #[serde(rename = "REDACTED_scan")]
    SecretScan,
    #[serde(rename = "diff_size")]
    DiffSize,
    #[serde(rename = "semantic_parse")]
    SemanticParse,
    #[serde(rename = "manifest_lock_coherence")]
    ManifestLockCoherence,
    #[serde(rename = "generated_file")]
    GeneratedFile,
    #[serde(rename = "policy")]
    Policy,
    #[serde(rename = "operation_traceability")]
    OperationTraceability,
    #[serde(rename = "static_contradiction")]
    StaticContradiction,
}
impl ::std::fmt::Display for PatchGuardResultGuard {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Schema => f.write_str("schema"),
            Self::PathScope => f.write_str("path_scope"),
            Self::SecretScan => f.write_str("REDACTED_scan"),
            Self::DiffSize => f.write_str("diff_size"),
            Self::SemanticParse => f.write_str("semantic_parse"),
            Self::ManifestLockCoherence => f.write_str("manifest_lock_coherence"),
            Self::GeneratedFile => f.write_str("generated_file"),
            Self::Policy => f.write_str("policy"),
            Self::OperationTraceability => f.write_str("operation_traceability"),
            Self::StaticContradiction => f.write_str("static_contradiction"),
        }
    }
}
impl ::std::str::FromStr for PatchGuardResultGuard {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "schema" => Ok(Self::Schema),
            "path_scope" => Ok(Self::PathScope),
            "REDACTED_scan" => Ok(Self::SecretScan),
            "diff_size" => Ok(Self::DiffSize),
            "semantic_parse" => Ok(Self::SemanticParse),
            "manifest_lock_coherence" => Ok(Self::ManifestLockCoherence),
            "generated_file" => Ok(Self::GeneratedFile),
            "policy" => Ok(Self::Policy),
            "operation_traceability" => Ok(Self::OperationTraceability),
            "static_contradiction" => Ok(Self::StaticContradiction),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for PatchGuardResultGuard {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for PatchGuardResultGuard {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PatchGuardResultGuard {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`PatchGuardResultState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "REDACTEDed",
///    "failed",
///    "inconclusive",
///    "unsupported"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum PatchGuardResultState {
    #[serde(rename = "REDACTEDed")]
    Passed,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "inconclusive")]
    Inconclusive,
    #[serde(rename = "unsupported")]
    Unsupported,
}
impl ::std::fmt::Display for PatchGuardResultState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Passed => f.write_str("REDACTEDed"),
            Self::Failed => f.write_str("failed"),
            Self::Inconclusive => f.write_str("inconclusive"),
            Self::Unsupported => f.write_str("unsupported"),
        }
    }
}
impl ::std::str::FromStr for PatchGuardResultState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "REDACTEDed" => Ok(Self::Passed),
            "failed" => Ok(Self::Failed),
            "inconclusive" => Ok(Self::Inconclusive),
            "unsupported" => Ok(Self::Unsupported),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for PatchGuardResultState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for PatchGuardResultState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PatchGuardResultState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`PolicyBudgets`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "maxAttempts",
///    "maxCandidates",
///    "maxConcurrentJobs",
///    "maxElapsedSeconds",
///    "maxEstimatedCostMicrousd"
///  ],
///  "properties": {
///    "maxAttempts": {
///      "type": "integer",
///      "maximum": 100.0,
///      "minimum": 1.0
///    },
///    "maxCandidates": {
///      "type": "integer",
///      "maximum": 1000.0,
///      "minimum": 1.0
///    },
///    "maxConcurrentJobs": {
///      "type": "integer",
///      "maximum": 1000.0,
///      "minimum": 1.0
///    },
///    "maxElapsedSeconds": {
///      "type": "integer",
///      "maximum": 604800.0,
///      "minimum": 1.0
///    },
///    "maxEstimatedCostMicrousd": {
///      "$ref": "#/$defs/DecimalCounter"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct PolicyBudgets {
    #[serde(rename = "maxAttempts")]
    pub max_attempts: ::std::num::NonZeroU64,
    #[serde(rename = "maxCandidates")]
    pub max_candidates: ::std::num::NonZeroU64,
    #[serde(rename = "maxConcurrentJobs")]
    pub max_concurrent_jobs: ::std::num::NonZeroU64,
    #[serde(rename = "maxElapsedSeconds")]
    pub max_elapsed_seconds: ::std::num::NonZeroU64,
    #[serde(rename = "maxEstimatedCostMicrousd")]
    pub max_estimated_cost_microusd: DecimalCounter,
}
///`PolicyConstraint`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "constraintId",
///    "failureCode",
///    "kind",
///    "operand",
///    "operator",
///    "subject"
///  ],
///  "properties": {
///    "constraintId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "failureCode": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "kind": {
///      "type": "string",
///      "enum": [
///        "required_target",
///        "allowed_manager",
///        "allowed_package",
///        "denied_package",
///        "maximum_dependency_count",
///        "required_test",
///        "required_lockfile",
///        "network_policy",
///        "resource_budget",
///        "path_scope",
///        "REDACTED_policy",
///        "custom"
///      ]
///    },
///    "operand": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "operator": {
///      "type": "string",
///      "enum": [
///        "equals",
///        "not_equals",
///        "contains",
///        "not_contains",
///        "less_than_or_equal",
///        "greater_than_or_equal",
///        "matches"
///      ]
///    },
///    "subject": {
///      "$ref": "#/$defs/ShortString"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct PolicyConstraint {
    #[serde(rename = "constraintId")]
    pub constraint_id: EntityId,
    #[serde(rename = "failureCode")]
    pub failure_code: ShortString,
    pub kind: PolicyConstraintKind,
    pub operand: BoundedString,
    pub operator: PolicyConstraintOperator,
    pub subject: ShortString,
}
///`PolicyConstraintKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "required_target",
///    "allowed_manager",
///    "allowed_package",
///    "denied_package",
///    "maximum_dependency_count",
///    "required_test",
///    "required_lockfile",
///    "network_policy",
///    "resource_budget",
///    "path_scope",
///    "REDACTED_policy",
///    "custom"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum PolicyConstraintKind {
    #[serde(rename = "required_target")]
    RequiredTarget,
    #[serde(rename = "allowed_manager")]
    AllowedManager,
    #[serde(rename = "allowed_package")]
    AllowedPackage,
    #[serde(rename = "denied_package")]
    DeniedPackage,
    #[serde(rename = "maximum_dependency_count")]
    MaximumDependencyCount,
    #[serde(rename = "required_test")]
    RequiredTest,
    #[serde(rename = "required_lockfile")]
    RequiredLockfile,
    #[serde(rename = "network_policy")]
    NetworkPolicy,
    #[serde(rename = "resource_budget")]
    ResourceBudget,
    #[serde(rename = "path_scope")]
    PathScope,
    #[serde(rename = "REDACTED_policy")]
    SecretPolicy,
    #[serde(rename = "custom")]
    Custom,
}
impl ::std::fmt::Display for PolicyConstraintKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::RequiredTarget => f.write_str("required_target"),
            Self::AllowedManager => f.write_str("allowed_manager"),
            Self::AllowedPackage => f.write_str("allowed_package"),
            Self::DeniedPackage => f.write_str("denied_package"),
            Self::MaximumDependencyCount => f.write_str("maximum_dependency_count"),
            Self::RequiredTest => f.write_str("required_test"),
            Self::RequiredLockfile => f.write_str("required_lockfile"),
            Self::NetworkPolicy => f.write_str("network_policy"),
            Self::ResourceBudget => f.write_str("resource_budget"),
            Self::PathScope => f.write_str("path_scope"),
            Self::SecretPolicy => f.write_str("REDACTED_policy"),
            Self::Custom => f.write_str("custom"),
        }
    }
}
impl ::std::str::FromStr for PolicyConstraintKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "required_target" => Ok(Self::RequiredTarget),
            "allowed_manager" => Ok(Self::AllowedManager),
            "allowed_package" => Ok(Self::AllowedPackage),
            "denied_package" => Ok(Self::DeniedPackage),
            "maximum_dependency_count" => Ok(Self::MaximumDependencyCount),
            "required_test" => Ok(Self::RequiredTest),
            "required_lockfile" => Ok(Self::RequiredLockfile),
            "network_policy" => Ok(Self::NetworkPolicy),
            "resource_budget" => Ok(Self::ResourceBudget),
            "path_scope" => Ok(Self::PathScope),
            "REDACTED_policy" => Ok(Self::SecretPolicy),
            "custom" => Ok(Self::Custom),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for PolicyConstraintKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for PolicyConstraintKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PolicyConstraintKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`PolicyConstraintOperator`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "equals",
///    "not_equals",
///    "contains",
///    "not_contains",
///    "less_than_or_equal",
///    "greater_than_or_equal",
///    "matches"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum PolicyConstraintOperator {
    #[serde(rename = "equals")]
    Equals,
    #[serde(rename = "not_equals")]
    NotEquals,
    #[serde(rename = "contains")]
    Contains,
    #[serde(rename = "not_contains")]
    NotContains,
    #[serde(rename = "less_than_or_equal")]
    LessThanOrEqual,
    #[serde(rename = "greater_than_or_equal")]
    GreaterThanOrEqual,
    #[serde(rename = "matches")]
    Matches,
}
impl ::std::fmt::Display for PolicyConstraintOperator {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Equals => f.write_str("equals"),
            Self::NotEquals => f.write_str("not_equals"),
            Self::Contains => f.write_str("contains"),
            Self::NotContains => f.write_str("not_contains"),
            Self::LessThanOrEqual => f.write_str("less_than_or_equal"),
            Self::GreaterThanOrEqual => f.write_str("greater_than_or_equal"),
            Self::Matches => f.write_str("matches"),
        }
    }
}
impl ::std::str::FromStr for PolicyConstraintOperator {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "equals" => Ok(Self::Equals),
            "not_equals" => Ok(Self::NotEquals),
            "contains" => Ok(Self::Contains),
            "not_contains" => Ok(Self::NotContains),
            "less_than_or_equal" => Ok(Self::LessThanOrEqual),
            "greater_than_or_equal" => Ok(Self::GreaterThanOrEqual),
            "matches" => Ok(Self::Matches),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for PolicyConstraintOperator {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for PolicyConstraintOperator {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PolicyConstraintOperator {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`PolicyObjective`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "direction",
///    "kind",
///    "measurement",
///    "objectiveId",
///    "REDACTEDSupplied",
///    "weight"
///  ],
///  "properties": {
///    "direction": {
///      "type": "string",
///      "enum": [
///        "minimize",
///        "maximize"
///      ]
///    },
///    "kind": {
///      "type": "string",
///      "enum": [
///        "validation_REDACTED_rate",
///        "dependency_count",
///        "install_duration",
///        "build_duration",
///        "test_duration",
///        "artifact_size",
///        "security_risk",
///        "version_freshness",
///        "custom"
///      ]
///    },
///    "measurement": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "objectiveId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "REDACTEDSupplied": {
///      "type": "boolean"
///    },
///    "weight": {
///      "type": "integer",
///      "maximum": 1000.0,
///      "minimum": 1.0
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct PolicyObjective {
    pub direction: PolicyObjectiveDirection,
    pub kind: PolicyObjectiveKind,
    pub measurement: ShortString,
    #[serde(rename = "objectiveId")]
    pub objective_id: EntityId,
    #[serde(rename = "REDACTEDSupplied")]
    pub REDACTED_supplied: bool,
    pub weight: ::std::num::NonZeroU64,
}
///`PolicyObjectiveDirection`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "minimize",
///    "maximize"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum PolicyObjectiveDirection {
    #[serde(rename = "minimize")]
    Minimize,
    #[serde(rename = "maximize")]
    Maximize,
}
impl ::std::fmt::Display for PolicyObjectiveDirection {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Minimize => f.write_str("minimize"),
            Self::Maximize => f.write_str("maximize"),
        }
    }
}
impl ::std::str::FromStr for PolicyObjectiveDirection {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "minimize" => Ok(Self::Minimize),
            "maximize" => Ok(Self::Maximize),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for PolicyObjectiveDirection {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for PolicyObjectiveDirection {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PolicyObjectiveDirection {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`PolicyObjectiveKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "validation_REDACTED_rate",
///    "dependency_count",
///    "install_duration",
///    "build_duration",
///    "test_duration",
///    "artifact_size",
///    "security_risk",
///    "version_freshness",
///    "custom"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum PolicyObjectiveKind {
    #[serde(rename = "validation_REDACTED_rate")]
    ValidationPassRate,
    #[serde(rename = "dependency_count")]
    DependencyCount,
    #[serde(rename = "install_duration")]
    InstallDuration,
    #[serde(rename = "build_duration")]
    BuildDuration,
    #[serde(rename = "test_duration")]
    TestDuration,
    #[serde(rename = "artifact_size")]
    ArtifactSize,
    #[serde(rename = "security_risk")]
    SecurityRisk,
    #[serde(rename = "version_freshness")]
    VersionFreshness,
    #[serde(rename = "custom")]
    Custom,
}
impl ::std::fmt::Display for PolicyObjectiveKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ValidationPassRate => f.write_str("validation_REDACTED_rate"),
            Self::DependencyCount => f.write_str("dependency_count"),
            Self::InstallDuration => f.write_str("install_duration"),
            Self::BuildDuration => f.write_str("build_duration"),
            Self::TestDuration => f.write_str("test_duration"),
            Self::ArtifactSize => f.write_str("artifact_size"),
            Self::SecurityRisk => f.write_str("security_risk"),
            Self::VersionFreshness => f.write_str("version_freshness"),
            Self::Custom => f.write_str("custom"),
        }
    }
}
impl ::std::str::FromStr for PolicyObjectiveKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "validation_REDACTED_rate" => Ok(Self::ValidationPassRate),
            "dependency_count" => Ok(Self::DependencyCount),
            "install_duration" => Ok(Self::InstallDuration),
            "build_duration" => Ok(Self::BuildDuration),
            "test_duration" => Ok(Self::TestDuration),
            "artifact_size" => Ok(Self::ArtifactSize),
            "security_risk" => Ok(Self::SecurityRisk),
            "version_freshness" => Ok(Self::VersionFreshness),
            "custom" => Ok(Self::Custom),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for PolicyObjectiveKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for PolicyObjectiveKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for PolicyObjectiveKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ProbeProposal`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "arguments",
///    "executable",
///    "expectedExitStatuses",
///    "phase",
///    "probeId",
///    "rationale",
///    "timeoutSeconds",
///    "workingDirectory"
///  ],
///  "properties": {
///    "arguments": {
///      "type": "array",
///      "items": {
///        "type": "string",
///        "maxLength": 4096
///      },
///      "maxItems": 256
///    },
///    "executable": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "expectedExitStatuses": {
///      "type": "array",
///      "items": {
///        "type": "integer",
///        "maximum": 2147483647.0,
///        "minimum": -2147483648.0
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "phase": {
///      "type": "string",
///      "enum": [
///        "preflight",
///        "resolve",
///        "install",
///        "build",
///        "test",
///        "smoke",
///        "benchmark"
///      ]
///    },
///    "probeId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "rationale": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "timeoutSeconds": {
///      "type": "integer",
///      "maximum": 86400.0,
///      "minimum": 1.0
///    },
///    "workingDirectory": {
///      "$ref": "#/$defs/RelativePath"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ProbeProposal {
    pub arguments: ::std::vec::Vec<ProbeProposalArgumentsItem>,
    pub executable: ShortString,
    #[serde(rename = "expectedExitStatuses")]
    pub expected_exit_statuses: ::std::vec::Vec<i32>,
    pub phase: ProbeProposalPhase,
    #[serde(rename = "probeId")]
    pub probe_id: EntityId,
    pub rationale: BoundedString,
    #[serde(rename = "timeoutSeconds")]
    pub timeout_seconds: ::std::num::NonZeroU64,
    #[serde(rename = "workingDirectory")]
    pub working_directory: RelativePath,
}
///`ProbeProposalArgumentsItem`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 4096
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct ProbeProposalArgumentsItem(::std::string::String);
impl ::std::ops::Deref for ProbeProposalArgumentsItem {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<ProbeProposalArgumentsItem> for ::std::string::String {
    fn from(value: ProbeProposalArgumentsItem) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for ProbeProposalArgumentsItem {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 4096usize {
            return Err("longer than 4096 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for ProbeProposalArgumentsItem {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ProbeProposalArgumentsItem {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ProbeProposalArgumentsItem {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for ProbeProposalArgumentsItem {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`ProbeProposalPhase`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "preflight",
///    "resolve",
///    "install",
///    "build",
///    "test",
///    "smoke",
///    "benchmark"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ProbeProposalPhase {
    #[serde(rename = "preflight")]
    Preflight,
    #[serde(rename = "resolve")]
    Resolve,
    #[serde(rename = "install")]
    Install,
    #[serde(rename = "build")]
    Build,
    #[serde(rename = "test")]
    Test,
    #[serde(rename = "smoke")]
    Smoke,
    #[serde(rename = "benchmark")]
    Benchmark,
}
impl ::std::fmt::Display for ProbeProposalPhase {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Preflight => f.write_str("preflight"),
            Self::Resolve => f.write_str("resolve"),
            Self::Install => f.write_str("install"),
            Self::Build => f.write_str("build"),
            Self::Test => f.write_str("test"),
            Self::Smoke => f.write_str("smoke"),
            Self::Benchmark => f.write_str("benchmark"),
        }
    }
}
impl ::std::str::FromStr for ProbeProposalPhase {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "preflight" => Ok(Self::Preflight),
            "resolve" => Ok(Self::Resolve),
            "install" => Ok(Self::Install),
            "build" => Ok(Self::Build),
            "test" => Ok(Self::Test),
            "smoke" => Ok(Self::Smoke),
            "benchmark" => Ok(Self::Benchmark),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ProbeProposalPhase {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ProbeProposalPhase {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ProbeProposalPhase {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Project`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "createdAt",
///    "defaultBranch",
///    "kind",
///    "projectGoal",
///    "projectId",
///    "repositoryFullName",
///    "repositoryId",
///    "schemaVersion",
///    "workspaceId"
///  ],
///  "properties": {
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "defaultBranch": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "kind": {
///      "enum": [
///        "project"
///      ]
///    },
///    "projectGoal": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "repositoryFullName": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "repositoryId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Project {
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "defaultBranch")]
    pub default_branch: ShortString,
    pub kind: ProjectKind,
    #[serde(rename = "projectGoal")]
    pub project_goal: BoundedString,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "repositoryFullName")]
    pub repository_full_name: ShortString,
    #[serde(rename = "repositoryId")]
    pub repository_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ProjectBindCommand`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "projectId",
///    "repositoryPath",
///    "type"
///  ],
///  "properties": {
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "repositoryPath": {
///      "type": "string",
///      "maxLength": 4096,
///      "minLength": 1
///    },
///    "type": {
///      "enum": [
///        "project.bind"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ProjectBindCommand {
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "repositoryPath")]
    pub repository_path: ProjectBindCommandRepositoryPath,
    #[serde(rename = "type")]
    pub type_: ProjectBindCommandType,
}
///`ProjectBindCommandRepositoryPath`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 4096,
///  "minLength": 1
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct ProjectBindCommandRepositoryPath(::std::string::String);
impl ::std::ops::Deref for ProjectBindCommandRepositoryPath {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<ProjectBindCommandRepositoryPath> for ::std::string::String {
    fn from(value: ProjectBindCommandRepositoryPath) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for ProjectBindCommandRepositoryPath {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 4096usize {
            return Err("longer than 4096 characters".into());
        }
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for ProjectBindCommandRepositoryPath {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ProjectBindCommandRepositoryPath {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ProjectBindCommandRepositoryPath {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for ProjectBindCommandRepositoryPath {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`ProjectBindCommandType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "project.bind"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ProjectBindCommandType {
    #[serde(rename = "project.bind")]
    ProjectBind,
}
impl ::std::fmt::Display for ProjectBindCommandType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ProjectBind => f.write_str("project.bind"),
        }
    }
}
impl ::std::str::FromStr for ProjectBindCommandType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "project.bind" => Ok(Self::ProjectBind),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ProjectBindCommandType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ProjectBindCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ProjectBindCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ProjectKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "project"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ProjectKind {
    #[serde(rename = "project")]
    Project,
}
impl ::std::fmt::Display for ProjectKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Project => f.write_str("project"),
        }
    }
}
impl ::std::str::FromStr for ProjectKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "project" => Ok(Self::Project),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ProjectKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ProjectKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ProjectKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///Discriminated union of every independently stored or transmitted v1 payload.
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "$id": "https://schemas.environment-REDACTED.dev/v1/protocol.schema.json",
///  "title": "ProtocolDocumentV1",
///  "description": "Discriminated union of every independently stored or transmitted v1 payload.",
///  "oneOf": [
///    {
///      "$ref": "#/$defs/Workspace"
///    },
///    {
///      "$ref": "#/$defs/Project"
///    },
///    {
///      "$ref": "#/$defs/Device"
///    },
///    {
///      "$ref": "#/$defs/Realm"
///    },
///    {
///      "$ref": "#/$defs/Layer"
///    },
///    {
///      "$ref": "#/$defs/ProviderCapabilityProfile"
///    },
///    {
///      "$ref": "#/$defs/Session"
///    },
///    {
///      "$ref": "#/$defs/ObservationEvent"
///    },
///    {
///      "$ref": "#/$defs/ActionEnvelope"
///    },
///    {
///      "$ref": "#/$defs/CaptureGap"
///    },
///    {
///      "$ref": "#/$defs/Snapshot"
///    },
///    {
///      "$ref": "#/$defs/SourceInput"
///    },
///    {
///      "$ref": "#/$defs/WorkingTreeBundle"
///    },
///    {
///      "$ref": "#/$defs/SubmoduleIdentity"
///    },
///    {
///      "$ref": "#/$defs/LfsIdentity"
///    },
///    {
///      "$ref": "#/$defs/ObjectMetadata"
///    },
///    {
///      "$ref": "#/$defs/DeclaredGraph"
///    },
///    {
///      "$ref": "#/$defs/LockedGraph"
///    },
///    {
///      "$ref": "#/$defs/ResolvedGraph"
///    },
///    {
///      "$ref": "#/$defs/InstalledGraph"
///    },
///    {
///      "$ref": "#/$defs/UsedGraph"
///    },
///    {
///      "$ref": "#/$defs/ObservedActionGraph"
///    },
///    {
///      "$ref": "#/$defs/ValidatedGraph"
///    },
///    {
///      "$ref": "#/$defs/Finding"
///    },
///    {
///      "$ref": "#/$defs/EvidenceReference"
///    },
///    {
///      "$ref": "#/$defs/BehaviorContract"
///    },
///    {
///      "$ref": "#/$defs/OptimalityPolicy"
///    },
///    {
///      "$ref": "#/$defs/CandidatePlan"
///    },
///    {
///      "$ref": "#/$defs/CandidatePatch"
///    },
///    {
///      "$ref": "#/$defs/CandidateLifecycle"
///    },
///    {
///      "$ref": "#/$defs/ValidationTarget"
///    },
///    {
///      "$ref": "#/$defs/ValidationBatch"
///    },
///    {
///      "$ref": "#/$defs/ValidationJob"
///    },
///    {
///      "$ref": "#/$defs/ValidationPhase"
///    },
///    {
///      "$ref": "#/$defs/ValidationOutcome"
///    },
///    {
///      "$ref": "#/$defs/ValidationAttestation"
///    },
///    {
///      "$ref": "#/$defs/ValidationJobKey"
///    },
///    {
///      "$ref": "#/$defs/ValidationCacheEntry"
///    },
///    {
///      "$ref": "#/$defs/ConcurrencyLease"
///    },
///    {
///      "$ref": "#/$defs/ExternalOperation"
///    },
///    {
///      "$ref": "#/$defs/SecretReference"
///    },
///    {
///      "$ref": "#/$defs/SecretBinding"
///    },
///    {
///      "$ref": "#/$defs/BraintrustOutboxRecord"
///    },
///    {
///      "$ref": "#/$defs/Recommendation"
///    },
///    {
///      "$ref": "#/$defs/Approval"
///    },
///    {
///      "$ref": "#/$defs/AuditEvent"
///    },
///    {
///      "$ref": "#/$defs/CompanionStatus"
///    },
///    {
///      "$ref": "#/$defs/CompanionRequest"
///    },
///    {
///      "$ref": "#/$defs/CompanionResponse"
///    },
///    {
///      "$ref": "#/$defs/CompanionNotification"
///    },
///    {
///      "$ref": "#/$defs/DeviceEnrollmentRequest"
///    },
///    {
///      "$ref": "#/$defs/DeviceEnrollmentResponse"
///    },
///    {
///      "$ref": "#/$defs/ObservationEventBatchRequest"
///    },
///    {
///      "$ref": "#/$defs/IngestAcceptedResponse"
///    },
///    {
///      "$ref": "#/$defs/SnapshotIngestRequest"
///    },
///    {
///      "$ref": "#/$defs/CapabilityProfilePublishRequest"
///    },
///    {
///      "$ref": "#/$defs/ChainAnchorPublishRequest"
///    },
///    {
///      "$ref": "#/$defs/CheckpointCreateRequest"
///    },
///    {
///      "$ref": "#/$defs/CheckpointCreateResponse"
///    },
///    {
///      "$ref": "#/$defs/ObjectUploadAuthorizationRequest"
///    },
///    {
///      "$ref": "#/$defs/EphemeralObjectAuthorization"
///    },
///    {
///      "$ref": "#/$defs/ObjectFinalizeRequest"
///    },
///    {
///      "$ref": "#/$defs/ObjectKeyExchangeRequest"
///    },
///    {
///      "$ref": "#/$defs/ObjectKeyExchangeResponse"
///    },
///    {
///      "$ref": "#/$defs/ReconcileQueueMessage"
///    },
///    {
///      "$ref": "#/$defs/ApiErrorResponse"
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum ProtocolDocumentV1 {
    Workspace(Workspace),
    Project(Project),
    Device(Device),
    Realm(Realm),
    Layer(Layer),
    ProviderCapabilityProfile(ProviderCapabilityProfile),
    Session(Session),
    ObservationEvent(ObservationEvent),
    ActionEnvelope(ActionEnvelope),
    CaptureGap(CaptureGap),
    Snapshot(Snapshot),
    SourceInput(SourceInput),
    WorkingTreeBundle(WorkingTreeBundle),
    SubmoduleIdentity(SubmoduleIdentity),
    LfsIdentity(LfsIdentity),
    ObjectMetadata(ObjectMetadata),
    DeclaredGraph(DeclaredGraph),
    LockedGraph(LockedGraph),
    ResolvedGraph(ResolvedGraph),
    InstalledGraph(InstalledGraph),
    UsedGraph(UsedGraph),
    ObservedActionGraph(ObservedActionGraph),
    ValidatedGraph(ValidatedGraph),
    Finding(Finding),
    EvidenceReference(EvidenceReference),
    BehaviorContract(BehaviorContract),
    OptimalityPolicy(OptimalityPolicy),
    CandidatePlan(CandidatePlan),
    CandidatePatch(CandidatePatch),
    CandidateLifecycle(CandidateLifecycle),
    ValidationTarget(ValidationTarget),
    ValidationBatch(ValidationBatch),
    ValidationJob(ValidationJob),
    ValidationPhase(ValidationPhase),
    ValidationOutcome(ValidationOutcome),
    ValidationAttestation(ValidationAttestation),
    ValidationJobKey(ValidationJobKey),
    ValidationCacheEntry(ValidationCacheEntry),
    ConcurrencyLease(ConcurrencyLease),
    ExternalOperation(ExternalOperation),
    SecretReference(SecretReference),
    SecretBinding(SecretBinding),
    BraintrustOutboxRecord(BraintrustOutboxRecord),
    Recommendation(Recommendation),
    Approval(Approval),
    AuditEvent(AuditEvent),
    CompanionStatus(CompanionStatus),
    CompanionRequest(CompanionRequest),
    CompanionResponse(CompanionResponse),
    CompanionNotification(CompanionNotification),
    DeviceEnrollmentRequest(DeviceEnrollmentRequest),
    DeviceEnrollmentResponse(DeviceEnrollmentResponse),
    ObservationEventBatchRequest(ObservationEventBatchRequest),
    IngestAcceptedResponse(IngestAcceptedResponse),
    SnapshotIngestRequest(SnapshotIngestRequest),
    CapabilityProfilePublishRequest(CapabilityProfilePublishRequest),
    ChainAnchorPublishRequest(ChainAnchorPublishRequest),
    CheckpointCreateRequest(CheckpointCreateRequest),
    CheckpointCreateResponse(CheckpointCreateResponse),
    ObjectUploadAuthorizationRequest(ObjectUploadAuthorizationRequest),
    EphemeralObjectAuthorization(EphemeralObjectAuthorization),
    ObjectFinalizeRequest(ObjectFinalizeRequest),
    ObjectKeyExchangeRequest(ObjectKeyExchangeRequest),
    ObjectKeyExchangeResponse(ObjectKeyExchangeResponse),
    ReconcileQueueMessage(ReconcileQueueMessage),
    ApiErrorResponse(ApiErrorResponse),
}
impl ::std::convert::From<Workspace> for ProtocolDocumentV1 {
    fn from(value: Workspace) -> Self {
        Self::Workspace(value)
    }
}
impl ::std::convert::From<Project> for ProtocolDocumentV1 {
    fn from(value: Project) -> Self {
        Self::Project(value)
    }
}
impl ::std::convert::From<Device> for ProtocolDocumentV1 {
    fn from(value: Device) -> Self {
        Self::Device(value)
    }
}
impl ::std::convert::From<Realm> for ProtocolDocumentV1 {
    fn from(value: Realm) -> Self {
        Self::Realm(value)
    }
}
impl ::std::convert::From<Layer> for ProtocolDocumentV1 {
    fn from(value: Layer) -> Self {
        Self::Layer(value)
    }
}
impl ::std::convert::From<ProviderCapabilityProfile> for ProtocolDocumentV1 {
    fn from(value: ProviderCapabilityProfile) -> Self {
        Self::ProviderCapabilityProfile(value)
    }
}
impl ::std::convert::From<Session> for ProtocolDocumentV1 {
    fn from(value: Session) -> Self {
        Self::Session(value)
    }
}
impl ::std::convert::From<ObservationEvent> for ProtocolDocumentV1 {
    fn from(value: ObservationEvent) -> Self {
        Self::ObservationEvent(value)
    }
}
impl ::std::convert::From<ActionEnvelope> for ProtocolDocumentV1 {
    fn from(value: ActionEnvelope) -> Self {
        Self::ActionEnvelope(value)
    }
}
impl ::std::convert::From<CaptureGap> for ProtocolDocumentV1 {
    fn from(value: CaptureGap) -> Self {
        Self::CaptureGap(value)
    }
}
impl ::std::convert::From<Snapshot> for ProtocolDocumentV1 {
    fn from(value: Snapshot) -> Self {
        Self::Snapshot(value)
    }
}
impl ::std::convert::From<SourceInput> for ProtocolDocumentV1 {
    fn from(value: SourceInput) -> Self {
        Self::SourceInput(value)
    }
}
impl ::std::convert::From<WorkingTreeBundle> for ProtocolDocumentV1 {
    fn from(value: WorkingTreeBundle) -> Self {
        Self::WorkingTreeBundle(value)
    }
}
impl ::std::convert::From<SubmoduleIdentity> for ProtocolDocumentV1 {
    fn from(value: SubmoduleIdentity) -> Self {
        Self::SubmoduleIdentity(value)
    }
}
impl ::std::convert::From<LfsIdentity> for ProtocolDocumentV1 {
    fn from(value: LfsIdentity) -> Self {
        Self::LfsIdentity(value)
    }
}
impl ::std::convert::From<ObjectMetadata> for ProtocolDocumentV1 {
    fn from(value: ObjectMetadata) -> Self {
        Self::ObjectMetadata(value)
    }
}
impl ::std::convert::From<DeclaredGraph> for ProtocolDocumentV1 {
    fn from(value: DeclaredGraph) -> Self {
        Self::DeclaredGraph(value)
    }
}
impl ::std::convert::From<LockedGraph> for ProtocolDocumentV1 {
    fn from(value: LockedGraph) -> Self {
        Self::LockedGraph(value)
    }
}
impl ::std::convert::From<ResolvedGraph> for ProtocolDocumentV1 {
    fn from(value: ResolvedGraph) -> Self {
        Self::ResolvedGraph(value)
    }
}
impl ::std::convert::From<InstalledGraph> for ProtocolDocumentV1 {
    fn from(value: InstalledGraph) -> Self {
        Self::InstalledGraph(value)
    }
}
impl ::std::convert::From<UsedGraph> for ProtocolDocumentV1 {
    fn from(value: UsedGraph) -> Self {
        Self::UsedGraph(value)
    }
}
impl ::std::convert::From<ObservedActionGraph> for ProtocolDocumentV1 {
    fn from(value: ObservedActionGraph) -> Self {
        Self::ObservedActionGraph(value)
    }
}
impl ::std::convert::From<ValidatedGraph> for ProtocolDocumentV1 {
    fn from(value: ValidatedGraph) -> Self {
        Self::ValidatedGraph(value)
    }
}
impl ::std::convert::From<Finding> for ProtocolDocumentV1 {
    fn from(value: Finding) -> Self {
        Self::Finding(value)
    }
}
impl ::std::convert::From<EvidenceReference> for ProtocolDocumentV1 {
    fn from(value: EvidenceReference) -> Self {
        Self::EvidenceReference(value)
    }
}
impl ::std::convert::From<BehaviorContract> for ProtocolDocumentV1 {
    fn from(value: BehaviorContract) -> Self {
        Self::BehaviorContract(value)
    }
}
impl ::std::convert::From<OptimalityPolicy> for ProtocolDocumentV1 {
    fn from(value: OptimalityPolicy) -> Self {
        Self::OptimalityPolicy(value)
    }
}
impl ::std::convert::From<CandidatePlan> for ProtocolDocumentV1 {
    fn from(value: CandidatePlan) -> Self {
        Self::CandidatePlan(value)
    }
}
impl ::std::convert::From<CandidatePatch> for ProtocolDocumentV1 {
    fn from(value: CandidatePatch) -> Self {
        Self::CandidatePatch(value)
    }
}
impl ::std::convert::From<CandidateLifecycle> for ProtocolDocumentV1 {
    fn from(value: CandidateLifecycle) -> Self {
        Self::CandidateLifecycle(value)
    }
}
impl ::std::convert::From<ValidationTarget> for ProtocolDocumentV1 {
    fn from(value: ValidationTarget) -> Self {
        Self::ValidationTarget(value)
    }
}
impl ::std::convert::From<ValidationBatch> for ProtocolDocumentV1 {
    fn from(value: ValidationBatch) -> Self {
        Self::ValidationBatch(value)
    }
}
impl ::std::convert::From<ValidationJob> for ProtocolDocumentV1 {
    fn from(value: ValidationJob) -> Self {
        Self::ValidationJob(value)
    }
}
impl ::std::convert::From<ValidationPhase> for ProtocolDocumentV1 {
    fn from(value: ValidationPhase) -> Self {
        Self::ValidationPhase(value)
    }
}
impl ::std::convert::From<ValidationOutcome> for ProtocolDocumentV1 {
    fn from(value: ValidationOutcome) -> Self {
        Self::ValidationOutcome(value)
    }
}
impl ::std::convert::From<ValidationAttestation> for ProtocolDocumentV1 {
    fn from(value: ValidationAttestation) -> Self {
        Self::ValidationAttestation(value)
    }
}
impl ::std::convert::From<ValidationJobKey> for ProtocolDocumentV1 {
    fn from(value: ValidationJobKey) -> Self {
        Self::ValidationJobKey(value)
    }
}
impl ::std::convert::From<ValidationCacheEntry> for ProtocolDocumentV1 {
    fn from(value: ValidationCacheEntry) -> Self {
        Self::ValidationCacheEntry(value)
    }
}
impl ::std::convert::From<ConcurrencyLease> for ProtocolDocumentV1 {
    fn from(value: ConcurrencyLease) -> Self {
        Self::ConcurrencyLease(value)
    }
}
impl ::std::convert::From<ExternalOperation> for ProtocolDocumentV1 {
    fn from(value: ExternalOperation) -> Self {
        Self::ExternalOperation(value)
    }
}
impl ::std::convert::From<SecretReference> for ProtocolDocumentV1 {
    fn from(value: SecretReference) -> Self {
        Self::SecretReference(value)
    }
}
impl ::std::convert::From<SecretBinding> for ProtocolDocumentV1 {
    fn from(value: SecretBinding) -> Self {
        Self::SecretBinding(value)
    }
}
impl ::std::convert::From<BraintrustOutboxRecord> for ProtocolDocumentV1 {
    fn from(value: BraintrustOutboxRecord) -> Self {
        Self::BraintrustOutboxRecord(value)
    }
}
impl ::std::convert::From<Recommendation> for ProtocolDocumentV1 {
    fn from(value: Recommendation) -> Self {
        Self::Recommendation(value)
    }
}
impl ::std::convert::From<Approval> for ProtocolDocumentV1 {
    fn from(value: Approval) -> Self {
        Self::Approval(value)
    }
}
impl ::std::convert::From<AuditEvent> for ProtocolDocumentV1 {
    fn from(value: AuditEvent) -> Self {
        Self::AuditEvent(value)
    }
}
impl ::std::convert::From<CompanionStatus> for ProtocolDocumentV1 {
    fn from(value: CompanionStatus) -> Self {
        Self::CompanionStatus(value)
    }
}
impl ::std::convert::From<CompanionRequest> for ProtocolDocumentV1 {
    fn from(value: CompanionRequest) -> Self {
        Self::CompanionRequest(value)
    }
}
impl ::std::convert::From<CompanionResponse> for ProtocolDocumentV1 {
    fn from(value: CompanionResponse) -> Self {
        Self::CompanionResponse(value)
    }
}
impl ::std::convert::From<CompanionNotification> for ProtocolDocumentV1 {
    fn from(value: CompanionNotification) -> Self {
        Self::CompanionNotification(value)
    }
}
impl ::std::convert::From<DeviceEnrollmentRequest> for ProtocolDocumentV1 {
    fn from(value: DeviceEnrollmentRequest) -> Self {
        Self::DeviceEnrollmentRequest(value)
    }
}
impl ::std::convert::From<DeviceEnrollmentResponse> for ProtocolDocumentV1 {
    fn from(value: DeviceEnrollmentResponse) -> Self {
        Self::DeviceEnrollmentResponse(value)
    }
}
impl ::std::convert::From<ObservationEventBatchRequest> for ProtocolDocumentV1 {
    fn from(value: ObservationEventBatchRequest) -> Self {
        Self::ObservationEventBatchRequest(value)
    }
}
impl ::std::convert::From<IngestAcceptedResponse> for ProtocolDocumentV1 {
    fn from(value: IngestAcceptedResponse) -> Self {
        Self::IngestAcceptedResponse(value)
    }
}
impl ::std::convert::From<SnapshotIngestRequest> for ProtocolDocumentV1 {
    fn from(value: SnapshotIngestRequest) -> Self {
        Self::SnapshotIngestRequest(value)
    }
}
impl ::std::convert::From<CapabilityProfilePublishRequest> for ProtocolDocumentV1 {
    fn from(value: CapabilityProfilePublishRequest) -> Self {
        Self::CapabilityProfilePublishRequest(value)
    }
}
impl ::std::convert::From<ChainAnchorPublishRequest> for ProtocolDocumentV1 {
    fn from(value: ChainAnchorPublishRequest) -> Self {
        Self::ChainAnchorPublishRequest(value)
    }
}
impl ::std::convert::From<CheckpointCreateRequest> for ProtocolDocumentV1 {
    fn from(value: CheckpointCreateRequest) -> Self {
        Self::CheckpointCreateRequest(value)
    }
}
impl ::std::convert::From<CheckpointCreateResponse> for ProtocolDocumentV1 {
    fn from(value: CheckpointCreateResponse) -> Self {
        Self::CheckpointCreateResponse(value)
    }
}
impl ::std::convert::From<ObjectUploadAuthorizationRequest> for ProtocolDocumentV1 {
    fn from(value: ObjectUploadAuthorizationRequest) -> Self {
        Self::ObjectUploadAuthorizationRequest(value)
    }
}
impl ::std::convert::From<EphemeralObjectAuthorization> for ProtocolDocumentV1 {
    fn from(value: EphemeralObjectAuthorization) -> Self {
        Self::EphemeralObjectAuthorization(value)
    }
}
impl ::std::convert::From<ObjectFinalizeRequest> for ProtocolDocumentV1 {
    fn from(value: ObjectFinalizeRequest) -> Self {
        Self::ObjectFinalizeRequest(value)
    }
}
impl ::std::convert::From<ObjectKeyExchangeRequest> for ProtocolDocumentV1 {
    fn from(value: ObjectKeyExchangeRequest) -> Self {
        Self::ObjectKeyExchangeRequest(value)
    }
}
impl ::std::convert::From<ObjectKeyExchangeResponse> for ProtocolDocumentV1 {
    fn from(value: ObjectKeyExchangeResponse) -> Self {
        Self::ObjectKeyExchangeResponse(value)
    }
}
impl ::std::convert::From<ReconcileQueueMessage> for ProtocolDocumentV1 {
    fn from(value: ReconcileQueueMessage) -> Self {
        Self::ReconcileQueueMessage(value)
    }
}
impl ::std::convert::From<ApiErrorResponse> for ProtocolDocumentV1 {
    fn from(value: ApiErrorResponse) -> Self {
        Self::ApiErrorResponse(value)
    }
}
///`ProtocolError`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "code",
///    "issues",
///    "message",
///    "retryable"
///  ],
///  "properties": {
///    "code": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "issues": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/FieldIssue"
///      },
///      "maxItems": 256
///    },
///    "message": {
///      "type": "string",
///      "maxLength": 1024,
///      "minLength": 1
///    },
///    "retryable": {
///      "type": "boolean"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ProtocolError {
    pub code: ShortString,
    pub issues: ::std::vec::Vec<FieldIssue>,
    pub message: ProtocolErrorMessage,
    pub retryable: bool,
}
///`ProtocolErrorMessage`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 1024,
///  "minLength": 1
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct ProtocolErrorMessage(::std::string::String);
impl ::std::ops::Deref for ProtocolErrorMessage {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<ProtocolErrorMessage> for ::std::string::String {
    fn from(value: ProtocolErrorMessage) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for ProtocolErrorMessage {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 1024usize {
            return Err("longer than 1024 characters".into());
        }
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for ProtocolErrorMessage {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ProtocolErrorMessage {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ProtocolErrorMessage {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for ProtocolErrorMessage {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`ProviderCapabilities`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "commandResults",
///    "fileOperations",
///    "permissionDecisions",
///    "sessionLifecycle",
///    "shellCommands",
///    "sourceSequence",
///    "subagents",
///    "toolLifecycle"
///  ],
///  "properties": {
///    "commandResults": {
///      "$ref": "#/$defs/CapabilityState"
///    },
///    "fileOperations": {
///      "$ref": "#/$defs/CapabilityState"
///    },
///    "permissionDecisions": {
///      "$ref": "#/$defs/CapabilityState"
///    },
///    "sessionLifecycle": {
///      "$ref": "#/$defs/CapabilityState"
///    },
///    "shellCommands": {
///      "$ref": "#/$defs/CapabilityState"
///    },
///    "sourceSequence": {
///      "$ref": "#/$defs/CapabilityState"
///    },
///    "subagents": {
///      "$ref": "#/$defs/CapabilityState"
///    },
///    "toolLifecycle": {
///      "$ref": "#/$defs/CapabilityState"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ProviderCapabilities {
    #[serde(rename = "commandResults")]
    pub command_results: CapabilityState,
    #[serde(rename = "fileOperations")]
    pub file_operations: CapabilityState,
    #[serde(rename = "permissionDecisions")]
    pub permission_decisions: CapabilityState,
    #[serde(rename = "sessionLifecycle")]
    pub session_lifecycle: CapabilityState,
    #[serde(rename = "shellCommands")]
    pub shell_commands: CapabilityState,
    #[serde(rename = "sourceSequence")]
    pub source_sequence: CapabilityState,
    pub subagents: CapabilityState,
    #[serde(rename = "toolLifecycle")]
    pub tool_lifecycle: CapabilityState,
}
///`ProviderCapabilityProfile`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "adapterVersion",
///    "capabilities",
///    "capabilityReportId",
///    "deviceId",
///    "kind",
///    "knownGaps",
///    "observedAt",
///    "projectId",
///    "provider",
///    "providerVersion",
///    "realmId",
///    "schemaVersion",
///    "supportedEventTypes",
///    "surface",
///    "workspaceId"
///  ],
///  "properties": {
///    "adapterVersion": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "capabilities": {
///      "$ref": "#/$defs/ProviderCapabilities"
///    },
///    "capabilityReportId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "provider_capability_profile"
///      ]
///    },
///    "knownGaps": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/BoundedString"
///      },
///      "maxItems": 256
///    },
///    "observedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "provider": {
///      "$ref": "#/$defs/ProviderName"
///    },
///    "providerVersion": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "supportedEventTypes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256
///    },
///    "surface": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ProviderCapabilityProfile {
    #[serde(rename = "adapterVersion")]
    pub adapter_version: ShortString,
    pub capabilities: ProviderCapabilities,
    #[serde(rename = "capabilityReportId")]
    pub capability_report_id: EntityId,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    pub kind: ProviderCapabilityProfileKind,
    #[serde(rename = "knownGaps")]
    pub known_gaps: ::std::vec::Vec<BoundedString>,
    #[serde(rename = "observedAt")]
    pub observed_at: Rfc3339Timestamp,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    pub provider: ProviderName,
    #[serde(rename = "providerVersion")]
    pub provider_version: ShortString,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "supportedEventTypes")]
    pub supported_event_types: ::std::vec::Vec<ShortString>,
    pub surface: ShortString,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ProviderCapabilityProfileKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "provider_capability_profile"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ProviderCapabilityProfileKind {
    #[serde(rename = "provider_capability_profile")]
    ProviderCapabilityProfile,
}
impl ::std::fmt::Display for ProviderCapabilityProfileKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ProviderCapabilityProfile => f.write_str("provider_capability_profile"),
        }
    }
}
impl ::std::str::FromStr for ProviderCapabilityProfileKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "provider_capability_profile" => Ok(Self::ProviderCapabilityProfile),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ProviderCapabilityProfileKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ProviderCapabilityProfileKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ProviderCapabilityProfileKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ProviderName`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "codex",
///    "claude_code",
///    "cursor"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ProviderName {
    #[serde(rename = "codex")]
    Codex,
    #[serde(rename = "claude_code")]
    ClaudeCode,
    #[serde(rename = "cursor")]
    Cursor,
}
impl ::std::fmt::Display for ProviderName {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Codex => f.write_str("codex"),
            Self::ClaudeCode => f.write_str("claude_code"),
            Self::Cursor => f.write_str("cursor"),
        }
    }
}
impl ::std::str::FromStr for ProviderName {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "codex" => Ok(Self::Codex),
            "claude_code" => Ok(Self::ClaudeCode),
            "cursor" => Ok(Self::Cursor),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ProviderName {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ProviderName {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ProviderName {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Realm`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "architecture",
///    "coverage",
///    "deviceId",
///    "displayLabel",
///    "kind",
///    "platform",
///    "realmId",
///    "realmType",
///    "schemaVersion"
///  ],
///  "properties": {
///    "architecture": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "coverage": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "displayLabel": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "kind": {
///      "enum": [
///        "realm"
///      ]
///    },
///    "parentRealmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "platform": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "realmType": {
///      "type": "string",
///      "enum": [
///        "host",
///        "wsl",
///        "dev_container",
///        "remote_ssh",
///        "codespace",
///        "cloud_environment",
///        "validation_sandbox"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Realm {
    pub architecture: ShortString,
    pub coverage: Assessment,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    #[serde(rename = "displayLabel")]
    pub display_label: ShortString,
    pub kind: RealmKind,
    #[serde(
        rename = "parentRealmId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub parent_realm_id: ::std::option::Option<EntityId>,
    pub platform: ShortString,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    #[serde(rename = "realmType")]
    pub realm_type: RealmRealmType,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`RealmKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "realm"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum RealmKind {
    #[serde(rename = "realm")]
    Realm,
}
impl ::std::fmt::Display for RealmKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Realm => f.write_str("realm"),
        }
    }
}
impl ::std::str::FromStr for RealmKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "realm" => Ok(Self::Realm),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for RealmKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RealmKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RealmKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`RealmRealmType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "host",
///    "wsl",
///    "dev_container",
///    "remote_ssh",
///    "codespace",
///    "cloud_environment",
///    "validation_sandbox"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum RealmRealmType {
    #[serde(rename = "host")]
    Host,
    #[serde(rename = "wsl")]
    Wsl,
    #[serde(rename = "dev_container")]
    DevContainer,
    #[serde(rename = "remote_ssh")]
    RemoteSsh,
    #[serde(rename = "codespace")]
    Codespace,
    #[serde(rename = "cloud_environment")]
    CloudEnvironment,
    #[serde(rename = "validation_sandbox")]
    ValidationSandbox,
}
impl ::std::fmt::Display for RealmRealmType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Host => f.write_str("host"),
            Self::Wsl => f.write_str("wsl"),
            Self::DevContainer => f.write_str("dev_container"),
            Self::RemoteSsh => f.write_str("remote_ssh"),
            Self::Codespace => f.write_str("codespace"),
            Self::CloudEnvironment => f.write_str("cloud_environment"),
            Self::ValidationSandbox => f.write_str("validation_sandbox"),
        }
    }
}
impl ::std::str::FromStr for RealmRealmType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "host" => Ok(Self::Host),
            "wsl" => Ok(Self::Wsl),
            "dev_container" => Ok(Self::DevContainer),
            "remote_ssh" => Ok(Self::RemoteSsh),
            "codespace" => Ok(Self::Codespace),
            "cloud_environment" => Ok(Self::CloudEnvironment),
            "validation_sandbox" => Ok(Self::ValidationSandbox),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for RealmRealmType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RealmRealmType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RealmRealmType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Recommendation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "behaviorContract",
///    "candidateId",
///    "candidatePatchId",
///    "createdAt",
///    "diffDigest",
///    "diffObjectId",
///    "findingEvidenceReferenceIds",
///    "findingIds",
///    "invalidationInputDigests",
///    "kind",
///    "limitations",
///    "policy",
///    "projectId",
///    "proof",
///    "rationale",
///    "recommendationId",
///    "schemaVersion",
///    "state",
///    "targetIds",
///    "updatedAt",
///    "validationMatrix",
///    "workspaceId"
///  ],
///  "properties": {
///    "behaviorContract": {
///      "$ref": "#/$defs/VersionedReference"
///    },
///    "candidateId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "candidatePatchId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "diffDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "diffObjectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "findingEvidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 2048,
///      "minItems": 1
///    },
///    "findingIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "invalidationInputDigests": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/Sha256Digest"
///      },
///      "maxItems": 1024,
///      "minItems": 1
///    },
///    "kind": {
///      "enum": [
///        "recommendation"
///      ]
///    },
///    "limitations": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/BoundedString"
///      },
///      "maxItems": 256
///    },
///    "policy": {
///      "$ref": "#/$defs/VersionedReference"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "proof": {
///      "$ref": "#/$defs/RecommendationProof"
///    },
///    "rationale": {
///      "$ref": "#/$defs/BoundedString"
///    },
///    "recommendationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "draft",
///        "reviewable",
///        "approved",
///        "applied",
///        "invalidated",
///        "rejected",
///        "superseded"
///      ]
///    },
///    "targetIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "updatedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "validationMatrix": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ValidationMatrixCell"
///      },
///      "maxItems": 512
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Recommendation {
    #[serde(rename = "behaviorContract")]
    pub behavior_contract: VersionedReference,
    #[serde(rename = "candidateId")]
    pub candidate_id: EntityId,
    #[serde(rename = "candidatePatchId")]
    pub candidate_patch_id: EntityId,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "diffDigest")]
    pub diff_digest: Sha256Digest,
    #[serde(rename = "diffObjectId")]
    pub diff_object_id: EntityId,
    #[serde(rename = "findingEvidenceReferenceIds")]
    pub finding_evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "findingIds")]
    pub finding_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "invalidationInputDigests")]
    pub invalidation_input_digests: ::std::vec::Vec<Sha256Digest>,
    pub kind: RecommendationKind,
    pub limitations: ::std::vec::Vec<BoundedString>,
    pub policy: VersionedReference,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    pub proof: RecommendationProof,
    pub rationale: BoundedString,
    #[serde(rename = "recommendationId")]
    pub recommendation_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub state: RecommendationState,
    #[serde(rename = "targetIds")]
    pub target_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Rfc3339Timestamp,
    #[serde(rename = "validationMatrix")]
    pub validation_matrix: ::std::vec::Vec<ValidationMatrixCell>,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`RecommendationKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "recommendation"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum RecommendationKind {
    #[serde(rename = "recommendation")]
    Recommendation,
}
impl ::std::fmt::Display for RecommendationKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Recommendation => f.write_str("recommendation"),
        }
    }
}
impl ::std::str::FromStr for RecommendationKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "recommendation" => Ok(Self::Recommendation),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for RecommendationKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RecommendationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RecommendationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`RecommendationProof`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "$ref": "#/$defs/VerifiedRecommendationProof"
///    },
///    {
///      "$ref": "#/$defs/ReconstructionRecommendationProof"
///    },
///    {
///      "$ref": "#/$defs/UnverifiedRecommendationProof"
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum RecommendationProof {
    VerifiedRecommendationProof(VerifiedRecommendationProof),
    ReconstructionRecommendationProof(ReconstructionRecommendationProof),
    UnverifiedRecommendationProof(UnverifiedRecommendationProof),
}
impl ::std::convert::From<VerifiedRecommendationProof> for RecommendationProof {
    fn from(value: VerifiedRecommendationProof) -> Self {
        Self::VerifiedRecommendationProof(value)
    }
}
impl ::std::convert::From<ReconstructionRecommendationProof> for RecommendationProof {
    fn from(value: ReconstructionRecommendationProof) -> Self {
        Self::ReconstructionRecommendationProof(value)
    }
}
impl ::std::convert::From<UnverifiedRecommendationProof> for RecommendationProof {
    fn from(value: UnverifiedRecommendationProof) -> Self {
        Self::UnverifiedRecommendationProof(value)
    }
}
///`RecommendationState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "draft",
///    "reviewable",
///    "approved",
///    "applied",
///    "invalidated",
///    "rejected",
///    "superseded"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum RecommendationState {
    #[serde(rename = "draft")]
    Draft,
    #[serde(rename = "reviewable")]
    Reviewable,
    #[serde(rename = "approved")]
    Approved,
    #[serde(rename = "applied")]
    Applied,
    #[serde(rename = "invalidated")]
    Invalidated,
    #[serde(rename = "rejected")]
    Rejected,
    #[serde(rename = "superseded")]
    Superseded,
}
impl ::std::fmt::Display for RecommendationState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Draft => f.write_str("draft"),
            Self::Reviewable => f.write_str("reviewable"),
            Self::Approved => f.write_str("approved"),
            Self::Applied => f.write_str("applied"),
            Self::Invalidated => f.write_str("invalidated"),
            Self::Rejected => f.write_str("rejected"),
            Self::Superseded => f.write_str("superseded"),
        }
    }
}
impl ::std::str::FromStr for RecommendationState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "draft" => Ok(Self::Draft),
            "reviewable" => Ok(Self::Reviewable),
            "approved" => Ok(Self::Approved),
            "applied" => Ok(Self::Applied),
            "invalidated" => Ok(Self::Invalidated),
            "rejected" => Ok(Self::Rejected),
            "superseded" => Ok(Self::Superseded),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for RecommendationState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RecommendationState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RecommendationState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ReconcileQueueMessage`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "attempt",
///    "checkpointId",
///    "enqueuedAt",
///    "idempotencyKey",
///    "kind",
///    "messageId",
///    "projectId",
///    "schemaVersion",
///    "sourceInputId",
///    "workspaceId"
///  ],
///  "properties": {
///    "attempt": {
///      "type": "integer",
///      "maximum": 100.0,
///      "minimum": 1.0
///    },
///    "checkpointId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "enqueuedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "idempotencyKey": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "reconcile_queue_message"
///      ]
///    },
///    "messageId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sourceInputId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ReconcileQueueMessage {
    pub attempt: ::std::num::NonZeroU64,
    #[serde(rename = "checkpointId")]
    pub checkpoint_id: EntityId,
    #[serde(rename = "enqueuedAt")]
    pub enqueued_at: Rfc3339Timestamp,
    #[serde(rename = "idempotencyKey")]
    pub idempotency_key: EntityId,
    pub kind: ReconcileQueueMessageKind,
    #[serde(rename = "messageId")]
    pub message_id: EntityId,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sourceInputId")]
    pub source_input_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ReconcileQueueMessageKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "reconcile_queue_message"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ReconcileQueueMessageKind {
    #[serde(rename = "reconcile_queue_message")]
    ReconcileQueueMessage,
}
impl ::std::fmt::Display for ReconcileQueueMessageKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ReconcileQueueMessage => f.write_str("reconcile_queue_message"),
        }
    }
}
impl ::std::str::FromStr for ReconcileQueueMessageKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "reconcile_queue_message" => Ok(Self::ReconcileQueueMessage),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ReconcileQueueMessageKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ReconcileQueueMessageKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ReconcileQueueMessageKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ReconstructionRecommendationProof`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "attestationDigest",
///    "attestationId",
///    "reasonCodes",
///    "result"
///  ],
///  "properties": {
///    "attestationDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "attestationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "reasonCodes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "result": {
///      "enum": [
///        "reconstruction_REDACTEDed"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ReconstructionRecommendationProof {
    #[serde(rename = "attestationDigest")]
    pub attestation_digest: Sha256Digest,
    #[serde(rename = "attestationId")]
    pub attestation_id: EntityId,
    #[serde(rename = "reasonCodes")]
    pub reason_codes: ::std::vec::Vec<ShortString>,
    pub result: ReconstructionRecommendationProofResult,
}
///`ReconstructionRecommendationProofResult`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "reconstruction_REDACTEDed"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ReconstructionRecommendationProofResult {
    #[serde(rename = "reconstruction_REDACTEDed")]
    ReconstructionPassed,
}
impl ::std::fmt::Display for ReconstructionRecommendationProofResult {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ReconstructionPassed => f.write_str("reconstruction_REDACTEDed"),
        }
    }
}
impl ::std::str::FromStr for ReconstructionRecommendationProofResult {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "reconstruction_REDACTEDed" => Ok(Self::ReconstructionPassed),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ReconstructionRecommendationProofResult {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ReconstructionRecommendationProofResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ReconstructionRecommendationProofResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`RedactedActionPayload`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "argumentShape",
///    "diagnosticCodes",
///    "environmentVariables",
///    "executableFamily",
///    "fileEffects",
///    "operationKind",
///    "packageOperations",
///    "summary"
///  ],
///  "properties": {
///    "argumentShape": {
///      "type": "array",
///      "items": {
///        "type": "string",
///        "maxLength": 128
///      },
///      "maxItems": 128
///    },
///    "diagnosticCodes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256
///    },
///    "environmentVariables": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EnvironmentVariableObservation"
///      },
///      "maxItems": 512
///    },
///    "executableFamily": {
///      "type": "string",
///      "maxLength": 256
///    },
///    "fileEffects": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/FileEffect"
///      },
///      "maxItems": 512
///    },
///    "operationKind": {
///      "type": "string",
///      "enum": [
///        "package",
///        "process",
///        "file",
///        "configuration",
///        "service",
///        "runtime",
///        "unknown"
///      ]
///    },
///    "packageOperations": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ObservationPackageOperation"
///      },
///      "maxItems": 256
///    },
///    "summary": {
///      "type": "string",
///      "maxLength": 2048
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct RedactedActionPayload {
    #[serde(rename = "argumentShape")]
    pub argument_shape: ::std::vec::Vec<RedactedActionPayloadArgumentShapeItem>,
    #[serde(rename = "diagnosticCodes")]
    pub diagnostic_codes: ::std::vec::Vec<ShortString>,
    #[serde(rename = "environmentVariables")]
    pub environment_variables: ::std::vec::Vec<EnvironmentVariableObservation>,
    #[serde(rename = "executableFamily")]
    pub executable_family: RedactedActionPayloadExecutableFamily,
    #[serde(rename = "fileEffects")]
    pub file_effects: ::std::vec::Vec<FileEffect>,
    #[serde(rename = "operationKind")]
    pub operation_kind: RedactedActionPayloadOperationKind,
    #[serde(rename = "packageOperations")]
    pub package_operations: ::std::vec::Vec<ObservationPackageOperation>,
    pub summary: RedactedActionPayloadSummary,
}
///`RedactedActionPayloadArgumentShapeItem`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 128
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct RedactedActionPayloadArgumentShapeItem(::std::string::String);
impl ::std::ops::Deref for RedactedActionPayloadArgumentShapeItem {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<RedactedActionPayloadArgumentShapeItem> for ::std::string::String {
    fn from(value: RedactedActionPayloadArgumentShapeItem) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for RedactedActionPayloadArgumentShapeItem {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 128usize {
            return Err("longer than 128 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for RedactedActionPayloadArgumentShapeItem {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RedactedActionPayloadArgumentShapeItem {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RedactedActionPayloadArgumentShapeItem {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for RedactedActionPayloadArgumentShapeItem {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`RedactedActionPayloadExecutableFamily`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 256
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct RedactedActionPayloadExecutableFamily(::std::string::String);
impl ::std::ops::Deref for RedactedActionPayloadExecutableFamily {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<RedactedActionPayloadExecutableFamily> for ::std::string::String {
    fn from(value: RedactedActionPayloadExecutableFamily) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for RedactedActionPayloadExecutableFamily {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 256usize {
            return Err("longer than 256 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for RedactedActionPayloadExecutableFamily {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RedactedActionPayloadExecutableFamily {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RedactedActionPayloadExecutableFamily {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for RedactedActionPayloadExecutableFamily {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`RedactedActionPayloadOperationKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "package",
///    "process",
///    "file",
///    "configuration",
///    "service",
///    "runtime",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum RedactedActionPayloadOperationKind {
    #[serde(rename = "package")]
    Package,
    #[serde(rename = "process")]
    Process,
    #[serde(rename = "file")]
    File,
    #[serde(rename = "configuration")]
    Configuration,
    #[serde(rename = "service")]
    Service,
    #[serde(rename = "runtime")]
    Runtime,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for RedactedActionPayloadOperationKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Package => f.write_str("package"),
            Self::Process => f.write_str("process"),
            Self::File => f.write_str("file"),
            Self::Configuration => f.write_str("configuration"),
            Self::Service => f.write_str("service"),
            Self::Runtime => f.write_str("runtime"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for RedactedActionPayloadOperationKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "package" => Ok(Self::Package),
            "process" => Ok(Self::Process),
            "file" => Ok(Self::File),
            "configuration" => Ok(Self::Configuration),
            "service" => Ok(Self::Service),
            "runtime" => Ok(Self::Runtime),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for RedactedActionPayloadOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RedactedActionPayloadOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RedactedActionPayloadOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`RedactedActionPayloadSummary`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 2048
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct RedactedActionPayloadSummary(::std::string::String);
impl ::std::ops::Deref for RedactedActionPayloadSummary {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<RedactedActionPayloadSummary> for ::std::string::String {
    fn from(value: RedactedActionPayloadSummary) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for RedactedActionPayloadSummary {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 2048usize {
            return Err("longer than 2048 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for RedactedActionPayloadSummary {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RedactedActionPayloadSummary {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RedactedActionPayloadSummary {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for RedactedActionPayloadSummary {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`RelativePath`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 2048,
///  "minLength": 1,
///  "pattern": "^(?:[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.\\.[^/\\\\:\\u0000]+)(?:/(?:[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.\\.[^/\\\\:\\u0000]+))*$"
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct RelativePath(::std::string::String);
impl ::std::ops::Deref for RelativePath {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<RelativePath> for ::std::string::String {
    fn from(value: RelativePath) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for RelativePath {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 2048usize {
            return Err("longer than 2048 characters".into());
        }
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        static PATTERN: ::std::sync::LazyLock<::regress::Regex> = ::std::sync::LazyLock::new(
            || {
                ::regress::Regex::new(
                    "^(?:[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.\\.[^/\\\\:\\u0000]+)(?:/(?:[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.\\.[^/\\\\:\\u0000]+))*$",
                )
                .unwrap()
            },
        );
        if PATTERN.find(value).is_none() {
            return Err(
                "doesn't match pattern \"^(?:[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.\\.[^/\\\\:\\u0000]+)(?:/(?:[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.[^./\\\\:\\u0000][^/\\\\:\\u0000]*|\\.\\.[^/\\\\:\\u0000]+))*$\""
                    .into(),
            );
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for RelativePath {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RelativePath {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RelativePath {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for RelativePath {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`ResolvedGraph`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "graph",
///    "kind",
///    "schemaVersion"
///  ],
///  "properties": {
///    "graph": {
///      "$ref": "#/$defs/GraphBody"
///    },
///    "kind": {
///      "enum": [
///        "resolved_graph"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ResolvedGraph {
    pub graph: GraphBody,
    pub kind: ResolvedGraphKind,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`ResolvedGraphKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "resolved_graph"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ResolvedGraphKind {
    #[serde(rename = "resolved_graph")]
    ResolvedGraph,
}
impl ::std::fmt::Display for ResolvedGraphKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ResolvedGraph => f.write_str("resolved_graph"),
        }
    }
}
impl ::std::str::FromStr for ResolvedGraphKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "resolved_graph" => Ok(Self::ResolvedGraph),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ResolvedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ResolvedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ResolvedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ResourcePolicy`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "cpuCount",
///    "diskBytes",
///    "maxElapsedSeconds",
///    "maxEstimatedCostMicrousd",
///    "memoryBytes"
///  ],
///  "properties": {
///    "cpuCount": {
///      "type": "integer",
///      "maximum": 1024.0,
///      "minimum": 1.0
///    },
///    "diskBytes": {
///      "$ref": "#/$defs/ByteCount"
///    },
///    "maxElapsedSeconds": {
///      "type": "integer",
///      "maximum": 604800.0,
///      "minimum": 1.0
///    },
///    "maxEstimatedCostMicrousd": {
///      "$ref": "#/$defs/DecimalCounter"
///    },
///    "memoryBytes": {
///      "$ref": "#/$defs/ByteCount"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ResourcePolicy {
    #[serde(rename = "cpuCount")]
    pub cpu_count: ::std::num::NonZeroU64,
    #[serde(rename = "diskBytes")]
    pub disk_bytes: ByteCount,
    #[serde(rename = "maxElapsedSeconds")]
    pub max_elapsed_seconds: ::std::num::NonZeroU64,
    #[serde(rename = "maxEstimatedCostMicrousd")]
    pub max_estimated_cost_microusd: DecimalCounter,
    #[serde(rename = "memoryBytes")]
    pub memory_bytes: ByteCount,
}
///`Rfc3339Timestamp`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 64
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct Rfc3339Timestamp(::std::string::String);
impl ::std::ops::Deref for Rfc3339Timestamp {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<Rfc3339Timestamp> for ::std::string::String {
    fn from(value: Rfc3339Timestamp) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for Rfc3339Timestamp {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 64usize {
            return Err("longer than 64 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for Rfc3339Timestamp {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for Rfc3339Timestamp {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for Rfc3339Timestamp {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for Rfc3339Timestamp {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`RuntimeSelectionOperation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "evidenceReferenceIds",
///    "findingIds",
///    "operationId",
///    "operationKind",
///    "realmId",
///    "runtime",
///    "version"
///  ],
///  "properties": {
///    "evidenceReferenceIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512,
///      "minItems": 1
///    },
///    "findingIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "operationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "operationKind": {
///      "enum": [
///        "runtime_select"
///      ]
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "runtime": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "version": {
///      "$ref": "#/$defs/ShortString"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct RuntimeSelectionOperation {
    #[serde(rename = "evidenceReferenceIds")]
    pub evidence_reference_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "findingIds")]
    pub finding_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "operationId")]
    pub operation_id: EntityId,
    #[serde(rename = "operationKind")]
    pub operation_kind: RuntimeSelectionOperationOperationKind,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    pub runtime: ShortString,
    pub version: ShortString,
}
///`RuntimeSelectionOperationOperationKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "runtime_select"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum RuntimeSelectionOperationOperationKind {
    #[serde(rename = "runtime_select")]
    RuntimeSelect,
}
impl ::std::fmt::Display for RuntimeSelectionOperationOperationKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::RuntimeSelect => f.write_str("runtime_select"),
        }
    }
}
impl ::std::str::FromStr for RuntimeSelectionOperationOperationKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "runtime_select" => Ok(Self::RuntimeSelect),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for RuntimeSelectionOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for RuntimeSelectionOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for RuntimeSelectionOperationOperationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`SchemaVersion`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "integer",
///  "enum": [
///    1
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct SchemaVersion(i64);
impl ::std::ops::Deref for SchemaVersion {
    type Target = i64;
    fn deref(&self) -> &i64 {
        &self.0
    }
}
impl ::std::convert::From<SchemaVersion> for i64 {
    fn from(value: SchemaVersion) -> Self {
        value.0
    }
}
impl ::std::convert::TryFrom<i64> for SchemaVersion {
    type Error = self::error::ConversionError;
    fn try_from(value: i64) -> ::std::result::Result<Self, self::error::ConversionError> {
        if ![1_i64].contains(&value) {
            Err("invalid value".into())
        } else {
            Ok(Self(value))
        }
    }
}
impl<'de> ::serde::Deserialize<'de> for SchemaVersion {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        Self::try_from(<i64>::deserialize(deserializer)?)
            .map_err(|e| <D::Error as ::serde::de::Error>::custom(e.to_string()))
    }
}
///`SecretBinding`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "allowedHosts",
///    "createdAt",
///    "kind",
///    "mountedAtAssessment",
///    "removedAtAssessment",
///    "schemaVersion",
///    "REDACTEDBindingId",
///    "REDACTEDReferenceId",
///    "state",
///    "targetId",
///    "validationJobId",
///    "workspaceId"
///  ],
///  "properties": {
///    "allowedHosts": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "kind": {
///      "enum": [
///        "REDACTED_binding"
///      ]
///    },
///    "mountedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "mountedAtAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "removedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "removedAtAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "REDACTEDBindingId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "REDACTEDReferenceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "reserved",
///        "mounted",
///        "removed",
///        "removal_failed",
///        "expired"
///      ]
///    },
///    "targetId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "validationJobId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SecretBinding {
    #[serde(rename = "allowedHosts")]
    pub allowed_hosts: ::std::vec::Vec<ShortString>,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    pub kind: SecretBindingKind,
    #[serde(
        rename = "mountedAt",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub mounted_at: ::std::option::Option<Rfc3339Timestamp>,
    #[serde(rename = "mountedAtAssessment")]
    pub mounted_at_assessment: Assessment,
    #[serde(
        rename = "removedAt",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub removed_at: ::std::option::Option<Rfc3339Timestamp>,
    #[serde(rename = "removedAtAssessment")]
    pub removed_at_assessment: Assessment,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "REDACTEDBindingId")]
    pub REDACTED_binding_id: EntityId,
    #[serde(rename = "REDACTEDReferenceId")]
    pub REDACTED_reference_id: EntityId,
    pub state: SecretBindingState,
    #[serde(rename = "targetId")]
    pub target_id: EntityId,
    #[serde(rename = "validationJobId")]
    pub validation_job_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`SecretBindingKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "REDACTED_binding"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SecretBindingKind {
    #[serde(rename = "REDACTED_binding")]
    SecretBinding,
}
impl ::std::fmt::Display for SecretBindingKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::SecretBinding => f.write_str("REDACTED_binding"),
        }
    }
}
impl ::std::str::FromStr for SecretBindingKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "REDACTED_binding" => Ok(Self::SecretBinding),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SecretBindingKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SecretBindingKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SecretBindingKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`SecretBindingState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "reserved",
///    "mounted",
///    "removed",
///    "removal_failed",
///    "expired"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SecretBindingState {
    #[serde(rename = "reserved")]
    Reserved,
    #[serde(rename = "mounted")]
    Mounted,
    #[serde(rename = "removed")]
    Removed,
    #[serde(rename = "removal_failed")]
    RemovalFailed,
    #[serde(rename = "expired")]
    Expired,
}
impl ::std::fmt::Display for SecretBindingState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Reserved => f.write_str("reserved"),
            Self::Mounted => f.write_str("mounted"),
            Self::Removed => f.write_str("removed"),
            Self::RemovalFailed => f.write_str("removal_failed"),
            Self::Expired => f.write_str("expired"),
        }
    }
}
impl ::std::str::FromStr for SecretBindingState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "reserved" => Ok(Self::Reserved),
            "mounted" => Ok(Self::Mounted),
            "removed" => Ok(Self::Removed),
            "removal_failed" => Ok(Self::RemovalFailed),
            "expired" => Ok(Self::Expired),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SecretBindingState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SecretBindingState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SecretBindingState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`SecretReference`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "allowedHosts",
///    "createdAt",
///    "expiryAssessment",
///    "kind",
///    "opaqueProviderReference",
///    "permittedTargetIds",
///    "provider",
///    "schemaVersion",
///    "REDACTEDReferenceId",
///    "versionIdentity",
///    "workspaceId"
///  ],
///  "properties": {
///    "allowedHosts": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "expiresAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "expiryAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "kind": {
///      "enum": [
///        "REDACTED_reference"
///      ]
///    },
///    "opaqueProviderReference": {
///      "$ref": "#/$defs/OpaqueTokenId"
///    },
///    "permittedTargetIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "provider": {
///      "type": "string",
///      "enum": [
///        "daytona_host_restricted",
///        "external_REDACTED_manager"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "REDACTEDReferenceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "versionIdentity": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SecretReference {
    #[serde(rename = "allowedHosts")]
    pub allowed_hosts: ::std::vec::Vec<ShortString>,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(
        rename = "expiresAt",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub expires_at: ::std::option::Option<Rfc3339Timestamp>,
    #[serde(rename = "expiryAssessment")]
    pub expiry_assessment: Assessment,
    pub kind: SecretReferenceKind,
    #[serde(rename = "opaqueProviderReference")]
    pub opaque_provider_reference: OpaqueTokenId,
    #[serde(rename = "permittedTargetIds")]
    pub permitted_target_ids: ::std::vec::Vec<EntityId>,
    pub provider: SecretReferenceProvider,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "REDACTEDReferenceId")]
    pub REDACTED_reference_id: EntityId,
    #[serde(rename = "versionIdentity")]
    pub version_identity: ShortString,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`SecretReferenceKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "REDACTED_reference"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SecretReferenceKind {
    #[serde(rename = "REDACTED_reference")]
    SecretReference,
}
impl ::std::fmt::Display for SecretReferenceKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::SecretReference => f.write_str("REDACTED_reference"),
        }
    }
}
impl ::std::str::FromStr for SecretReferenceKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "REDACTED_reference" => Ok(Self::SecretReference),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SecretReferenceKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SecretReferenceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SecretReferenceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`SecretReferenceProvider`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "daytona_host_restricted",
///    "external_REDACTED_manager"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SecretReferenceProvider {
    #[serde(rename = "daytona_host_restricted")]
    DaytonaHostRestricted,
    #[serde(rename = "external_REDACTED_manager")]
    ExternalSecretManager,
}
impl ::std::fmt::Display for SecretReferenceProvider {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::DaytonaHostRestricted => f.write_str("daytona_host_restricted"),
            Self::ExternalSecretManager => f.write_str("external_REDACTED_manager"),
        }
    }
}
impl ::std::str::FromStr for SecretReferenceProvider {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "daytona_host_restricted" => Ok(Self::DaytonaHostRestricted),
            "external_REDACTED_manager" => Ok(Self::ExternalSecretManager),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SecretReferenceProvider {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SecretReferenceProvider {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SecretReferenceProvider {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Session`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "boundarySource",
///    "capabilityReportId",
///    "capture",
///    "deviceId",
///    "kind",
///    "projectId",
///    "provider",
///    "realmId",
///    "schemaVersion",
///    "sessionId",
///    "startedAt",
///    "status",
///    "surface",
///    "workspaceId"
///  ],
///  "properties": {
///    "boundarySource": {
///      "type": "string",
///      "enum": [
///        "provider",
///        "extension_manual",
///        "companion_inferred"
///      ]
///    },
///    "capabilityReportId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "capture": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "endedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "kind": {
///      "enum": [
///        "session"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "provider": {
///      "$ref": "#/$defs/ProviderName"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sessionId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "startedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "status": {
///      "type": "string",
///      "enum": [
///        "registered",
///        "observing",
///        "draining",
///        "checkpointing",
///        "ended",
///        "partial_capture"
///      ]
///    },
///    "surface": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Session {
    #[serde(rename = "boundarySource")]
    pub boundary_source: SessionBoundarySource,
    #[serde(rename = "capabilityReportId")]
    pub capability_report_id: EntityId,
    pub capture: Assessment,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    #[serde(
        rename = "endedAt",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub ended_at: ::std::option::Option<Rfc3339Timestamp>,
    pub kind: SessionKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    pub provider: ProviderName,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sessionId")]
    pub session_id: EntityId,
    #[serde(rename = "startedAt")]
    pub started_at: Rfc3339Timestamp,
    pub status: SessionStatus,
    pub surface: ShortString,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`SessionBoundarySource`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "provider",
///    "extension_manual",
///    "companion_inferred"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SessionBoundarySource {
    #[serde(rename = "provider")]
    Provider,
    #[serde(rename = "extension_manual")]
    ExtensionManual,
    #[serde(rename = "companion_inferred")]
    CompanionInferred,
}
impl ::std::fmt::Display for SessionBoundarySource {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Provider => f.write_str("provider"),
            Self::ExtensionManual => f.write_str("extension_manual"),
            Self::CompanionInferred => f.write_str("companion_inferred"),
        }
    }
}
impl ::std::str::FromStr for SessionBoundarySource {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "provider" => Ok(Self::Provider),
            "extension_manual" => Ok(Self::ExtensionManual),
            "companion_inferred" => Ok(Self::CompanionInferred),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SessionBoundarySource {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SessionBoundarySource {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SessionBoundarySource {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`SessionChangedNotification`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "session",
///    "type"
///  ],
///  "properties": {
///    "session": {
///      "$ref": "#/$defs/LocalSessionSummary"
///    },
///    "type": {
///      "enum": [
///        "session.changed"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SessionChangedNotification {
    pub session: LocalSessionSummary,
    #[serde(rename = "type")]
    pub type_: SessionChangedNotificationType,
}
///`SessionChangedNotificationType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "session.changed"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SessionChangedNotificationType {
    #[serde(rename = "session.changed")]
    SessionChanged,
}
impl ::std::fmt::Display for SessionChangedNotificationType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::SessionChanged => f.write_str("session.changed"),
        }
    }
}
impl ::std::str::FromStr for SessionChangedNotificationType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "session.changed" => Ok(Self::SessionChanged),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SessionChangedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SessionChangedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SessionChangedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`SessionKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "session"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SessionKind {
    #[serde(rename = "session")]
    Session,
}
impl ::std::fmt::Display for SessionKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Session => f.write_str("session"),
        }
    }
}
impl ::std::str::FromStr for SessionKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "session" => Ok(Self::Session),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SessionKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SessionKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SessionKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`SessionStatus`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "registered",
///    "observing",
///    "draining",
///    "checkpointing",
///    "ended",
///    "partial_capture"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SessionStatus {
    #[serde(rename = "registered")]
    Registered,
    #[serde(rename = "observing")]
    Observing,
    #[serde(rename = "draining")]
    Draining,
    #[serde(rename = "checkpointing")]
    Checkpointing,
    #[serde(rename = "ended")]
    Ended,
    #[serde(rename = "partial_capture")]
    PartialCapture,
}
impl ::std::fmt::Display for SessionStatus {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Registered => f.write_str("registered"),
            Self::Observing => f.write_str("observing"),
            Self::Draining => f.write_str("draining"),
            Self::Checkpointing => f.write_str("checkpointing"),
            Self::Ended => f.write_str("ended"),
            Self::PartialCapture => f.write_str("partial_capture"),
        }
    }
}
impl ::std::str::FromStr for SessionStatus {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "registered" => Ok(Self::Registered),
            "observing" => Ok(Self::Observing),
            "draining" => Ok(Self::Draining),
            "checkpointing" => Ok(Self::Checkpointing),
            "ended" => Ok(Self::Ended),
            "partial_capture" => Ok(Self::PartialCapture),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SessionStatus {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SessionStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SessionStatus {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Sha256Digest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "pattern": "^sha256:[a-f0-9]{64}$"
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct Sha256Digest(::std::string::String);
impl ::std::ops::Deref for Sha256Digest {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<Sha256Digest> for ::std::string::String {
    fn from(value: Sha256Digest) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for Sha256Digest {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        static PATTERN: ::std::sync::LazyLock<::regress::Regex> =
            ::std::sync::LazyLock::new(|| ::regress::Regex::new("^sha256:[a-f0-9]{64}$").unwrap());
        if PATTERN.find(value).is_none() {
            return Err("doesn't match pattern \"^sha256:[a-f0-9]{64}$\"".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for Sha256Digest {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for Sha256Digest {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for Sha256Digest {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for Sha256Digest {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`ShortString`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 256,
///  "minLength": 1
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct ShortString(::std::string::String);
impl ::std::ops::Deref for ShortString {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<ShortString> for ::std::string::String {
    fn from(value: ShortString) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for ShortString {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 256usize {
            return Err("longer than 256 characters".into());
        }
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for ShortString {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ShortString {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ShortString {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for ShortString {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`Snapshot`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "adapterResults",
///    "completeness",
///    "contentDigest",
///    "deviceId",
///    "gapIds",
///    "intervalEnd",
///    "intervalStart",
///    "kind",
///    "parentSnapshotState",
///    "projectId",
///    "realmId",
///    "schemaVersion",
///    "scope",
///    "snapshotId",
///    "workspaceId"
///  ],
///  "properties": {
///    "adapterResults": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/AdapterInventoryResult"
///      },
///      "maxItems": 512
///    },
///    "completeness": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "contentDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "gapIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512
///    },
///    "intervalEnd": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "intervalStart": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "kind": {
///      "enum": [
///        "snapshot"
///      ]
///    },
///    "layerId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "parentSnapshotId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "parentSnapshotState": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "realmId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "scope": {
///      "$ref": "#/$defs/InventoryScope"
///    },
///    "snapshotId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Snapshot {
    #[serde(rename = "adapterResults")]
    pub adapter_results: ::std::vec::Vec<AdapterInventoryResult>,
    pub completeness: Assessment,
    #[serde(rename = "contentDigest")]
    pub content_digest: Sha256Digest,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    #[serde(rename = "gapIds")]
    pub gap_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "intervalEnd")]
    pub interval_end: Rfc3339Timestamp,
    #[serde(rename = "intervalStart")]
    pub interval_start: Rfc3339Timestamp,
    pub kind: SnapshotKind,
    #[serde(
        rename = "layerId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub layer_id: ::std::option::Option<EntityId>,
    #[serde(
        rename = "parentSnapshotId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub parent_snapshot_id: ::std::option::Option<EntityId>,
    #[serde(rename = "parentSnapshotState")]
    pub parent_snapshot_state: Assessment,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "realmId")]
    pub realm_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub scope: InventoryScope,
    #[serde(rename = "snapshotId")]
    pub snapshot_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`SnapshotIngestRequest`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "createdAt",
///    "deviceId",
///    "kind",
///    "projectId",
///    "schemaVersion",
///    "signature",
///    "snapshotDigest",
///    "snapshotId",
///    "snapshotObjectId",
///    "workspaceId"
///  ],
///  "properties": {
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "deviceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "snapshot_ingest_request"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "signature": {
///      "$ref": "#/$defs/Base64Url"
///    },
///    "snapshotDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "snapshotId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "snapshotObjectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SnapshotIngestRequest {
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "deviceId")]
    pub device_id: EntityId,
    pub kind: SnapshotIngestRequestKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub signature: Base64Url,
    #[serde(rename = "snapshotDigest")]
    pub snapshot_digest: Sha256Digest,
    #[serde(rename = "snapshotId")]
    pub snapshot_id: EntityId,
    #[serde(rename = "snapshotObjectId")]
    pub snapshot_object_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`SnapshotIngestRequestKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "snapshot_ingest_request"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SnapshotIngestRequestKind {
    #[serde(rename = "snapshot_ingest_request")]
    SnapshotIngestRequest,
}
impl ::std::fmt::Display for SnapshotIngestRequestKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::SnapshotIngestRequest => f.write_str("snapshot_ingest_request"),
        }
    }
}
impl ::std::str::FromStr for SnapshotIngestRequestKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "snapshot_ingest_request" => Ok(Self::SnapshotIngestRequest),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SnapshotIngestRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SnapshotIngestRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SnapshotIngestRequestKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`SnapshotKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "snapshot"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SnapshotKind {
    #[serde(rename = "snapshot")]
    Snapshot,
}
impl ::std::fmt::Display for SnapshotKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Snapshot => f.write_str("snapshot"),
        }
    }
}
impl ::std::str::FromStr for SnapshotKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "snapshot" => Ok(Self::Snapshot),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SnapshotKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SnapshotKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SnapshotKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`SourceInput`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "$ref": "#/$defs/GitCommitSourceInput"
///    },
///    {
///      "$ref": "#/$defs/WorkingTreeSourceInput"
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum SourceInput {
    GitCommitSourceInput(GitCommitSourceInput),
    WorkingTreeSourceInput(WorkingTreeSourceInput),
}
impl ::std::convert::From<GitCommitSourceInput> for SourceInput {
    fn from(value: GitCommitSourceInput) -> Self {
        Self::GitCommitSourceInput(value)
    }
}
impl ::std::convert::From<WorkingTreeSourceInput> for SourceInput {
    fn from(value: WorkingTreeSourceInput) -> Self {
        Self::WorkingTreeSourceInput(value)
    }
}
///`StatusChangedNotification`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "status",
///    "type"
///  ],
///  "properties": {
///    "status": {
///      "$ref": "#/$defs/CompanionStatus"
///    },
///    "type": {
///      "enum": [
///        "status.changed"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct StatusChangedNotification {
    pub status: CompanionStatus,
    #[serde(rename = "type")]
    pub type_: StatusChangedNotificationType,
}
///`StatusChangedNotificationType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "status.changed"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum StatusChangedNotificationType {
    #[serde(rename = "status.changed")]
    StatusChanged,
}
impl ::std::fmt::Display for StatusChangedNotificationType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::StatusChanged => f.write_str("status.changed"),
        }
    }
}
impl ::std::str::FromStr for StatusChangedNotificationType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "status.changed" => Ok(Self::StatusChanged),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for StatusChangedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for StatusChangedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for StatusChangedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`StatusGetCommand`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "type"
///  ],
///  "properties": {
///    "type": {
///      "enum": [
///        "status.get"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct StatusGetCommand {
    #[serde(rename = "type")]
    pub type_: StatusGetCommandType,
}
///`StatusGetCommandType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "status.get"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum StatusGetCommandType {
    #[serde(rename = "status.get")]
    StatusGet,
}
impl ::std::fmt::Display for StatusGetCommandType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::StatusGet => f.write_str("status.get"),
        }
    }
}
impl ::std::str::FromStr for StatusGetCommandType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "status.get" => Ok(Self::StatusGet),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for StatusGetCommandType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for StatusGetCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for StatusGetCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`StringMap`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "maxProperties": 256,
///  "additionalProperties": {
///    "type": "string",
///    "maxLength": 4096
///  }
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct StringMap(pub ::std::collections::HashMap<::std::string::String, StringMapValue>);
impl ::std::ops::Deref for StringMap {
    type Target = ::std::collections::HashMap<::std::string::String, StringMapValue>;
    fn deref(&self) -> &::std::collections::HashMap<::std::string::String, StringMapValue> {
        &self.0
    }
}
impl ::std::convert::From<StringMap>
    for ::std::collections::HashMap<::std::string::String, StringMapValue>
{
    fn from(value: StringMap) -> Self {
        value.0
    }
}
impl ::std::convert::From<::std::collections::HashMap<::std::string::String, StringMapValue>>
    for StringMap
{
    fn from(value: ::std::collections::HashMap<::std::string::String, StringMapValue>) -> Self {
        Self(value)
    }
}
///`StringMapValue`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 4096
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct StringMapValue(::std::string::String);
impl ::std::ops::Deref for StringMapValue {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<StringMapValue> for ::std::string::String {
    fn from(value: StringMapValue) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for StringMapValue {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 4096usize {
            return Err("longer than 4096 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for StringMapValue {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for StringMapValue {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for StringMapValue {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for StringMapValue {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`SubmoduleIdentity`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "commitId",
///    "contentDigest",
///    "kind",
///    "path",
///    "repositoryIdentity",
///    "schemaVersion"
///  ],
///  "properties": {
///    "commitId": {
///      "$ref": "#/$defs/GitObjectId"
///    },
///    "contentDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "kind": {
///      "enum": [
///        "submodule_identity"
///      ]
///    },
///    "path": {
///      "$ref": "#/$defs/RelativePath"
///    },
///    "repositoryIdentity": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct SubmoduleIdentity {
    #[serde(rename = "commitId")]
    pub commit_id: GitObjectId,
    #[serde(rename = "contentDigest")]
    pub content_digest: Sha256Digest,
    pub kind: SubmoduleIdentityKind,
    pub path: RelativePath,
    #[serde(rename = "repositoryIdentity")]
    pub repository_identity: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`SubmoduleIdentityKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "submodule_identity"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SubmoduleIdentityKind {
    #[serde(rename = "submodule_identity")]
    SubmoduleIdentity,
}
impl ::std::fmt::Display for SubmoduleIdentityKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::SubmoduleIdentity => f.write_str("submodule_identity"),
        }
    }
}
impl ::std::str::FromStr for SubmoduleIdentityKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "submodule_identity" => Ok(Self::SubmoduleIdentity),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SubmoduleIdentityKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SubmoduleIdentityKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SubmoduleIdentityKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`SupportLevel`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "full_native",
///    "native_validation",
///    "observed_only",
///    "unsupported",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum SupportLevel {
    #[serde(rename = "full_native")]
    FullNative,
    #[serde(rename = "native_validation")]
    NativeValidation,
    #[serde(rename = "observed_only")]
    ObservedOnly,
    #[serde(rename = "unsupported")]
    Unsupported,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for SupportLevel {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::FullNative => f.write_str("full_native"),
            Self::NativeValidation => f.write_str("native_validation"),
            Self::ObservedOnly => f.write_str("observed_only"),
            Self::Unsupported => f.write_str("unsupported"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for SupportLevel {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "full_native" => Ok(Self::FullNative),
            "native_validation" => Ok(Self::NativeValidation),
            "observed_only" => Ok(Self::ObservedOnly),
            "unsupported" => Ok(Self::Unsupported),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for SupportLevel {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for SupportLevel {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for SupportLevel {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`UnverifiedCandidateState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "reasonCodes",
///    "state"
///  ],
///  "properties": {
///    "reasonCodes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "draft",
///        "static_rejected",
///        "ready_for_validation",
///        "validating",
///        "validation_failed",
///        "inconclusive",
///        "stale"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct UnverifiedCandidateState {
    #[serde(rename = "reasonCodes")]
    pub reason_codes: ::std::vec::Vec<ShortString>,
    pub state: UnverifiedCandidateStateState,
}
///`UnverifiedCandidateStateState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "draft",
///    "static_rejected",
///    "ready_for_validation",
///    "validating",
///    "validation_failed",
///    "inconclusive",
///    "stale"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum UnverifiedCandidateStateState {
    #[serde(rename = "draft")]
    Draft,
    #[serde(rename = "static_rejected")]
    StaticRejected,
    #[serde(rename = "ready_for_validation")]
    ReadyForValidation,
    #[serde(rename = "validating")]
    Validating,
    #[serde(rename = "validation_failed")]
    ValidationFailed,
    #[serde(rename = "inconclusive")]
    Inconclusive,
    #[serde(rename = "stale")]
    Stale,
}
impl ::std::fmt::Display for UnverifiedCandidateStateState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Draft => f.write_str("draft"),
            Self::StaticRejected => f.write_str("static_rejected"),
            Self::ReadyForValidation => f.write_str("ready_for_validation"),
            Self::Validating => f.write_str("validating"),
            Self::ValidationFailed => f.write_str("validation_failed"),
            Self::Inconclusive => f.write_str("inconclusive"),
            Self::Stale => f.write_str("stale"),
        }
    }
}
impl ::std::str::FromStr for UnverifiedCandidateStateState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "draft" => Ok(Self::Draft),
            "static_rejected" => Ok(Self::StaticRejected),
            "ready_for_validation" => Ok(Self::ReadyForValidation),
            "validating" => Ok(Self::Validating),
            "validation_failed" => Ok(Self::ValidationFailed),
            "inconclusive" => Ok(Self::Inconclusive),
            "stale" => Ok(Self::Stale),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for UnverifiedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for UnverifiedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for UnverifiedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`UnverifiedRecommendationProof`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "reasonCodes",
///    "result"
///  ],
///  "properties": {
///    "reasonCodes": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ShortString"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "result": {
///      "enum": [
///        "not_verified"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct UnverifiedRecommendationProof {
    #[serde(rename = "reasonCodes")]
    pub reason_codes: ::std::vec::Vec<ShortString>,
    pub result: UnverifiedRecommendationProofResult,
}
///`UnverifiedRecommendationProofResult`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "not_verified"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum UnverifiedRecommendationProofResult {
    #[serde(rename = "not_verified")]
    NotVerified,
}
impl ::std::fmt::Display for UnverifiedRecommendationProofResult {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::NotVerified => f.write_str("not_verified"),
        }
    }
}
impl ::std::str::FromStr for UnverifiedRecommendationProofResult {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "not_verified" => Ok(Self::NotVerified),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for UnverifiedRecommendationProofResult {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for UnverifiedRecommendationProofResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for UnverifiedRecommendationProofResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`UploadChangedNotification`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "pendingBatches",
///    "type"
///  ],
///  "properties": {
///    "pendingBatches": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 0.0
///    },
///    "type": {
///      "enum": [
///        "upload.changed"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct UploadChangedNotification {
    #[serde(rename = "pendingBatches")]
    pub pending_batches: i64,
    #[serde(rename = "type")]
    pub type_: UploadChangedNotificationType,
}
///`UploadChangedNotificationType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "upload.changed"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum UploadChangedNotificationType {
    #[serde(rename = "upload.changed")]
    UploadChanged,
}
impl ::std::fmt::Display for UploadChangedNotificationType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::UploadChanged => f.write_str("upload.changed"),
        }
    }
}
impl ::std::str::FromStr for UploadChangedNotificationType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "upload.changed" => Ok(Self::UploadChanged),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for UploadChangedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for UploadChangedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for UploadChangedNotificationType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`UsedGraph`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "graph",
///    "kind",
///    "schemaVersion"
///  ],
///  "properties": {
///    "graph": {
///      "$ref": "#/$defs/GraphBody"
///    },
///    "kind": {
///      "enum": [
///        "used_graph"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct UsedGraph {
    pub graph: GraphBody,
    pub kind: UsedGraphKind,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
}
///`UsedGraphKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "used_graph"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum UsedGraphKind {
    #[serde(rename = "used_graph")]
    UsedGraph,
}
impl ::std::fmt::Display for UsedGraphKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::UsedGraph => f.write_str("used_graph"),
        }
    }
}
impl ::std::str::FromStr for UsedGraphKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "used_graph" => Ok(Self::UsedGraph),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for UsedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for UsedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for UsedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidatedGraph`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "graph",
///    "kind",
///    "outcome",
///    "schemaVersion",
///    "targetId",
///    "validationJobId"
///  ],
///  "properties": {
///    "graph": {
///      "$ref": "#/$defs/GraphBody"
///    },
///    "kind": {
///      "enum": [
///        "validated_graph"
///      ]
///    },
///    "outcome": {
///      "type": "string",
///      "enum": [
///        "REDACTEDed",
///        "failed",
///        "inconclusive",
///        "unsupported"
///      ]
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "targetId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "validationJobId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidatedGraph {
    pub graph: GraphBody,
    pub kind: ValidatedGraphKind,
    pub outcome: ValidatedGraphOutcome,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "targetId")]
    pub target_id: EntityId,
    #[serde(rename = "validationJobId")]
    pub validation_job_id: EntityId,
}
///`ValidatedGraphKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "validated_graph"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidatedGraphKind {
    #[serde(rename = "validated_graph")]
    ValidatedGraph,
}
impl ::std::fmt::Display for ValidatedGraphKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ValidatedGraph => f.write_str("validated_graph"),
        }
    }
}
impl ::std::str::FromStr for ValidatedGraphKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "validated_graph" => Ok(Self::ValidatedGraph),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidatedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidatedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidatedGraphKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidatedGraphOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "REDACTEDed",
///    "failed",
///    "inconclusive",
///    "unsupported"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidatedGraphOutcome {
    #[serde(rename = "REDACTEDed")]
    Passed,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "inconclusive")]
    Inconclusive,
    #[serde(rename = "unsupported")]
    Unsupported,
}
impl ::std::fmt::Display for ValidatedGraphOutcome {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Passed => f.write_str("REDACTEDed"),
            Self::Failed => f.write_str("failed"),
            Self::Inconclusive => f.write_str("inconclusive"),
            Self::Unsupported => f.write_str("unsupported"),
        }
    }
}
impl ::std::str::FromStr for ValidatedGraphOutcome {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "REDACTEDed" => Ok(Self::Passed),
            "failed" => Ok(Self::Failed),
            "inconclusive" => Ok(Self::Inconclusive),
            "unsupported" => Ok(Self::Unsupported),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidatedGraphOutcome {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidatedGraphOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidatedGraphOutcome {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationAttestation`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "adapterVersions",
///    "attestationDigest",
///    "attestationId",
///    "attestedTargets",
///    "behaviorContract",
///    "behaviorContractDigest",
///    "candidateId",
///    "candidatePatchDigest",
///    "createdAt",
///    "kind",
///    "limitations",
///    "nativeToolVersions",
///    "policy",
///    "policyDigest",
///    "projectId",
///    "requiredTargetIds",
///    "result",
///    "ruleVersions",
///    "schemaVersion",
///    "sourceInput",
///    "sourceInputDigest",
///    "validatorVersion",
///    "workspaceId"
///  ],
///  "properties": {
///    "adapterVersions": {
///      "$ref": "#/$defs/VersionMap"
///    },
///    "attestationDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "attestationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "attestedTargets": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/AttestedTarget"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "behaviorContract": {
///      "$ref": "#/$defs/VersionedReference"
///    },
///    "behaviorContractDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "candidateId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "candidatePatchDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "kind": {
///      "enum": [
///        "validation_attestation"
///      ]
///    },
///    "limitations": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/BoundedString"
///      },
///      "maxItems": 256
///    },
///    "nativeToolVersions": {
///      "$ref": "#/$defs/VersionMap"
///    },
///    "policy": {
///      "$ref": "#/$defs/VersionedReference"
///    },
///    "policyDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "requiredTargetIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "result": {
///      "type": "string",
///      "enum": [
///        "reconstruction_REDACTEDed",
///        "verified"
///      ]
///    },
///    "ruleVersions": {
///      "$ref": "#/$defs/VersionMap"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sourceInput": {
///      "$ref": "#/$defs/SourceInput"
///    },
///    "sourceInputDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "validatorVersion": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidationAttestation {
    #[serde(rename = "adapterVersions")]
    pub adapter_versions: VersionMap,
    #[serde(rename = "attestationDigest")]
    pub attestation_digest: Sha256Digest,
    #[serde(rename = "attestationId")]
    pub attestation_id: EntityId,
    #[serde(rename = "attestedTargets")]
    pub attested_targets: ::std::vec::Vec<AttestedTarget>,
    #[serde(rename = "behaviorContract")]
    pub behavior_contract: VersionedReference,
    #[serde(rename = "behaviorContractDigest")]
    pub behavior_contract_digest: Sha256Digest,
    #[serde(rename = "candidateId")]
    pub candidate_id: EntityId,
    #[serde(rename = "candidatePatchDigest")]
    pub candidate_patch_digest: Sha256Digest,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    pub kind: ValidationAttestationKind,
    pub limitations: ::std::vec::Vec<BoundedString>,
    #[serde(rename = "nativeToolVersions")]
    pub native_tool_versions: VersionMap,
    pub policy: VersionedReference,
    #[serde(rename = "policyDigest")]
    pub policy_digest: Sha256Digest,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "requiredTargetIds")]
    pub required_target_ids: ::std::vec::Vec<EntityId>,
    pub result: ValidationAttestationResult,
    #[serde(rename = "ruleVersions")]
    pub rule_versions: VersionMap,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sourceInput")]
    pub source_input: SourceInput,
    #[serde(rename = "sourceInputDigest")]
    pub source_input_digest: Sha256Digest,
    #[serde(rename = "validatorVersion")]
    pub validator_version: ShortString,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ValidationAttestationKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "validation_attestation"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationAttestationKind {
    #[serde(rename = "validation_attestation")]
    ValidationAttestation,
}
impl ::std::fmt::Display for ValidationAttestationKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ValidationAttestation => f.write_str("validation_attestation"),
        }
    }
}
impl ::std::str::FromStr for ValidationAttestationKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "validation_attestation" => Ok(Self::ValidationAttestation),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationAttestationKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationAttestationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationAttestationKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationAttestationResult`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "reconstruction_REDACTEDed",
///    "verified"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationAttestationResult {
    #[serde(rename = "reconstruction_REDACTEDed")]
    ReconstructionPassed,
    #[serde(rename = "verified")]
    Verified,
}
impl ::std::fmt::Display for ValidationAttestationResult {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ReconstructionPassed => f.write_str("reconstruction_REDACTEDed"),
            Self::Verified => f.write_str("verified"),
        }
    }
}
impl ::std::str::FromStr for ValidationAttestationResult {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "reconstruction_REDACTEDed" => Ok(Self::ReconstructionPassed),
            "verified" => Ok(Self::Verified),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationAttestationResult {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationAttestationResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationAttestationResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationBatch`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "budgetReservationId",
///    "candidateId",
///    "candidatePatchDigest",
///    "createdAt",
///    "jobIds",
///    "kind",
///    "projectId",
///    "requiredTargetIds",
///    "schemaVersion",
///    "sourceInputDigest",
///    "state",
///    "supersededByAssessment",
///    "updatedAt",
///    "validationBatchId",
///    "workspaceId"
///  ],
///  "properties": {
///    "budgetReservationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "candidateId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "candidatePatchDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "jobIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512,
///      "minItems": 1
///    },
///    "kind": {
///      "enum": [
///        "validation_batch"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "requiredTargetIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "sourceInputDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "reserved",
///        "queued",
///        "running",
///        "cancelling",
///        "aggregating",
///        "REDACTEDed",
///        "failed",
///        "inconclusive",
///        "superseded"
///      ]
///    },
///    "supersededByAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "supersededByBatchId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "updatedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "validationBatchId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidationBatch {
    #[serde(rename = "budgetReservationId")]
    pub budget_reservation_id: EntityId,
    #[serde(rename = "candidateId")]
    pub candidate_id: EntityId,
    #[serde(rename = "candidatePatchDigest")]
    pub candidate_patch_digest: Sha256Digest,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "jobIds")]
    pub job_ids: ::std::vec::Vec<EntityId>,
    pub kind: ValidationBatchKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "requiredTargetIds")]
    pub required_target_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "sourceInputDigest")]
    pub source_input_digest: Sha256Digest,
    pub state: ValidationBatchState,
    #[serde(rename = "supersededByAssessment")]
    pub superseded_by_assessment: Assessment,
    #[serde(
        rename = "supersededByBatchId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub superseded_by_batch_id: ::std::option::Option<EntityId>,
    #[serde(rename = "updatedAt")]
    pub updated_at: Rfc3339Timestamp,
    #[serde(rename = "validationBatchId")]
    pub validation_batch_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ValidationBatchKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "validation_batch"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationBatchKind {
    #[serde(rename = "validation_batch")]
    ValidationBatch,
}
impl ::std::fmt::Display for ValidationBatchKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ValidationBatch => f.write_str("validation_batch"),
        }
    }
}
impl ::std::str::FromStr for ValidationBatchKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "validation_batch" => Ok(Self::ValidationBatch),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationBatchKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationBatchKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationBatchKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationBatchState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "reserved",
///    "queued",
///    "running",
///    "cancelling",
///    "aggregating",
///    "REDACTEDed",
///    "failed",
///    "inconclusive",
///    "superseded"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationBatchState {
    #[serde(rename = "reserved")]
    Reserved,
    #[serde(rename = "queued")]
    Queued,
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "cancelling")]
    Cancelling,
    #[serde(rename = "aggregating")]
    Aggregating,
    #[serde(rename = "REDACTEDed")]
    Passed,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "inconclusive")]
    Inconclusive,
    #[serde(rename = "superseded")]
    Superseded,
}
impl ::std::fmt::Display for ValidationBatchState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Reserved => f.write_str("reserved"),
            Self::Queued => f.write_str("queued"),
            Self::Running => f.write_str("running"),
            Self::Cancelling => f.write_str("cancelling"),
            Self::Aggregating => f.write_str("aggregating"),
            Self::Passed => f.write_str("REDACTEDed"),
            Self::Failed => f.write_str("failed"),
            Self::Inconclusive => f.write_str("inconclusive"),
            Self::Superseded => f.write_str("superseded"),
        }
    }
}
impl ::std::str::FromStr for ValidationBatchState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "reserved" => Ok(Self::Reserved),
            "queued" => Ok(Self::Queued),
            "running" => Ok(Self::Running),
            "cancelling" => Ok(Self::Cancelling),
            "aggregating" => Ok(Self::Aggregating),
            "REDACTEDed" => Ok(Self::Passed),
            "failed" => Ok(Self::Failed),
            "inconclusive" => Ok(Self::Inconclusive),
            "superseded" => Ok(Self::Superseded),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationBatchState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationBatchState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationBatchState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationCacheEntry`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "artifacts",
///    "attestationAssessment",
///    "cacheEntryId",
///    "createdAt",
///    "expiresAt",
///    "jobKeyDigest",
///    "kind",
///    "projectId",
///    "schemaVersion",
///    "state",
///    "workspaceId"
///  ],
///  "properties": {
///    "artifacts": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/CacheArtifact"
///      },
///      "maxItems": 256,
///      "minItems": 1
///    },
///    "attestationAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "attestationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "cacheEntryId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "expiresAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "jobKeyDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "kind": {
///      "enum": [
///        "validation_cache_entry"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "ready",
///        "stale",
///        "expired",
///        "invalid"
///      ]
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidationCacheEntry {
    pub artifacts: ::std::vec::Vec<CacheArtifact>,
    #[serde(rename = "attestationAssessment")]
    pub attestation_assessment: Assessment,
    #[serde(
        rename = "attestationId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub attestation_id: ::std::option::Option<EntityId>,
    #[serde(rename = "cacheEntryId")]
    pub cache_entry_id: EntityId,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "expiresAt")]
    pub expires_at: Rfc3339Timestamp,
    #[serde(rename = "jobKeyDigest")]
    pub job_key_digest: Sha256Digest,
    pub kind: ValidationCacheEntryKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub state: ValidationCacheEntryState,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ValidationCacheEntryKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "validation_cache_entry"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationCacheEntryKind {
    #[serde(rename = "validation_cache_entry")]
    ValidationCacheEntry,
}
impl ::std::fmt::Display for ValidationCacheEntryKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ValidationCacheEntry => f.write_str("validation_cache_entry"),
        }
    }
}
impl ::std::str::FromStr for ValidationCacheEntryKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "validation_cache_entry" => Ok(Self::ValidationCacheEntry),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationCacheEntryKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationCacheEntryKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationCacheEntryKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationCacheEntryState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "ready",
///    "stale",
///    "expired",
///    "invalid"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationCacheEntryState {
    #[serde(rename = "ready")]
    Ready,
    #[serde(rename = "stale")]
    Stale,
    #[serde(rename = "expired")]
    Expired,
    #[serde(rename = "invalid")]
    Invalid,
}
impl ::std::fmt::Display for ValidationCacheEntryState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Ready => f.write_str("ready"),
            Self::Stale => f.write_str("stale"),
            Self::Expired => f.write_str("expired"),
            Self::Invalid => f.write_str("invalid"),
        }
    }
}
impl ::std::str::FromStr for ValidationCacheEntryState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "ready" => Ok(Self::Ready),
            "stale" => Ok(Self::Stale),
            "expired" => Ok(Self::Expired),
            "invalid" => Ok(Self::Invalid),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationCacheEntryState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationCacheEntryState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationCacheEntryState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationDiagnostic`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "commandId",
///    "diagnosticId",
///    "errorSignatureAssessment",
///    "evidenceObjectAssessment",
///    "exitStatusAssessment",
///    "redactedExcerpt",
///    "truncated"
///  ],
///  "properties": {
///    "commandId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "diagnosticId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "errorSignature": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "errorSignatureAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "evidenceObjectAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "evidenceObjectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "exitStatus": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": -2147483648.0
///    },
///    "exitStatusAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "redactedExcerpt": {
///      "type": "string",
///      "maxLength": 8192
///    },
///    "truncated": {
///      "type": "boolean"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidationDiagnostic {
    #[serde(rename = "commandId")]
    pub command_id: EntityId,
    #[serde(rename = "diagnosticId")]
    pub diagnostic_id: EntityId,
    #[serde(
        rename = "errorSignature",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub error_signature: ::std::option::Option<ShortString>,
    #[serde(rename = "errorSignatureAssessment")]
    pub error_signature_assessment: Assessment,
    #[serde(rename = "evidenceObjectAssessment")]
    pub evidence_object_assessment: Assessment,
    #[serde(
        rename = "evidenceObjectId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub evidence_object_id: ::std::option::Option<EntityId>,
    #[serde(
        rename = "exitStatus",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub exit_status: ::std::option::Option<i32>,
    #[serde(rename = "exitStatusAssessment")]
    pub exit_status_assessment: Assessment,
    #[serde(rename = "redactedExcerpt")]
    pub redacted_excerpt: ValidationDiagnosticRedactedExcerpt,
    pub truncated: bool,
}
///`ValidationDiagnosticRedactedExcerpt`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 8192
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct ValidationDiagnosticRedactedExcerpt(::std::string::String);
impl ::std::ops::Deref for ValidationDiagnosticRedactedExcerpt {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<ValidationDiagnosticRedactedExcerpt> for ::std::string::String {
    fn from(value: ValidationDiagnosticRedactedExcerpt) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for ValidationDiagnosticRedactedExcerpt {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 8192usize {
            return Err("longer than 8192 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for ValidationDiagnosticRedactedExcerpt {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationDiagnosticRedactedExcerpt {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationDiagnosticRedactedExcerpt {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for ValidationDiagnosticRedactedExcerpt {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`ValidationJob`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "attempt",
///    "cacheAssessment",
///    "candidateId",
///    "createdAt",
///    "currentPhaseAssessment",
///    "daytonaSandboxAssessment",
///    "jobKeyDigest",
///    "kind",
///    "projectId",
///    "schemaVersion",
///    "state",
///    "targetId",
///    "updatedAt",
///    "validationBatchId",
///    "validationJobId",
///    "workspaceId"
///  ],
///  "properties": {
///    "attempt": {
///      "type": "integer",
///      "maximum": 100.0,
///      "minimum": 1.0
///    },
///    "cacheAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "cacheEntryId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "candidateId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "currentPhaseAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "currentPhaseId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "daytonaSandboxAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "daytonaSandboxId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "jobKeyDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "kind": {
///      "enum": [
///        "validation_job"
///      ]
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "queued",
///        "provisioning",
///        "preflight",
///        "source_prepare",
///        "resolve",
///        "install",
///        "build",
///        "test",
///        "smoke",
///        "benchmark",
///        "evidence_persist",
///        "cleanup",
///        "terminal"
///      ]
///    },
///    "targetId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "updatedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "validationBatchId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "validationJobId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidationJob {
    pub attempt: ::std::num::NonZeroU64,
    #[serde(rename = "cacheAssessment")]
    pub cache_assessment: Assessment,
    #[serde(
        rename = "cacheEntryId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub cache_entry_id: ::std::option::Option<EntityId>,
    #[serde(rename = "candidateId")]
    pub candidate_id: EntityId,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "currentPhaseAssessment")]
    pub current_phase_assessment: Assessment,
    #[serde(
        rename = "currentPhaseId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub current_phase_id: ::std::option::Option<EntityId>,
    #[serde(rename = "daytonaSandboxAssessment")]
    pub daytona_sandbox_assessment: Assessment,
    #[serde(
        rename = "daytonaSandboxId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub daytona_sandbox_id: ::std::option::Option<EntityId>,
    #[serde(rename = "jobKeyDigest")]
    pub job_key_digest: Sha256Digest,
    pub kind: ValidationJobKind,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    pub state: ValidationJobState,
    #[serde(rename = "targetId")]
    pub target_id: EntityId,
    #[serde(rename = "updatedAt")]
    pub updated_at: Rfc3339Timestamp,
    #[serde(rename = "validationBatchId")]
    pub validation_batch_id: EntityId,
    #[serde(rename = "validationJobId")]
    pub validation_job_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ValidationJobKey`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "adapterVersionsDigest",
///    "behaviorContractDigest",
///    "candidatePatchDigest",
///    "immutableBaseDigest",
///    "kind",
///    "nativeToolVersionsDigest",
///    "networkPolicyDigest",
///    "policyDigest",
///    "ruleVersionsDigest",
///    "schemaVersion",
///    "REDACTEDBindingSchemaAssessment",
///    "sourceInputDigest",
///    "targetDigest",
///    "validatorVersion"
///  ],
///  "properties": {
///    "adapterVersionsDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "behaviorContractDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "candidatePatchDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "immutableBaseDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "kind": {
///      "enum": [
///        "validation_job_key"
///      ]
///    },
///    "nativeToolVersionsDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "networkPolicyDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "policyDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "ruleVersionsDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "REDACTEDBindingSchemaAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "REDACTEDBindingSchemaDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "sourceInputDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "targetDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "validatorVersion": {
///      "$ref": "#/$defs/ShortString"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidationJobKey {
    #[serde(rename = "adapterVersionsDigest")]
    pub adapter_versions_digest: Sha256Digest,
    #[serde(rename = "behaviorContractDigest")]
    pub behavior_contract_digest: Sha256Digest,
    #[serde(rename = "candidatePatchDigest")]
    pub candidate_patch_digest: Sha256Digest,
    #[serde(rename = "immutableBaseDigest")]
    pub immutable_base_digest: Sha256Digest,
    pub kind: ValidationJobKeyKind,
    #[serde(rename = "nativeToolVersionsDigest")]
    pub native_tool_versions_digest: Sha256Digest,
    #[serde(rename = "networkPolicyDigest")]
    pub network_policy_digest: Sha256Digest,
    #[serde(rename = "policyDigest")]
    pub policy_digest: Sha256Digest,
    #[serde(rename = "ruleVersionsDigest")]
    pub rule_versions_digest: Sha256Digest,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "REDACTEDBindingSchemaAssessment")]
    pub REDACTED_binding_schema_assessment: Assessment,
    #[serde(
        rename = "REDACTEDBindingSchemaDigest",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub REDACTED_binding_schema_digest: ::std::option::Option<Sha256Digest>,
    #[serde(rename = "sourceInputDigest")]
    pub source_input_digest: Sha256Digest,
    #[serde(rename = "targetDigest")]
    pub target_digest: Sha256Digest,
    #[serde(rename = "validatorVersion")]
    pub validator_version: ShortString,
}
///`ValidationJobKeyKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "validation_job_key"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationJobKeyKind {
    #[serde(rename = "validation_job_key")]
    ValidationJobKey,
}
impl ::std::fmt::Display for ValidationJobKeyKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ValidationJobKey => f.write_str("validation_job_key"),
        }
    }
}
impl ::std::str::FromStr for ValidationJobKeyKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "validation_job_key" => Ok(Self::ValidationJobKey),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationJobKeyKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationJobKeyKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationJobKeyKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationJobKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "validation_job"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationJobKind {
    #[serde(rename = "validation_job")]
    ValidationJob,
}
impl ::std::fmt::Display for ValidationJobKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ValidationJob => f.write_str("validation_job"),
        }
    }
}
impl ::std::str::FromStr for ValidationJobKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "validation_job" => Ok(Self::ValidationJob),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationJobKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationJobKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationJobKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationJobState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "queued",
///    "provisioning",
///    "preflight",
///    "source_prepare",
///    "resolve",
///    "install",
///    "build",
///    "test",
///    "smoke",
///    "benchmark",
///    "evidence_persist",
///    "cleanup",
///    "terminal"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationJobState {
    #[serde(rename = "queued")]
    Queued,
    #[serde(rename = "provisioning")]
    Provisioning,
    #[serde(rename = "preflight")]
    Preflight,
    #[serde(rename = "source_prepare")]
    SourcePrepare,
    #[serde(rename = "resolve")]
    Resolve,
    #[serde(rename = "install")]
    Install,
    #[serde(rename = "build")]
    Build,
    #[serde(rename = "test")]
    Test,
    #[serde(rename = "smoke")]
    Smoke,
    #[serde(rename = "benchmark")]
    Benchmark,
    #[serde(rename = "evidence_persist")]
    EvidencePersist,
    #[serde(rename = "cleanup")]
    Cleanup,
    #[serde(rename = "terminal")]
    Terminal,
}
impl ::std::fmt::Display for ValidationJobState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Queued => f.write_str("queued"),
            Self::Provisioning => f.write_str("provisioning"),
            Self::Preflight => f.write_str("preflight"),
            Self::SourcePrepare => f.write_str("source_prepare"),
            Self::Resolve => f.write_str("resolve"),
            Self::Install => f.write_str("install"),
            Self::Build => f.write_str("build"),
            Self::Test => f.write_str("test"),
            Self::Smoke => f.write_str("smoke"),
            Self::Benchmark => f.write_str("benchmark"),
            Self::EvidencePersist => f.write_str("evidence_persist"),
            Self::Cleanup => f.write_str("cleanup"),
            Self::Terminal => f.write_str("terminal"),
        }
    }
}
impl ::std::str::FromStr for ValidationJobState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "queued" => Ok(Self::Queued),
            "provisioning" => Ok(Self::Provisioning),
            "preflight" => Ok(Self::Preflight),
            "source_prepare" => Ok(Self::SourcePrepare),
            "resolve" => Ok(Self::Resolve),
            "install" => Ok(Self::Install),
            "build" => Ok(Self::Build),
            "test" => Ok(Self::Test),
            "smoke" => Ok(Self::Smoke),
            "benchmark" => Ok(Self::Benchmark),
            "evidence_persist" => Ok(Self::EvidencePersist),
            "cleanup" => Ok(Self::Cleanup),
            "terminal" => Ok(Self::Terminal),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationJobState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationJobState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationJobState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationMatrixCell`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "behaviorStepOutcomeIds",
///    "cacheAssessment",
///    "outcome",
///    "targetId",
///    "validationJobId"
///  ],
///  "properties": {
///    "behaviorStepOutcomeIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 1024
///    },
///    "cacheAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "outcome": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "targetId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "validationJobId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidationMatrixCell {
    #[serde(rename = "behaviorStepOutcomeIds")]
    pub behavior_step_outcome_ids: ::std::vec::Vec<EntityId>,
    #[serde(rename = "cacheAssessment")]
    pub cache_assessment: Assessment,
    pub outcome: ShortString,
    #[serde(rename = "targetId")]
    pub target_id: EntityId,
    #[serde(rename = "validationJobId")]
    pub validation_job_id: EntityId,
}
///`ValidationOutcome`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "candidateId",
///    "kind",
///    "originConfidence",
///    "phaseIds",
///    "result",
///    "schemaVersion",
///    "suspectedOrigin",
///    "targetId",
///    "terminalAt",
///    "validationJobId",
///    "validationOutcomeId"
///  ],
///  "properties": {
///    "candidateId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "kind": {
///      "enum": [
///        "validation_outcome"
///      ]
///    },
///    "originConfidence": {
///      "$ref": "#/$defs/Confidence"
///    },
///    "phaseIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 64,
///      "minItems": 1
///    },
///    "result": {
///      "$ref": "#/$defs/ValidationOutcomeResult"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "suspectedOrigin": {
///      "type": "string",
///      "enum": [
///        "project",
///        "candidate",
///        "daytona",
///        "registry",
///        "network",
///        "resource",
///        "unknown"
///      ]
///    },
///    "targetId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "terminalAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "validationJobId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "validationOutcomeId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidationOutcome {
    #[serde(rename = "candidateId")]
    pub candidate_id: EntityId,
    pub kind: ValidationOutcomeKind,
    #[serde(rename = "originConfidence")]
    pub origin_confidence: Confidence,
    #[serde(rename = "phaseIds")]
    pub phase_ids: ::std::vec::Vec<EntityId>,
    pub result: ValidationOutcomeResult,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "suspectedOrigin")]
    pub suspected_origin: ValidationOutcomeSuspectedOrigin,
    #[serde(rename = "targetId")]
    pub target_id: EntityId,
    #[serde(rename = "terminalAt")]
    pub terminal_at: Rfc3339Timestamp,
    #[serde(rename = "validationJobId")]
    pub validation_job_id: EntityId,
    #[serde(rename = "validationOutcomeId")]
    pub validation_outcome_id: EntityId,
}
///`ValidationOutcomeKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "validation_outcome"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationOutcomeKind {
    #[serde(rename = "validation_outcome")]
    ValidationOutcome,
}
impl ::std::fmt::Display for ValidationOutcomeKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ValidationOutcome => f.write_str("validation_outcome"),
        }
    }
}
impl ::std::str::FromStr for ValidationOutcomeKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "validation_outcome" => Ok(Self::ValidationOutcome),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationOutcomeKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationOutcomeKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationOutcomeKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationOutcomeResult`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "oneOf": [
///    {
///      "$ref": "#/$defs/PassedOutcome"
///    },
///    {
///      "$ref": "#/$defs/NonCleanupFailureOutcome"
///    },
///    {
///      "$ref": "#/$defs/CleanupFailedOutcome"
///    }
///  ]
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(untagged)]
pub enum ValidationOutcomeResult {
    PassedOutcome(PassedOutcome),
    NonCleanupFailureOutcome(NonCleanupFailureOutcome),
    CleanupFailedOutcome(CleanupFailedOutcome),
}
impl ::std::convert::From<PassedOutcome> for ValidationOutcomeResult {
    fn from(value: PassedOutcome) -> Self {
        Self::PassedOutcome(value)
    }
}
impl ::std::convert::From<NonCleanupFailureOutcome> for ValidationOutcomeResult {
    fn from(value: NonCleanupFailureOutcome) -> Self {
        Self::NonCleanupFailureOutcome(value)
    }
}
impl ::std::convert::From<CleanupFailedOutcome> for ValidationOutcomeResult {
    fn from(value: CleanupFailedOutcome) -> Self {
        Self::CleanupFailedOutcome(value)
    }
}
///`ValidationOutcomeSuspectedOrigin`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "project",
///    "candidate",
///    "daytona",
///    "registry",
///    "network",
///    "resource",
///    "unknown"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationOutcomeSuspectedOrigin {
    #[serde(rename = "project")]
    Project,
    #[serde(rename = "candidate")]
    Candidate,
    #[serde(rename = "daytona")]
    Daytona,
    #[serde(rename = "registry")]
    Registry,
    #[serde(rename = "network")]
    Network,
    #[serde(rename = "resource")]
    Resource,
    #[serde(rename = "unknown")]
    Unknown,
}
impl ::std::fmt::Display for ValidationOutcomeSuspectedOrigin {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Project => f.write_str("project"),
            Self::Candidate => f.write_str("candidate"),
            Self::Daytona => f.write_str("daytona"),
            Self::Registry => f.write_str("registry"),
            Self::Network => f.write_str("network"),
            Self::Resource => f.write_str("resource"),
            Self::Unknown => f.write_str("unknown"),
        }
    }
}
impl ::std::str::FromStr for ValidationOutcomeSuspectedOrigin {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "project" => Ok(Self::Project),
            "candidate" => Ok(Self::Candidate),
            "daytona" => Ok(Self::Daytona),
            "registry" => Ok(Self::Registry),
            "network" => Ok(Self::Network),
            "resource" => Ok(Self::Resource),
            "unknown" => Ok(Self::Unknown),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationOutcomeSuspectedOrigin {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationOutcomeSuspectedOrigin {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationOutcomeSuspectedOrigin {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationPhase`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "createdAt",
///    "diagnostics",
///    "durationAssessment",
///    "finishedAtAssessment",
///    "kind",
///    "phase",
///    "providerHealth",
///    "schemaVersion",
///    "startedAtAssessment",
///    "state",
///    "validationJobId",
///    "validationPhaseId"
///  ],
///  "properties": {
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "diagnostics": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/ValidationDiagnostic"
///      },
///      "maxItems": 256
///    },
///    "durationAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "durationMs": {
///      "$ref": "#/$defs/DurationMs"
///    },
///    "finishedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "finishedAtAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "kind": {
///      "enum": [
///        "validation_phase"
///      ]
///    },
///    "phase": {
///      "type": "string",
///      "enum": [
///        "provisioning",
///        "preflight",
///        "source_prepare",
///        "resolve",
///        "install",
///        "build",
///        "test",
///        "smoke",
///        "benchmark",
///        "evidence_persist",
///        "cleanup"
///      ]
///    },
///    "providerHealth": {
///      "$ref": "#/$defs/HealthState"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "startedAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "startedAtAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "state": {
///      "type": "string",
///      "enum": [
///        "queued",
///        "running",
///        "REDACTEDed",
///        "failed",
///        "timed_out",
///        "skipped",
///        "cancelled",
///        "inconclusive"
///      ]
///    },
///    "validationJobId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "validationPhaseId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidationPhase {
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    pub diagnostics: ::std::vec::Vec<ValidationDiagnostic>,
    #[serde(rename = "durationAssessment")]
    pub duration_assessment: Assessment,
    #[serde(
        rename = "durationMs",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub duration_ms: ::std::option::Option<DurationMs>,
    #[serde(
        rename = "finishedAt",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub finished_at: ::std::option::Option<Rfc3339Timestamp>,
    #[serde(rename = "finishedAtAssessment")]
    pub finished_at_assessment: Assessment,
    pub kind: ValidationPhaseKind,
    pub phase: ValidationPhasePhase,
    #[serde(rename = "providerHealth")]
    pub provider_health: HealthState,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(
        rename = "startedAt",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub started_at: ::std::option::Option<Rfc3339Timestamp>,
    #[serde(rename = "startedAtAssessment")]
    pub started_at_assessment: Assessment,
    pub state: ValidationPhaseState,
    #[serde(rename = "validationJobId")]
    pub validation_job_id: EntityId,
    #[serde(rename = "validationPhaseId")]
    pub validation_phase_id: EntityId,
}
///`ValidationPhaseKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "validation_phase"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationPhaseKind {
    #[serde(rename = "validation_phase")]
    ValidationPhase,
}
impl ::std::fmt::Display for ValidationPhaseKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ValidationPhase => f.write_str("validation_phase"),
        }
    }
}
impl ::std::str::FromStr for ValidationPhaseKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "validation_phase" => Ok(Self::ValidationPhase),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationPhaseKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationPhaseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationPhaseKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationPhasePhase`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "provisioning",
///    "preflight",
///    "source_prepare",
///    "resolve",
///    "install",
///    "build",
///    "test",
///    "smoke",
///    "benchmark",
///    "evidence_persist",
///    "cleanup"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationPhasePhase {
    #[serde(rename = "provisioning")]
    Provisioning,
    #[serde(rename = "preflight")]
    Preflight,
    #[serde(rename = "source_prepare")]
    SourcePrepare,
    #[serde(rename = "resolve")]
    Resolve,
    #[serde(rename = "install")]
    Install,
    #[serde(rename = "build")]
    Build,
    #[serde(rename = "test")]
    Test,
    #[serde(rename = "smoke")]
    Smoke,
    #[serde(rename = "benchmark")]
    Benchmark,
    #[serde(rename = "evidence_persist")]
    EvidencePersist,
    #[serde(rename = "cleanup")]
    Cleanup,
}
impl ::std::fmt::Display for ValidationPhasePhase {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Provisioning => f.write_str("provisioning"),
            Self::Preflight => f.write_str("preflight"),
            Self::SourcePrepare => f.write_str("source_prepare"),
            Self::Resolve => f.write_str("resolve"),
            Self::Install => f.write_str("install"),
            Self::Build => f.write_str("build"),
            Self::Test => f.write_str("test"),
            Self::Smoke => f.write_str("smoke"),
            Self::Benchmark => f.write_str("benchmark"),
            Self::EvidencePersist => f.write_str("evidence_persist"),
            Self::Cleanup => f.write_str("cleanup"),
        }
    }
}
impl ::std::str::FromStr for ValidationPhasePhase {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "provisioning" => Ok(Self::Provisioning),
            "preflight" => Ok(Self::Preflight),
            "source_prepare" => Ok(Self::SourcePrepare),
            "resolve" => Ok(Self::Resolve),
            "install" => Ok(Self::Install),
            "build" => Ok(Self::Build),
            "test" => Ok(Self::Test),
            "smoke" => Ok(Self::Smoke),
            "benchmark" => Ok(Self::Benchmark),
            "evidence_persist" => Ok(Self::EvidencePersist),
            "cleanup" => Ok(Self::Cleanup),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationPhasePhase {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationPhasePhase {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationPhasePhase {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationPhaseState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "queued",
///    "running",
///    "REDACTEDed",
///    "failed",
///    "timed_out",
///    "skipped",
///    "cancelled",
///    "inconclusive"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationPhaseState {
    #[serde(rename = "queued")]
    Queued,
    #[serde(rename = "running")]
    Running,
    #[serde(rename = "REDACTEDed")]
    Passed,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "timed_out")]
    TimedOut,
    #[serde(rename = "skipped")]
    Skipped,
    #[serde(rename = "cancelled")]
    Cancelled,
    #[serde(rename = "inconclusive")]
    Inconclusive,
}
impl ::std::fmt::Display for ValidationPhaseState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Queued => f.write_str("queued"),
            Self::Running => f.write_str("running"),
            Self::Passed => f.write_str("REDACTEDed"),
            Self::Failed => f.write_str("failed"),
            Self::TimedOut => f.write_str("timed_out"),
            Self::Skipped => f.write_str("skipped"),
            Self::Cancelled => f.write_str("cancelled"),
            Self::Inconclusive => f.write_str("inconclusive"),
        }
    }
}
impl ::std::str::FromStr for ValidationPhaseState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "queued" => Ok(Self::Queued),
            "running" => Ok(Self::Running),
            "REDACTEDed" => Ok(Self::Passed),
            "failed" => Ok(Self::Failed),
            "timed_out" => Ok(Self::TimedOut),
            "skipped" => Ok(Self::Skipped),
            "cancelled" => Ok(Self::Cancelled),
            "inconclusive" => Ok(Self::Inconclusive),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationPhaseState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationPhaseState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationPhaseState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`ValidationTarget`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "architecture",
///    "capabilityAssessment",
///    "createdAt",
///    "immutableBase",
///    "kind",
///    "managerSelections",
///    "name",
///    "networkPolicy",
///    "os",
///    "projectId",
///    "resourcePolicy",
///    "runtimeSelections",
///    "schemaVersion",
///    "targetDigest",
///    "targetId",
///    "workspaceId"
///  ],
///  "properties": {
///    "architecture": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "capabilityAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "immutableBase": {
///      "$ref": "#/$defs/ImmutableBaseIdentity"
///    },
///    "kind": {
///      "enum": [
///        "validation_target"
///      ]
///    },
///    "managerSelections": {
///      "$ref": "#/$defs/VersionMap"
///    },
///    "name": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "networkPolicy": {
///      "$ref": "#/$defs/NetworkPolicy"
///    },
///    "os": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "resourcePolicy": {
///      "$ref": "#/$defs/ResourcePolicy"
///    },
///    "runtimeSelections": {
///      "$ref": "#/$defs/VersionMap"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "targetDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "targetId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct ValidationTarget {
    pub architecture: ShortString,
    #[serde(rename = "capabilityAssessment")]
    pub capability_assessment: Assessment,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "immutableBase")]
    pub immutable_base: ImmutableBaseIdentity,
    pub kind: ValidationTargetKind,
    #[serde(rename = "managerSelections")]
    pub manager_selections: VersionMap,
    pub name: ShortString,
    #[serde(rename = "networkPolicy")]
    pub network_policy: NetworkPolicy,
    pub os: ShortString,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "resourcePolicy")]
    pub resource_policy: ResourcePolicy,
    #[serde(rename = "runtimeSelections")]
    pub runtime_selections: VersionMap,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "targetDigest")]
    pub target_digest: Sha256Digest,
    #[serde(rename = "targetId")]
    pub target_id: EntityId,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`ValidationTargetKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "validation_target"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum ValidationTargetKind {
    #[serde(rename = "validation_target")]
    ValidationTarget,
}
impl ::std::fmt::Display for ValidationTargetKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::ValidationTarget => f.write_str("validation_target"),
        }
    }
}
impl ::std::str::FromStr for ValidationTargetKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "validation_target" => Ok(Self::ValidationTarget),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for ValidationTargetKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for ValidationTargetKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for ValidationTargetKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`VerifiedCandidateState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "attestationId",
///    "state"
///  ],
///  "properties": {
///    "attestationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "state": {
///      "enum": [
///        "verified"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct VerifiedCandidateState {
    #[serde(rename = "attestationId")]
    pub attestation_id: EntityId,
    pub state: VerifiedCandidateStateState,
}
///`VerifiedCandidateStateState`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "verified"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum VerifiedCandidateStateState {
    #[serde(rename = "verified")]
    Verified,
}
impl ::std::fmt::Display for VerifiedCandidateStateState {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Verified => f.write_str("verified"),
        }
    }
}
impl ::std::str::FromStr for VerifiedCandidateStateState {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "verified" => Ok(Self::Verified),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for VerifiedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for VerifiedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for VerifiedCandidateStateState {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`VerifiedRecommendationProof`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "attestationDigest",
///    "attestationId",
///    "result"
///  ],
///  "properties": {
///    "attestationDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "attestationId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "result": {
///      "enum": [
///        "verified"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct VerifiedRecommendationProof {
    #[serde(rename = "attestationDigest")]
    pub attestation_digest: Sha256Digest,
    #[serde(rename = "attestationId")]
    pub attestation_id: EntityId,
    pub result: VerifiedRecommendationProofResult,
}
///`VerifiedRecommendationProofResult`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "verified"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum VerifiedRecommendationProofResult {
    #[serde(rename = "verified")]
    Verified,
}
impl ::std::fmt::Display for VerifiedRecommendationProofResult {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Verified => f.write_str("verified"),
        }
    }
}
impl ::std::str::FromStr for VerifiedRecommendationProofResult {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "verified" => Ok(Self::Verified),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for VerifiedRecommendationProofResult {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for VerifiedRecommendationProofResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for VerifiedRecommendationProofResult {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`VersionMap`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "maxProperties": 256,
///  "additionalProperties": {
///    "type": "string",
///    "maxLength": 256,
///    "minLength": 1
///  },
///  "propertyNames": {
///    "maxLength": 256,
///    "minLength": 1
///  }
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(transparent)]
pub struct VersionMap(pub ::std::collections::HashMap<VersionMapKey, VersionMapValue>);
impl ::std::ops::Deref for VersionMap {
    type Target = ::std::collections::HashMap<VersionMapKey, VersionMapValue>;
    fn deref(&self) -> &::std::collections::HashMap<VersionMapKey, VersionMapValue> {
        &self.0
    }
}
impl ::std::convert::From<VersionMap>
    for ::std::collections::HashMap<VersionMapKey, VersionMapValue>
{
    fn from(value: VersionMap) -> Self {
        value.0
    }
}
impl ::std::convert::From<::std::collections::HashMap<VersionMapKey, VersionMapValue>>
    for VersionMap
{
    fn from(value: ::std::collections::HashMap<VersionMapKey, VersionMapValue>) -> Self {
        Self(value)
    }
}
///`VersionMapKey`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 256,
///  "minLength": 1
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct VersionMapKey(::std::string::String);
impl ::std::ops::Deref for VersionMapKey {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<VersionMapKey> for ::std::string::String {
    fn from(value: VersionMapKey) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for VersionMapKey {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 256usize {
            return Err("longer than 256 characters".into());
        }
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for VersionMapKey {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for VersionMapKey {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for VersionMapKey {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for VersionMapKey {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`VersionMapValue`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "maxLength": 256,
///  "minLength": 1
///}
/// ```
/// </details>
#[derive(::serde::Serialize, Clone, Debug, Eq, Hash, Ord, PartialEq, PartialOrd)]
#[serde(transparent)]
pub struct VersionMapValue(::std::string::String);
impl ::std::ops::Deref for VersionMapValue {
    type Target = ::std::string::String;
    fn deref(&self) -> &::std::string::String {
        &self.0
    }
}
impl ::std::convert::From<VersionMapValue> for ::std::string::String {
    fn from(value: VersionMapValue) -> Self {
        value.0
    }
}
impl ::std::str::FromStr for VersionMapValue {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        if value.chars().count() > 256usize {
            return Err("longer than 256 characters".into());
        }
        if value.chars().count() < 1usize {
            return Err("shorter than 1 characters".into());
        }
        Ok(Self(value.to_string()))
    }
}
impl ::std::convert::TryFrom<&str> for VersionMapValue {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for VersionMapValue {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for VersionMapValue {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl<'de> ::serde::Deserialize<'de> for VersionMapValue {
    fn deserialize<D>(deserializer: D) -> ::std::result::Result<Self, D::Error>
    where
        D: ::serde::Deserializer<'de>,
    {
        ::std::string::String::deserialize(deserializer)?
            .parse()
            .map_err(|e: self::error::ConversionError| {
                <D::Error as ::serde::de::Error>::custom(e.to_string())
            })
    }
}
///`VersionedReference`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "id",
///    "version"
///  ],
///  "properties": {
///    "id": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "version": {
///      "type": "integer",
///      "maximum": 2147483647.0,
///      "minimum": 1.0
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct VersionedReference {
    pub id: EntityId,
    pub version: ::std::num::NonZeroU64,
}
///`WorkingTreeBundle`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "baseCommitSha",
///    "bundleId",
///    "contentDigest",
///    "excludedPathReasonCodes",
///    "includedPathDigests",
///    "kind",
///    "patchObjectId",
///    "resultingTreeDigest",
///    "schemaVersion",
///    "REDACTEDScanAssessment",
///    "sourceInputId"
///  ],
///  "properties": {
///    "baseCommitSha": {
///      "$ref": "#/$defs/GitObjectId"
///    },
///    "bundleId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "contentDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "excludedPathReasonCodes": {
///      "type": "object",
///      "maxProperties": 10000,
///      "additionalProperties": {
///        "$ref": "#/$defs/ShortString"
///      }
///    },
///    "includedPathDigests": {
///      "type": "object",
///      "maxProperties": 10000,
///      "additionalProperties": {
///        "$ref": "#/$defs/Sha256Digest"
///      }
///    },
///    "kind": {
///      "enum": [
///        "working_tree_bundle"
///      ]
///    },
///    "patchObjectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "resultingTreeDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "REDACTEDScanAssessment": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "sourceInputId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "untrackedObjectId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct WorkingTreeBundle {
    #[serde(rename = "baseCommitSha")]
    pub base_commit_sha: GitObjectId,
    #[serde(rename = "bundleId")]
    pub bundle_id: EntityId,
    #[serde(rename = "contentDigest")]
    pub content_digest: Sha256Digest,
    #[serde(rename = "excludedPathReasonCodes")]
    pub excluded_path_reason_codes: ::std::collections::HashMap<::std::string::String, ShortString>,
    #[serde(rename = "includedPathDigests")]
    pub included_path_digests: ::std::collections::HashMap<::std::string::String, Sha256Digest>,
    pub kind: WorkingTreeBundleKind,
    #[serde(rename = "patchObjectId")]
    pub patch_object_id: EntityId,
    #[serde(rename = "resultingTreeDigest")]
    pub resulting_tree_digest: Sha256Digest,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "REDACTEDScanAssessment")]
    pub REDACTED_scan_assessment: Assessment,
    #[serde(rename = "sourceInputId")]
    pub source_input_id: EntityId,
    #[serde(
        rename = "untrackedObjectId",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub untracked_object_id: ::std::option::Option<EntityId>,
}
///`WorkingTreeBundleKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "working_tree_bundle"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum WorkingTreeBundleKind {
    #[serde(rename = "working_tree_bundle")]
    WorkingTreeBundle,
}
impl ::std::fmt::Display for WorkingTreeBundleKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::WorkingTreeBundle => f.write_str("working_tree_bundle"),
        }
    }
}
impl ::std::str::FromStr for WorkingTreeBundleKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "working_tree_bundle" => Ok(Self::WorkingTreeBundle),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for WorkingTreeBundleKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for WorkingTreeBundleKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for WorkingTreeBundleKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`WorkingTreeSourceInput`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "baseCommitSha",
///    "bundleDigest",
///    "bundleObjectId",
///    "createdAt",
///    "ignorePolicyVersion",
///    "includedPathManifestDigest",
///    "kind",
///    "lfsIdentities",
///    "projectId",
///    "repositoryId",
///    "resultingTreeDigest",
///    "schemaVersion",
///    "REDACTEDScanPolicyVersion",
///    "sourceInputId",
///    "submoduleIdentities",
///    "supportGapIds",
///    "untrackedBundleState",
///    "workspaceId",
///    "worktreePatchDigest"
///  ],
///  "properties": {
///    "baseCommitSha": {
///      "$ref": "#/$defs/GitObjectId"
///    },
///    "bundleDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "bundleObjectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "ignorePolicyVersion": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "includedPathManifestDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "kind": {
///      "enum": [
///        "source_input_working_tree"
///      ]
///    },
///    "lfsIdentities": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/LfsIdentity"
///      },
///      "maxItems": 4096
///    },
///    "projectId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "repositoryId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "resultingTreeDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "REDACTEDScanPolicyVersion": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "sourceInputId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "submoduleIdentities": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/SubmoduleIdentity"
///      },
///      "maxItems": 1024
///    },
///    "supportGapIds": {
///      "type": "array",
///      "items": {
///        "$ref": "#/$defs/EntityId"
///      },
///      "maxItems": 512
///    },
///    "untrackedBundleDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    },
///    "untrackedBundleState": {
///      "$ref": "#/$defs/Assessment"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    },
///    "worktreePatchDigest": {
///      "$ref": "#/$defs/Sha256Digest"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct WorkingTreeSourceInput {
    #[serde(rename = "baseCommitSha")]
    pub base_commit_sha: GitObjectId,
    #[serde(rename = "bundleDigest")]
    pub bundle_digest: Sha256Digest,
    #[serde(rename = "bundleObjectId")]
    pub bundle_object_id: EntityId,
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    #[serde(rename = "ignorePolicyVersion")]
    pub ignore_policy_version: ShortString,
    #[serde(rename = "includedPathManifestDigest")]
    pub included_path_manifest_digest: Sha256Digest,
    pub kind: WorkingTreeSourceInputKind,
    #[serde(rename = "lfsIdentities")]
    pub lfs_identities: ::std::vec::Vec<LfsIdentity>,
    #[serde(rename = "projectId")]
    pub project_id: EntityId,
    #[serde(rename = "repositoryId")]
    pub repository_id: EntityId,
    #[serde(rename = "resultingTreeDigest")]
    pub resulting_tree_digest: Sha256Digest,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "REDACTEDScanPolicyVersion")]
    pub REDACTED_scan_policy_version: ShortString,
    #[serde(rename = "sourceInputId")]
    pub source_input_id: EntityId,
    #[serde(rename = "submoduleIdentities")]
    pub submodule_identities: ::std::vec::Vec<SubmoduleIdentity>,
    #[serde(rename = "supportGapIds")]
    pub support_gap_ids: ::std::vec::Vec<EntityId>,
    #[serde(
        rename = "untrackedBundleDigest",
        default,
        skip_serializing_if = "::std::option::Option::is_none"
    )]
    pub untracked_bundle_digest: ::std::option::Option<Sha256Digest>,
    #[serde(rename = "untrackedBundleState")]
    pub untracked_bundle_state: Assessment,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
    #[serde(rename = "worktreePatchDigest")]
    pub worktree_patch_digest: Sha256Digest,
}
///`WorkingTreeSourceInputKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "source_input_working_tree"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum WorkingTreeSourceInputKind {
    #[serde(rename = "source_input_working_tree")]
    SourceInputWorkingTree,
}
impl ::std::fmt::Display for WorkingTreeSourceInputKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::SourceInputWorkingTree => f.write_str("source_input_working_tree"),
        }
    }
}
impl ::std::str::FromStr for WorkingTreeSourceInputKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "source_input_working_tree" => Ok(Self::SourceInputWorkingTree),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for WorkingTreeSourceInputKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for WorkingTreeSourceInputKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for WorkingTreeSourceInputKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`Workspace`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "createdAt",
///    "kind",
///    "name",
///    "retentionClass",
///    "schemaVersion",
///    "workspaceId"
///  ],
///  "properties": {
///    "createdAt": {
///      "$ref": "#/$defs/Rfc3339Timestamp"
///    },
///    "kind": {
///      "enum": [
///        "workspace"
///      ]
///    },
///    "name": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "retentionClass": {
///      "$ref": "#/$defs/ShortString"
///    },
///    "schemaVersion": {
///      "$ref": "#/$defs/SchemaVersion"
///    },
///    "workspaceId": {
///      "$ref": "#/$defs/EntityId"
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct Workspace {
    #[serde(rename = "createdAt")]
    pub created_at: Rfc3339Timestamp,
    pub kind: WorkspaceKind,
    pub name: ShortString,
    #[serde(rename = "retentionClass")]
    pub retention_class: ShortString,
    #[serde(rename = "schemaVersion")]
    pub schema_version: SchemaVersion,
    #[serde(rename = "workspaceId")]
    pub workspace_id: EntityId,
}
///`WorkspaceEnrollCommand`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "object",
///  "required": [
///    "enrollmentToken",
///    "type"
///  ],
///  "properties": {
///    "enrollmentToken": {
///      "$ref": "#/$defs/OpaqueTokenId"
///    },
///    "type": {
///      "enum": [
///        "workspace.enroll"
///      ]
///    }
///  },
///  "additionalProperties": false
///}
/// ```
/// </details>
#[derive(::serde::Deserialize, ::serde::Serialize, Clone, Debug)]
#[serde(deny_unknown_fields)]
pub struct WorkspaceEnrollCommand {
    #[serde(rename = "enrollmentToken")]
    pub enrollment_REDACTED: OpaqueTokenId,
    #[serde(rename = "type")]
    pub type_: WorkspaceEnrollCommandType,
}
///`WorkspaceEnrollCommandType`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "workspace.enroll"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum WorkspaceEnrollCommandType {
    #[serde(rename = "workspace.enroll")]
    WorkspaceEnroll,
}
impl ::std::fmt::Display for WorkspaceEnrollCommandType {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::WorkspaceEnroll => f.write_str("workspace.enroll"),
        }
    }
}
impl ::std::str::FromStr for WorkspaceEnrollCommandType {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "workspace.enroll" => Ok(Self::WorkspaceEnroll),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for WorkspaceEnrollCommandType {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for WorkspaceEnrollCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for WorkspaceEnrollCommandType {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`WorkspaceKind`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "enum": [
///    "workspace"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum WorkspaceKind {
    #[serde(rename = "workspace")]
    Workspace,
}
impl ::std::fmt::Display for WorkspaceKind {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Workspace => f.write_str("workspace"),
        }
    }
}
impl ::std::str::FromStr for WorkspaceKind {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "workspace" => Ok(Self::Workspace),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for WorkspaceKind {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for WorkspaceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for WorkspaceKind {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
///`WorkspaceRole`
///
/// <details><summary>JSON schema</summary>
///
/// ```json
///{
///  "type": "string",
///  "enum": [
///    "owner",
///    "member"
///  ]
///}
/// ```
/// </details>
#[derive(
    ::serde::Deserialize,
    ::serde::Serialize,
    Clone,
    Copy,
    Debug,
    Eq,
    Hash,
    Ord,
    PartialEq,
    PartialOrd,
)]
pub enum WorkspaceRole {
    #[serde(rename = "owner")]
    Owner,
    #[serde(rename = "member")]
    Member,
}
impl ::std::fmt::Display for WorkspaceRole {
    fn fmt(&self, f: &mut ::std::fmt::Formatter<'_>) -> ::std::fmt::Result {
        match *self {
            Self::Owner => f.write_str("owner"),
            Self::Member => f.write_str("member"),
        }
    }
}
impl ::std::str::FromStr for WorkspaceRole {
    type Err = self::error::ConversionError;
    fn from_str(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        match value {
            "owner" => Ok(Self::Owner),
            "member" => Ok(Self::Member),
            _ => Err("invalid value".into()),
        }
    }
}
impl ::std::convert::TryFrom<&str> for WorkspaceRole {
    type Error = self::error::ConversionError;
    fn try_from(value: &str) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<&::std::string::String> for WorkspaceRole {
    type Error = self::error::ConversionError;
    fn try_from(
        value: &::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
impl ::std::convert::TryFrom<::std::string::String> for WorkspaceRole {
    type Error = self::error::ConversionError;
    fn try_from(
        value: ::std::string::String,
    ) -> ::std::result::Result<Self, self::error::ConversionError> {
        value.parse()
    }
}
