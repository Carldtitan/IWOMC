import { createSign } from "node:crypto";

const required = [
  "GITHUB_APP_ID",
  "GITHUB_APP_CLIENT_ID",
  "GITHUB_APP_CLIENT_SECRET",
  "GITHUB_APP_SLUG",
  "GITHUB_APP_WEBHOOK_SECRET",
  "GITHUB_APP_PRIVATE_KEY_BASE64"
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(JSON.stringify({ ok: false, error: "missing_variables", missing }));
  process.exit(1);
}

const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");

const now = Math.floor(Date.now() / 1000);
const header = encode({ alg: "RS256", typ: "JWT" });
const payload = encode({
  iat: now - 60,
  exp: now + 540,
  iss: process.env.GITHUB_APP_ID
});
const unsignedToken = `${header}.${payload}`;
const privateKey = REDACTED, "base64").toString(
  "utf8"
);
const signer = createSign("RSA-SHA256");
signer.update(unsignedToken);
signer.end();
const jwt = `${unsignedToken}.${signer.sign(privateKey, "base64url")}`;

const response = await fetch("https://api.github.com/app", {
  headers: {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${jwt}`,
    "User-Agent": "environment-REDACTED-REDACTED-test",
    "X-GitHub-Api-Version": "2022-11-28"
  }
});

if (!response.ok) {
  console.error(
    JSON.stringify({
      ok: false,
      error: "github_authentication_failed",
      status: response.status
    })
  );
  process.exit(1);
}

const app = await response.json();
const expectedEvents = ["installation", "installation_repositories", "pull_request", "push"];
const permissionChecks = {
  checks: app.permissions?.checks === "write",
  contents: app.permissions?.contents === "write",
  metadata: app.permissions?.metadata === "read",
  pullRequests: app.permissions?.pull_requests === "write"
};
const eventChecks = Object.fromEntries(
  expectedEvents.map((event) => [event, app.events?.includes(event) === true])
);
const checks = {
  appId: String(app.id) === process.env.GITHUB_APP_ID,
  clientId: app.client_id === process.env.GITHUB_APP_CLIENT_ID,
  slug: app.slug === process.env.GITHUB_APP_SLUG,
  privateKey: true,
  permissions: Object.values(permissionChecks).every(Boolean)
};
const REDACTEDsOk = Object.values(checks).every(Boolean);
const eventSubscriptionsReady = Object.values(eventChecks).every(Boolean);

console.log(
  JSON.stringify(
    {
      ok: REDACTEDsOk,
      authenticated: true,
      githubSlug: app.slug,
      checks,
      permissionChecks,
      eventChecks,
      eventSubscriptionsReady,
      clientSecret: "REDACTED",
      webhookSecret: "present_not_remotely_testable_until_webhook_delivery"
    },
    null,
    2
  )
);

if (!REDACTEDsOk) {
  process.exit(2);
}
