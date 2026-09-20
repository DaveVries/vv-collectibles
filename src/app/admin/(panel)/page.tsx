import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [orderCount, paidAgg, processing, pendingPartners, recent] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({
      where: { paymentStatus: "PAID" },
      _sum: { totalCents: true },
    }),
    prisma.order.count({ where: { status: "PROCESSING" } }),
    prisma.partner.count({ where: { status: "PENDING" } }),
    prisma.order.findMany({ orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Dashboard</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Omzet (betaald)" value={formatMoney(paidAgg._sum.totalCents ?? 0)} />
        <Stat label="Bestellingen" value={String(orderCount)} />
        <Stat label="In verwerking" value={String(processing)} href="/admin/orders?status=PROCESSING" />
        <Stat label="Partneraanvragen" value={String(pendingPartners)} href="/admin/partners" />
      </div>

      <div className="mt-10 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recente bestellingen</h2>
        <Link href="/admin/orders" className="text-sm font-semibold text-gold-dark hover:underline">
          Alle bestellingen →
        </Link>
      </div>
      <div className="mt-4 overflow-hidden rounded-2xl border border-navy/10 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy/5 text-navy/60">
            <tr>
              <th className="px-4 py-3">Nummer</th>
              <th className="px-4 py-3">Klant</th>
              <th className="px-4 py-3">Datum</th>
              <th className="px-4 py-3">Totaal</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-navy/40">
                  Nog geen bestellingen.
                </td>
              </tr>
            )}
            {recent.map((o) => (
              <tr key={o.id} className="hover:bg-navy/[0.02]">
                <td className="px-4 py-3 font-medium">
                  <Link href={`/admin/orders/${o.id}`} className="hover:text-gold-dark">
                    {o.number}
                  </Link>
                </td>
                <td className="px-4 py-3 text-navy/70">{o.customerName}</td>
                <td className="px-4 py-3 text-navy/60">{formatDateTime(o.createdAt)}</td>
                <td className="px-4 py-3">{formatMoney(o.totalCents, o.currency)}</td>
                <td className="px-4 py-3">
                  <OrderStatusBadge status={o.status} paymentStatus={o.paymentStatus} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href?: string }) {
  const body = (
    <div className="card p-5">
      <p className="text-sm text-navy/50">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
