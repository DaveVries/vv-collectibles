import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { slugify } from "@/lib/utils";
import { sendNewProductAnnounce } from "@/lib/email";

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
  notifyPartners: z.coerce.boolean().default(true),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Controleer de velden", issues: parsed.error.issues }, { status: 400 });
  }
  const d = parsed.data;

  // Ensure unique slug.
  let slug = slugify(d.name);
  if (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${slug}-${Date.now().toString(36).slice(-4)}`;
  }

  const product = await prisma.product.create({
    data: {
      slug,
      name: d.name,
      summary: d.summary,
      description: d.description,
      category: d.category,
      brand: d.brand,
      language: d.language,
      priceCents: Math.round(d.priceEuros * 100),
      compareAtCents: d.compareAtEuros ? Math.round(d.compareAtEuros * 100) : null,
      wholesaleCents: d.wholesaleEuros ? Math.round(d.wholesaleEuros * 100) : null,
      stock: d.stock,
      images: d.images,
      isPreorder: d.isPreorder,
      releaseDate: d.releaseDate ? new Date(d.releaseDate) : null,
      expectedDelivery: d.expectedDelivery,
      preorderNote: d.preorderNote,
      nonCancellable: d.nonCancellable,
      isCase: d.isCase,
      caseSize: d.caseSize,
      featured: d.featured,
    },
  });

  // Auto-notify approved partners who opted in (B2B "new item" announce).
  if (d.notifyPartners) {
    const partners = await prisma.partner.findMany({
      where: { status: "APPROVED", notifyNewProducts: true },
      select: { email: true },
    });
    await sendNewProductAnnounce(partners.map((p) => p.email), product).catch((e) =>
      console.error("announce error", e),
    );
  }

  return NextResponse.json({ ok: true, slug: product.slug });
}
