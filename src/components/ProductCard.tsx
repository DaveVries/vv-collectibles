import Link from "next/link";
import { formatMoney } from "@/lib/utils";
import type { Product } from "@prisma/client";

export function ProductCard({ product }: { product: Product }) {
  const img = product.images[0];
  const soldOut = product.soldOut || (!product.isPreorder && product.stock <= 0);
  return (
    <Link href={`/products/${product.slug}`} className="card group flex flex-col overflow-hidden">
      <div className="relative aspect-square overflow-hidden bg-navy-800">
        {/* corner ribbon */}
        {soldOut ? (
          <span className="absolute right-[-34px] top-4 z-10 w-32 rotate-45 bg-yellow-400 py-1 text-center text-xs font-bold text-navy">
            Sold out
          </span>
        ) : product.isPreorder ? (
          <span className="absolute right-[-34px] top-4 z-10 w-32 rotate-45 bg-gold py-1 text-center text-xs font-bold text-navy">
            Pre-order
          </span>
        ) : null}
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={product.name}
            className="h-full w-full object-cover transition group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-cream/30">
            <span className="text-4xl font-extrabold">V&amp;V</span>
          </div>
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <span className="text-xs font-medium uppercase tracking-wide text-gold-dark">
          {product.category}
        </span>
        <h3 className="mt-1 line-clamp-2 flex-1 text-sm font-semibold text-navy">{product.name}</h3>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-lg font-bold text-navy">
            {formatMoney(product.priceCents, product.currency)}
          </span>
          {product.compareAtCents && product.compareAtCents > product.priceCents && (
            <span className="text-sm text-navy/40 line-through">
              {formatMoney(product.compareAtCents, product.currency)}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
