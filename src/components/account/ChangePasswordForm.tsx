"use client";

import { useRef, useState } from "react";

export function ChangePasswordForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    setError(null);
    const fd = new FormData(e.currentTarget);
    const res = await fetch("/api/account/password", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: fd.get("currentPassword"),
        newPassword: fd.get("newPassword"),
      }),
    });
    setSaving(false);
    const d = await res.json().catch(() => ({}));
    if (res.ok) {
      setMsg("Wachtwoord gewijzigd ✓");
      formRef.current?.reset();
    } else {
      setError(d.error || "Wijzigen mislukt");
    }
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="card max-w-md space-y-4 p-6">
      <div>
        <label className="label" htmlFor="currentPassword">Huidig wachtwoord</label>
        <input id="currentPassword" name="currentPassword" type="password" required className="input" />
      </div>
      <div>
        <label className="label" htmlFor="newPassword">Nieuw wachtwoord</label>
        <input id="newPassword" name="newPassword" type="password" required minLength={8} className="input" />
        <p className="mt-1 text-xs text-navy/40">Minimaal 8 tekens</p>
      </div>
      {msg && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{msg}</p>}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary">
        {saving ? "Bezig…" : "Wachtwoord wijzigen"}
      </button>
    </form>
  );
}
