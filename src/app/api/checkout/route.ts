import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { nextOrderNumber } from "@/lib/numbering";
import { createPayment } from "@/lib/rabo";
import { markOrderPaid } from "@/lib/order-finalize";

const SHIPPING_CENTS = 695;

const schema = z.object({
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().optional().nullable(),
  }),
  shipping: z.object({
    street: z.string().min(1),
    houseNr: z.string().min(1),
    zip: z.string().min(1),
    city: z.string().min(1),
    country: z.string().default("NL"),
  }),
  items: z
    .array(z.object({ productId: z.string(), quantity: z.number().int().positive() }))
    .min(1),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ongeldige gegevens" }, { status: 400 });
  }
  const { customer, shipping, items } = parsed.data;

  // Re-price from the DB (never trust client prices).
  const products = await prisma.product.findMany({
    where: { id: { in: items.map((i) => i.productId) }, active: true },
  });
  const byId = new Map(products.map((p) => [p.id, p]));

  const lineItems = items
    .map((i) => {
      const p = byId.get(i.productId);
      if (!p) return null;
      return {
        product: p,
        quantity: i.quantity,
        unitPriceCents: p.priceCents,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (lineItems.length === 0) {
    return NextResponse.json({ error: "Geen geldige producten" }, { status: 400 });
  }

  const subtotalCents = lineItems.reduce((s, l) => s + l.unitPriceCents * l.quantity, 0);
  const shippingCents = SHIPPING_CENTS;
  const totalCents = subtotalCents + shippingCents;
  const hasPreorderItems = lineItems.some((l) => l.product.isPreorder);

  const number = await nextOrderNumber();

  // Link to the logged-in account (if any) so it shows up under "Mijn bestellingen".
  const session = await auth();
  const userId = session?.user?.id ?? null;
  if (userId) {
    // Remember the address on the profile for next time (fill only empty fields).
    await prisma.user.update({
      where: { id: userId },
      data: {
        phone: customer.phone ?? undefined,
        street: shipping.street,
        houseNr: shipping.houseNr,
        zip: shipping.zip,
        city: shipping.city,
        country: shipping.country || "NL",
      },
    }).catch(() => {});
  }

  const order = await prisma.order.create({
    data: {
      number,
      channel: "WEBSHOP",
      userId,
      customerName: customer.name,
      customerEmail: customer.email,
      customerPhone: customer.phone ?? null,
      shipStreet: shipping.street,
      shipHouseNr: shipping.houseNr,
      shipZip: shipping.zip,
      shipCity: shipping.city,
      shipCountry: shipping.country || "NL",
      subtotalCents,
      shippingCents,
      totalCents,
      hasPreorderItems,
      items: {
        create: lineItems.map((l) => ({
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

  const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

  // Rabo's notification URL is configured once in the dashboard, so unlike
  // Mollie there is no per-payment webhook URL to pass here.
  let payment;
  try {
    payment = await createPayment({
      orderId: order.id,
      orderNumber: order.number,
      amountCents: totalCents,
      description: `V&V Collectibles ${order.number}`,
      redirectUrl: `${site}/checkout/success?order=${order.number}`,
    });
  } catch (e) {
    console.error("rabo announce error", e);
    // The order row stays behind in PENDING_PAYMENT, which is what we want:
    // the customer can retry and support can see the attempt.
    return NextResponse.json(
      { error: "De betaling kon niet gestart worden. Probeer het opnieuw." },
      { status: 502 },
    );
  }

  await prisma.order.update({
    where: { id: order.id },
    data: { paymentRef: payment.paymentId },
  });

  // In stub mode the payment is instantly "paid": finalize now so the order,
  // invoice and confirmation email all exist for local testing.
  if (payment.stub) {
    await markOrderPaid(order.id, { method: "stub" });
  }

  return NextResponse.json({ orderNumber: order.number, checkoutUrl: payment.checkoutUrl });
}
