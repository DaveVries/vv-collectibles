/**
 * Rabo OnlineKassa (Rabo Smart Pay / OmniKassa 2.0) protocol constants.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ VERIFY BEFORE GOING LIVE                                                │
 * │                                                                         │
 * │ Everything in this file is protocol-level detail taken from the public  │
 * │ SDK documentation. The authoritative reference is the API manual behind │
 * │ the login at https://developer.rabobank.nl/api-documentation/           │
 * │ rabo-omnikassa/2-0-16 — check each constant below against it.           │
 * │                                                                         │
 * │ The two that will bite you first are BASE_URL (a wrong path gives 404)  │
 * │ and the SIGNATURE_FIELDS orders (a wrong order gives a signature        │
 * │ mismatch on every single request). Both are isolated here on purpose:   │
 * │ correcting them is a one-file change, no logic elsewhere depends on     │
 * │ the specific ordering.                                                  │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/** Sandbox vs production is driven by RABO_ENVIRONMENT (see .env.example). */
export const BASE_URL = {
  sandbox: "https://betalen.rabobank.nl/omnikassa-api-sandbox",
  production: "https://betalen.rabobank.nl/omnikassa-api",
} as const;

/** Paths appended to BASE_URL. */
export const PATHS = {
  /** Exchanges the dashboard refresh token for a short-lived access token. */
  accessToken: "/gateway/server/api/access-token",
  /** Announces a new order; responds with the hosted-payment redirect URL. */
  announceOrder: "/order/server/api/v2/order",
  /** Pulls finished order results after a webhook notification. */
  orderResults: "/order/server/api/events/results/merchant.order.status.changed",
} as const;

/**
 * Signature field order, per message type.
 *
 * The signature is an HMAC-SHA512 over these fields, read in exactly this
 * order and joined with SIGNATURE_SEPARATOR. Nested fields use dot paths.
 *
 * NOTE: public sources disagree on the separator (see SIGNATURE_SEPARATOR).
 * If every request comes back with a signature error, that constant is the
 * first thing to flip.
 */
export const SIGNATURE_FIELDS = {
  /** Body we send to announceOrder. */
  announceRequest: [
    "timestamp",
    "merchantOrderId",
    "amount.currency",
    "amount.amount",
    "language",
    "description",
    "merchantReturnURL",
  ],
  /** Body announceOrder sends back. */
  announceResponse: ["redirectUrl", "omnikassaOrderId"],
  /** Query params on the customer's return to merchantReturnURL. */
  returnParams: ["order_id", "status"],
  /** Body of the webhook notification POST. */
  notification: ["authentication", "expiry", "eventName", "poiId"],
  /** Body of the orderResults response (order fields joined per result). */
  orderResults: ["moreOrderResultsAvailable"],
  /** Fields of each individual result inside an orderResults response. */
  orderResultItem: [
    "merchantOrderId",
    "omnikassaOrderId",
    "poiId",
    "orderStatus",
    "orderStatusDateTime",
    "errorCode",
    "paidAmount.currency",
    "paidAmount.amount",
    "totalAmount.currency",
    "totalAmount.amount",
  ],
} as const;

/**
 * How signature fields are joined before hashing.
 *
 * The Rabobank SDK manual describes the fields as "stitched" together, which
 * reads as an empty separator. At least one widely-used community SDK joins
 * them with commas instead. Empty string is the safer default because it
 * matches the official wording — but if signatures fail, try ",".
 */
export const SIGNATURE_SEPARATOR = "";

/** HMAC algorithm. The signing key from the dashboard is base64 and is decoded before use. */
export const SIGNATURE_ALGORITHM = "sha512";

/** Order statuses Rabo reports back to us. */
export type RaboOrderStatus = "IN_PROGRESS" | "COMPLETED" | "CANCELLED" | "EXPIRED";

/**
 * Payment brands the hosted page can offer. Leaving paymentBrand unset on the
 * announce lets the customer pick on Rabo's own page, which is what we do.
 */
export const PAYMENT_BRANDS = [
  "IDEAL",
  "PAYPAL",
  "MASTERCARD",
  "VISA",
  "BANCONTACT",
  "MAESTRO",
  "V_PAY",
] as const;

/** Rabo rejects announces above this amount (in cents). */
export const MAX_AMOUNT_CENTS = 9_999_999;
