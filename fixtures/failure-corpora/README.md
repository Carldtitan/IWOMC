# Deterministic failure corpora

`v1/manifest.json` is the only entry point. It pins the corpus-set version, fixture counts, and the
SHA-256 hash of every corpus file. The loader hashes the exact UTF-8 bytes before parsing, so content,
formatting, or line-ending drift fails closed.

Every fixture is synthetic and contains:

- a stable, globally unique fixture ID;
- a plain-language description of the scenario;
- deterministic normalized input;
- a documented expected outcome.

The security corpus intentionally contains non-working, secret-shaped test strings. Never replace
them with real credentials. Adding or changing a fixture requires a corpus version change when the
expected behavior changes and always requires updating the matching manifest hash and fixture count.
