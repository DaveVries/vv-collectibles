import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { customerOrderWhere } from "@/lib/customer-orders";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import type { OrderStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

const STEPS: { status: OrderStatus; label: string }[] = [
  { status: "PENDING_PAYMENT", label: "Besteld" },
  { status: "PROCESSING", label: "In verwerking" },
  { status: "COMPLETED", label: "Verzonden / voltooid" },
];

export default async function CustomerOrderPage({ params }: { params: { number: string } }) {
  const session = await auth();
  // Ownership enforced: number must match AND belong to this user/email.
  const order = await prisma.order.findFirst({
    where: {
      number: params.number,
      ...customerOrderWhere(session?.user?.id, session?.user?.email),
    },
    include: { items: true, invoice: true },
  });
  if (!order) notFound();

  const currentStep = STEPS.findIndex((s) => s.status === order.status);
  const cancelled = order.status === "CANCELLED";

  return (
    <div>
      <Link href="/account/orders" className="text-sm text-navy/50 hover:text-gold-dark">
        ← Mijn bestellingen
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{order.number}</h1>
        <OrderStatusBadge status={order.status} paymentStatus={order.paymentStatus} />
      </div>
      <p className="mt-1 text-sm text-navy/50">Geplaatst {formatDateTime(order.createdAt)}</p>

      {/* Status timeline */}
      {!cancelled && (
        <ol className="mt-6 flex items-center">
          {STEPS.map((s, i) => {
            const done = i <= currentStep;
            return (
              <li key={s.status} className="flex flex-1 items-center last:flex-none">
                <div className="flex flex-col items-center">
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      done ? "bg-gold text-navy" : "bg-navy/10 text-navy/40"
                    }`}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span className="mt-1 text-xs text-navy/60">{s.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`mx-2 h-0.5 flex-1 ${i < currentStep ? "bg-gold" : "bg-navy/10"}`} />
                )}
              </li>
            );
          })}
        </ol>
      )}

      {order.trackingNumber && (
        <div className="card mt-6 p-5">
          <h2 className="text-sm font-semibold text-navy/60">Verzending</h2>
          <p className="mt-1 text-sm">
            {order.trackingCarrier ?? "PostNL"} — trackingnummer{" "}
            <span className="font-mono font-semibold">{order.trackingNumber}</span>
          </p>
        </div>
      )}

      {order.hasPreorderItems && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-red-600">
          Je bestelling bevat pre-order artikelen. Levertijden kunnen verschuiven; we mailen je
          zodra je producten verzonden worden.
        </p>
      )}

      {/* Items */}
      <div className="card mt-6 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-navy/5 text-navy/60">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Aantal</th>
              <th className="px-4 py-3 text-right">Totaal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {order.items.map((it) => (
              <tr key={it.id}>
                <td className="px-4 py-3">
                  {it.name}
                  {it.isPreorder && (
                    <span className="block text-xs text-amber-600">
                      Pre-order{it.expectedDelivery ? ` — verwacht ${it.expectedDelivery}` : ""}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">{it.quantity}</td>
                <td className="px-4 py-3 text-right">
                  {formatMoney(it.unitPriceCents * it.quantity, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-navy/10 text-sm">
            <tr>
              <td colSpan={2} className="px-4 py-2 text-right text-navy/60">Verzending</td>
              <td className="px-4 py-2 text-right">{formatMoney(order.shippingCents, order.currency)}</td>
            </tr>
            <tr className="font-bold">
              <td colSpan={2} className="px-4 py-3 text-right">Totaal</td>
              <td className="px-4 py-3 text-right">{formatMoney(order.totalCents, order.currency)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {order.invoice && (
          <a
            href={`/api/orders/${order.id}/invoice`}
            target="_blank"
            rel="noreferrer"
            className="btn-outline"
          >
            Factuur downloaden (PDF)
          </a>
        )}
      </div>
    </div>
  );
}
