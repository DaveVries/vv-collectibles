import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { ProductForm } from "@/components/admin/ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: { id: string } }) {
  const p = await prisma.product.findUnique({ where: { id: params.id } });
  if (!p) notFound();

  return (
    <div className="max-w-2xl">
      <Link href="/admin/products" className="text-sm text-navy/50 hover:text-gold-dark">
        ← Producten
      </Link>
      <h1 className="mt-2 text-2xl font-bold">Product bewerken</h1>
      <div className="mt-6">
        <ProductForm
          initial={{
            id: p.id,
            name: p.name,
            summary: p.summary,
            description: p.description,
            category: p.category,
            brand: p.brand,
            language: p.language,
            priceCents: p.priceCents,
            compareAtCents: p.compareAtCents,
            wholesaleCents: p.wholesaleCents,
            stock: p.stock,
            images: p.images,
            isPreorder: p.isPreorder,
            releaseDate: p.releaseDate ? p.releaseDate.toISOString() : null,
            expectedDelivery: p.expectedDelivery,
            preorderNote: p.preorderNote,
            nonCancellable: p.nonCancellable,
            isCase: p.isCase,
            caseSize: p.caseSize,
            featured: p.featured,
            active: p.active,
          }}
        />
      </div>
    </div>
  );
}
