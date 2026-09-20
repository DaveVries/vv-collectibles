import { BASE_URL, PATHS, MAX_AMOUNT_CENTS, SIGNATURE_FIELDS, type RaboOrderStatus } from "./spec";
import { sign, signRaw, signaturesMatch, signatureBase } from "./signature";

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
  if (!signaturesMatch(sign(result, SIGNATURE_FIELDS.announceResponse), result.signature)) {
    throw new Error("Rabo order announce response had an invalid signature");
  }

  return { omnikassaOrderId: result.omnikassaOrderId, redirectUrl: result.redirectUrl };
}

/* ------------------------------ order results ----------------------------- */

export type OrderResult = {
  merchantOrderId: string;
  omnikassaOrderId: string;
  orderStatus: RaboOrderStatus;
  orderStatusDateTime?: string;
  errorCode?: string;
  paidAmount?: { currency: string; amount: number };
  totalAmount?: { currency: string; amount: number };
};

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

  const base = [
    signatureBase(body, SIGNATURE_FIELDS.orderResults),
    ...results.map((r) => signatureBase(r, SIGNATURE_FIELDS.orderResultItem)),
  ].join("");

  if (!signaturesMatch(signRaw(base), body.signature)) {
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
