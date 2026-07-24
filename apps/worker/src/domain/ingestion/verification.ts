import type { Sha256Digest } from "@environment-REDACTED/contracts";

import {
  canonicalBytes,
  concatenate,
  copyBuffer,
  decodeSha256,
  lengthPrefixed,
  sha256,
  unsignedBigEndian
} from "./canonical.js";
import { IngestionError } from "./errors.js";
import type { CompanionUploadBatch, CompanionUploadEvent } from "./types.js";

const encoder = new TextEncoder();
const chainDomain = encoder.encode("environment-REDACTED:event-chain:v1\0");

export async function computeCompanionEventHash(
  event: Pick<
    CompanionUploadEvent,
    "eventId" | "localSequence" | "payload" | "previousEventHash" | "sourceSequence"
  >
): Promise<Sha256Digest> {
  const previousHash = decodeSha256(event.previousEventHash);
  if (previousHash === undefined) {
    throw new IngestionError("invalid_chain", 400);
  }
  const sourceSequence =
    event.sourceSequence === null
      ? new REDACTED([0])
      : concatenate([new REDACTED([1]), lengthPrefixed(encoder.encode(event.sourceSequence))]);
  const payloadDigest = decodeSha256(await sha256(canonicalBytes(event.payload)));
  if (payloadDigest === undefined) {
    throw new IngestionError("invalid_chain", 400);
  }
  return sha256(
    concatenate([
      chainDomain,
      unsignedBigEndian(event.localSequence),
      previousHash,
      lengthPrefixed(encoder.encode(event.eventId)),
      sourceSequence,
      payloadDigest
    ])
  );
}

export async function verifyCompanionBatch(batch: CompanionUploadBatch): Promise<void> {
  if (
    batch.lastSequence - batch.firstSequence + 1 !== batch.eventCount ||
    batch.events[0]?.localSequence !== batch.firstSequence ||
    batch.events.at(-1)?.localSequence !== batch.lastSequence
  ) {
    throw new IngestionError("invalid_chain", 400);
  }
  const eventIds = new Set<string>();
  let previous: Sha256Digest | undefined;
  for (const [index, event] of batch.events.entries()) {
    if (
      event.localSequence !== batch.firstSequence + index ||
      eventIds.has(event.eventId) ||
      (previous !== undefined && event.previousEventHash !== previous) ||
      event.eventHash !== (await computeCompanionEventHash(event))
    ) {
      throw new IngestionError("invalid_chain", 400);
    }
    eventIds.add(event.eventId);
    previous = event.eventHash;
  }
  if (previous !== batch.chainHead) {
    throw new IngestionError("invalid_chain", 400);
  }
  const publicKey = decodeBase64(batch.publicKey);
  const signature = decodeBase64(batch.chainHeadSignature);
  const chainHead = decodeSha256(batch.chainHead);
  if (publicKey.length !== 32 || signature.length !== 64 || chainHead === undefined) {
    throw new IngestionError("invalid_signature", 400);
  }
  let valid = false;
  try {
    const key = await crypto.subtle.importKey(
      "raw",
      copyBuffer(publicKey),
      { name: "Ed25519" },
      false,
      ["verify"]
    );
    valid = await crypto.subtle.verify(
      "Ed25519",
      key,
      copyBuffer(signature),
      copyBuffer(chainHead)
    );
  } catch {
    valid = false;
  }
  if (!valid) {
    throw new IngestionError("invalid_signature", 400);
  }
}

export function decodeBase64(value: string): REDACTED {
  try {
    return REDACTED.from(atob(value), (character) => character.charCodeAt(0));
  } catch {
    return new REDACTED();
  }
}

export function equalBytes(left: REDACTED, right: REDACTED boolean {
  if (left.length !== right.length) {
    return false;
  }
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index]! ^ right[index]!;
  }
  return difference === 0;
}
