"use client";

import Link from "next/link";
import { useCart } from "@/components/CartProvider";
import { formatMoney } from "@/lib/utils";

export default function CartPage() {
  const { items, setQty, remove, subtotalCents } = useCart();
  const hasPreorder = items.some((i) => i.isPreorder);

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-2xl font-bold">Je winkelwagen is leeg</h1>
        <Link href="/products" className="btn-gold mt-6">
          Verder winkelen
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-bold">Winkelwagen</h1>

      <div className="mt-8 space-y-4">
        {items.map((item) => (
          <div key={item.productId} className="card flex items-center gap-4 p-4">
            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-navy-800">
              {item.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center font-bold text-cream/30">
                  V&amp;V
                </div>
              )}
            </div>
            <div className="flex-1">
              <Link href={`/products/${item.slug}`} className="font-semibold hover:text-gold-dark">
                {item.name}
              </Link>
              {item.isPreorder && (
                <p className="text-xs font-medium text-amber-600">
                  🔔 Pre-order
                  {item.expectedDelivery ? ` — verwacht ${item.expectedDelivery}` : ""}
                </p>
              )}
              <p className="mt-1 text-sm text-navy/60">{formatMoney(item.priceCents)}</p>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                value={item.quantity}
                onChange={(e) => setQty(item.productId, parseInt(e.target.value) || 1)}
                className="input w-16 text-center"
              />
              <button
                onClick={() => remove(item.productId)}
                className="text-sm text-navy/40 hover:text-red-600"
                aria-label="Verwijderen"
              >
                ✕
              </button>
            </div>
            <div className="w-24 text-right font-semibold">
              {formatMoney(item.priceCents * item.quantity)}
            </div>
          </div>
        ))}
      </div>

      {hasPreorder && (
        <p className="mt-6 rounded-xl bg-amber-50 px-4 py-3 text-sm text-red-600">
          Let op: je winkelwagen bevat pre-order artikelen. Levertijden kunnen verschuiven en
          pre-orders kunnen niet worden geannuleerd.
        </p>
      )}

      <div className="mt-8 flex flex-col items-end gap-4">
        <div className="text-lg">
          Subtotaal: <span className="font-bold">{formatMoney(subtotalCents)}</span>
        </div>
        <Link href="/checkout" className="btn-gold">
          Naar afrekenen →
        </Link>
      </div>
    </div>
  );
}
