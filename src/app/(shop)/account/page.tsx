import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOrderWhere } from "@/lib/customer-orders";
import { getPartnerForSession } from "@/lib/partner";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";

export const dynamic = "force-dynamic";

export default async function AccountPage() {
  const session = await auth();
  const userId = session?.user?.id;
  const email = session?.user?.email;

  const [orders, partner] = await Promise.all([
    prisma.order.findMany({
      where: customerOrderWhere(userId, email),
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    getPartnerForSession(userId, email),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold">Overzicht</h1>
      <p className="mt-1 text-navy/60">Welkom terug{session?.user?.name ? `, ${session.user.name}` : ""}.</p>

      {partner && (
        <Link
          href="/partner"
          className="mt-5 flex items-center justify-between rounded-2xl bg-navy p-5 text-cream hover:bg-navy-700"
        >
          <div>
            <p className="font-semibold">Partnerportaal</p>
            <p className="text-sm text-cream/70">
              Je bent partner ({partner.companyName}) — bestel tegen inkoopprijzen.
            </p>
          </div>
          <span className="text-gold">→</span>
        </Link>
      )}

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Recente bestellingen</h2>
        <Link href="/account/orders" className="text-sm font-semibold text-gold-dark hover:underline">
          Alles bekijken →
        </Link>
      </div>

      {orders.length === 0 ? (
        <div className="card mt-4 p-8 text-center text-navy/50">
          Je hebt nog geen bestellingen.{" "}
          <Link href="/products" className="text-gold-dark underline">Begin met winkelen</Link>.
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((o) => (
            <li key={o.id}>
              <Link
                href={`/account/orders/${o.number}`}
                className="card flex items-center justify-between p-4 hover:border-gold"
              >
                <div>
                  <p className="font-semibold">{o.number}</p>
                  <p className="text-xs text-navy/50">{formatDateTime(o.createdAt)}</p>
                </div>
                <div className="flex items-center gap-4">
                  <OrderStatusBadge status={o.status} paymentStatus={o.paymentStatus} />
                  <span className="font-semibold">{formatMoney(o.totalCents, o.currency)}</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
