import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { getPartnerForSession } from "@/lib/partner";
import { priceLine } from "@/lib/pricing";
import { nextOrderNumber } from "@/lib/numbering";
import { ensureInvoiceForOrder } from "@/lib/invoice";
import { sendOrderConfirmation } from "@/lib/email";

// B2B orders ship free / arranged separately; consumer shipping fee doesn't apply.
const B2B_SHIPPING_CENTS = 0;

const schema = z.object({
  shipping: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
    street: z.string().min(1),
    houseNr: z.string().min(1),
    zip: z.string().min(1),
    city: z.string().min(1),
    country: z.string().default("NL"),
  }),
  items: z.array(z.object({ productId: z.string(), quantity: z.number().int().positive() })).min(1),
});

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const partner = await getPartnerForSession(session.user.id, session.user.email);
  if (!partner) return NextResponse.json({ error: "Geen goedgekeurde partner" }, { status: 403 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Ongeldige gegevens" }, { status: 400 });
  const { shipping, items } = parsed.data;

  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  // Recompute partner net prices server-side — never trust client amounts.
  const lines = items
    .map((i) => {
      const p = byId.get(i.productId);
      if (!p) return null;
      const priced = priceLine(p, i.quantity, partner);
      return { product: p, quantity: i.quantity, unitPriceCents: priced.unitNetCents };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (lines.length === 0) return NextResponse.json({ error: "Geen geldige producten" }, { status: 400 });

  const subtotalCents = lines.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const totalCents = subtotalCents + B2B_SHIPPING_CENTS;
  const hasPreorderItems = lines.some((l) => l.product.isPreorder);
  const number = await nextOrderNumber();

  const order = await prisma.order.create({
    data: {
      number,
      channel: "B2B",
      userId: session.user.id,
      partnerId: partner.id,
      // B2B is invoiced (op rekening): order proceeds to processing, payment stays open.
      status: "PROCESSING",
      paymentStatus: "OPEN",
      paymentMethod: "Factuur",
      customerName: shipping.name,
      customerEmail: shipping.email.toLowerCase(),
      customerPhone: shipping.phone ?? null,
      shipStreet: shipping.street,
      shipHouseNr: shipping.houseNr,
      shipZip: shipping.zip,
      shipCity: shipping.city,
      shipCountry: shipping.country || "NL",
      subtotalCents,
      shippingCents: B2B_SHIPPING_CENTS,
      totalCents,
      hasPreorderItems,
      items: {
        create: lines.map((l) => ({
          productId: l.product.id,
          name: l.product.name,
          unitPriceCents: l.unitPriceCents,
          quantity: l.quantity,
          isPreorder: l.product.isPreorder,
          expectedDelivery: l.product.expectedDelivery,
        })),
      },
    },
  });

  await ensureInvoiceForOrder(order.id).catch((e) => console.error("invoice error", e));
  await sendOrderConfirmation(order).catch((e) => console.error("email error", e));

  return NextResponse.json({ ok: true, orderNumber: order.number });
}
