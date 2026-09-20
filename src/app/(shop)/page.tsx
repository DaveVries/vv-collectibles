import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import { VVMark } from "@/components/Logo";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [featured, preorders] = await Promise.all([
    prisma.product.findMany({
      where: { active: true, featured: true },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.product.findMany({
      where: { active: true, isPreorder: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="bg-navy text-cream">
        <div className="mx-auto grid max-w-6xl items-center gap-8 px-4 py-16 md:grid-cols-2 md:py-24">
          <div>
            <span className="badge bg-gold/15 text-gold">Sealed · Pre-orders · Distributie</span>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight md:text-5xl">
              Sealed collectibles voor verzamelaars & investeerders
            </h1>
            <p className="mt-4 max-w-md text-cream/70">
              Officiële Pokémon, Bandai en TCG producten. Reserveer de nieuwste releases als
              pre-order en mis nooit meer een drop. Ook scherpe partnerprijzen voor winkels.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/products" className="btn-gold">
                Bekijk producten
              </Link>
              <Link href="/partners" className="btn-outline border-cream/30 bg-transparent text-cream hover:border-gold hover:text-gold">
                Voor winkels & distributie
              </Link>
            </div>
          </div>
          <div className="flex justify-center">
            <div className="rounded-3xl bg-navy-700 p-10 shadow-card">
              <VVMark className="h-48 w-48" />
            </div>
          </div>
        </div>
      </section>

      {/* Pre-order info strip */}
      <section className="border-b border-navy/10 bg-amber-50">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 text-sm text-navy/80">
          <span aria-hidden>🔔</span>
          <p>
            <strong>Pre-orders:</strong> levertijden kunnen verschuiven en pre-orders kunnen niet
            worden geannuleerd. Op elke productpagina vind je de verwachte leverdatum.
          </p>
        </div>
      </section>

      {/* Pre-orders */}
      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Nieuwste pre-orders</h2>
          <Link href="/products?filter=preorder" className="text-sm font-semibold text-gold-dark hover:underline">
            Alles bekijken →
          </Link>
        </div>
        {preorders.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {preorders.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Featured */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-16">
          <h2 className="mb-6 text-2xl font-bold">Uitgelicht</h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {featured.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="card p-10 text-center text-navy/50">
      Nog geen producten. Voeg ze toe via <Link href="/admin/products" className="text-gold-dark underline">Beheer → Producten</Link>.
    </div>
  );
}
