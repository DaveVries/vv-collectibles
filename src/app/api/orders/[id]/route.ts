import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendShippedEmail } from "@/lib/email";

const schema = z.object({
  status: z.enum(["PENDING_PAYMENT", "PROCESSING", "COMPLETED", "CANCELLED"]).optional(),
  trackingNumber: z.string().nullable().optional(),
  trackingCarrier: z.string().optional(),
  notes: z.string().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldig" }, { status: 400 });

  const before = await prisma.order.findUnique({ where: { id: params.id } });
  const order = await prisma.order.update({
    where: { id: params.id },
    data: parsed.data,
  });

  // Notify the customer when the order first gets a tracking number or is completed.
  const newlyTracked = !before?.trackingNumber && !!order.trackingNumber;
  const newlyCompleted = before?.status !== "COMPLETED" && order.status === "COMPLETED";
  if (newlyTracked || newlyCompleted) {
    await sendShippedEmail(order).catch((e) => console.error("shipped email error", e));
  }

  return NextResponse.json({ ok: true, order });
}
