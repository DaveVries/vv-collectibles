/**
 * Self-contained checks for the Rabo OnlineKassa signature logic.
 *
 *   npm run test:rabo
 *
 * These verify the *mechanics* — determinism, nested field resolution, tamper
 * rejection, expiry handling, status mapping — using a dummy signing key. They
 * cannot tell you whether the field ORDER in src/lib/rabo/spec.ts matches
 * Rabo's real spec; only a sandbox call can. Re-run this after changing
 * anything in spec.ts to confirm nothing else broke.
 */
import { sign, verify, signatureBase, signaturesMatch } from "../src/lib/rabo/signature";
import { SIGNATURE_FIELDS } from "../src/lib/rabo/spec";
import { mapOrderStatus, parseNotification, verifyReturnParams } from "../src/lib/rabo";

process.env.RABO_SIGNING_KEY = Buffer.from("test-signing-key").toString("base64");

let fails = 0;
const ok = (name: string, cond: boolean) => {
  console.log(`${cond ? "PASS" : "FAIL"}  ${name}`);
  if (!cond) fails++;
};

// --- base string construction ---
const announce = {
  timestamp: "2026-09-20T10:00:00.000Z",
  merchantOrderId: "VV-2026-0001",
  amount: { currency: "EUR", amount: 4295 },
  language: "NL",
  description: "V&V Collectibles VV-2026-0001",
  merchantReturnURL: "https://shop.test/checkout/success?order=VV-2026-0001",
};
const base = signatureBase(announce, SIGNATURE_FIELDS.announceRequest);
ok("nested amount.currency resolved", base.includes("EUR"));
ok("nested amount.amount resolved", base.includes("4295"));
ok("field order: timestamp precedes merchantOrderId",
   base.indexOf("2026-09-20") < base.indexOf("VV-2026-0001"));

// --- determinism + hex shape ---
const s1 = sign(announce, SIGNATURE_FIELDS.announceRequest);
const s2 = sign(announce, SIGNATURE_FIELDS.announceRequest);
ok("signature is deterministic", s1 === s2);
ok("signature is 128-char lowercase hex", /^[0-9a-f]{128}$/.test(s1));

// --- tamper detection ---
ok("verify accepts untampered", verify(announce, SIGNATURE_FIELDS.announceRequest, s1));
const tampered = { ...announce, amount: { currency: "EUR", amount: 1 } };
ok("verify rejects altered amount", !verify(tampered, SIGNATURE_FIELDS.announceRequest, s1));

// --- malformed signature inputs must not throw ---
ok("rejects undefined signature", !signaturesMatch(s1, undefined));
ok("rejects empty signature", !signaturesMatch(s1, ""));
ok("rejects short signature", !signaturesMatch(s1, "abc"));
ok("case-insensitive match", signaturesMatch(s1, s1.toUpperCase()));

// --- absent optional fields occupy their slot ---
const withNull = { ...announce, description: null };
ok("null field does not throw", typeof sign(withNull, SIGNATURE_FIELDS.announceRequest) === "string");
ok("null field changes the signature", sign(withNull, SIGNATURE_FIELDS.announceRequest) !== s1);

// --- status mapping ---
ok("COMPLETED -> PAID", mapOrderStatus("COMPLETED") === "PAID");
ok("CANCELLED -> CANCELED", mapOrderStatus("CANCELLED") === "CANCELED");
ok("EXPIRED -> EXPIRED", mapOrderStatus("EXPIRED") === "EXPIRED");
ok("IN_PROGRESS -> OPEN", mapOrderStatus("IN_PROGRESS") === "OPEN");
ok("unknown -> OPEN (never PAID)", mapOrderStatus("SOMETHING_NEW") === "OPEN");

// --- notification validation (stub mode off) ---
process.env.RABO_REFRESH_TOKEN = "x";
const notif: Record<string, string> = {
  authentication: "tok-123",
  expiry: new Date(Date.now() + 60_000).toISOString(),
  eventName: "merchant.order.status.changed",
  poiId: "1000001",
};
notif.signature = sign(notif, SIGNATURE_FIELDS.notification);
ok("valid notification accepted", parseNotification(notif) !== null);
ok("unsigned notification rejected", parseNotification({ ...notif, signature: "deadbeef" }) === null);
ok("missing-field notification rejected", parseNotification({ authentication: "t" }) === null);
ok("non-object rejected", parseNotification("nope") === null);

const expired: Record<string, string> = { ...notif, expiry: new Date(Date.now() - 60_000).toISOString() };
expired.signature = sign(expired, SIGNATURE_FIELDS.notification);
ok("expired notification rejected despite valid signature", parseNotification(expired) === null);

// --- return params ---
const ret: Record<string, string> = { order_id: "abc-123", status: "COMPLETED" };
ret.signature = sign(ret, SIGNATURE_FIELDS.returnParams);
ok("valid return params accepted", verifyReturnParams(ret)?.status === "COMPLETED");
ok("forged return params rejected",
   verifyReturnParams({ order_id: "abc-123", status: "COMPLETED", signature: "f".repeat(128) }) === null);
ok("status swap without resign rejected",
   verifyReturnParams({ ...ret, status: "CANCELLED" }) === null);

console.log(fails === 0 ? "\nALL CHECKS PASSED" : `\n${fails} CHECK(S) FAILED`);
process.exit(fails === 0 ? 0 : 1);
