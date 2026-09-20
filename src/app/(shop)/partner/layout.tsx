import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getPartnerForSession } from "@/lib/partner";
import { TIER_LABEL } from "@/lib/pricing";

export const dynamic = "force-dynamic";

export default async function PartnerLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/partner");

  const partner = await getPartnerForSession(session.user.id, session.user.email);

  // Logged in but not an approved partner.
  if (!partner) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">Partnerportaal</h1>
        <p className="mt-3 text-navy/60">
          Dit account is nog geen goedgekeurde partner. Heb je je al aangemeld? Dan beoordelen we je
          aanvraag zo snel mogelijk. Nog niet aangemeld?
        </p>
        <Link href="/partners" className="btn-gold mt-6">
          Meld je winkel aan
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="md:w-56 md:shrink-0">
          <p className="text-sm text-navy/50">Partnerportaal</p>
          <p className="font-semibold">{partner.companyName}</p>
          <span className="badge mt-1 bg-gold/15 text-gold-dark">{TIER_LABEL[partner.tier]}</span>
          <nav className="mt-5 space-y-1 text-sm">
            <Link href="/partner" className="block rounded-lg px-3 py-2 hover:bg-navy/5">Overzicht</Link>
            <Link href="/partner/catalog" className="block rounded-lg px-3 py-2 hover:bg-navy/5">Bestellen (catalogus)</Link>
            <Link href="/partner/orders" className="block rounded-lg px-3 py-2 hover:bg-navy/5">Mijn B2B-orders</Link>
            <Link href="/account/profile" className="block rounded-lg px-3 py-2 hover:bg-navy/5">Gegevens</Link>
          </nav>
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
