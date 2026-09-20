import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  phone: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  houseNr: z.string().optional().nullable(),
  zip: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

export async function PATCH(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Controleer de velden" }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone ?? null,
      street: parsed.data.street ?? null,
      houseNr: parsed.data.houseNr ?? null,
      zip: parsed.data.zip ?? null,
      city: parsed.data.city ?? null,
      country: parsed.data.country || "NL",
    },
  });

  return NextResponse.json({ ok: true });
}
