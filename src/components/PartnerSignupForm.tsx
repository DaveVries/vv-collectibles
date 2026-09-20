"use client";

import { useState } from "react";

export function PartnerSignupForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const payload = Object.fromEntries(fd.entries());
    try {
      const res = await fetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Er ging iets mis");
      setStatus("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Onbekende fout");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <div className="card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-2xl">
          ✓
        </div>
        <h3 className="mt-4 text-lg font-bold">Aanvraag ontvangen!</h3>
        <p className="mt-2 text-sm text-navy/60">
          Bedankt voor je interesse. We beoordelen je aanvraag en nemen zo snel mogelijk contact
          met je op met de partnervoorwaarden.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-4 p-6 sm:grid-cols-2">
      <F name="companyName" label="Bedrijfsnaam" required />
      <F name="contactName" label="Contactpersoon" required />
      <F name="email" label="E-mail" type="email" required />
      <F name="phone" label="Telefoon" />
      <F name="vatNumber" label="BTW-nummer" />
      <F name="website" label="Website" />
      <F name="city" label="Plaats" />
      <F name="country" label="Land" defaultValue="NL" />
      <div className="sm:col-span-2">
        <label className="label" htmlFor="message">
          Vertel ons over je winkel
        </label>
        <textarea id="message" name="message" rows={3} className="input" />
      </div>
      {error && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">{error}</p>
      )}
      <div className="sm:col-span-2">
        <button type="submit" disabled={status === "sending"} className="btn-gold w-full">
          {status === "sending" ? "Versturen…" : "Aanvraag versturen"}
        </button>
      </div>
    </form>
  );
}

function F({
  name,
  label,
  type = "text",
  required,
  defaultValue,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="label" htmlFor={name}>
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      <input id={name} name={name} type={type} required={required} defaultValue={defaultValue} className="input" />
    </div>
  );
}
