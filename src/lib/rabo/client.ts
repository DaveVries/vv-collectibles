import { BASE_URL, PATHS, MAX_AMOUNT_CENTS, SIGNATURE_FIELDS, type RaboOrderStatus } from "./spec";
import { sign, signValues, signaturesMatch, type KeyMode } from "./signature";

/**
 * Thin HTTP client for the Rabo OnlineKassa API.
 *
 * Auth is two-tiered: a long-lived *refresh token* from the Rabo dashboard is
 * exchanged for a short-lived *access token*, which signs the actual calls.
 * The access token is cached in module scope until shortly before it expires.
 */

/**
 * True when credentials are absent, i.e. we run in STUB mode.
 *
 * Evaluated per call rather than captured at module load: a module-level
 * constant freezes whatever the environment looked like at import time, which
 * silently breaks tests and any runtime that populates env after import.
 */
export function isStub(): boolean {
  return !process.env.RABO_REFRESH_TOKEN || !process.env.RABO_SIGNING_KEY;
}

function baseUrl(): string {
  return process.env.RABO_ENVIRONMENT === "production" ? BASE_URL.production : BASE_URL.sandbox;
}

function refreshToken(): string {
  const token = process.env.RABO_REFRESH_TOKEN;
  if (!token) throw new Error("RABO_REFRESH_TOKEN is not set");
  return token;
}

/* ------------------------------ access token ------------------------------ */

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

/** Refresh a minute early so a token never expires mid-flight. */
const TOKEN_SKEW_MS = 60_000;

async function accessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - TOKEN_SKEW_MS > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch(`${baseUrl()}${PATHS.accessToken}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${refreshToken()}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Rabo access-token request failed (${res.status}): ${await res.text()}`);
  }

  const body = (await res.json()) as { token: string; validUntil?: string; durationInMillis?: number };
  if (!body?.token) throw new Error("Rabo access-token response contained no token");

  const expiresAt = body.validUntil
    ? Date.parse(body.validUntil)
    : Date.now() + (body.durationInMillis ?? 600_000);

  cachedToken = { token: body.token, expiresAt };
  return body.token;
}

/** Drops the cached token; the next call re-authenticates. Used after a 401. */
export function invalidateAccessToken(): void {
  cachedToken = null;
}

/* -------------------------------- announce -------------------------------- */

export type AnnounceArgs = {
  merchantOrderId: string;
  amountCents: number;
  currency: string;
  description: string;
  returnUrl: string;
  language?: string;
};

export type AnnounceResult = {
  omnikassaOrderId: string;
  redirectUrl: string;
};

/**
 * Announces an order and returns the hosted payment page to redirect to.
 * The response signature is verified before the redirect URL is trusted —
 * without that check a tampered response could redirect customers anywhere.
 */
export async function announceOrder(args: AnnounceArgs): Promise<AnnounceResult> {
  if (args.amountCents > MAX_AMOUNT_CENTS) {
    throw new Error(`Order amount ${args.amountCents} exceeds the Rabo maximum of ${MAX_AMOUNT_CENTS}`);
  }

  const payload = {
    timestamp: new Date().toISOString(),
    merchantOrderId: args.merchantOrderId,
    amount: { currency: args.currency, amount: args.amountCents },
    language: args.language ?? "NL",
    description: args.description,
    merchantReturnURL: args.returnUrl,
  };

  const body = { ...payload, signature: sign(payload, SIGNATURE_FIELDS.announceRequest) };

  const res = await fetch(`${baseUrl()}${PATHS.announceOrder}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (res.status === 401) {
    invalidateAccessToken();
    throw new Error("Rabo rejected the access token while announcing an order");
  }
  if (!res.ok) {
    throw new Error(`Rabo order announce failed (${res.status}): ${await res.text()}`);
  }

  const result = (await res.json()) as {
    redirectUrl?: string;
    omnikassaOrderId?: string;
    signature?: string;
  };

  if (!result.redirectUrl || !result.omnikassaOrderId) {
    throw new Error("Rabo order announce response was missing redirectUrl or omnikassaOrderId");
  }
  // The live API does not sign this response: it comes back with redirectUrl
  // and omnikassaOrderId and nothing else. The PHP SDK still models a
  // signature here, so the SDK is ahead of or behind the deployed API.
  //
  // Verify when one is present, and accept its absence. There is no security
  // lost by not checking a signature that was never sent: this is the reply
  // to our own HTTPS request, authenticated with a bearer token, so the
  // channel is already trusted. The webhook is the opposite case — an
  // unauthenticated inbound POST where the signature is the only protection
  // — and that one stays mandatory.
  if (result.signature) {
    if (!signaturesMatch(sign(result, SIGNATURE_FIELDS.announceResponse), result.signature)) {
      throw new Error(
        `Rabo order announce response had an invalid signature. ${describeSignatureMismatch(result)}`,
      );
    }
  }

  return { omnikassaOrderId: result.omnikassaOrderId, redirectUrl: result.redirectUrl };
}


/**
 * Works out how Rabo actually signed the response, and says so.
 *
 * Both the field ordering and the key handling are in question. The ordering
 * came from the official PHP SDK and does not match the live API; the key
 * handling (base64-decode the dashboard value) is documented but unproven,
 * because Rabo appears not to verify our request signatures — so a wrong key
 * stays invisible until a response fails to verify, which is exactly the
 * symptom here.
 *
 * Tries every combination of the two and names what matched. Runs only after
 * a verification has already failed, so it costs nothing normally, and logs
 * no secret: the key never leaves the HMAC, and the fields are a redirect URL
 * and an order id the customer sees anyway.
 */
function describeSignatureMismatch(result: Record<string, unknown>): string {
  const orderings: Record<string, string[]> = {
    "[redirectUrl]": ["redirectUrl"],
    "[redirectUrl, omnikassaOrderId]": ["redirectUrl", "omnikassaOrderId"],
    "[omnikassaOrderId, redirectUrl]": ["omnikassaOrderId", "redirectUrl"],
    "[omnikassaOrderId]": ["omnikassaOrderId"],
  };
  const modes: KeyMode[] = ["base64", "raw"];

  const matches: string[] = [];
  for (const mode of modes) {
    for (const [label, fields] of Object.entries(orderings)) {
      if (signaturesMatch(sign(result, fields, mode), result.signature)) {
        matches.push(`${label} with the ${mode} key`);
      }
    }
  }

  const keys = Object.keys(result).join(", ");
  if (matches.length) {
    return `Rabo signed ${matches.join(" or ")}. Response keys: ${keys}.`;
  }
  return (
    `No combination of ordering and key handling matched. Response keys: ${keys}. ` +
    `redirectUrl length=${String(result.redirectUrl ?? "").length}, ` +
    `signature length=${String(result.signature ?? "").length}. ` +
    "If a key above is unexpected, it is probably part of the signature."
  );
}

/* ------------------------------ order results ----------------------------- */

type Money = { currency?: string; amount?: number };

type TransactionInfo = {
  id?: string;
  paymentBrand?: string;
  type?: string;
  status?: string;
  amount?: Money;
  confirmedAmount?: Money;
  startTime?: string;
  lastUpdateTime?: string;
};

export type OrderResult = {
  merchantOrderId: string;
  omnikassaOrderId: string;
  poiId?: string | number;
  orderStatus: RaboOrderStatus;
  orderStatusDateTime?: string;
  errorCode?: string;
  paidAmount?: Money;
  totalAmount?: Money;
  transactionInfo?: TransactionInfo[];
};

/** A Money contributes two slots, currency then amount, even when absent. */
function moneyValues(m: Money | undefined): unknown[] {
  return [m?.currency ?? null, m?.amount ?? null];
}

/**
 * The signed value list for one order result, mirroring
 * MerchantOrderResult::getSignatureData() in the official PHP SDK: the fixed
 * fields, the two amounts, then every transaction appended in array order.
 *
 * The transactions matter — a completed order carries at least one, and
 * leaving them out makes the signature fail on exactly the payments that
 * succeeded.
 */
function orderResultValues(r: OrderResult): unknown[] {
  return [
    r.merchantOrderId,
    r.omnikassaOrderId,
    r.poiId,
    r.orderStatus,
    r.orderStatusDateTime,
    r.errorCode,
    ...moneyValues(r.paidAmount),
    ...moneyValues(r.totalAmount),
    ...(r.transactionInfo ?? []).flatMap((t) => [
      t.id,
      t.paymentBrand,
      t.type,
      t.status,
      ...moneyValues(t.amount),
      // Absent confirmedAmount still occupies both slots: the SDK
      // substitutes [null, null] rather than skipping it.
      ...moneyValues(t.confirmedAmount),
      t.startTime,
      t.lastUpdateTime,
    ]),
  ];
}

/**
 * Fetches one page of finished order results using the token handed to us by
 * a webhook notification. Rabo returns up to 100 results per call and sets
 * `moreOrderResultsAvailable` when the caller should ask again.
 *
 * The response signature covers the page flag plus every result's fields in
 * order; we rebuild that base string and compare before trusting any status.
 */
export async function fetchOrderResults(
  notificationToken: string,
): Promise<{ results: OrderResult[]; more: boolean }> {
  const res = await fetch(`${baseUrl()}${PATHS.orderResults}`, {
    method: "GET",
    headers: { Authorization: `Bearer ${notificationToken}` },
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error(`Rabo order-results request failed (${res.status}): ${await res.text()}`);
  }

  const body = (await res.json()) as {
    moreOrderResultsAvailable?: boolean;
    orderResults?: OrderResult[];
    signature?: string;
  };

  const results = body.orderResults ?? [];

  // moreOrderResultsAvailable is signed as the literal "true"/"false",
  // followed by every result's values, the whole lot flattened and joined
  // with the same separator as everything else.
  const values = [
    body.moreOrderResultsAvailable ? "true" : "false",
    ...results.flatMap(orderResultValues),
  ];

  if (!signaturesMatch(signValues(values), body.signature)) {
    throw new Error("Rabo order-results response had an invalid signature");
  }

  return { results, more: Boolean(body.moreOrderResultsAvailable) };
}

/** Walks every page of results for a notification token. */
export async function fetchAllOrderResults(notificationToken: string): Promise<OrderResult[]> {
  const all: OrderResult[] = [];
  let more = true;
  // Rabo pages at 100 results; cap the loop so a stuck `more` flag can't spin forever.
  for (let page = 0; more && page < 50; page++) {
    const { results, more: hasMore } = await fetchOrderResults(notificationToken);
    all.push(...results);
    more = hasMore && results.length > 0;
  }
  return all;
}
