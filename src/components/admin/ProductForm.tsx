"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ImageManager } from "@/components/admin/ImageManager";

export type ProductInitial = {
  id: string;
  name: string;
  summary: string | null;
  description: string | null;
  category: string;
  brand: string | null;
  language: string;
  priceCents: number;
  compareAtCents: number | null;
  wholesaleCents: number | null;
  stock: number;
  images: string[];
  isPreorder: boolean;
  releaseDate: string | null; // ISO
  expectedDelivery: string | null;
  preorderNote: string | null;
  nonCancellable: boolean;
  isCase: boolean;
  caseSize: number | null;
  featured: boolean;
  active: boolean;
};

const euros = (cents: number | null | undefined) =>
  cents == null ? "" : (cents / 100).toFixed(2);

export function ProductForm({ initial }: { initial?: ProductInitial }) {
  const router = useRouter();
  const editing = !!initial;
  const [images, setImages] = useState<string[]>(initial?.images ?? []);
  const [isPreorder, setIsPreorder] = useState(initial?.isPreorder ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = {
      ...Object.fromEntries(fd.entries()),
      images,
      isPreorder: fd.get("isPreorder") === "on",
      nonCancellable: fd.get("nonCancellable") === "on",
      isCase: fd.get("isCase") === "on",
      featured: fd.get("featured") === "on",
      active: fd.get("active") === "on",
      notifyPartners: fd.get("notifyPartners") === "on",
    };
    const res = await fetch(editing ? `/api/products/${initial!.id}` : "/api/products", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      router.push("/admin/products");
      router.refresh();
    } else {
      setError(data.error || "Opslaan mislukt");
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <section className="card space-y-4 p-6">
        <F name="name" label="Naam" required def={initial?.name} />
        <div className="grid gap-4 sm:grid-cols-2">
          <F name="category" label="Categorie" def={initial?.category ?? "Elite Trainer Box"} />
          <F name="brand" label="Merk" def={initial?.brand ?? "Pokémon"} />
        </div>
        <F name="summary" label="Korte omschrijving" def={initial?.summary ?? ""} />
        <div>
          <label className="label" htmlFor="description">Beschrijving</label>
          <textarea id="description" name="description" rows={4} className="input" defaultValue={initial?.description ?? ""} />
        </div>
      </section>

      <section className="card p-6">
        <ImageManager value={images} onChange={setImages} />
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-semibold">Prijs &amp; voorraad</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <F name="priceEuros" label="Prijs (€)" type="number" step="0.01" required def={euros(initial?.priceCents)} />
          <F name="compareAtEuros" label="Van-prijs (€)" type="number" step="0.01" def={euros(initial?.compareAtCents)} />
          <F name="stock" label="Voorraad" type="number" def={initial ? String(initial.stock) : "0"} />
        </div>
        <F name="wholesaleEuros" label="Wholesale basis (€, optioneel — voor partners)" type="number" step="0.01" def={euros(initial?.wholesaleCents)} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Check name="featured" label="Uitlichten op homepage" def={initial?.featured ?? false} />
          <Check name="isCase" label="Sealed case (bulk)" def={initial?.isCase ?? false} />
          <F name="caseSize" label="Stuks per case" type="number" def={initial?.caseSize ? String(initial.caseSize) : ""} />
          {editing ? (
            <Check name="active" label="Actief (zichtbaar in shop)" def={initial?.active ?? true} />
          ) : (
            <Check name="notifyPartners" label="Partners mailen bij toevoegen" def />
          )}
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <Check name="isPreorder" label="Dit is een pre-order" def={initial?.isPreorder ?? true} onChange={setIsPreorder} />
        {isPreorder && (
          <div className="space-y-4 border-l-2 border-amber-300 pl-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <F name="releaseDate" label="Releasedatum" type="date" def={initial?.releaseDate ? initial.releaseDate.slice(0, 10) : ""} />
              <F name="expectedDelivery" label="Verwachte levering (tekst)" def={initial?.expectedDelivery ?? ""} placeholder="rond januari 2027" />
            </div>
            <div>
              <label className="label" htmlFor="preorderNote">Pre-order alert tekst (rood)</label>
              <textarea
                id="preorderNote"
                name="preorderNote"
                rows={3}
                className="input"
                defaultValue={initial?.preorderNote ?? ""}
                placeholder="Let op: deze batch heeft een langere levertijd…"
              />
            </div>
            <Check name="nonCancellable" label="Niet annuleerbaar" def={initial?.nonCancellable ?? true} />
          </div>
        )}
      </section>

      {error && <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>}

      <div className="flex gap-3">
        <button type="submit" disabled={saving} className="btn-gold">
          {saving ? "Opslaan…" : editing ? "Wijzigingen opslaan" : "Product opslaan"}
        </button>
        <Link href="/admin/products" className="btn-outline">Annuleren</Link>
      </div>
    </form>
  );
}

function F({
  name,
  label,
  type = "text",
  required,
  def,
  placeholder,
  step,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  def?: string;
  placeholder?: string;
  step?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input id={name} name={name} type={type} step={step} required={required} defaultValue={def} placeholder={placeholder} className="input" />
    </div>
  );
}

function Check({
  name,
  label,
  def,
  onChange,
}: {
  name: string;
  label: string;
  def?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        defaultChecked={def}
        onChange={(e) => onChange?.(e.target.checked)}
        className="h-4 w-4 rounded border-navy/30 text-gold focus:ring-gold"
      />
      {label}
    </label>
  );
}
