"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/CartProvider";
import { formatMoney } from "@/lib/utils";
import Link from "next/link";

const SHIPPING_CENTS = 695;

type Profile = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  houseNr?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
};

export default function CheckoutPage() {
  const { items, subtotalCents, clear } = useCart();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  // Prefill from the logged-in account, if any.
  useEffect(() => {
    fetch("/api/me")
      .then((r) => r.json())
      .then((p) => p && setProfile(p))
      .catch(() => {});
  }, []);
  const hasPreorder = items.some((i) => i.isPreorder);
  const totalCents = subtotalCents + (items.length ? SHIPPING_CENTS : 0);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      customer: {
        name: fd.get("name"),
        email: fd.get("email"),
        phone: fd.get("phone"),
      },
      shipping: {
        street: fd.get("street"),
        houseNr: fd.get("houseNr"),
        zip: fd.get("zip"),
        city: fd.get("city"),
        country: fd.get("country") || "NL",
      },
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
    };

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Er ging iets mis");
      clear();
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
      setSubmitting(false);
    }
  }

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
    <div className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-bold">Afrekenen</h1>
      {!profile && (
        <p className="mt-3 text-sm text-navy/60">
          <Link href="/login?callbackUrl=/checkout" className="font-semibold text-gold-dark hover:underline">
            Log in
          </Link>{" "}
          voor sneller afrekenen en om je bestelling te volgen — of reken af als gast.
        </p>
      )}
      <div className="mt-8 grid gap-10 md:grid-cols-[1fr_360px]">
        {/* key remounts the form so defaultValues apply once the profile loads */}
        <form key={profile ? "p" : "guest"} onSubmit={onSubmit} className="space-y-6">
          <section className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Gegevens</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field name="name" label="Naam" required className="sm:col-span-2" defaultValue={profile?.name ?? undefined} />
              <Field name="email" label="E-mail" type="email" required defaultValue={profile?.email ?? undefined} />
              <Field name="phone" label="Telefoon" defaultValue={profile?.phone ?? undefined} />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-4 text-lg font-semibold">Verzendadres</h2>
            <div className="grid gap-4 sm:grid-cols-6">
              <Field name="street" label="Straat" required className="sm:col-span-4" defaultValue={profile?.street ?? undefined} />
              <Field name="houseNr" label="Huisnr." required className="sm:col-span-2" defaultValue={profile?.houseNr ?? undefined} />
              <Field name="zip" label="Postcode" required className="sm:col-span-2" defaultValue={profile?.zip ?? undefined} />
              <Field name="city" label="Plaats" required className="sm:col-span-4" defaultValue={profile?.city ?? undefined} />
              <Field name="country" label="Land" defaultValue={profile?.country ?? "NL"} className="sm:col-span-2" />
            </div>
          </section>

          <section className="card p-6">
            <h2 className="mb-2 text-lg font-semibold">Betaling</h2>
            <p className="text-sm text-navy/60">
              Je wordt na het plaatsen doorgestuurd naar de beveiligde betaalpagina van
              Rabo OnlineKassa: iDEAL | Wero, creditcard, Bancontact of PayPal.
            </p>
          </section>

          {hasPreorder && (
            <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-red-600">
              Je bestelling bevat pre-order artikelen. Levertijden kunnen verschuiven en pre-orders
              kunnen niet worden geannuleerd, herroepen of geretourneerd.
            </p>
          )}

          {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

          <button type="submit" disabled={submitting} className="btn-gold w-full">
            {submitting ? "Bezig…" : `Betalen ${formatMoney(totalCents)}`}
          </button>
        </form>

        {/* Summary */}
        <aside className="card h-fit p-6">
          <h2 className="mb-4 text-lg font-semibold">Overzicht</h2>
          <ul className="space-y-3 text-sm">
            {items.map((i) => (
              <li key={i.productId} className="flex justify-between gap-2">
                <span className="text-navy/70">
                  {i.quantity}× {i.name}
                  {i.isPreorder && <span className="text-amber-600"> (pre-order)</span>}
                </span>
                <span className="shrink-0 font-medium">{formatMoney(i.priceCents * i.quantity)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-navy/10 pt-4 text-sm">
            <Row label="Subtotaal" value={formatMoney(subtotalCents)} />
            <Row label="Verzending" value={formatMoney(SHIPPING_CENTS)} />
            <div className="mt-2 flex justify-between border-t border-navy/10 pt-2 text-base font-bold">
              <span>Totaal</span>
              <span>{formatMoney(totalCents)}</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  className,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  className?: string;
  defaultValue?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        defaultValue={defaultValue}
        className="input"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-navy/70">
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
