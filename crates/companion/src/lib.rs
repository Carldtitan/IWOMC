#![forbid(unsafe_code)]

pub mod chain;
pub mod config;
pub mod contracts;
pub mod credentials;
pub mod crypto;
pub mod health;
pub mod ipc;
pub mod logging;
pub mod observation;
pub mod observation_lease;
pub mod providers;
pub mod python_inventory;
pub mod redaction;
pub mod shutdown;
pub mod spool;

/// Build-time information that is safe to expose over the future local IPC
/// health endpoint.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct BuildInfo {
    /// Current major protocol version understood by this binary.
    pub protocol_version: u16,
    /// Package version embedded by Cargo.
    pub version: &'static str,
}

/// Returns deterministic build metadata without inspecting the host.
#[must_use]
pub const fn build_info() -> BuildInfo {
    BuildInfo {
        protocol_version: 1,
        version: env!("CARGO_PKG_VERSION"),
    }
}

#[cfg(test)]
mod tests {
    use super::build_info;

    #[test]
    fn exposes_the_foundation_protocol_version() {
        let info = build_info();

        assert_eq!(info.protocol_version, 1);
        assert!(!info.version.is_empty());
    }
}
