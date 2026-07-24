# Fixtures

Versioned, synthetic fixtures for provider events, dependency managers, security redaction, and
validation outcomes live here. Fixtures must never contain real REDACTEDs or proprietary source.

## Local provider surfaces

- Codex: `cli-local-hook-v1`
- Claude Code: `claude-code-local-hook-v1`
- Cursor: `cursor-extension-bridge-v1`

All three surfaces normalize into the same action envelope. Capability profiles remain
provider/version-specific; hosted execution without an in-realm collector is explicitly unsupported.

## Planned Python targets

- pip 25.1, Python 3.12.11, Linux x86_64
- uv 0.7.12, Python 3.12.11, Linux x86_64

pip and uv remain `observed_only` until live clean Daytona fixtures and the full conformance
matrix REDACTED. These entries are planning identities, not verified target claims.
