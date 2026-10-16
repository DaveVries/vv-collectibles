import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendShippedEmail } from "@/lib/email";
import { markOrderPaid } from "@/lib/order-finalize";

const schema = z.object({
  status: z.enum(["PENDING_PAYMENT", "PROCESSING", "COMPLETED", "CANCELLED"]).optional(),
  trackingNumber: z.string().nullable().optional(),
  trackingCarrier: z.string().optional(),
  notes: z.string().optional(),
  /**
   * Reconcile a payment that completed at Rabo but never reached us, because
   * the notification was lost or rejected. Runs the same finalisation as the
   * webhook — paidAt, invoice, confirmation email — rather than only flipping
   * a status field, and is idempotent.
   *
   * Confirm the payment in the Rabo dashboard before using it: nothing here
   * checks with Rabo, it records what staff assert.
   */
  markPaid: z.literal(true).optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Staff only. Without this, any signed-in customer could alter any order by
  // id — its status, its tracking, or mark it completed. Every other admin
  // route already guards this way; this one did not.
  const role = session.user.role;
  if (role !== "ADMIN" && role !== "STAFF") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldig" }, { status: 400 });

  const { markPaid, ...fields } = parsed.data;

  const before = await prisma.order.findUnique({ where: { id: params.id } });
  if (!before) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  if (markPaid) {
    console.warn(
      `order ${before.number} marked paid manually by ${session.user.email} — reconciling a payment the webhook missed`,
    );
    await markOrderPaid(params.id, { method: "rabo (handmatig)" });
  }

  const order = Object.keys(fields).length
    ? await prisma.order.update({ where: { id: params.id }, data: fields })
    : (await prisma.order.findUnique({ where: { id: params.id } }))!;

  // Notify the customer when the order first gets a tracking number or is completed.
  const newlyTracked = !before?.trackingNumber && !!order.trackingNumber;
  const newlyCompleted = before?.status !== "COMPLETED" && order.status === "COMPLETED";
  if (newlyTracked || newlyCompleted) {
    await sendShippedEmail(order).catch((e) => console.error("shipped email error", e));
  }

  return NextResponse.json({ ok: true, order });
}
