import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Producten</h1>
        <Link href="/admin/products/new" className="btn-gold">
          + Nieuw product
        </Link>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-navy/5 text-navy/60">
            <tr>
              <th className="px-4 py-3">Naam</th>
              <th className="px-4 py-3">Categorie</th>
              <th className="px-4 py-3">Prijs</th>
              <th className="px-4 py-3">Voorraad</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-navy/40">
                  Nog geen producten.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-navy/[0.02]">
                <td className="px-4 py-3 font-medium">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-navy-800">
                      {p.images[0] ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.images[0]} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[10px] font-bold text-cream/40">
                          V&amp;V
                        </div>
                      )}
                    </div>
                    <Link href={`/products/${p.slug}`} target="_blank" className="hover:text-gold-dark">
                      {p.name}
                    </Link>
                  </div>
                </td>
                <td className="px-4 py-3 text-navy/70">{p.category}</td>
                <td className="px-4 py-3">{formatMoney(p.priceCents, p.currency)}</td>
                <td className="px-4 py-3 text-navy/70">{p.isPreorder ? "pre-order" : p.stock}</td>
                <td className="px-4 py-3">
                  {p.isPreorder && <span className="badge bg-amber-100 text-amber-800">Pre-order</span>}
                  {p.isCase && <span className="badge bg-purple-100 text-purple-700">Case</span>}
                </td>
                <td className="px-4 py-3">
                  {p.active ? (
                    <span className="badge bg-green-100 text-green-800">Actief</span>
                  ) : (
                    <span className="badge bg-navy/10 text-navy/50">Verborgen</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/products/${p.id}/edit`} className="font-semibold text-gold-dark hover:underline">
                    Bewerken
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
