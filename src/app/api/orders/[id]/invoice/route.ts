import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getInvoicePdf } from "@/lib/invoice";

/**
 * Generate (if needed) and stream the invoice PDF for an order. Staff can fetch
 * any order; a customer may only fetch their own (by userId or matching email).
 * Streams the bytes directly so it works identically in dev and production.
 */
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const role = session.user.role;
  if (role !== "ADMIN" && role !== "STAFF") {
    const order = await prisma.order.findUnique({ where: { id: params.id } });
    const ownsByEmail = order?.customerEmail === session.user.email?.toLowerCase();
    const ownsById = order?.userId && order.userId === session.user.id;
    if (!order || (!ownsByEmail && !ownsById)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  try {
    const pdf = await getInvoicePdf(params.id);
    if (!pdf) return NextResponse.json({ error: "Niet gevonden" }, { status: 404 });

    const download = new URL(req.url).searchParams.get("download") === "1";
    return new NextResponse(new Uint8Array(pdf.buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${pdf.number}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Factuur mislukt" },
      { status: 500 },
    );
  }
}
