"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Initial = {
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  street?: string | null;
  houseNr?: string | null;
  zip?: string | null;
  city?: string | null;
  country?: string | null;
} | null;

export function ProfileForm({ initial }: { initial: Initial }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/account/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.fromEntries(fd.entries())),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Opgeslagen ✓");
      router.refresh();
    } else {
      const d = await res.json().catch(() => ({}));
      setError(d.error || "Opslaan mislukt");
    }
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <F name="name" label="Naam" defaultValue={initial?.name ?? ""} required />
        <div>
          <label className="label">E-mail</label>
          <input className="input bg-navy/5" value={initial?.email ?? ""} disabled />
        </div>
        <F name="phone" label="Telefoon" defaultValue={initial?.phone ?? ""} />
      </div>
      <div className="grid gap-4 sm:grid-cols-6">
        <F name="street" label="Straat" defaultValue={initial?.street ?? ""} className="sm:col-span-4" />
        <F name="houseNr" label="Huisnr." defaultValue={initial?.houseNr ?? ""} className="sm:col-span-2" />
        <F name="zip" label="Postcode" defaultValue={initial?.zip ?? ""} className="sm:col-span-2" />
        <F name="city" label="Plaats" defaultValue={initial?.city ?? ""} className="sm:col-span-4" />
        <F name="country" label="Land" defaultValue={initial?.country ?? "NL"} className="sm:col-span-2" />
      </div>
      {msg && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="btn-gold">
        {saving ? "Opslaan…" : "Opslaan"}
      </button>
    </form>
  );
}

function F({
  name,
  label,
  defaultValue,
  required,
  className,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input id={name} name={name} defaultValue={defaultValue} required={required} className="input" />
    </div>
  );
}
