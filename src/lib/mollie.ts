import { createMollieClient } from "@mollie/api-client";

/**
 * Mollie wrapper. When MOLLIE_API_KEY is unset we run in STUB mode: a fake
 * payment is "created" and checkout redirects straight to the success page,
 * and the order is treated as paid. This lets the whole flow run end-to-end
 * locally before real API keys exist.
 */
const apiKey = process.env.MOLLIE_API_KEY;
export const MOLLIE_STUB = !apiKey;

const client = apiKey ? createMollieClient({ apiKey }) : null;

export type CreatePaymentArgs = {
  orderId: string;
  orderNumber: string;
  amountCents: number;
  currency?: string;
  description: string;
  redirectUrl: string;
  webhookUrl: string;
};

export type CreatePaymentResult = {
  paymentId: string;
  checkoutUrl: string;
  stub: boolean;
};

export async function createPayment(args: CreatePaymentArgs): Promise<CreatePaymentResult> {
  const currency = args.currency ?? "EUR";
  const value = (args.amountCents / 100).toFixed(2);

  if (MOLLIE_STUB || !client) {
    // Pretend the payment succeeded immediately; redirect straight to success.
    return {
      paymentId: `stub_${args.orderId}`,
      checkoutUrl: args.redirectUrl,
      stub: true,
    };
  }

  const payment = await client.payments.create({
    amount: { currency, value },
    description: args.description,
    redirectUrl: args.redirectUrl,
    webhookUrl: args.webhookUrl,
    metadata: { orderId: args.orderId, orderNumber: args.orderNumber },
  });

  return {
    paymentId: payment.id,
    checkoutUrl: payment.getCheckoutUrl() ?? args.redirectUrl,
    stub: false,
  };
}

/** Map Mollie payment status to our PaymentStatus enum value. */
export async function getPaymentStatus(paymentId: string): Promise<{
  status: "OPEN" | "PAID" | "FAILED" | "EXPIRED" | "CANCELED" | "REFUNDED";
  method: string | null;
}> {
  if (MOLLIE_STUB || !client || paymentId.startsWith("stub_")) {
    return { status: "PAID", method: "stub" };
  }
  const p = await client.payments.get(paymentId);
  const map: Record<string, "OPEN" | "PAID" | "FAILED" | "EXPIRED" | "CANCELED" | "REFUNDED"> = {
    open: "OPEN",
    pending: "OPEN",
    authorized: "OPEN",
    paid: "PAID",
    failed: "FAILED",
    expired: "EXPIRED",
    canceled: "CANCELED",
  };
  return { status: map[p.status] ?? "OPEN", method: p.method ?? null };
}
