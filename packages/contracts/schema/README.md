# Protocol compatibility policy

The public protocol is fail-closed: every object rejects unknown properties, every payload carries
an explicit `schemaVersion`, and every independently stored or transmitted payload has a stable
`kind`.

Within version 1, a producer may begin populating an optional field that version 1 already defines.
A version 1 reader must continue accepting older payloads that omit that field. The additive
compatibility golden fixture tests both forms.

Adding a new property, payload kind, discriminator value, or meaning is a wire-shape change and
requires a new schema version. Older readers intentionally reject it instead of silently retaining
data they do not understand. Breaking versions require an explicit, registered migration whose
declared target version matches the document it returns.

`protocol.schema.json` is the authored root. `protocol.bundle.schema.json`, TypeScript types, Rust
types, and the golden fixtures are generated and checked for drift in CI.
