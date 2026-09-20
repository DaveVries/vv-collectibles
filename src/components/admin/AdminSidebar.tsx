"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { VVLogo } from "@/components/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", exact: true },
  { href: "/admin/orders", label: "Bestellingen" },
  { href: "/admin/products", label: "Producten" },
  { href: "/admin/partners", label: "Partners" },
];

export function AdminSidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex w-60 shrink-0 flex-col bg-navy text-cream">
      <div className="border-b border-cream/10 px-5 py-5">
        <Link href="/admin">
          <VVLogo />
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "block rounded-lg px-3 py-2 text-sm font-medium transition",
                active ? "bg-gold text-navy" : "text-cream/70 hover:bg-navy-700 hover:text-cream",
              )}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-cream/10 p-3 text-sm">
        <Link href="/" className="block rounded-lg px-3 py-2 text-cream/60 hover:text-gold">
          ← Naar winkel
        </Link>
        <button
          onClick={() => signOut({ callbackUrl: "/admin/login" })}
          className="block w-full rounded-lg px-3 py-2 text-left text-cream/60 hover:text-gold"
        >
          Uitloggen
        </button>
      </div>
    </aside>
  );
}
