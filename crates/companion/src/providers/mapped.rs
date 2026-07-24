//! Shared normalization for providers exposing IWOMC's versioned local hook surface.

use std::{collections::BTreeSet, error::Error, fmt};

use serde_json::Value;

use super::codex::{
    AdapterOutput, CapabilityState, CodexAdapter, CodexAdapterConfig, CodexAdapterErrorCode,
    CodexCapabilities, ProviderCapabilityProfile,
};
use crate::{observation::CaptureGapCode, redaction::Redactor};

#[derive(Clone, Debug, Eq, PartialEq)]
pub struct LocalProviderConfig {
    pub provider_version: String,
    pub hooks_enabled: bool,
    pub hosted_execution: bool,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum LocalProviderErrorCode {
    InvalidPayload,
    UnsupportedSchemaVersion,
    WrongProvider,
}

#[derive(Debug)]
pub struct LocalProviderError {
    code: LocalProviderErrorCode,
}

impl LocalProviderError {
    #[must_use]
    pub const fn code(&self) -> LocalProviderErrorCode {
        self.code
    }
}

impl fmt::Display for LocalProviderError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("local provider hook payload normalization failed")
    }
}

impl Error for LocalProviderError {}

pub struct MappedLocalAdapter {
    provider: &'static str,
    adapter_version: &'static str,
    surface: &'static str,
    config: LocalProviderConfig,
    inner: CodexAdapter,
    capabilities: CodexCapabilities,
}

impl MappedLocalAdapter {
    pub fn new(
        provider: &'static str,
        adapter_version: &'static str,
        surface: &'static str,
        config: LocalProviderConfig,
        capabilities: CodexCapabilities,
        redactor: Redactor,
    ) -> Self {
        let inner = CodexAdapter::new(
            CodexAdapterConfig {
                provider_version: config.provider_version.clone(),
                surface: surface.to_owned(),
                hooks_enabled: config.hooks_enabled,
                hosted_execution: config.hosted_execution,
            },
            redactor,
        );
        Self {
            provider,
            adapter_version,
            surface,
            config,
            inner,
            capabilities,
        }
    }

    pub fn inspect(&self) -> ProviderCapabilityProfile {
        let unavailable = !self.config.hooks_enabled || self.config.hosted_execution;
        let mut capabilities = self.capabilities.clone();
        if unavailable {
            capabilities = unavailable_capabilities();
        }
        let mut known_gaps = BTreeSet::new();
        if !self.config.hooks_enabled {
            known_gaps.insert(CaptureGapCode::DisabledHook);
        }
        if self.config.hosted_execution {
            known_gaps.insert(CaptureGapCode::UnsupportedHostedExecution);
        }
        ProviderCapabilityProfile {
            provider: self.provider.to_owned(),
            surface: self.surface.to_owned(),
            provider_version: self.config.provider_version.clone(),
            adapter_version: self.adapter_version.to_owned(),
            hooks_enabled: self.config.hooks_enabled,
            capabilities,
            known_gaps,
        }
    }

    pub fn normalize(&mut self, bytes: &[u8]) -> Result<AdapterOutput, LocalProviderError> {
        let mut document: Value =
            serde_json::from_slice(bytes).map_err(|_| LocalProviderError {
                code: LocalProviderErrorCode::InvalidPayload,
            })?;
        let object = document.as_object_mut().ok_or(LocalProviderError {
            code: LocalProviderErrorCode::InvalidPayload,
        })?;
        if object.get("provider").and_then(Value::as_str) != Some(self.provider) {
            return Err(LocalProviderError {
                code: LocalProviderErrorCode::WrongProvider,
            });
        }
        object.insert("provider".to_owned(), Value::String("codex".to_owned()));
        let canonical = serde_json::to_vec(&document).map_err(|_| LocalProviderError {
            code: LocalProviderErrorCode::InvalidPayload,
        })?;
        let mut output = self.inner.normalize(&canonical).map_err(|error| {
            let code = match error.code() {
                CodexAdapterErrorCode::InvalidPayload => LocalProviderErrorCode::InvalidPayload,
                CodexAdapterErrorCode::UnsupportedSchemaVersion => {
                    LocalProviderErrorCode::UnsupportedSchemaVersion
                }
                CodexAdapterErrorCode::WrongProvider => LocalProviderErrorCode::WrongProvider,
            };
            LocalProviderError { code }
        })?;
        if let Some(event) = &mut output.event {
            self.provider.clone_into(&mut event.provider);
            if let Some(action) = &mut event.action {
                self.provider.clone_into(&mut action.provider);
            }
        }
        Ok(output)
    }
}

fn unavailable_capabilities() -> CodexCapabilities {
    CodexCapabilities {
        session_lifecycle: CapabilityState::Unavailable,
        tool_lifecycle: CapabilityState::Unavailable,
        shell_commands: CapabilityState::Unavailable,
        command_results: CapabilityState::Unavailable,
        file_operations: CapabilityState::Unavailable,
        permission_decisions: CapabilityState::Unavailable,
        subagents: CapabilityState::Unavailable,
        source_sequence: CapabilityState::Unavailable,
        raw_reasoning: CapabilityState::Unavailable,
    }
}
