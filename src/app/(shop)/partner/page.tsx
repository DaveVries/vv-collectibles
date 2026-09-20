import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPartnerForSession } from "@/lib/partner";
import { TIER_BASE_DISCOUNT_PCT, TIER_LABEL } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function PartnerHome() {
  const session = await auth();
  const partner = await getPartnerForSession(session?.user?.id, session?.user?.email);
  if (!partner) return null; // layout already handles this

  const orderCount = await prisma.order.count({ where: { partnerId: partner.id } });
  const baseDiscount = TIER_BASE_DISCOUNT_PCT[partner.tier] + partner.discountPct;

  return (
    <div>
      <h1 className="text-2xl font-bold">Welkom, {partner.companyName}</h1>
      <p className="mt-1 text-navy/60">Jouw partnercondities in één oogopslag.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Card label="Niveau" value={TIER_LABEL[partner.tier]} />
        <Card label="Jouw korting" value={`${baseDiscount}%`} sub="op consumentenprijs" />
        <Card
          label="Bulkstaffel"
          value={`+${partner.bulkDiscountPct}%`}
          sub={`vanaf ${partner.bulkThreshold} stuks per regel`}
        />
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/partner/catalog" className="btn-gold">Bestellen via catalogus →</Link>
        <Link href="/partner/orders" className="btn-outline">
          Mijn B2B-orders{orderCount ? ` (${orderCount})` : ""}
        </Link>
      </div>

      <div className="card mt-8 p-6 text-sm text-navy/70">
        <h2 className="font-semibold text-navy">Zo werkt het</h2>
        <ul className="mt-3 list-inside list-disc space-y-1">
          <li>Je inkoopprijzen zijn al verwerkt in de catalogus — netto, exclusief consumentenmarge.</li>
          <li>Bestel je {partner.bulkThreshold}+ stuks van een artikel? Dan krijg je automatisch extra bulkkorting.</li>
          <li>Je ontvangt automatisch bericht zodra we nieuwe items toevoegen.</li>
          <li>B2B-orders worden op factuur geleverd; je ontvangt direct een factuur (PDF).</li>
        </ul>
      </div>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <p className="text-sm text-navy/50">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
      {sub && <p className="text-xs text-navy/50">{sub}</p>}
    </div>
  );
}
