import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { ProductCard } from "@/components/ProductCard";
import type { Prisma } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { filter?: string; category?: string };
}) {
  const where: Prisma.ProductWhereInput = { active: true };
  if (searchParams.filter === "preorder") where.isPreorder = true;
  if (searchParams.category) where.category = searchParams.category;

  const [products, categories] = await Promise.all([
    prisma.product.findMany({ where, orderBy: { createdAt: "desc" } }),
    prisma.product.findMany({
      where: { active: true },
      select: { category: true },
      distinct: ["category"],
    }),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-3xl font-bold">
        {searchParams.filter === "preorder" ? "Pre-orders" : "Alle producten"}
      </h1>

      <div className="mt-6 flex flex-wrap gap-2">
        <FilterPill href="/products" active={!searchParams.filter && !searchParams.category}>
          Alles
        </FilterPill>
        <FilterPill href="/products?filter=preorder" active={searchParams.filter === "preorder"}>
          Pre-orders
        </FilterPill>
        {categories.map((c) => (
          <FilterPill
            key={c.category}
            href={`/products?category=${encodeURIComponent(c.category)}`}
            active={searchParams.category === c.category}
          >
            {c.category}
          </FilterPill>
        ))}
      </div>

      {products.length === 0 ? (
        <p className="mt-12 text-navy/50">Geen producten gevonden.</p>
      ) : (
        <div className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterPill({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`badge px-3 py-1.5 ${
        active ? "bg-navy text-cream" : "border border-navy/15 bg-white text-navy/70 hover:border-navy/40"
      }`}
    >
      {children}
    </Link>
  );
}
