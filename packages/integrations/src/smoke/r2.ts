import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client
} from "@aws-sdk/client-s3";

import { parseServerEnvironment } from "@environment-reconciler/contracts/env";

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null;
}

function safeErrorSummary(error: unknown): Readonly<Record<string, string | number | undefined>> {
  if (!isRecord(error)) {
    return { name: error instanceof Error ? error.name : "UnknownError" };
  }

  const name = typeof error.name === "string" ? error.name : "UnknownError";
  const status =
    isRecord(error.$metadata) && typeof error.$metadata.httpStatusCode === "number"
      ? error.$metadata.httpStatusCode
      : undefined;

  return status === undefined ? { name } : { name, status };
}

function isNotFound(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  const status =
    isRecord(error.$metadata) && typeof error.$metadata.httpStatusCode === "number"
      ? error.$metadata.httpStatusCode
      : undefined;
  return status === 404 || error.name === "NotFound" || error.name === "NoSuchKey";
}

async function run(): Promise<void> {
  const environment = parseServerEnvironment(process.env);
  const endpoint = environment.R2_S3_ENDPOINT;
  const accessKeyId = environment.R2_S3_ACCESS_KEY_ID;
  const secretAccessKey = environment.R2_S3_SECRET_ACCESS_KEY;
  const bucket = environment.R2_BUCKET_NAME;

  if (
    endpoint === undefined ||
    accessKeyId === undefined ||
    secretAccessKey === undefined ||
    bucket === undefined
  ) {
    throw new Error("R2 direct-transfer configuration is not complete");
  }

  const client = new S3Client({
    credentials: { accessKeyId, secretAccessKey },
    endpoint,
    region: "auto"
  });
  const objectKey = `_environment-reconciler-smoke/${crypto.randomUUID()}.txt`;
  const expected = new TextEncoder().encode(
    `environment-reconciler-r2-smoke:${crypto.randomUUID()}`
  );
  let objectMayExist = false;

  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));

    objectMayExist = true;
    await client.send(
      new PutObjectCommand({
        Body: expected,
        Bucket: bucket,
        ContentType: "text/plain",
        Key: objectKey,
        Metadata: {
          purpose: "environment-reconciler-smoke"
        }
      })
    );

    const downloaded = await client.send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: objectKey
      })
    );
    if (downloaded.Body === undefined) {
      throw new Error("R2 returned no body for the temporary smoke object");
    }

    const actual = await downloaded.Body.transformToByteArray();
    if (
      actual.length !== expected.length ||
      actual.some((byte, index) => byte !== expected[index])
    ) {
      throw new Error("R2 temporary object content did not round-trip exactly");
    }

    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    objectMayExist = false;

    try {
      await client.send(new HeadObjectCommand({ Bucket: bucket, Key: objectKey }));
      throw new Error("R2 temporary object still exists after deletion");
    } catch (error) {
      if (!isNotFound(error)) {
        throw error;
      }
    }

    console.log(
      JSON.stringify({
        ok: true,
        checks: [
          "authenticate",
          "head_bucket",
          "put",
          "get_exact_bytes",
          "delete",
          "confirm_delete"
        ]
      })
    );
  } finally {
    if (objectMayExist) {
      await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: objectKey }));
    }
    client.destroy();
  }
}

try {
  await run();
} catch (error) {
  console.error(JSON.stringify({ ok: false, error: safeErrorSummary(error) }));
  process.exitCode = 1;
}
