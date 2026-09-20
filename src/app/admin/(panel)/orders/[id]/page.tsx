import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDateTime } from "@/lib/utils";
import { OrderStatusBadge } from "@/components/admin/OrderStatusBadge";
import { OrderActions } from "@/components/admin/OrderActions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const order = await prisma.order.findUnique({
    where: { id: params.id },
    include: { items: true, invoice: true, partner: true },
  });
  if (!order) notFound();

  return (
    <div>
      <Link href="/admin/orders" className="text-sm text-navy/50 hover:text-gold-dark">
        ← Bestellingen
      </Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold">{order.number}</h1>
        <OrderStatusBadge status={order.status} paymentStatus={order.paymentStatus} />
        {order.hasPreorderItems && (
          <span className="badge bg-amber-100 text-amber-800">🔔 Pre-order</span>
        )}
      </div>
      <p className="mt-1 text-sm text-navy/50">Geplaatst {formatDateTime(order.createdAt)}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Items */}
          <div className="card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-navy/5 text-navy/60">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3 text-right">Aantal</th>
                  <th className="px-4 py-3 text-right">Stukprijs</th>
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
                    <td className="px-4 py-3 text-right">{formatMoney(it.unitPriceCents, order.currency)}</td>
                    <td className="px-4 py-3 text-right">
                      {formatMoney(it.unitPriceCents * it.quantity, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-navy/10 text-sm">
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-navy/60">Subtotaal</td>
                  <td className="px-4 py-2 text-right">{formatMoney(order.subtotalCents, order.currency)}</td>
                </tr>
                <tr>
                  <td colSpan={3} className="px-4 py-2 text-right text-navy/60">Verzending</td>
                  <td className="px-4 py-2 text-right">{formatMoney(order.shippingCents, order.currency)}</td>
                </tr>
                <tr className="font-bold">
                  <td colSpan={3} className="px-4 py-3 text-right">Totaal</td>
                  <td className="px-4 py-3 text-right">{formatMoney(order.totalCents, order.currency)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Customer / shipping */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-navy/60">Klant</h2>
              <p className="mt-2 font-medium">{order.customerName}</p>
              <p className="text-sm text-navy/70">{order.customerEmail}</p>
              {order.customerPhone && <p className="text-sm text-navy/70">{order.customerPhone}</p>}
              {order.partner && (
                <p className="mt-2 text-xs text-gold-dark">B2B · {order.partner.companyName}</p>
              )}
            </div>
            <div className="card p-5">
              <h2 className="text-sm font-semibold text-navy/60">Verzendadres</h2>
              <p className="mt-2 text-sm text-navy/70">
                {order.shipStreet} {order.shipHouseNr}
                <br />
                {order.shipZip} {order.shipCity}
                <br />
                {order.shipCountry}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <OrderActions
          orderId={order.id}
          initialStatus={order.status}
          initialTracking={order.trackingNumber}
          initialBarcode={order.labelBarcode}
          hasInvoice={!!order.invoice}
        />
      </div>
    </div>
  );
}
