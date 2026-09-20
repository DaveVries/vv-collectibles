import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/SignOutButton";

export const dynamic = "force-dynamic";

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) redirect("/login?callbackUrl=/account");

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex flex-col gap-8 md:flex-row">
        <aside className="md:w-52 md:shrink-0">
          <p className="text-sm text-navy/50">Ingelogd als</p>
          <p className="font-semibold">{session.user.name ?? session.user.email}</p>
          <nav className="mt-5 space-y-1 text-sm">
            <Link href="/account" className="block rounded-lg px-3 py-2 hover:bg-navy/5">
              Overzicht
            </Link>
            <Link href="/account/orders" className="block rounded-lg px-3 py-2 hover:bg-navy/5">
              Mijn bestellingen
            </Link>
            <Link href="/account/profile" className="block rounded-lg px-3 py-2 hover:bg-navy/5">
              Mijn gegevens
            </Link>
          </nav>
          <div className="mt-5">
            <SignOutButton className="btn-outline w-full" />
          </div>
        </aside>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
