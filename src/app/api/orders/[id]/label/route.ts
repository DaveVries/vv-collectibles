import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { generateLabel, POSTNL_STUB } from "@/lib/postnl";

/**
 * "Label" button: pre-fills PostNL with the recipient's address from the order
 * and creates a shipping label. Returns the barcode + label (PDF data URL).
 * In stub mode it returns a placeholder barcode so the flow is testable.
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const order = await prisma.order.findUnique({ where: { id: params.id } });
  if (!order) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

  try {
    const label = await generateLabel(order.number, {
      name: order.customerName,
      street: order.shipStreet,
      houseNr: order.shipHouseNr,
      zip: order.shipZip,
      city: order.shipCity,
      country: order.shipCountry,
    });

    await prisma.order.update({
      where: { id: order.id },
      data: {
        labelBarcode: label.barcode,
        labelUrl: label.labelUrl ?? undefined,
        trackingNumber: order.trackingNumber ?? label.barcode,
        trackingCarrier: "PostNL",
      },
    });

    return NextResponse.json({
      ok: true,
      barcode: label.barcode,
      labelUrl: label.labelUrl,
      stub: label.stub || POSTNL_STUB,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Label mislukt" },
      { status: 502 },
    );
  }
}
