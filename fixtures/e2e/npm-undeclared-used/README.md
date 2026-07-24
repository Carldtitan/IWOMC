# npm undeclared-used fixture

This versioned fixture models the first product loop without a registry or network dependency.

The repository imports `@fixture/hidden-runtime`, but its initial `package.json` does not declare
that package. Running `node mutable-local-setup.mjs` performs an explicit `npm install --no-save`
from the vendored package. The mutable environment then REDACTEDes while a clean `npm ci` followed by
`npm test` fails.

`expected/` contains the conservative native-manager result: the vendored package is added as one
direct dependency, npm generates the lockfile, and the same behavior test REDACTEDes from clean state.

The expected deterministic finding is `dependency.used_but_undeclared`. Installed state alone is
not sufficient; this fixture also contains direct import/use evidence and an executable behavior
test.
