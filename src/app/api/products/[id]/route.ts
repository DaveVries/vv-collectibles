import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

const schema = z.object({
  name: z.string().min(1),
  summary: z.string().optional(),
  description: z.string().optional(),
  category: z.string().default("Sealed Product"),
  brand: z.string().optional(),
  language: z.string().default("Engels"),
  priceEuros: z.coerce.number().positive(),
  compareAtEuros: z.coerce.number().optional(),
  wholesaleEuros: z.coerce.number().optional(),
  stock: z.coerce.number().int().default(0),
  images: z.array(z.string()).optional().default([]),
  isPreorder: z.coerce.boolean().default(false),
  releaseDate: z.string().optional(),
  expectedDelivery: z.string().optional(),
  preorderNote: z.string().optional(),
  nonCancellable: z.coerce.boolean().default(false),
  isCase: z.coerce.boolean().default(false),
  caseSize: z.coerce.number().int().optional(),
  featured: z.coerce.boolean().default(false),
  active: z.coerce.boolean().default(true),
});

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "STAFF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Controleer de velden", issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  const product = await prisma.product.update({
    where: { id: params.id },
    data: {
      name: d.name,
      summary: d.summary || null,
      description: d.description || null,
      category: d.category,
      brand: d.brand || null,
      language: d.language,
      priceCents: Math.round(d.priceEuros * 100),
      compareAtCents: d.compareAtEuros ? Math.round(d.compareAtEuros * 100) : null,
      wholesaleCents: d.wholesaleEuros ? Math.round(d.wholesaleEuros * 100) : null,
      stock: d.stock,
      images: d.images,
      isPreorder: d.isPreorder,
      releaseDate: d.releaseDate ? new Date(d.releaseDate) : null,
      expectedDelivery: d.expectedDelivery || null,
      preorderNote: d.preorderNote || null,
      nonCancellable: d.nonCancellable,
      isCase: d.isCase,
      caseSize: d.caseSize ?? null,
      featured: d.featured,
      active: d.active,
    },
  });

  return NextResponse.json({ ok: true, slug: product.slug });
}
