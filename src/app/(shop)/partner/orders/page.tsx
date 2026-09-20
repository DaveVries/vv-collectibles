import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPartnerForSession } from "@/lib/partner";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";

export const dynamic = "force-dynamic";

export default async function PartnerOrdersPage() {
  const session = await auth();
  const partner = await getPartnerForSession(session?.user?.id, session?.user?.email);
  if (!partner) return null;

  const orders = await prisma.order.findMany({
    where: { partnerId: partner.id },
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Mijn B2B-orders</h1>

      {orders.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-navy/50">
          Nog geen B2B-orders.{" "}
          <Link href="/partner/catalog" className="text-gold-dark underline">Plaats je eerste bestelling</Link>.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <Link key={o.id} href={`/account/orders/${o.number}`} className="card block p-5 hover:border-gold">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {o.number}
                    {o.hasPreorderItems && <span className="ml-1 text-amber-600">🔔</span>}
                  </p>
                  <p className="text-xs text-navy/50">{formatDateTime(o.createdAt)}</p>
                </div>
                <OrderStatusBadge status={o.status} paymentStatus={o.paymentStatus} />
                <span className="font-semibold">{formatMoney(o.totalCents, o.currency)}</span>
              </div>
              <p className="mt-3 text-sm text-navy/60">
                {o.items.reduce((n, i) => n + i.quantity, 0)} stuks ·{" "}
                {o.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
