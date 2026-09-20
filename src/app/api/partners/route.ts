import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

const schema = z.object({
  companyName: z.string().min(1),
  contactName: z.string().min(1),
  email: z.string().email(),
  phone: z.string().optional(),
  vatNumber: z.string().optional(),
  website: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  message: z.string().optional(),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Vul de verplichte velden in" }, { status: 400 });
  }
  const data = parsed.data;

  const existing = await prisma.partner.findUnique({ where: { email: data.email } });
  if (existing) {
    return NextResponse.json(
      { error: "Er bestaat al een aanvraag met dit e-mailadres" },
      { status: 409 },
    );
  }

  const partner = await prisma.partner.create({
    data: {
      companyName: data.companyName,
      contactName: data.contactName,
      email: data.email.toLowerCase(),
      phone: data.phone,
      vatNumber: data.vatNumber,
      website: data.website,
      city: data.city,
      country: data.country || "NL",
      message: data.message,
    },
  });

  // Notify the shop owner of the new application.
  await sendEmail({
    to: process.env.EMAIL_FROM ?? "orders@vvcollectibles.nl",
    subject: `Nieuwe partneraanvraag: ${partner.companyName}`,
    html: `<p>${partner.companyName} (${partner.contactName}, ${partner.email}) wil partner worden.</p>
      <p>${partner.message ?? ""}</p>`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}
