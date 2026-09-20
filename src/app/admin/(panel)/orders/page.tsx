import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import type { Prisma, OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STATUSES: OrderStatus[] = ["PENDING_PAYMENT", "PROCESSING", "COMPLETED", "CANCELLED"];

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const where: Prisma.OrderWhereInput = {};
  if (searchParams.status && STATUSES.includes(searchParams.status as OrderStatus)) {
    where.status = searchParams.status as OrderStatus;
  }

  const orders = await prisma.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: { items: true, invoice: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Bestellingen</h1>

      <div className="mt-5 flex flex-wrap gap-2">
        <Pill href="/admin/orders" active={!searchParams.status}>Alles</Pill>
        {STATUSES.map((s) => (
          <Pill key={s} href={`/admin/orders?status=${s}`} active={searchParams.status === s}>
            {labelFor(s)}
          </Pill>
        ))}
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-navy/5 text-navy/60">
            <tr>
              <th className="px-4 py-3">Nummer</th>
              <th className="px-4 py-3">Klant</th>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Items</th>
              <th className="px-4 py-3">Totaal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Tracking</th>
              <th className="px-4 py-3">Factuur</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {orders.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-navy/40">
                  Geen bestellingen gevonden.
                </td>
              </tr>
            )}
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-navy/[0.02]">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-gold-dark">
                    {o.number}
                  </Link>
                  {o.hasPreorderItems && (
                    <span className="ml-1 text-xs text-amber-600" title="Bevat pre-orders">🔔</span>
                  )}
                </td>
                <td className="px-4 py-3 text-navy/70">{o.customerName}</td>
                <td className="px-4 py-3 text-navy/60">{formatDateTime(o.createdAt)}</td>
                <td className="px-4 py-3 text-navy/60">
                  {o.items.reduce((n, i) => n + i.quantity, 0)}
                </td>
                <td className="px-4 py-3">{formatMoney(o.totalCents, o.currency)}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={o.status} paymentStatus={o.paymentStatus} />
                </td>
                <td className="px-4 py-3 text-navy/60">{o.trackingNumber ?? "—"}</td>
                <td className="px-4 py-3">
                  {o.paymentStatus === "PAID" || o.invoice ? (
                    <a
                      href={`/api/orders/${o.id}/invoice`}
                      target="_blank"
                      rel="noreferrer"
                      className="font-semibold text-gold-dark hover:underline"
                    >
                      PDF
                    </a>
                  ) : (
                    <span className="text-navy/30">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function labelFor(s: OrderStatus) {
  return {
    PENDING_PAYMENT: "Wacht op betaling",
    PROCESSING: "In verwerking",
    COMPLETED: "Voltooid",
    CANCELLED: "Geannuleerd",
  }[s];
}

function Pill({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`badge px-3 py-1.5 ${active ? "bg-navy text-cream" : "border border-navy/15 bg-white text-navy/70 hover:border-navy/40"}`}
    >
      {children}
    </Link>
  );
}
