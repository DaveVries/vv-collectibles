import { createHmac, timingSafeEqual } from "node:crypto";
import { SIGNATURE_ALGORITHM, SIGNATURE_SEPARATOR } from "./spec";

/**
 * HMAC-SHA512 signing for Rabo OnlineKassa messages.
 *
 * The signing key comes from the Rabo dashboard base64-encoded; it is decoded
 * to raw bytes before being handed to the HMAC. The result is lowercase hex.
 * A common integration mistake is to hash the JSON body — it is the bare
 * concatenated field *values* that get hashed, never the JSON.
 */

function signingKey(): Buffer {
  const raw = process.env.RABO_SIGNING_KEY;
  if (!raw) throw new Error("RABO_SIGNING_KEY is not set");
  return Buffer.from(raw, "base64");
}

/** Reads a possibly-nested field ("amount.currency") off an object. */
function readPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc === null || acc === undefined) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, source);
}

/**
 * Turns a field value into the string that goes into the signature.
 * Absent/null fields contribute an empty string — they still occupy their
 * slot in the ordering, which is what Rabo expects for optional fields.
 */
function toSignatureValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

/** Collects the ordered field values of `source` as one signable string. */
export function signatureBase(source: unknown, fields: readonly string[]): string {
  return fields.map((f) => toSignatureValue(readPath(source, f))).join(SIGNATURE_SEPARATOR);
}

/** Signs an ordered field list, returning lowercase hex. */
export function sign(source: unknown, fields: readonly string[]): string {
  return createHmac(SIGNATURE_ALGORITHM, signingKey())
    .update(signatureBase(source, fields), "utf8")
    .digest("hex");
}

/** Signs an already-assembled base string. Used where results are concatenated. */
export function signRaw(base: string): string {
  return createHmac(SIGNATURE_ALGORITHM, signingKey()).update(base, "utf8").digest("hex");
}

/**
 * Constant-time comparison of an expected signature against one we received.
 * Returns false rather than throwing on a malformed input, so callers can
 * treat "bad signature" and "unparseable signature" identically.
 */
export function signaturesMatch(expected: string, received: unknown): boolean {
  if (typeof received !== "string" || received.length === 0) return false;
  const a = Buffer.from(expected.toLowerCase(), "utf8");
  const b = Buffer.from(received.toLowerCase(), "utf8");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/** Verifies a received message against the expected ordered field signature. */
export function verify(
  source: unknown,
  fields: readonly string[],
  received: unknown,
): boolean {
  return signaturesMatch(sign(source, fields), received);
}
