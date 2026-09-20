"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPage() {
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const fd = new FormData(e.currentTarget);
    await fetch("/api/password/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: fd.get("email") }),
    }).catch(() => {});
    setLoading(false);
    setDone(true);
  }

  return (
    <div className="mx-auto flex max-w-md justify-center px-4 py-16">
      <div className="card w-full max-w-sm p-8">
        <h1 className="text-xl font-bold">Wachtwoord vergeten</h1>
        {done ? (
          <p className="mt-3 text-sm text-navy/70">
            Als er een account bestaat met dit e-mailadres, hebben we een link gestuurd om je
            wachtwoord opnieuw in te stellen. Controleer je inbox.
          </p>
        ) : (
          <form onSubmit={onSubmit} className="mt-4 space-y-4">
            <p className="text-sm text-navy/60">
              Vul je e-mailadres in. We sturen je een link om een nieuw wachtwoord in te stellen.
            </p>
            <div>
              <label className="label" htmlFor="email">E-mail</label>
              <input id="email" name="email" type="email" required className="input" />
            </div>
            <button type="submit" disabled={loading} className="btn-gold w-full">
              {loading ? "Versturen…" : "Stuur reset-link"}
            </button>
          </form>
        )}
        <p className="mt-4 text-center text-sm">
          <Link href="/login" className="text-gold-dark hover:underline">
            Terug naar inloggen
          </Link>
        </p>
      </div>
    </div>
  );
}
