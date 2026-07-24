//! Authenticated, bounded local IPC for the extension/Companion trust boundary.

use std::{
    collections::HashSet,
    error::Error,
    fmt,
    io::{self, Read, Write},
    path::{Path, PathBuf},
    time::Duration,
};

use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use sha2::{Digest, Sha256};

use crate::crypto::hmac_sha256;

pub const IPC_PROTOCOL_VERSION: u16 = 1;
pub const DEFAULT_MAXIMUM_FRAME_BYTES: usize = 64 * 1024;
const MAXIMUM_FRAME_BYTES: usize = 1024 * 1024;
const NONCE_BYTES: usize = 32;
const NONCE_ENCODED_BYTES: usize = 43;
const MAXIMUM_SOCKET_PATH_BYTES: usize = 100;

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum IpcErrorCode {
    AuthenticationFailed,
    ConnectionLimit,
    FrameTooLarge,
    InvalidConfiguration,
    InvalidEndpoint,
    InvalidFrame,
    Io,
    RandomUnavailable,
    Timeout,
}

#[derive(Debug)]
pub struct IpcError {
    code: IpcErrorCode,
}

impl IpcError {
    const fn new(code: IpcErrorCode) -> Self {
        Self { code }
    }

    #[must_use]
    pub const fn code(&self) -> IpcErrorCode {
        self.code
    }
}

impl fmt::Display for IpcError {
    fn fmt(&self, formatter: &mut fmt::Formatter<'_>) -> fmt::Result {
        formatter.write_str("local IPC operation failed")
    }
}

impl Error for IpcError {}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct IpcServerConfig {
    pub io_timeout: Duration,
    pub maximum_frame_bytes: usize,
    pub maximum_requests_per_connection: usize,
}

impl Default for IpcServerConfig {
    fn default() -> Self {
        Self {
            io_timeout: Duration::from_secs(5),
            maximum_frame_bytes: DEFAULT_MAXIMUM_FRAME_BYTES,
            maximum_requests_per_connection: 128,
        }
    }
}

impl IpcServerConfig {
    /// Validate configured frame, request, and timeout bounds.
    ///
    /// # Errors
    ///
    /// Returns an invalid-configuration error for unbounded or unusable values.
    pub fn validate(self) -> Result<Self, IpcError> {
        if self.maximum_frame_bytes < 256
            || self.maximum_frame_bytes > MAXIMUM_FRAME_BYTES
            || self.maximum_requests_per_connection == 0
            || self.maximum_requests_per_connection > 10_000
            || self.io_timeout.is_zero()
            || self.io_timeout > Duration::from_secs(60)
        {
            return Err(IpcError::new(IpcErrorCode::InvalidConfiguration));
        }
        Ok(self)
    }
}

pub trait IpcTransport: Read + Write {
    /// Apply the same bounded timeout to reads and writes.
    ///
    /// # Errors
    ///
    /// Returns an I/O error if the underlying local transport rejects the timeout.
    fn set_io_timeout(&self, timeout: Duration) -> io::Result<()>;
}

pub trait IpcAcceptor {
    type Connection: IpcTransport;

    /// Accept one local connection.
    ///
    /// # Errors
    ///
    /// Returns an I/O error when the local transport cannot accept a peer.
    fn accept(&self) -> io::Result<Self::Connection>;
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum CheckpointReason {
    Manual,
    SessionEnd,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum IpcHandlerErrorCode {
    Forbidden,
    Internal,
    InvalidState,
    Unavailable,
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct IpcHandlerError {
    code: IpcHandlerErrorCode,
}

impl IpcHandlerError {
    #[must_use]
    pub const fn new(code: IpcHandlerErrorCode) -> Self {
        Self { code }
    }

    #[must_use]
    pub const fn code(self) -> IpcHandlerErrorCode {
        self.code
    }
}

pub trait CompanionIpcHandler {
    /// Return the current local Companion status payload.
    ///
    /// # Errors
    ///
    /// Returns a safe classified handler error when status is unavailable.
    fn status(&mut self) -> Result<Value, IpcHandlerError>;

    /// Create a manual or session-end checkpoint.
    ///
    /// # Errors
    ///
    /// Returns a safe classified handler error when the checkpoint cannot be created.
    fn create_checkpoint(&mut self, reason: CheckpointReason) -> Result<Value, IpcHandlerError>;

    /// Start a repository observation boundary.
    ///
    /// # Errors
    ///
    /// Returns a safe classified handler error when observation cannot start.
    fn start_observation(
        &mut self,
        project_id: &str,
        provider_surface: &str,
    ) -> Result<Value, IpcHandlerError>;

    /// Stop an active observation boundary.
    ///
    /// # Errors
    ///
    /// Returns a safe classified handler error when observation cannot stop.
    fn stop_observation(&mut self, session_id: &str) -> Result<Value, IpcHandlerError>;
}

/// Accept and serve one authenticated local connection.
///
/// # Errors
///
/// Returns a classified error for accept, timeout, framing, authentication, or handler failures.
pub fn serve_once<A: IpcAcceptor, H: CompanionIpcHandler>(
    acceptor: &A,
    shared_secret: &[u8],
    handler: &mut H,
    config: IpcServerConfig,
) -> Result<(), IpcError> {
    let mut connection = acceptor
        .accept()
        .map_err(|_| IpcError::new(IpcErrorCode::Io))?;
    serve_connection(&mut connection, shared_secret, handler, config)
}

/// Authenticate and serve requests over one already-connected local transport.
///
/// # Errors
///
/// Returns a classified error for invalid configuration, timeout, framing, or authentication.
pub fn serve_connection<T: IpcTransport, H: CompanionIpcHandler>(
    transport: &mut T,
    shared_secret: &[u8],
    handler: &mut H,
    config: IpcServerConfig,
) -> Result<(), IpcError> {
    let config = config.validate()?;
    validate_secret(shared_secret)?;
    transport
        .set_io_timeout(config.io_timeout)
        .map_err(map_io_error)?;
    let mut server_nonce = [0_u8; NONCE_BYTES];
    getrandom::fill(&mut server_nonce)
        .map_err(|_| IpcError::new(IpcErrorCode::RandomUnavailable))?;
    serve_connection_with_nonce(transport, shared_secret, handler, config, server_nonce)
}

/// Derive the same scope-hashed Windows named-pipe path used by the extension.
///
/// # Errors
///
/// Returns an invalid-endpoint error when the scope is empty, oversized, or contains controls.
pub fn windows_named_pipe_path(scope_id: &str) -> Result<String, IpcError> {
    validate_scope(scope_id)?;
    let digest = hex::encode(Sha256::digest(scope_id.as_bytes()));
    Ok(format!(
        r"\\.\pipe\environment-reconciler-{}",
        &digest[..32]
    ))
}

/// Derive the same bounded Unix-domain-socket path used by the extension.
///
/// # Errors
///
/// Returns an invalid-endpoint error for an unsafe root, scope, or oversized path.
pub fn unix_socket_path(runtime_directory: &Path, scope_id: &str) -> Result<PathBuf, IpcError> {
    validate_scope(scope_id)?;
    let runtime_directory = runtime_directory
        .to_str()
        .ok_or_else(|| IpcError::new(IpcErrorCode::InvalidEndpoint))?;
    if !runtime_directory.starts_with('/')
        || runtime_directory.contains('\\')
        || runtime_directory
            .split('/')
            .any(|component| matches!(component, "." | ".."))
    {
        return Err(IpcError::new(IpcErrorCode::InvalidEndpoint));
    }
    let digest = hex::encode(Sha256::digest(scope_id.as_bytes()));
    let path = PathBuf::from(format!(
        "{}/companion-{}.sock",
        runtime_directory.trim_end_matches('/'),
        &digest[..24]
    ));
    if path.as_os_str().as_encoded_bytes().len() > MAXIMUM_SOCKET_PATH_BYTES {
        return Err(IpcError::new(IpcErrorCode::InvalidEndpoint));
    }
    Ok(path)
}

#[must_use]
pub fn create_handshake_mac(
    secret: &[u8],
    role: HandshakeRole,
    client_nonce: &str,
    server_nonce: &str,
) -> String {
    let transcript = format!(
        "environment-reconciler-ipc-v1\0{}\0{client_nonce}\0{server_nonce}",
        role.as_str()
    );
    URL_SAFE_NO_PAD.encode(hmac_sha256(secret, transcript.as_bytes()))
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum HandshakeRole {
    Client,
    Server,
}

impl HandshakeRole {
    const fn as_str(self) -> &'static str {
        match self {
            Self::Client => "client",
            Self::Server => "server",
        }
    }
}

#[cfg(unix)]
mod unix {
    use std::{
        fs::{self, DirBuilder},
        io,
        os::unix::{
            fs::{DirBuilderExt, FileTypeExt, MetadataExt, PermissionsExt},
            net::{UnixListener, UnixStream},
        },
        path::{Path, PathBuf},
        time::Duration,
    };

    use super::{IpcAcceptor, IpcError, IpcErrorCode, IpcTransport, MAXIMUM_SOCKET_PATH_BYTES};

    pub struct SecureUnixListener {
        listener: UnixListener,
        socket_path: PathBuf,
    }

    impl SecureUnixListener {
        /// Bind a private, same-owner Unix-domain socket.
        ///
        /// # Errors
        ///
        /// Returns an invalid-endpoint or I/O error for unsafe paths and permissions.
        pub fn bind(socket_path: &Path) -> Result<Self, IpcError> {
            use std::os::unix::ffi::OsStrExt as _;

            if !socket_path.is_absolute()
                || socket_path.as_os_str().as_bytes().len() > MAXIMUM_SOCKET_PATH_BYTES
            {
                return Err(IpcError::new(IpcErrorCode::InvalidEndpoint));
            }
            let parent = socket_path
                .parent()
                .ok_or_else(|| IpcError::new(IpcErrorCode::InvalidEndpoint))?;
            DirBuilder::new()
                .recursive(true)
                .mode(0o700)
                .create(parent)
                .map_err(|_| IpcError::new(IpcErrorCode::Io))?;
            let directory_metadata =
                fs::symlink_metadata(parent).map_err(|_| IpcError::new(IpcErrorCode::Io))?;
            if !directory_metadata.file_type().is_dir() || directory_metadata.mode() & 0o077 != 0 {
                return Err(IpcError::new(IpcErrorCode::InvalidEndpoint));
            }
            if fs::symlink_metadata(socket_path).is_ok() {
                return Err(IpcError::new(IpcErrorCode::InvalidEndpoint));
            }
            let listener =
                UnixListener::bind(socket_path).map_err(|_| IpcError::new(IpcErrorCode::Io))?;
            fs::set_permissions(socket_path, fs::Permissions::from_mode(0o600))
                .map_err(|_| IpcError::new(IpcErrorCode::Io))?;
            let socket_metadata =
                fs::symlink_metadata(socket_path).map_err(|_| IpcError::new(IpcErrorCode::Io))?;
            if !socket_metadata.file_type().is_socket()
                || socket_metadata.mode() & 0o077 != 0
                || socket_metadata.uid() != directory_metadata.uid()
            {
                return Err(IpcError::new(IpcErrorCode::InvalidEndpoint));
            }
            Ok(Self {
                listener,
                socket_path: socket_path.to_owned(),
            })
        }
    }

    impl IpcAcceptor for SecureUnixListener {
        type Connection = UnixStream;

        fn accept(&self) -> io::Result<Self::Connection> {
            self.listener.accept().map(|(stream, _)| stream)
        }
    }

    impl IpcTransport for UnixStream {
        fn set_io_timeout(&self, timeout: Duration) -> io::Result<()> {
            self.set_read_timeout(Some(timeout))?;
            self.set_write_timeout(Some(timeout))
        }
    }

    impl Drop for SecureUnixListener {
        fn drop(&mut self) {
            let _ = fs::remove_file(&self.socket_path);
        }
    }
}

#[cfg(unix)]
pub use unix::SecureUnixListener;

#[cfg(windows)]
mod windows {
    use std::{
        io::{self, Read, Write},
        sync::Mutex,
        thread,
        time::{Duration, Instant},
    };

    use interprocess::local_socket::{
        GenericNamespaced, Listener, ListenerOptions, Stream, prelude::*,
    };

    use super::{IpcAcceptor, IpcError, IpcErrorCode, IpcTransport, windows_named_pipe_path};

    pub struct SecureWindowsNamedPipeListener {
        listener: Listener,
    }

    impl SecureWindowsNamedPipeListener {
        /// Bind the scope-derived Windows named pipe used by the extension.
        ///
        /// The unguessable per-launch scope and the protocol HMAC provide peer authentication;
        /// the raw scope is never included in the pipe name.
        ///
        /// # Errors
        ///
        /// Returns an invalid-endpoint or I/O error if the pipe cannot be created.
        pub fn bind(scope_id: &str) -> Result<Self, IpcError> {
            let path = windows_named_pipe_path(scope_id)?;
            let pipe_name = path
                .strip_prefix(r"\\.\pipe\")
                .ok_or_else(|| IpcError::new(IpcErrorCode::InvalidEndpoint))?;
            let name = pipe_name
                .to_ns_name::<GenericNamespaced>()
                .map_err(|_| IpcError::new(IpcErrorCode::InvalidEndpoint))?;
            let listener = ListenerOptions::new()
                .name(name)
                .create_sync()
                .map_err(|_| IpcError::new(IpcErrorCode::Io))?;
            Ok(Self { listener })
        }
    }

    impl IpcAcceptor for SecureWindowsNamedPipeListener {
        type Connection = BoundedWindowsPipe;

        fn accept(&self) -> io::Result<Self::Connection> {
            let stream = self.listener.accept()?;
            stream.set_nonblocking(true)?;
            Ok(BoundedWindowsPipe {
                stream,
                timeout: Mutex::new(Duration::from_secs(5)),
            })
        }
    }

    pub struct BoundedWindowsPipe {
        stream: Stream,
        timeout: Mutex<Duration>,
    }

    impl Read for BoundedWindowsPipe {
        fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
            retry_until_timeout(self.timeout(), || match self.stream.read(buffer) {
                Ok(0) if !buffer.is_empty() => Err(io::Error::new(
                    io::ErrorKind::WouldBlock,
                    "local IPC peer has no data available yet",
                )),
                result => result,
            })
        }
    }

    impl Write for BoundedWindowsPipe {
        fn write(&mut self, buffer: &[u8]) -> io::Result<usize> {
            retry_until_timeout(self.timeout(), || self.stream.write(buffer))
        }

        fn flush(&mut self) -> io::Result<()> {
            self.stream.flush()
        }
    }

    impl BoundedWindowsPipe {
        fn timeout(&self) -> Duration {
            *self
                .timeout
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
        }
    }

    impl IpcTransport for BoundedWindowsPipe {
        fn set_io_timeout(&self, timeout: Duration) -> io::Result<()> {
            *self
                .timeout
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner) = timeout;
            Ok(())
        }
    }

    fn retry_until_timeout<T>(
        timeout: Duration,
        mut operation: impl FnMut() -> io::Result<T>,
    ) -> io::Result<T> {
        let deadline = Instant::now() + timeout;
        loop {
            match operation() {
                Err(error) if error.kind() == io::ErrorKind::WouldBlock => {
                    if Instant::now() >= deadline {
                        return Err(io::Error::new(
                            io::ErrorKind::TimedOut,
                            "local IPC operation timed out",
                        ));
                    }
                    thread::sleep(Duration::from_millis(2));
                }
                result => return result,
            }
        }
    }
}

#[cfg(windows)]
pub use windows::SecureWindowsNamedPipeListener;

#[derive(Debug, Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct RequestEnvelope {
    protocol_version: u16,
    request_id: String,
    #[serde(rename = "type")]
    kind: String,
    payload: Value,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct ResponseEnvelope<'a> {
    protocol_version: u16,
    request_id: &'a str,
    #[serde(rename = "type")]
    kind: &'a str,
    ok: bool,
    payload: Value,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct ChallengePayload {
    nonce: String,
    protocol_version: u16,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct ProofPayload {
    client_nonce: String,
    mac: String,
    server_nonce: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct EmptyPayload {}

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct CheckpointPayload {
    reason: CheckpointReason,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct StartObservationPayload {
    project_id: String,
    provider_surface: String,
}

#[derive(Deserialize)]
#[serde(deny_unknown_fields, rename_all = "camelCase")]
struct StopObservationPayload {
    session_id: String,
}

fn serve_connection_with_nonce<T: IpcTransport, H: CompanionIpcHandler>(
    transport: &mut T,
    shared_secret: &[u8],
    handler: &mut H,
    config: IpcServerConfig,
    server_nonce_bytes: [u8; NONCE_BYTES],
) -> Result<(), IpcError> {
    let mut request_ids = HashSet::new();
    let challenge = read_required_frame(transport, config.maximum_frame_bytes)?;
    validate_envelope(&challenge, &mut request_ids)?;
    if challenge.kind != "handshake.challenge" {
        return Err(IpcError::new(IpcErrorCode::AuthenticationFailed));
    }
    let challenge_payload: ChallengePayload = decode_payload(challenge.payload)?;
    if challenge_payload.protocol_version != IPC_PROTOCOL_VERSION {
        return Err(IpcError::new(IpcErrorCode::AuthenticationFailed));
    }
    validate_nonce(&challenge_payload.nonce)?;
    let server_nonce = URL_SAFE_NO_PAD.encode(server_nonce_bytes);
    write_frame(
        transport,
        &ResponseEnvelope {
            protocol_version: IPC_PROTOCOL_VERSION,
            request_id: &challenge.request_id,
            kind: "handshake.response",
            ok: true,
            payload: json!({
                "mac": create_handshake_mac(
                    shared_secret,
                    HandshakeRole::Server,
                    &challenge_payload.nonce,
                    &server_nonce,
                ),
                "serverNonce": server_nonce,
            }),
        },
        config.maximum_frame_bytes,
    )?;

    let proof = read_required_frame(transport, config.maximum_frame_bytes)?;
    validate_envelope(&proof, &mut request_ids)?;
    if proof.kind != "handshake.proof" {
        return Err(IpcError::new(IpcErrorCode::AuthenticationFailed));
    }
    let proof_payload: ProofPayload = decode_payload(proof.payload)?;
    validate_nonce(&proof_payload.client_nonce)?;
    validate_nonce(&proof_payload.server_nonce)?;
    let expected_mac = create_handshake_mac(
        shared_secret,
        HandshakeRole::Client,
        &challenge_payload.nonce,
        &server_nonce,
    );
    if proof_payload.client_nonce != challenge_payload.nonce
        || proof_payload.server_nonce != server_nonce
        || !constant_time_mac_equal(&proof_payload.mac, &expected_mac)
    {
        return Err(IpcError::new(IpcErrorCode::AuthenticationFailed));
    }
    write_frame(
        transport,
        &ResponseEnvelope {
            protocol_version: IPC_PROTOCOL_VERSION,
            request_id: &proof.request_id,
            kind: "handshake.ack",
            ok: true,
            payload: json!({"accepted": true}),
        },
        config.maximum_frame_bytes,
    )?;

    for _ in 0..config.maximum_requests_per_connection {
        let Some(request) = read_frame(transport, config.maximum_frame_bytes)? else {
            return Ok(());
        };
        validate_envelope(&request, &mut request_ids)?;
        let (response_kind, result) = dispatch(handler, &request.kind, request.payload);
        let (ok, payload) = match result {
            Ok(payload) if payload.is_object() => (true, payload),
            Ok(_) => (false, json!({"code": IpcHandlerErrorCode::Internal})),
            Err(error) => (false, json!({"code": error.code()})),
        };
        write_frame(
            transport,
            &ResponseEnvelope {
                protocol_version: IPC_PROTOCOL_VERSION,
                request_id: &request.request_id,
                kind: response_kind,
                ok,
                payload,
            },
            config.maximum_frame_bytes,
        )?;
    }
    Err(IpcError::new(IpcErrorCode::ConnectionLimit))
}

fn dispatch<H: CompanionIpcHandler>(
    handler: &mut H,
    request_kind: &str,
    payload: Value,
) -> (&'static str, Result<Value, IpcHandlerError>) {
    match request_kind {
        "status.get" => {
            let result =
                decode_handler_payload::<EmptyPayload>(payload).and_then(|_| handler.status());
            ("status.result", result)
        }
        "checkpoint.create" => {
            let result = decode_handler_payload::<CheckpointPayload>(payload)
                .and_then(|input| handler.create_checkpoint(input.reason));
            ("checkpoint.result", result)
        }
        "observation.start" => {
            let result =
                decode_handler_payload::<StartObservationPayload>(payload).and_then(|input| {
                    validate_identifier(&input.project_id)?;
                    validate_label(&input.provider_surface)?;
                    handler.start_observation(&input.project_id, &input.provider_surface)
                });
            ("observation.result", result)
        }
        "observation.stop" => {
            let result =
                decode_handler_payload::<StopObservationPayload>(payload).and_then(|input| {
                    validate_identifier(&input.session_id)?;
                    handler.stop_observation(&input.session_id)
                });
            ("observation.result", result)
        }
        _ => (
            "request.error",
            Err(IpcHandlerError::new(IpcHandlerErrorCode::Forbidden)),
        ),
    }
}

fn read_required_frame<T: Read>(
    transport: &mut T,
    maximum_frame_bytes: usize,
) -> Result<RequestEnvelope, IpcError> {
    read_frame(transport, maximum_frame_bytes)?
        .ok_or_else(|| IpcError::new(IpcErrorCode::InvalidFrame))
}

fn read_frame<T: Read>(
    transport: &mut T,
    maximum_frame_bytes: usize,
) -> Result<Option<RequestEnvelope>, IpcError> {
    let mut header = [0_u8; 4];
    match transport.read(&mut header[..1]) {
        Ok(0) => return Ok(None),
        Ok(_) => {}
        Err(error) => return Err(map_io_error(error)),
    }
    transport
        .read_exact(&mut header[1..])
        .map_err(map_io_error)?;
    let length = usize::try_from(u32::from_be_bytes(header))
        .map_err(|_| IpcError::new(IpcErrorCode::FrameTooLarge))?;
    if length == 0 || length > maximum_frame_bytes {
        return Err(IpcError::new(IpcErrorCode::FrameTooLarge));
    }
    let mut payload = vec![0_u8; length];
    transport.read_exact(&mut payload).map_err(map_io_error)?;
    serde_json::from_slice(&payload)
        .map(Some)
        .map_err(|_| IpcError::new(IpcErrorCode::InvalidFrame))
}

fn write_frame<T: Write>(
    transport: &mut T,
    response: &ResponseEnvelope<'_>,
    maximum_frame_bytes: usize,
) -> Result<(), IpcError> {
    let payload =
        serde_json::to_vec(response).map_err(|_| IpcError::new(IpcErrorCode::InvalidFrame))?;
    if payload.is_empty() || payload.len() > maximum_frame_bytes {
        return Err(IpcError::new(IpcErrorCode::FrameTooLarge));
    }
    let length =
        u32::try_from(payload.len()).map_err(|_| IpcError::new(IpcErrorCode::FrameTooLarge))?;
    transport
        .write_all(&length.to_be_bytes())
        .and_then(|()| transport.write_all(&payload))
        .and_then(|()| transport.flush())
        .map_err(map_io_error)
}

fn validate_envelope(
    request: &RequestEnvelope,
    request_ids: &mut HashSet<String>,
) -> Result<(), IpcError> {
    if request.protocol_version != IPC_PROTOCOL_VERSION
        || !valid_uuid_v4(&request.request_id)
        || !valid_request_kind(&request.kind)
        || !request.payload.is_object()
        || !request_ids.insert(request.request_id.clone())
    {
        return Err(IpcError::new(IpcErrorCode::InvalidFrame));
    }
    Ok(())
}

fn decode_payload<T: for<'de> Deserialize<'de>>(payload: Value) -> Result<T, IpcError> {
    serde_json::from_value(payload).map_err(|_| IpcError::new(IpcErrorCode::InvalidFrame))
}

fn decode_handler_payload<T: for<'de> Deserialize<'de>>(
    payload: Value,
) -> Result<T, IpcHandlerError> {
    serde_json::from_value(payload)
        .map_err(|_| IpcHandlerError::new(IpcHandlerErrorCode::InvalidState))
}

fn validate_secret(secret: &[u8]) -> Result<(), IpcError> {
    if (32..=1024).contains(&secret.len()) {
        Ok(())
    } else {
        Err(IpcError::new(IpcErrorCode::InvalidConfiguration))
    }
}

fn validate_scope(scope_id: &str) -> Result<(), IpcError> {
    if scope_id.is_empty() || scope_id.len() > 1024 || scope_id.chars().any(char::is_control) {
        Err(IpcError::new(IpcErrorCode::InvalidEndpoint))
    } else {
        Ok(())
    }
}

fn validate_nonce(value: &str) -> Result<(), IpcError> {
    if value.len() != NONCE_ENCODED_BYTES {
        return Err(IpcError::new(IpcErrorCode::AuthenticationFailed));
    }
    let bytes = URL_SAFE_NO_PAD
        .decode(value)
        .map_err(|_| IpcError::new(IpcErrorCode::AuthenticationFailed))?;
    if bytes.len() == NONCE_BYTES {
        Ok(())
    } else {
        Err(IpcError::new(IpcErrorCode::AuthenticationFailed))
    }
}

fn constant_time_mac_equal(actual: &str, expected: &str) -> bool {
    let Ok(actual) = URL_SAFE_NO_PAD.decode(actual) else {
        return false;
    };
    let Ok(expected) = URL_SAFE_NO_PAD.decode(expected) else {
        return false;
    };
    if actual.len() != expected.len() {
        return false;
    }
    actual
        .iter()
        .zip(expected)
        .fold(0_u8, |difference, (left, right)| {
            difference | (left ^ right)
        })
        == 0
}

fn valid_uuid_v4(value: &str) -> bool {
    let bytes = value.as_bytes();
    bytes.len() == 36
        && [8, 13, 18, 23]
            .into_iter()
            .all(|index| bytes[index] == b'-')
        && bytes[14] == b'4'
        && matches!(bytes[19], b'8' | b'9' | b'a' | b'b')
        && bytes
            .iter()
            .enumerate()
            .all(|(index, byte)| [8, 13, 18, 23].contains(&index) || byte.is_ascii_hexdigit())
}

fn valid_request_kind(value: &str) -> bool {
    !value.is_empty()
        && value.len() <= 100
        && value.as_bytes()[0].is_ascii_lowercase()
        && value.bytes().all(|byte| {
            byte.is_ascii_lowercase() || byte.is_ascii_digit() || b"_.-".contains(&byte)
        })
}

fn validate_identifier(value: &str) -> Result<(), IpcHandlerError> {
    let valid = !value.is_empty()
        && value.len() <= 200
        && value.bytes().enumerate().all(|(index, byte)| {
            byte.is_ascii_alphanumeric() || (index > 0 && matches!(byte, b'.' | b'_' | b':' | b'-'))
        });
    if valid {
        Ok(())
    } else {
        Err(IpcHandlerError::new(IpcHandlerErrorCode::InvalidState))
    }
}

fn validate_label(value: &str) -> Result<(), IpcHandlerError> {
    if value.is_empty() || value.len() > 200 || value.chars().any(char::is_control) {
        Err(IpcHandlerError::new(IpcHandlerErrorCode::InvalidState))
    } else {
        Ok(())
    }
}

fn map_io_error(error: io::Error) -> IpcError {
    let kind = error.kind();
    drop(error);
    if matches!(kind, io::ErrorKind::TimedOut | io::ErrorKind::WouldBlock) {
        IpcError::new(IpcErrorCode::Timeout)
    } else {
        IpcError::new(IpcErrorCode::Io)
    }
}

#[cfg(test)]
mod tests {
    use std::{
        io::{self, Cursor, Read, Write},
        path::Path,
        time::Duration,
    };

    use base64::{Engine as _, engine::general_purpose::URL_SAFE_NO_PAD};
    use serde_json::{Value, json};

    use super::{
        CheckpointReason, CompanionIpcHandler, HandshakeRole, IPC_PROTOCOL_VERSION, IpcErrorCode,
        IpcHandlerError, IpcServerConfig, IpcTransport, create_handshake_mac,
        serve_connection_with_nonce, unix_socket_path, windows_named_pipe_path,
    };

    const CHALLENGE_ID: &str = "11111111-1111-4111-8111-111111111111";
    const PROOF_ID: &str = "22222222-2222-4222-8222-222222222222";
    const REQUEST_ID: &str = "33333333-3333-4333-8333-333333333333";
    const CHECKPOINT_ID: &str = "44444444-4444-4444-8444-444444444444";
    const START_ID: &str = "55555555-5555-4555-8555-555555555555";
    const STOP_ID: &str = "66666666-6666-4666-8666-666666666666";

    #[derive(Default)]
    struct RecordingHandler {
        calls: Vec<String>,
    }

    impl CompanionIpcHandler for RecordingHandler {
        fn status(&mut self) -> Result<Value, IpcHandlerError> {
            self.calls.push("status".to_owned());
            Ok(json!({"state": "observing"}))
        }

        fn create_checkpoint(
            &mut self,
            reason: CheckpointReason,
        ) -> Result<Value, IpcHandlerError> {
            self.calls.push(format!("checkpoint:{reason:?}"));
            Ok(json!({"checkpointId": "checkpoint-1"}))
        }

        fn start_observation(
            &mut self,
            project_id: &str,
            provider_surface: &str,
        ) -> Result<Value, IpcHandlerError> {
            self.calls
                .push(format!("start:{project_id}:{provider_surface}"));
            Ok(json!({"sessionId": "session-1"}))
        }

        fn stop_observation(&mut self, session_id: &str) -> Result<Value, IpcHandlerError> {
            self.calls.push(format!("stop:{session_id}"));
            Ok(json!({"stopped": true}))
        }
    }

    struct MemoryTransport {
        input: Cursor<Vec<u8>>,
        output: Vec<u8>,
    }

    impl MemoryTransport {
        fn new(input: Vec<u8>) -> Self {
            Self {
                input: Cursor::new(input),
                output: Vec::new(),
            }
        }
    }

    impl Read for MemoryTransport {
        fn read(&mut self, buffer: &mut [u8]) -> io::Result<usize> {
            self.input.read(buffer)
        }
    }

    impl Write for MemoryTransport {
        fn write(&mut self, buffer: &[u8]) -> io::Result<usize> {
            self.output.extend_from_slice(buffer);
            Ok(buffer.len())
        }

        fn flush(&mut self) -> io::Result<()> {
            Ok(())
        }
    }

    impl IpcTransport for MemoryTransport {
        fn set_io_timeout(&self, _timeout: Duration) -> io::Result<()> {
            Ok(())
        }
    }

    #[test]
    fn authenticates_matching_extension_transcript_and_dispatches_status() {
        let secret = [7_u8; 32];
        let client_nonce = URL_SAFE_NO_PAD.encode([3_u8; 32]);
        let server_nonce_bytes = [9_u8; 32];
        let server_nonce = URL_SAFE_NO_PAD.encode(server_nonce_bytes);
        let input = [
            request_frame(
                CHALLENGE_ID,
                "handshake.challenge",
                json!({"nonce": client_nonce, "protocolVersion": 1}),
            ),
            request_frame(
                PROOF_ID,
                "handshake.proof",
                json!({
                    "clientNonce": client_nonce,
                    "serverNonce": server_nonce,
                    "mac": create_handshake_mac(
                        &secret,
                        HandshakeRole::Client,
                        &client_nonce,
                        &server_nonce,
                    ),
                }),
            ),
            request_frame(REQUEST_ID, "status.get", json!({})),
            request_frame(
                CHECKPOINT_ID,
                "checkpoint.create",
                json!({"reason": "manual"}),
            ),
            request_frame(
                START_ID,
                "observation.start",
                json!({"projectId": "project-1", "providerSurface": "Codex local hook"}),
            ),
            request_frame(
                STOP_ID,
                "observation.stop",
                json!({"sessionId": "session-1"}),
            ),
        ]
        .concat();
        let mut transport = MemoryTransport::new(input);
        let mut handler = RecordingHandler::default();

        serve_connection_with_nonce(
            &mut transport,
            &secret,
            &mut handler,
            IpcServerConfig::default(),
            server_nonce_bytes,
        )
        .expect("authenticated connection");

        let responses = response_frames(&transport.output);
        assert_eq!(responses.len(), 6);
        assert_eq!(responses[0]["type"], "handshake.response");
        assert_eq!(
            responses[0]["payload"]["mac"],
            create_handshake_mac(&secret, HandshakeRole::Server, &client_nonce, &server_nonce,)
        );
        assert_eq!(responses[1]["payload"]["accepted"], true);
        assert_eq!(responses[2]["payload"]["state"], "observing");
        assert_eq!(responses[2]["requestId"], REQUEST_ID);
        assert_eq!(responses[3]["payload"]["checkpointId"], "checkpoint-1");
        assert_eq!(responses[4]["payload"]["sessionId"], "session-1");
        assert_eq!(responses[5]["payload"]["stopped"], true);
        assert_eq!(
            handler.calls,
            [
                "status",
                "checkpoint:Manual",
                "start:project-1:Codex local hook",
                "stop:session-1"
            ]
        );
    }

    #[test]
    fn rejects_bad_proof_before_dispatch() {
        let secret = [7_u8; 32];
        let client_nonce = URL_SAFE_NO_PAD.encode([3_u8; 32]);
        let server_nonce = URL_SAFE_NO_PAD.encode([9_u8; 32]);
        let input = [
            request_frame(
                CHALLENGE_ID,
                "handshake.challenge",
                json!({"nonce": client_nonce, "protocolVersion": 1}),
            ),
            request_frame(
                PROOF_ID,
                "handshake.proof",
                json!({
                    "clientNonce": client_nonce,
                    "serverNonce": server_nonce,
                    "mac": URL_SAFE_NO_PAD.encode([1_u8; 32]),
                }),
            ),
        ]
        .concat();
        let mut transport = MemoryTransport::new(input);
        let mut handler = RecordingHandler::default();

        let error = serve_connection_with_nonce(
            &mut transport,
            &secret,
            &mut handler,
            IpcServerConfig::default(),
            [9_u8; 32],
        )
        .expect_err("bad proof");

        assert_eq!(error.code(), IpcErrorCode::AuthenticationFailed);
        assert!(handler.calls.is_empty());
    }

    #[test]
    fn rejects_duplicate_ids_strict_payloads_and_oversized_frames() {
        let secret = [7_u8; 32];
        let client_nonce = URL_SAFE_NO_PAD.encode([3_u8; 32]);
        let duplicate = [
            request_frame(
                CHALLENGE_ID,
                "handshake.challenge",
                json!({"nonce": client_nonce, "protocolVersion": 1}),
            ),
            request_frame(
                CHALLENGE_ID,
                "handshake.proof",
                json!({"clientNonce": client_nonce, "serverNonce": client_nonce, "mac": client_nonce}),
            ),
        ]
        .concat();
        let mut duplicate_transport = MemoryTransport::new(duplicate);
        let mut handler = RecordingHandler::default();
        let duplicate_error = serve_connection_with_nonce(
            &mut duplicate_transport,
            &secret,
            &mut handler,
            IpcServerConfig::default(),
            [9_u8; 32],
        )
        .expect_err("duplicate");
        assert_eq!(duplicate_error.code(), IpcErrorCode::InvalidFrame);

        let mut oversized = (65_537_u32).to_be_bytes().to_vec();
        oversized.extend_from_slice(b"{}");
        let mut oversized_transport = MemoryTransport::new(oversized);
        let oversized_error = serve_connection_with_nonce(
            &mut oversized_transport,
            &secret,
            &mut handler,
            IpcServerConfig::default(),
            [9_u8; 32],
        )
        .expect_err("oversized");
        assert_eq!(oversized_error.code(), IpcErrorCode::FrameTooLarge);

        let strict = request_frame(
            CHALLENGE_ID,
            "handshake.challenge",
            json!({"nonce": client_nonce, "protocolVersion": 1, "unexpected": true}),
        );
        let mut strict_transport = MemoryTransport::new(strict);
        let strict_error = serve_connection_with_nonce(
            &mut strict_transport,
            &secret,
            &mut handler,
            IpcServerConfig::default(),
            [9_u8; 32],
        )
        .expect_err("strict payload");
        assert_eq!(strict_error.code(), IpcErrorCode::InvalidFrame);
    }

    #[test]
    fn endpoint_derivation_matches_extension_hashing_and_bounds() {
        let windows = windows_named_pipe_path("device/private workspace").expect("pipe");
        let unix = unix_socket_path(
            Path::new("/run/user/1000/environment-reconciler"),
            "device/private workspace",
        )
        .expect("socket");
        assert_eq!(
            windows,
            r"\\.\pipe\environment-reconciler-0c29d324442ace80e25e8dd5e8d8f865"
        );
        assert_eq!(
            unix,
            Path::new(
                "/run/user/1000/environment-reconciler/companion-0c29d324442ace80e25e8dd5.sock"
            )
        );
        assert!(!windows.contains("private workspace"));
    }

    fn request_frame(request_id: &str, kind: &str, payload: Value) -> Vec<u8> {
        let mut request = serde_json::Map::new();
        request.insert("payload".to_owned(), payload);
        request.insert(
            "protocolVersion".to_owned(),
            Value::from(IPC_PROTOCOL_VERSION),
        );
        request.insert("requestId".to_owned(), Value::from(request_id));
        request.insert("type".to_owned(), Value::from(kind));
        let bytes = serde_json::to_vec(&Value::Object(request)).expect("request JSON");
        let mut frame = u32::try_from(bytes.len())
            .expect("bounded")
            .to_be_bytes()
            .to_vec();
        frame.extend(bytes);
        frame
    }

    fn response_frames(bytes: &[u8]) -> Vec<Value> {
        let mut cursor = Cursor::new(bytes);
        let mut responses = Vec::new();
        while usize::try_from(cursor.position()).expect("position") < bytes.len() {
            let mut header = [0_u8; 4];
            cursor.read_exact(&mut header).expect("header");
            let mut payload = vec![0_u8; u32::from_be_bytes(header) as usize];
            cursor.read_exact(&mut payload).expect("payload");
            responses.push(serde_json::from_slice(&payload).expect("response JSON"));
        }
        responses
    }
}
