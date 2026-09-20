"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/lib/utils";

type Row = {
  productId: string;
  slug: string;
  name: string;
  category: string;
  image: string | null;
  currency: string;
  isPreorder: boolean;
  consumerCents: number;
  unitNormalCents: number;
  unitBulkCents: number;
  discountPct: number;
  bulkDiscountPct: number;
};

type Address = {
  name: string;
  street: string;
  houseNr: string;
  zip: string;
  city: string;
  country: string;
  email: string;
  phone: string;
};

export function PartnerOrderForm({
  rows,
  bulkThreshold,
  defaultAddress,
}: {
  rows: Row[];
  bulkThreshold: number;
  defaultAddress: Address;
}) {
  const router = useRouter();
  const [qty, setQty] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const unitFor = (r: Row, q: number) => (q >= bulkThreshold ? r.unitBulkCents : r.unitNormalCents);

  const { lines, total, count } = useMemo(() => {
    const lines = rows
      .map((r) => {
        const q = qty[r.productId] ?? 0;
        return { r, q, unit: unitFor(r, q), line: unitFor(r, q) * q };
      })
      .filter((l) => l.q > 0);
    return {
      lines,
      total: lines.reduce((s, l) => s + l.line, 0),
      count: lines.reduce((s, l) => s + l.q, 0),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [qty, rows]);

  async function placeOrder(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (lines.length === 0) {
      setError("Voeg minimaal één product toe.");
      return;
    }
    setSubmitting(true);
    const fd = new FormData(e.currentTarget);
    const payload = {
      shipping: {
        name: fd.get("name"),
        street: fd.get("street"),
        houseNr: fd.get("houseNr"),
        zip: fd.get("zip"),
        city: fd.get("city"),
        country: fd.get("country") || "NL",
        email: fd.get("email"),
        phone: fd.get("phone"),
      },
      items: lines.map((l) => ({ productId: l.r.productId, quantity: l.q })),
    };
    const res = await fetch("/api/partner/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    setSubmitting(false);
    if (res.ok) {
      router.push("/partner/orders");
      router.refresh();
    } else {
      setError(data.error || "Bestellen mislukt");
    }
  }

  return (
    <form onSubmit={placeOrder}>
      <div className="overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-navy/5 text-navy/60">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3 text-right">Adviesprijs</th>
              <th className="px-4 py-3 text-right">Jouw prijs</th>
              <th className="px-4 py-3 text-right">Bulkprijs ({bulkThreshold}+)</th>
              <th className="px-4 py-3 text-right">Aantal</th>
              <th className="px-4 py-3 text-right">Totaal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {rows.map((r) => {
              const q = qty[r.productId] ?? 0;
              const unit = unitFor(r, q);
              const bulkActive = q >= bulkThreshold;
              return (
                <tr key={r.productId} className="hover:bg-navy/[0.02]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{r.name}</div>
                    <div className="text-xs text-navy/50">
                      {r.category}
                      {r.isPreorder && <span className="ml-1 text-amber-600">· pre-order</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-navy/40 line-through">
                    {formatMoney(r.consumerCents, r.currency)}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">
                    {formatMoney(r.unitNormalCents, r.currency)}
                    <div className="text-xs font-normal text-green-700">-{r.discountPct}%</div>
                  </td>
                  <td className="px-4 py-3 text-right text-navy/70">
                    {formatMoney(r.unitBulkCents, r.currency)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <input
                      type="number"
                      min={0}
                      value={q || ""}
                      placeholder="0"
                      onChange={(e) =>
                        setQty((m) => ({ ...m, [r.productId]: Math.max(0, parseInt(e.target.value) || 0) }))
                      }
                      className="input w-20 text-right"
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {q > 0 ? (
                      <>
                        <span className="font-semibold">{formatMoney(unit * q, r.currency)}</span>
                        {bulkActive && <div className="text-xs text-green-700">bulkprijs ✓</div>}
                      </>
                    ) : (
                      <span className="text-navy/30">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Delivery address */}
      <div className="card mt-6 p-6">
        <h2 className="mb-4 text-lg font-semibold">Bezorgadres</h2>
        <div className="grid gap-4 sm:grid-cols-6">
          <A name="name" label="Bedrijf / naam" def={defaultAddress.name} cls="sm:col-span-3" required />
          <A name="email" label="E-mail" def={defaultAddress.email} type="email" cls="sm:col-span-3" required />
          <A name="street" label="Straat" def={defaultAddress.street} cls="sm:col-span-4" required />
          <A name="houseNr" label="Huisnr." def={defaultAddress.houseNr} cls="sm:col-span-2" required />
          <A name="zip" label="Postcode" def={defaultAddress.zip} cls="sm:col-span-2" required />
          <A name="city" label="Plaats" def={defaultAddress.city} cls="sm:col-span-4" required />
          <A name="country" label="Land" def={defaultAddress.country} cls="sm:col-span-2" />
          <A name="phone" label="Telefoon" def={defaultAddress.phone} cls="sm:col-span-3" />
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="mt-6 flex flex-col items-end gap-3">
        <div className="text-lg">
          {count} stuk(s) · Totaal excl. verzending:{" "}
          <span className="font-bold">{formatMoney(total)}</span>
        </div>
        <button type="submit" disabled={submitting || lines.length === 0} className="btn-gold">
          {submitting ? "Bezig…" : "B2B-bestelling plaatsen"}
        </button>
        <p className="text-xs text-navy/50">
          Je ontvangt een orderbevestiging en factuur (op rekening). Pre-order levertijden kunnen
          verschuiven.
        </p>
      </div>
    </form>
  );
}

function A({
  name,
  label,
  def,
  cls,
  type = "text",
  required,
}: {
  name: string;
  label: string;
  def?: string;
  cls?: string;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className={cls}>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input id={name} name={name} type={type} defaultValue={def} required={required} className="input" />
    </div>
  );
}
