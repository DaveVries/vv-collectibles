import Link from "next/link";
import { PartnerSignupForm } from "@/components/PartnerSignupForm";
import { TIER_BASE_DISCOUNT_PCT, TIER_LABEL } from "@/lib/pricing";

export const metadata = { title: "Voor winkels & distributie" };

export default function PartnersPage() {
  return (
    <div>
      <section className="bg-navy text-cream">
        <div className="mx-auto max-w-4xl px-4 py-16">
          <span className="badge bg-gold/15 text-gold">B2B · Distributie</span>
          <h1 className="mt-4 text-4xl font-extrabold">Word partner of afnemer</h1>
          <p className="mt-4 max-w-2xl text-cream/70">
            Heb jij een (web)winkel? Word partner van V&amp;V Collectibles en krijg toegang tot
            scherpe inkoopprijzen, vroege pre-order allocaties en automatische updates zodra we
            nieuwe items toevoegen. Hoe meer je afneemt, hoe beter de staffelprijs.
          </p>
          <p className="mt-6 text-sm text-cream/70">
            Al partner?{" "}
            <Link href="/login?callbackUrl=/partner" className="font-semibold text-gold hover:underline">
              Log in op het partnerportaal →
            </Link>
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-14">
        <h2 className="text-2xl font-bold">Partnervoordelen</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Benefit
            title="Inkoopprijzen"
            body="Direct toegang tot wholesale-prijzen, afhankelijk van je partnerniveau."
          />
          <Benefit
            title="Bulkkorting (staffel)"
            body="Extra korting per regel zodra je de bulkdrempel haalt. Ideaal voor cases."
          />
          <Benefit
            title="Automatische updates"
            body="Ontvang automatisch mail met prijzen zodra we een nieuw item toevoegen."
          />
        </div>

        <h2 id="distributie" className="mt-14 text-2xl font-bold">
          Partnerniveaus
        </h2>
        <div className="mt-6 overflow-hidden rounded-2xl border border-navy/10">
          <table className="w-full text-left text-sm">
            <thead className="bg-navy/5 text-navy/70">
              <tr>
                <th className="px-4 py-3">Niveau</th>
                <th className="px-4 py-3">Basiskorting</th>
                <th className="px-4 py-3">Voor wie</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy/10">
              {(["STANDARD", "PARTNER", "DISTRIBUTOR"] as const).map((tier) => (
                <tr key={tier}>
                  <td className="px-4 py-3 font-semibold">{TIER_LABEL[tier]}</td>
                  <td className="px-4 py-3">{TIER_BASE_DISCOUNT_PCT[tier]}%</td>
                  <td className="px-4 py-3 text-navy/60">
                    {tier === "STANDARD" && "Kleinere winkels die net starten"}
                    {tier === "PARTNER" && "Vaste afnemers met regelmatige orders"}
                    {tier === "DISTRIBUTOR" && "Grootafnemers / wederverkopers (cases)"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="bg-navy/5 px-4 py-3 text-xs text-navy/50">
            Definitieve korting en bulkdrempels worden per partner ingesteld na goedkeuring.
          </p>
        </div>

        <div className="mt-14">
          <h2 className="text-2xl font-bold">Aanmelden als partner</h2>
          <p className="mt-2 text-navy/60">
            Vul het formulier in. We beoordelen je aanvraag en nemen contact op met je
            partnervoorwaarden.
          </p>
          <div className="mt-6">
            <PartnerSignupForm />
          </div>
        </div>
      </section>
    </div>
  );
}

function Benefit({ title, body }: { title: string; body: string }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold text-navy">{title}</h3>
      <p className="mt-2 text-sm text-navy/60">{body}</p>
    </div>
  );
}
