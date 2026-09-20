import { SIGNATURE_FIELDS, type RaboOrderStatus } from "./spec";
import { verify } from "./signature";
import { announceOrder, isStub } from "./client";

export { isStub, fetchAllOrderResults, type OrderResult } from "./client";
export type { RaboOrderStatus } from "./spec";

/**
 * Rabo OnlineKassa (Rabo Smart Pay / OmniKassa 2.0) wrapper.
 *
 * When RABO_REFRESH_TOKEN or RABO_SIGNING_KEY is unset we run in STUB mode:
 * no API call is made, checkout redirects straight to the success page and
 * the order is treated as paid. That keeps the whole flow runnable locally
 * before real credentials exist — same behaviour the Mollie wrapper had.
 */

/** Our own PaymentStatus enum values (see prisma/schema.prisma). */
export type PaymentStatus = "OPEN" | "PAID" | "FAILED" | "EXPIRED" | "CANCELED" | "REFUNDED";

/**
 * Rabo reports four order states; map them onto our enum.
 *
 * REFUNDED is deliberately not in the return type: refunds are handled in the
 * Rabo dashboard and are not reported through the order-results feed, so this
 * function can never produce one.
 */
export function mapOrderStatus(
  status: RaboOrderStatus | string,
): Exclude<PaymentStatus, "REFUNDED"> {
  switch (status) {
    case "COMPLETED":
      return "PAID";
    case "CANCELLED":
      return "CANCELED";
    case "EXPIRED":
      return "EXPIRED";
    case "IN_PROGRESS":
      return "OPEN";
    default:
      return "OPEN";
  }
}

export type CreatePaymentArgs = {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency?: string;
  description: string;
  redirectUrl: string;
};

export type CreatePaymentResult = {
  paymentId: string;
  checkoutUrl: string;
  stub: boolean;
};

/**
 * Announces the order with Rabo and returns the URL to send the customer to.
 *
 * Note there is no webhookUrl argument: unlike Mollie, the notification URL
 * is configured once in the Rabo dashboard, not per payment.
 */
export async function createPayment(args: CreatePaymentArgs): Promise<CreatePaymentResult> {
  if (isStub()) {
    return {
      paymentId: `stub_${args.orderId}`,
      checkoutUrl: args.redirectUrl,
      stub: true,
    };
  }

  const announced = await announceOrder({
    // Rabo echoes merchantOrderId back on the webhook; our order number is
    // the natural key to match on.
    merchantOrderId: args.orderNumber,
    amountCents: args.amountCents,
    currency: args.currency ?? "EUR",
    description: args.description,
    returnUrl: args.redirectUrl,
  });

  return {
    paymentId: announced.omnikassaOrderId,
    checkoutUrl: announced.redirectUrl,
    stub: false,
  };
}

/* ------------------------------ notifications ----------------------------- */

export type RaboNotification = {
  authentication: string;
  expiry: string;
  eventName: string;
  poiId: string;
  signature: string;
};

/**
 * Validates a webhook notification body.
 *
 * Returns the parsed notification, or null when the body is malformed, the
 * signature does not match, or the embedded token has already expired.
 * Callers must treat null as "ignore this notification" — never as a reason
 * to mark anything paid.
 */
export function parseNotification(body: unknown): RaboNotification | null {
  if (isStub()) return null;
  if (!body || typeof body !== "object") return null;

  const n = body as Partial<RaboNotification>;
  if (!n.authentication || !n.expiry || !n.eventName || !n.poiId || !n.signature) {
    return null;
  }

  if (!verify(n, SIGNATURE_FIELDS.notification, n.signature)) return null;

  const expiresAt = Date.parse(n.expiry);
  if (Number.isFinite(expiresAt) && expiresAt < Date.now()) return null;

  return n as RaboNotification;
}

/**
 * Validates the `order_id` / `status` / `signature` query parameters Rabo
 * appends when it sends the customer back to merchantReturnURL.
 *
 * This is a display-time convenience only. The webhook is the authoritative
 * source of truth for payment state — a customer who closes the browser
 * before returning still gets a correct order, and the return URL must never
 * be the only thing that marks an order paid.
 */
export function verifyReturnParams(params: {
  order_id?: string | null;
  status?: string | null;
  signature?: string | null;
}): { orderId: string; status: RaboOrderStatus } | null {
  if (isStub()) return null;
  if (!params.order_id || !params.status || !params.signature) return null;

  const source = { order_id: params.order_id, status: params.status };
  if (!verify(source, SIGNATURE_FIELDS.returnParams, params.signature)) return null;

  return { orderId: params.order_id, status: params.status as RaboOrderStatus };
}
