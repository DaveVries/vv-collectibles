"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Partner, PartnerStatus, PartnerTier } from "@prisma/client";
import { TIER_LABEL } from "@/lib/pricing";

export function PartnerRow({ partner }: { partner: Partner }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState({
    status: partner.status,
    tier: partner.tier,
    discountPct: partner.discountPct,
    bulkThreshold: partner.bulkThreshold,
    bulkDiscountPct: partner.bulkDiscountPct,
  });

  async function patch(data: Record<string, unknown>) {
    setBusy(true);
    const res = await fetch(`/api/partners/${partner.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  const statusBadge: Record<PartnerStatus, string> = {
    PENDING: "bg-amber-100 text-amber-800",
    APPROVED: "bg-green-100 text-green-800",
    REJECTED: "bg-red-100 text-red-700",
  };

  return (
    <>
      <tr className="hover:bg-navy/[0.02]">
        <td className="px-4 py-3">
          <div className="font-medium">{partner.companyName}</div>
          <div className="text-xs text-navy/50">
            {partner.contactName} · {partner.email}
          </div>
        </td>
        <td className="px-4 py-3 text-navy/60">{partner.city || "—"}</td>
        <td className="px-4 py-3">
          <span className={`badge ${statusBadge[state.status]}`}>{state.status}</span>
        </td>
        <td className="px-4 py-3 text-navy/70">{TIER_LABEL[state.tier]}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            {state.status !== "APPROVED" && (
              <button
                disabled={busy}
                onClick={() => {
                  setState((s) => ({ ...s, status: "APPROVED" }));
                  patch({ status: "APPROVED" });
                }}
                className="badge bg-green-600 text-white hover:bg-green-700"
              >
                Goedkeuren
              </button>
            )}
            <button onClick={() => setOpen((o) => !o)} className="badge border border-navy/20 text-navy/70">
              {open ? "Sluiten" : "Bewerken"}
            </button>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="bg-navy/[0.02]">
          <td colSpan={5} className="px-4 py-4">
            {partner.message && (
              <p className="mb-3 text-sm text-navy/60">“{partner.message}”</p>
            )}
            <div className="grid gap-3 sm:grid-cols-5">
              <Field label="Status">
                <select
                  className="input"
                  value={state.status}
                  onChange={(e) => setState((s) => ({ ...s, status: e.target.value as PartnerStatus }))}
                >
                  {(["PENDING", "APPROVED", "REJECTED"] as const).map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </Field>
              <Field label="Niveau">
                <select
                  className="input"
                  value={state.tier}
                  onChange={(e) => setState((s) => ({ ...s, tier: e.target.value as PartnerTier }))}
                >
                  {(["STANDARD", "PARTNER", "DISTRIBUTOR"] as const).map((t) => (
                    <option key={t} value={t}>{TIER_LABEL[t]}</option>
                  ))}
                </select>
              </Field>
              <Field label="Extra korting %">
                <input
                  type="number"
                  className="input"
                  value={state.discountPct}
                  onChange={(e) => setState((s) => ({ ...s, discountPct: +e.target.value }))}
                />
              </Field>
              <Field label="Bulk vanaf (stuks)">
                <input
                  type="number"
                  className="input"
                  value={state.bulkThreshold}
                  onChange={(e) => setState((s) => ({ ...s, bulkThreshold: +e.target.value }))}
                />
              </Field>
              <Field label="Bulk korting %">
                <input
                  type="number"
                  className="input"
                  value={state.bulkDiscountPct}
                  onChange={(e) => setState((s) => ({ ...s, bulkDiscountPct: +e.target.value }))}
                />
              </Field>
            </div>
            <button
              disabled={busy}
              onClick={() => patch(state)}
              className="btn-primary mt-4"
            >
              {busy ? "Opslaan…" : "Opslaan"}
            </button>
          </td>
        </tr>
      )}
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block font-medium text-navy/60">{label}</span>
      {children}
    </label>
  );
}
