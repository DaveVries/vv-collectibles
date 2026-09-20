import { prisma } from "@/lib/prisma";
import { ensureInvoiceForOrder } from "@/lib/invoice";
import { sendOrderConfirmation } from "@/lib/email";

/**
 * Marks an order paid and runs the once-only side effects (invoice + customer
 * confirmation email).
 *
 * Safe to call more than once for the same order: payment providers retry
 * webhooks, and Rabo in particular can report the same order in more than one
 * results batch. The `paidAt` guard means a duplicate call updates state but
 * never generates a second invoice or sends a second email.
 */
export async function markOrderPaid(
  orderId: string,
  opts: { method?: string | null } = {},
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) return;

  const alreadyPaid = order.paymentStatus === "PAID";

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus: "PAID",
      paymentMethod: opts.method ?? order.paymentMethod,
      status: order.status === "PENDING_PAYMENT" ? "PROCESSING" : order.status,
      paidAt: order.paidAt ?? new Date(),
    },
  });

  if (alreadyPaid) return;

  await ensureInvoiceForOrder(orderId).catch((e) => console.error("invoice error", e));
  await sendOrderConfirmation(order).catch((e) => console.error("email error", e));
}

/**
 * Applies a non-paid terminal status (cancelled/expired/failed). Leaves an
 * already-paid order alone — a late CANCELLED must not retract a real payment.
 */
export async function markOrderUnpaid(
  orderId: string,
  paymentStatus: "OPEN" | "FAILED" | "EXPIRED" | "CANCELED",
): Promise<void> {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentStatus === "PAID") return;

  const terminal = paymentStatus === "EXPIRED" || paymentStatus === "CANCELED" || paymentStatus === "FAILED";

  await prisma.order.update({
    where: { id: orderId },
    data: {
      paymentStatus,
      status: terminal && order.status === "PENDING_PAYMENT" ? "CANCELLED" : order.status,
    },
  });
}
