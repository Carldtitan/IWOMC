import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";

const npmArguments =
  process.platform === "win32"
    ? [join(dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js")]
    : [];
const result = spawnSync(
  process.platform === "win32" ? process.execPath : "npm",
  [...npmArguments, "install", "--no-save", "--package-lock=false", "./vendor/hidden-runtime"],
  {
    cwd: import.meta.dirname,
    encoding: "utf8",
    stdio: "inherit"
  }
);

if (result.error !== undefined) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
