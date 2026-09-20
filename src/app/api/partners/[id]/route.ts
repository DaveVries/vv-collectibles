import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  tier: z.enum(["STANDARD", "PARTNER", "DISTRIBUTOR"]).optional(),
  discountPct: z.coerce.number().int().min(0).max(60).optional(),
  bulkThreshold: z.coerce.number().int().min(1).optional(),
  bulkDiscountPct: z.coerce.number().int().min(0).max(60).optional(),
  notifyNewProducts: z.coerce.boolean().optional(),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldig" }, { status: 400 });

  const before = await prisma.partner.findUnique({ where: { id: params.id } });
  const partner = await prisma.partner.update({ where: { id: params.id }, data: parsed.data });

  // Email the store when it gets approved.
  if (parsed.data.status === "APPROVED" && before?.status !== "APPROVED") {
    const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
    await sendEmail({
      to: partner.email,
      subject: "Je bent goedgekeurd als partner — V&V Collectibles",
      html: `<p>Hi ${partner.contactName},</p>
        <p>Je aanvraag voor <strong>${partner.companyName}</strong> is goedgekeurd. Je ontvangt
        voortaan automatisch onze partnerprijzen en updates bij nieuwe items.</p>
        <p>Log in op het partnerportaal om te bestellen tegen jouw inkoopprijzen:</p>
        <p><a href="${site}/partner">${site}/partner</a></p>
        <p>Heb je nog geen account? Maak er één aan met dit e-mailadres (${partner.email}) via
        <a href="${site}/register">${site}/register</a> — je portaaltoegang wordt dan automatisch gekoppeld.</p>`,
    }).catch(() => {});
  }

  return NextResponse.json({ ok: true, partner });
}
