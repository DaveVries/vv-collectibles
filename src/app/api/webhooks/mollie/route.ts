import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getPaymentStatus } from "@/lib/mollie";
import { ensureInvoiceForOrder } from "@/lib/invoice";
import { sendOrderConfirmation } from "@/lib/email";

/**
 * Mollie calls this webhook with the payment id whenever a payment changes
 * state. We re-fetch the authoritative status from Mollie (never trust the
 * body) and update the order; on first PAID we generate the invoice + email.
 */
export async function POST(req: Request) {
  let paymentId: string | null = null;
  try {
    const form = await req.formData();
    paymentId = (form.get("id") as string) ?? null;
  } catch {
    const body = await req.json().catch(() => null);
    paymentId = body?.id ?? null;
  }
  if (!paymentId) return NextResponse.json({ error: "missing id" }, { status: 400 });

  const order = await prisma.order.findFirst({ where: { molliePaymentId: paymentId } });
  if (!order) return NextResponse.json({ ok: true }); // 200 so Mollie stops retrying

  const { status, method } = await getPaymentStatus(paymentId);
  const wasPaid = order.paymentStatus === "PAID";

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentStatus: status,
      paymentMethod: method ?? order.paymentMethod,
      status: status === "PAID" ? (order.status === "PENDING_PAYMENT" ? "PROCESSING" : order.status) : order.status,
      paidAt: status === "PAID" && !order.paidAt ? new Date() : order.paidAt,
    },
  });

  if (status === "PAID" && !wasPaid) {
    await ensureInvoiceForOrder(order.id).catch((e) => console.error("invoice error", e));
    await sendOrderConfirmation(order).catch((e) => console.error("email error", e));
  }

  return NextResponse.json({ ok: true });
}
