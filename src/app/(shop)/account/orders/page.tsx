import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOrderWhere } from "@/lib/customer-orders";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";

export const dynamic = "force-dynamic";

export default async function MyOrdersPage() {
  const session = await auth();
  const orders = await prisma.order.findMany({
    where: customerOrderWhere(session?.user?.id, session?.user?.email),
    orderBy: { createdAt: "desc" },
    include: { items: true },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold">Mijn bestellingen</h1>

      {orders.length === 0 ? (
        <div className="card mt-6 p-8 text-center text-navy/50">
          Je hebt nog geen bestellingen.
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          {orders.map((o) => (
            <Link
              key={o.id}
              href={`/account/orders/${o.number}`}
              className="card block p-5 hover:border-gold"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold">
                    {o.number}
                    {o.hasPreorderItems && <span className="ml-1 text-amber-600" title="Bevat pre-orders">🔔</span>}
                  </p>
                  <p className="text-xs text-navy/50">{formatDateTime(o.createdAt)}</p>
                </div>
                <OrderStatusBadge status={o.status} paymentStatus={o.paymentStatus} />
                <span className="font-semibold">{formatMoney(o.totalCents, o.currency)}</span>
              </div>
              <p className="mt-3 text-sm text-navy/60">
                {o.items.map((i) => `${i.quantity}× ${i.name}`).join(" · ")}
              </p>
              {o.trackingNumber && (
                <p className="mt-2 text-sm text-navy/70">
                  Tracking ({o.trackingCarrier ?? "PostNL"}):{" "}
                  <span className="font-mono">{o.trackingNumber}</span>
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
