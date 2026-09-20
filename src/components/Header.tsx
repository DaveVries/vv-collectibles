"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCart } from "@/components/CartProvider";
import { VVLogo } from "@/components/Logo";

export function Header() {
  const { count } = useCart();
  const { data: session } = useSession();
  const isStaff = session?.user?.role === "ADMIN" || session?.user?.role === "STAFF";
  return (
    <header className="sticky top-0 z-40 bg-navy text-cream">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" aria-label="V&V Collectibles home">
          <VVLogo />
        </Link>
        <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
          <Link href="/products" className="hover:text-gold">
            Producten
          </Link>
          <Link href="/products?filter=preorder" className="hover:text-gold">
            Pre-orders
          </Link>
          <Link href="/partners" className="hover:text-gold">
            Voor winkels
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          {isStaff && (
            <Link href="/admin" className="hidden text-xs text-cream/60 hover:text-gold sm:block">
              Beheer
            </Link>
          )}
          {session?.user ? (
            <Link href="/account" className="text-sm hover:text-gold">
              {session.user.name?.split(" ")[0] ?? "Account"}
            </Link>
          ) : (
            <Link href="/login" className="text-sm hover:text-gold">
              Inloggen
            </Link>
          )}
          <Link
            href="/cart"
            className="relative rounded-full border border-cream/20 px-4 py-2 text-sm hover:border-gold hover:text-gold"
          >
            Winkelwagen
            {count > 0 && (
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-gold px-1 text-xs font-bold text-navy">
                {count}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
