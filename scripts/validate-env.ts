import {
  getIntegrationReadiness,
  parseMigrationEnvironment,
  parseServerEnvironment,
  parseToolingEnvironment
} from "../packages/contracts/src/env.js";

function main(): void {
  const server = parseServerEnvironment(process.env);
  parseMigrationEnvironment(process.env);
  parseToolingEnvironment(process.env);

  console.log(
    JSON.stringify({
      valid: true,
      scopes: {
        migration: "valid",
        server: "valid",
        tooling: "valid"
      },
      integrations: getIntegrationReadiness(server)
    })
  );
}

try {
  main();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown environment validation error";
  console.error(JSON.stringify({ valid: false, error: message }));
  process.exitCode = 1;
}
