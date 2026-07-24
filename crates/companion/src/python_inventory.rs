//! Read-only native inventory collection for pip and uv.

use std::{error::Error, fmt, process::Command};

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum PythonManager {
    Pip,
    Uv,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum EnvironmentScope {
    Project,
    VirtualEnvironment,
    User,
    Global,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PythonInventoryPackage {
    pub ecosystem: &'static str,
    pub name: String,
    pub normalized_name: String,
    pub version: String,
    pub environment_scope: EnvironmentScope,
    pub editable_project_location: Option<String>,
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PythonInventoryResult {
    pub schema_version: u16,
    pub manager: PythonManager,
    pub interpreter: String,
    pub environment_scope: EnvironmentScope,
    pub packages: Vec<PythonInventoryPackage>,
}

#[derive(Clone, Debug, Deserialize)]
struct NativePackage {
    name: String,
    version: String,
    editable_project_location: Option<String>,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum PythonInventoryErrorCode {
    ExecutionFailed,
    InvalidOutput,
}

#[derive(Debug)]
pub struct PythonInventoryError {
    code: PythonInventoryErrorCode,
}

impl PythonInventoryError {
    #[must_use]
    pub const fn code(&self) -> PythonInventoryErrorCode {
        self.code
    }
}

impl fmt::Display for PythonInventoryError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("Python inventory collection failed")
    }
}

impl Error for PythonInventoryError {}

pub trait ReadOnlyCommandRunner {
    /// Executes a read-only native inventory command.
    ///
    /// # Errors
    ///
    /// Returns an error when the process fails.
    fn output(&self, executable: &str, arguments: &[&str])
    -> Result<Vec<u8>, PythonInventoryError>;
}

pub struct SystemCommandRunner;

impl ReadOnlyCommandRunner for SystemCommandRunner {
    fn output(
        &self,
        executable: &str,
        arguments: &[&str],
    ) -> Result<Vec<u8>, PythonInventoryError> {
        let output = Command::new(executable)
            .args(arguments)
            .output()
            .map_err(|_| PythonInventoryError {
                code: PythonInventoryErrorCode::ExecutionFailed,
            })?;
        if !output.status.success() {
            return Err(PythonInventoryError {
                code: PythonInventoryErrorCode::ExecutionFailed,
            });
        }
        Ok(output.stdout)
    }
}

/// Collects the installed graph without mutating the Python environment.
///
/// # Errors
///
/// Returns an error when the native command fails or emits invalid JSON.
pub fn collect_python_inventory(
    runner: &impl ReadOnlyCommandRunner,
    manager: PythonManager,
    interpreter: &str,
    environment_scope: EnvironmentScope,
) -> Result<PythonInventoryResult, PythonInventoryError> {
    let bytes = match manager {
        PythonManager::Pip => {
            runner.output(interpreter, &["-m", "pip", "list", "--format=json"])?
        }
        PythonManager::Uv => runner.output("uv", &["pip", "list", "--format=json"])?,
    };
    parse_python_inventory(&bytes, manager, interpreter, environment_scope)
}

/// Converts pip/uv JSON into the canonical inventory representation.
///
/// # Errors
///
/// Returns an error when the JSON does not match the supported list format.
pub fn parse_python_inventory(
    bytes: &[u8],
    manager: PythonManager,
    interpreter: &str,
    environment_scope: EnvironmentScope,
) -> Result<PythonInventoryResult, PythonInventoryError> {
    let native: Vec<NativePackage> =
        serde_json::from_slice(bytes).map_err(|_| PythonInventoryError {
            code: PythonInventoryErrorCode::InvalidOutput,
        })?;
    let mut packages: Vec<_> = native
        .into_iter()
        .map(|package| PythonInventoryPackage {
            ecosystem: "pypi",
            normalized_name: normalize_name(&package.name),
            name: package.name,
            version: package.version,
            environment_scope,
            editable_project_location: package.editable_project_location,
        })
        .collect();
    packages.sort_by(|left, right| left.normalized_name.cmp(&right.normalized_name));
    Ok(PythonInventoryResult {
        schema_version: 1,
        manager,
        interpreter: interpreter.to_owned(),
        environment_scope,
        packages,
    })
}

fn normalize_name(name: &str) -> String {
    let mut normalized = String::with_capacity(name.len());
    let mut separator = false;
    for character in name.chars() {
        if matches!(character, '-' | '_' | '.') {
            if !separator {
                normalized.push('-');
                separator = true;
            }
        } else {
            normalized.extend(character.to_lowercase());
            separator = false;
        }
    }
    normalized
}

#[cfg(test)]
mod tests {
    use super::{
        EnvironmentScope, PythonInventoryError, PythonManager, ReadOnlyCommandRunner,
        collect_python_inventory, parse_python_inventory,
    };

    struct FakeRunner;

    impl ReadOnlyCommandRunner for FakeRunner {
        fn output(
            &self,
            executable: &str,
            arguments: &[&str],
        ) -> Result<Vec<u8>, PythonInventoryError> {
            assert!(
                (executable == "python" && arguments == ["-m", "pip", "list", "--format=json"])
                    || (executable == "uv" && arguments == ["pip", "list", "--format=json"])
            );
            Ok(br#"[{"name":"Requests","version":"2.32.4"}]"#.to_vec())
        }
    }

    #[test]
    fn pip_and_uv_use_read_only_commands_and_return_canonical_results() {
        for manager in [PythonManager::Pip, PythonManager::Uv] {
            let result = collect_python_inventory(
                &FakeRunner,
                manager,
                "python",
                EnvironmentScope::VirtualEnvironment,
            )
            .expect("inventory");
            assert_eq!(result.packages[0].normalized_name, "requests");
            assert_eq!(
                result.packages[0].environment_scope,
                EnvironmentScope::VirtualEnvironment
            );
        }
    }

    #[test]
    fn preserves_editable_location_and_normalizes_pep_503_names() {
        let result = parse_python_inventory(
            br#"[{"name":"My_Package.Name","version":"1.0","editable_project_location":"/repo"}]"#,
            PythonManager::Pip,
            "python3.12",
            EnvironmentScope::Project,
        )
        .expect("inventory");
        assert_eq!(result.packages[0].normalized_name, "my-package-name");
        assert_eq!(
            result.packages[0].editable_project_location.as_deref(),
            Some("/repo")
        );
    }
}
