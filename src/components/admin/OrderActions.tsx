"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderStatus } from "@prisma/client";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "PENDING_PAYMENT", label: "Wacht op betaling" },
  { value: "PROCESSING", label: "In verwerking" },
  { value: "COMPLETED", label: "Voltooid" },
  { value: "CANCELLED", label: "Geannuleerd" },
];

export function OrderActions({
  orderId,
  initialStatus,
  initialTracking,
  initialBarcode,
  hasInvoice,
}: {
  orderId: string;
  initialStatus: OrderStatus;
  initialTracking: string | null;
  initialBarcode: string | null;
  hasInvoice: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<OrderStatus>(initialStatus);
  const [tracking, setTracking] = useState(initialTracking ?? "");
  const [barcode, setBarcode] = useState(initialBarcode);
  const [saving, setSaving] = useState(false);
  const [labeling, setLabeling] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);
    const res = await fetch(`/api/orders/${orderId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, trackingNumber: tracking || null }),
    });
    setSaving(false);
    if (res.ok) {
      setMsg("Opgeslagen ✓");
      router.refresh();
    } else {
      setMsg("Opslaan mislukt");
    }
  }

  async function createLabel() {
    setLabeling(true);
    setMsg(null);
    const res = await fetch(`/api/orders/${orderId}/label`, { method: "POST" });
    const data = await res.json();
    setLabeling(false);
    if (res.ok) {
      setBarcode(data.barcode);
      if (!tracking) setTracking(data.barcode);
      setMsg(
        data.stub
          ? `PostNL-label aangemaakt (testmodus): ${data.barcode}`
          : `PostNL-label aangemaakt: ${data.barcode}`,
      );
      if (data.labelUrl) window.open(data.labelUrl, "_blank");
      router.refresh();
    } else {
      setMsg(data.error || "Label mislukt");
    }
  }

  return (
    <div className="card space-y-5 p-6">
      <h2 className="text-lg font-semibold">Verwerken</h2>

      <div>
        <label className="label">Status</label>
        <select
          className="input"
          value={status}
          onChange={(e) => setStatus(e.target.value as OrderStatus)}
        >
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Trackingnummer (PostNL)</label>
        <input
          className="input"
          value={tracking}
          onChange={(e) => setTracking(e.target.value)}
          placeholder="3SVVC…"
        />
      </div>

      <button onClick={save} disabled={saving} className="btn-primary w-full">
        {saving ? "Opslaan…" : "Opslaan"}
      </button>

      <div className="border-t border-navy/10 pt-5">
        <h3 className="text-sm font-semibold">Verzending</h3>
        <p className="mt-1 text-xs text-navy/50">
          Maakt automatisch een PostNL-label met het adres van deze bestelling. Je hoeft alleen nog
          te betalen/printen.
        </p>
        <button onClick={createLabel} disabled={labeling} className="btn-gold mt-3 w-full">
          {labeling ? "Bezig…" : barcode ? "Label opnieuw aanmaken" : "📦 PostNL-label aanmaken"}
        </button>
        {barcode && (
          <p className="mt-2 text-xs text-navy/60">
            Barcode: <span className="font-mono">{barcode}</span>
          </p>
        )}
      </div>

      <div className="border-t border-navy/10 pt-5">
        <h3 className="text-sm font-semibold">Factuur</h3>
        <a
          href={`/api/orders/${orderId}/invoice`}
          target="_blank"
          rel="noreferrer"
          className="btn-outline mt-3 w-full"
        >
          {hasInvoice ? "Factuur openen (PDF)" : "Factuur genereren (PDF)"}
        </a>
      </div>

      {msg && <p className="rounded-lg bg-navy/5 px-3 py-2 text-sm text-navy/70">{msg}</p>}
    </div>
  );
}
