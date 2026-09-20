"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const email = fd.get("email") as string;
    const password = fd.get("password") as string;
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: fd.get("name"), email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Registratie mislukt");
      setLoading(false);
      return;
    }
    // Auto sign-in after registration.
    await signIn("credentials", { email, password, redirect: false });
    router.push("/account");
    router.refresh();
  }

  return (
    <div className="mx-auto flex max-w-md justify-center px-4 py-16">
      <form onSubmit={onSubmit} className="card w-full max-w-sm space-y-4 p-8">
        <h1 className="text-xl font-bold">Account aanmaken</h1>
        <p className="text-sm text-navy/60">Maak een account om je bestellingen te volgen.</p>
        <div>
          <label className="label" htmlFor="name">Naam</label>
          <input id="name" name="name" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="email">E-mail</label>
          <input id="email" name="email" type="email" required className="input" />
        </div>
        <div>
          <label className="label" htmlFor="password">Wachtwoord</label>
          <input id="password" name="password" type="password" required minLength={8} className="input" />
          <p className="mt-1 text-xs text-navy/40">Minimaal 8 tekens</p>
        </div>
        {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="btn-gold w-full">
          {loading ? "Bezig…" : "Registreren"}
        </button>
        <p className="text-center text-sm text-navy/60">
          Al een account?{" "}
          <Link href="/login" className="font-semibold text-gold-dark hover:underline">
            Inloggen
          </Link>
        </p>
      </form>
    </div>
  );
}
