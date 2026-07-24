//! Non-secret companion configuration.

use std::{
    env,
    error::Error,
    fmt,
    path::{Path, PathBuf},
    time::Duration,
};

const DEFAULT_MAX_SPOOL_BYTES: u64 = 256 * 1024 * 1024;
const DEFAULT_MAX_PENDING_EVENTS: u64 = 100_000;
const DEFAULT_BATCH_SIZE: usize = 250;
const DEFAULT_HEALTH_INTERVAL_SECONDS: u64 = 30;

/// Validated runtime configuration. Credential material is deliberately absent.
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct CompanionConfig {
    pub data_directory: PathBuf,
    pub spool_path: PathBuf,
    pub credential_service: String,
    pub max_spool_bytes: u64,
    pub max_pending_events: u64,
    pub batch_size: usize,
    pub health_interval: Duration,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ConfigErrorCode {
    InvalidPath,
    InvalidNumber,
    InvalidService,
}

#[derive(Debug)]
pub struct ConfigError {
    code: ConfigErrorCode,
    field: &'static str,
}

impl ConfigError {
    const fn new(code: ConfigErrorCode, field: &'static str) -> Self {
        Self { code, field }
    }

    #[must_use]
    pub const fn code(&self) -> ConfigErrorCode {
        self.code
    }
}

impl fmt::Display for ConfigError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(
            formatter,
            "invalid companion configuration field {}",
            self.field
        )
    }
}

impl Error for ConfigError {}

impl CompanionConfig {
    /// Load non-secret configuration from the process environment.
    ///
    /// # Errors
    ///
    /// Returns a classified error when a configured limit or path is invalid.
    pub fn from_environment() -> Result<Self, ConfigError> {
        Self::from_lookup(|name| env::var(name).ok())
    }

    /// Load configuration through an injected lookup, primarily for deterministic tests.
    ///
    /// # Errors
    ///
    /// Returns a classified error when a configured limit or path is invalid.
    pub fn from_lookup(lookup: impl Fn(&str) -> Option<String>) -> Result<Self, ConfigError> {
        let data_directory =
            lookup("ER_COMPANION_DATA_DIR").map_or_else(default_data_directory, PathBuf::from);
        validate_path(&data_directory, "ER_COMPANION_DATA_DIR")?;

        let spool_path = lookup("ER_COMPANION_SPOOL_PATH")
            .map_or_else(|| data_directory.join("event-spool.sqlite3"), PathBuf::from);
        validate_path(&spool_path, "ER_COMPANION_SPOOL_PATH")?;

        let credential_service = lookup("ER_COMPANION_CREDENTIAL_SERVICE")
            .unwrap_or_else(|| "dev.environment-reconciler.companion".to_owned());
        if credential_service.trim().is_empty()
            || credential_service.len() > 200
            || credential_service.chars().any(char::is_control)
        {
            return Err(ConfigError::new(
                ConfigErrorCode::InvalidService,
                "ER_COMPANION_CREDENTIAL_SERVICE",
            ));
        }

        let max_spool_bytes = parse_u64(
            lookup("ER_COMPANION_MAX_SPOOL_BYTES"),
            DEFAULT_MAX_SPOOL_BYTES,
            "ER_COMPANION_MAX_SPOOL_BYTES",
            1024 * 1024,
        )?;
        let max_pending_events = parse_u64(
            lookup("ER_COMPANION_MAX_PENDING_EVENTS"),
            DEFAULT_MAX_PENDING_EVENTS,
            "ER_COMPANION_MAX_PENDING_EVENTS",
            1,
        )?;
        let batch_size_u64 = parse_u64(
            lookup("ER_COMPANION_BATCH_SIZE"),
            DEFAULT_BATCH_SIZE as u64,
            "ER_COMPANION_BATCH_SIZE",
            1,
        )?;
        let batch_size = usize::try_from(batch_size_u64).map_err(|_| {
            ConfigError::new(ConfigErrorCode::InvalidNumber, "ER_COMPANION_BATCH_SIZE")
        })?;
        if batch_size > 10_000 {
            return Err(ConfigError::new(
                ConfigErrorCode::InvalidNumber,
                "ER_COMPANION_BATCH_SIZE",
            ));
        }
        let health_seconds = parse_u64(
            lookup("ER_COMPANION_HEALTH_INTERVAL_SECONDS"),
            DEFAULT_HEALTH_INTERVAL_SECONDS,
            "ER_COMPANION_HEALTH_INTERVAL_SECONDS",
            1,
        )?;

        Ok(Self {
            data_directory,
            spool_path,
            credential_service,
            max_spool_bytes,
            max_pending_events,
            batch_size,
            health_interval: Duration::from_secs(health_seconds),
        })
    }
}

fn validate_path(path: &Path, field: &'static str) -> Result<(), ConfigError> {
    if path.as_os_str().is_empty() {
        return Err(ConfigError::new(ConfigErrorCode::InvalidPath, field));
    }
    Ok(())
}

fn parse_u64(
    configured: Option<String>,
    default: u64,
    field: &'static str,
    minimum: u64,
) -> Result<u64, ConfigError> {
    let value = configured.map_or(Ok(default), |text| {
        text.parse::<u64>()
            .map_err(|_| ConfigError::new(ConfigErrorCode::InvalidNumber, field))
    })?;
    if value < minimum {
        return Err(ConfigError::new(ConfigErrorCode::InvalidNumber, field));
    }
    Ok(value)
}

fn default_data_directory() -> PathBuf {
    if cfg!(windows) {
        env::var_os("LOCALAPPDATA").map_or_else(
            || PathBuf::from(".environment-reconciler"),
            |path| PathBuf::from(path).join("EnvironmentReconciler"),
        )
    } else {
        env::var_os("XDG_DATA_HOME").map_or_else(
            || {
                env::var_os("HOME").map_or_else(
                    || PathBuf::from(".environment-reconciler"),
                    |path| PathBuf::from(path).join(".local/share/environment-reconciler"),
                )
            },
            |path| PathBuf::from(path).join("environment-reconciler"),
        )
    }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;

    use super::{CompanionConfig, ConfigErrorCode};

    #[test]
    fn loads_valid_bounded_non_secret_configuration() {
        let values = HashMap::from([
            ("ER_COMPANION_DATA_DIR", "fixture-data"),
            ("ER_COMPANION_MAX_SPOOL_BYTES", "1048576"),
            ("ER_COMPANION_MAX_PENDING_EVENTS", "50"),
            ("ER_COMPANION_BATCH_SIZE", "10"),
            ("ER_COMPANION_HEALTH_INTERVAL_SECONDS", "5"),
        ]);
        let config = CompanionConfig::from_lookup(|name| values.get(name).map(ToString::to_string))
            .expect("fixture configuration must be valid");

        assert_eq!(config.data_directory.to_string_lossy(), "fixture-data");
        assert_eq!(config.max_pending_events, 50);
        assert_eq!(config.batch_size, 10);
    }

    #[test]
    fn rejects_zero_and_unbounded_batch_values() {
        let zero = CompanionConfig::from_lookup(|name| {
            (name == "ER_COMPANION_BATCH_SIZE").then(|| "0".to_owned())
        })
        .expect_err("zero batch size must fail");
        assert_eq!(zero.code(), ConfigErrorCode::InvalidNumber);

        let huge = CompanionConfig::from_lookup(|name| {
            (name == "ER_COMPANION_BATCH_SIZE").then(|| "10001".to_owned())
        })
        .expect_err("unbounded batch size must fail");
        assert_eq!(huge.code(), ConfigErrorCode::InvalidNumber);
    }
}
