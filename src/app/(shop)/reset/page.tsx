"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function ResetForm() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"idle" | "saving" | "done">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("saving");
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password: fd.get("password") }),
    });
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setStatus("done");
    } else {
      setError(d.error || "Mislukt");
      setStatus("idle");
    }
  }

  if (!token) {
    return <p className="text-sm text-red-600">Ongeldige of ontbrekende reset-link.</p>;
  }

  if (status === "done") {
    return (
      <div className="text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-gold/20 text-2xl">✓</div>
        <h2 className="mt-3 text-lg font-bold">Wachtwoord ingesteld</h2>
        <p className="mt-2 text-sm text-navy/60">Je kunt nu inloggen met je nieuwe wachtwoord.</p>
        <Link href="/login" className="btn-gold mt-5">Naar inloggen</Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-xl font-bold">Nieuw wachtwoord</h1>
      <div>
        <label className="label" htmlFor="password">Nieuw wachtwoord</label>
        <input id="password" name="password" type="password" required minLength={8} className="input" />
        <p className="mt-1 text-xs text-navy/40">Minimaal 8 tekens</p>
      </div>
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={status === "saving"} className="btn-gold w-full">
        {status === "saving" ? "Bezig…" : "Wachtwoord instellen"}
      </button>
    </form>
  );
}

export default function ResetPage() {
  return (
    <div className="mx-auto flex max-w-md justify-center px-4 py-16">
      <div className="card w-full max-w-sm p-8">
        <Suspense>
          <ResetForm />
        </Suspense>
      </div>
    </div>
  );
}
