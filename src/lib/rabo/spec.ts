/**
 * Rabo OnlineKassa (Rabo Smart Pay / OmniKassa 2.0) protocol constants.
 *
 * ┌─────────────────────────────────────────────────────────────────────────┐
 * │ VERIFIED against the official PHP SDK                                   │
 * │ (github.com/rabobank-nederland/omnikassa-php-sdk):                      │
 * │                                                                         │
 * │   BASE_URL              README, v1.18.0 notes                           │
 * │   PATHS.accessToken     ApiConnector: '%s/gatekeeper/refresh'           │
 * │   PATHS.announceOrder   ApiConnector: '%s/order/server/api/v2/order'    │
 * │   PATHS.orderResults    ApiConnector: '…/events/results/%s'             │
 * │   SIGNATURE_SEPARATOR   Signable: implode(',', flatten(...))            │
 * │   SIGNATURE_ALGORITHM   Signable: HASH_ALGORITHM = 'sha512', hex out    │
 * │                                                                         │
 * │ STILL UNVERIFIED — confirm in a sandbox call before going live:         │
 * │                                                                         │
 * │   SIGNATURE_FIELDS      the per-message field ORDER. The separator and  │
 * │                         algorithm are now known, but the order of each  │
 * │                         message's fields comes from the getSignatureData│
 * │                         implementations, which were not read. A wrong   │
 * │                         order fails every request with a signature      │
 * │                         mismatch, and that is the symptom to expect.    │
 * │                                                                         │
 * │ Everything stays isolated in this file on purpose: correcting a field   │
 * │ order is a one-file change, nothing else depends on the ordering.       │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

/**
 * Sandbox vs production is driven by RABO_ENVIRONMENT (see .env.example).
 *
 * Verified against the official PHP SDK README. Sandbox and production are
 * separate hosts; the older form that distinguished them by path suffix
 * (/omnikassa-api vs /omnikassa-api-sandbox on betalen.rabobank.nl) is
 * listed there as incorrect.
 */
export const BASE_URL = {
  sandbox: "https://api.pay-sandbox.rabobank.nl/omnikassa-api",
  production: "https://api.pay.rabobank.nl/omnikassa-api",
} as const;

/** Paths appended to BASE_URL. */
export const PATHS = {
  /** Exchanges the dashboard refresh token for a short-lived access token. */
  accessToken: "/gatekeeper/refresh",
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
 * A comma, with no spaces. Verified against the official PHP SDK: Signable
 * flattens the signature data, discarding keys, then joins it with
 * implode(',', ...) before handing it to hash_hmac.
 */
export const SIGNATURE_SEPARATOR = ",";

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
