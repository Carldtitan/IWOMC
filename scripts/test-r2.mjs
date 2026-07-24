import { createHash, createHmac, randomUUID } from "node:crypto";

const required = [
  "R2_S3_ENDPOINT",
  "R2_S3_ACCESS_KEY_ID",
  "R2_S3_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME"
];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length > 0) {
  console.error(JSON.stringify({ ok: false, error: "missing_variables", missing }));
  process.exit(1);
}

const endpoint = new URL(process.env.R2_S3_ENDPOINT);
const accessKeyId = process.env.R2_S3_ACCESS_KEY_ID;
const REDACTEDAccessKey = process.env.R2_S3_SECRET_ACCESS_KEY;
const bucket = process.env.R2_BUCKET_NAME;
const region = "auto";
const service = "s3";

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const hmac = (key, value, encoding) => createHmac("sha256", key).update(value).digest(encoding);
const encodePath = (path) =>
  path
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

async function signedRequest(method, path, body = "") {
  const payload = typeof body === "string" ? Buffer.from(body) : body;
  const payloadHash = sha256(payload);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);
  const canonicalUri = encodePath(path);
  const canonicalHeaders =
    `host:${endpoint.host}\n` + `x-amz-content-sha256:${payloadHash}\n` + `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    method,
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash
  ].join("\n");
  const REDACTEDScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    REDACTEDScope,
    sha256(canonicalRequest)
  ].join("\n");
  const dateKey = hmac(`AWS4${REDACTEDAccessKey}`, dateStamp);
  const regionKey = hmac(dateKey, region);
  const serviceKey = hmac(regionKey, service);
  const signingKey = hmac(serviceKey, "aws4_request");
  const signature = hmac(signingKey, stringToSign, "hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${REDACTEDScope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  return fetch(new URL(canonicalUri, endpoint), {
    method,
    headers: {
      Authorization: authorization,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate
    },
    body: method === "PUT" ? payload : undefined
  });
}

const key = `_REDACTED-tests/${randomUUID()}.txt`;
const path = `/${bucket}/${key}`;
const canary = `environment-REDACTED-r2-test:${randomUUID()}`;
let uploaded = false;
let readBack = false;
let deleted = false;
let accountBucketEnumerationDenied = false;

try {
  const accountListResponse = await signedRequest("GET", "/");
  accountBucketEnumerationDenied =
    accountListResponse.status === 401 || accountListResponse.status === 403;

  const putResponse = await signedRequest("PUT", path, canary);
  uploaded = putResponse.ok;
  if (!uploaded) {
    throw new Error(`R2 PUT failed with status ${putResponse.status}`);
  }

  const getResponse = await signedRequest("GET", path);
  readBack = getResponse.ok && (await getResponse.text()) === canary;
  if (!readBack) {
    throw new Error(`R2 GET verification failed with status ${getResponse.status}`);
  }
} finally {
  if (uploaded) {
    const deleteResponse = await signedRequest("DELETE", path);
    deleted = deleteResponse.ok;
  }
}

const result = {
  ok: uploaded && readBack && deleted && accountBucketEnumerationDenied,
  authenticated: uploaded,
  write: uploaded,
  readBack,
  cleanup: deleted,
  accountBucketEnumerationDenied
};
console.log(JSON.stringify(result, null, 2));

if (!result.ok) {
  process.exit(2);
}
