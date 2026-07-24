// Kept because the implementation specification explicitly requires a
// workspace entrypoint. Vitest 4 uses `test.projects` in vitest.config.ts;
// this list remains useful to older tooling that discovers workspace roots.
export default ["./vitest.config.ts"];
