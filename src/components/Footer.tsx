import Link from "next/link";
import { VVLogo } from "@/components/Logo";

const PAYMENT_METHODS = [
  "iDEAL",
  "Bancontact",
  "PayPal",
  "Belfius",
  "KBC/CBC",
  "Trustly",
  "Bankoverschrijving",
];

export function Footer() {
  return (
    <footer className="mt-20 bg-navy text-cream/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 md:grid-cols-4">
        <div className="md:col-span-2">
          <VVLogo />
          <p className="mt-4 max-w-sm text-sm text-cream/60">
            Sealed collectibles & pre-orders. Officiële Pokémon, Bandai en TCG producten —
            voor verzamelaars, investeerders en winkels.
          </p>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-cream">Shop</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/products" className="hover:text-gold">Alle producten</Link></li>
            <li><Link href="/products?filter=preorder" className="hover:text-gold">Pre-orders</Link></li>
            <li><Link href="/cart" className="hover:text-gold">Winkelwagen</Link></li>
          </ul>
        </div>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-cream">Zakelijk</h4>
          <ul className="space-y-2 text-sm">
            <li><Link href="/partners" className="hover:text-gold">Word partner</Link></li>
            <li><Link href="/partners#distributie" className="hover:text-gold">Distributie</Link></li>
            <li><Link href="/admin" className="hover:text-gold">Beheer</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-cream/10">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 text-xs text-cream/50 md:flex-row md:items-center md:justify-between">
          <span>© {new Date().getFullYear()} V&amp;V Collectibles. Alle rechten voorbehouden.</span>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((m) => (
              <span key={m} className="rounded border border-cream/15 px-2 py-0.5">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
