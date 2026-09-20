import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/utils";
import { PreorderBanner } from "@/components/PreorderBanner";
import { AddToCartButton } from "@/components/AddToCartButton";

export const dynamic = "force-dynamic";

async function getProduct(slug: string) {
  return prisma.product.findUnique({ where: { slug } });
}

export async function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Promise<Metadata> {
  const product = await getProduct(params.slug);
  if (!product) return { title: "Product niet gevonden" };
  return { title: product.name, description: product.summary ?? undefined };
}

export default async function ProductPage({ params }: { params: { slug: string } }) {
  const product = await getProduct(params.slug);
  if (!product || !product.active) notFound();

  const img = product.images[0];
  const soldOut = product.soldOut || (!product.isPreorder && product.stock <= 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="grid gap-10 md:grid-cols-2">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden rounded-2xl bg-navy-800">
          {soldOut ? (
            <span className="absolute right-[-40px] top-6 z-10 w-40 rotate-45 bg-yellow-400 py-1.5 text-center text-sm font-bold text-navy">
              Sold out
            </span>
          ) : product.isPreorder ? (
            <span className="absolute right-[-40px] top-6 z-10 w-40 rotate-45 bg-gold py-1.5 text-center text-sm font-bold text-navy">
              Pre-order
            </span>
          ) : null}
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={product.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-6xl font-extrabold text-cream/20">
              V&amp;V
            </div>
          )}
        </div>

        {/* Details */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-gold-dark">
            {product.brand ? `${product.brand} · ` : ""}
            {product.category}
          </span>
          <h1 className="mt-2 text-3xl font-bold">{product.name}</h1>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold">
              {formatMoney(product.priceCents, product.currency)}
            </span>
            {product.compareAtCents && product.compareAtCents > product.priceCents && (
              <span className="text-lg text-navy/40 line-through">
                {formatMoney(product.compareAtCents, product.currency)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-navy/50">Incl. {product.vatRatePct}% BTW</p>

          {product.summary && <p className="mt-4 text-navy/70">{product.summary}</p>}

          <div className="mt-6">
            <AddToCartButton
              disabled={soldOut}
              item={{
                productId: product.id,
                slug: product.slug,
                name: product.name,
                priceCents: product.priceCents,
                image: img,
                isPreorder: product.isPreorder,
                expectedDelivery: product.expectedDelivery,
              }}
            />
          </div>

          {product.isPreorder && (
            <div className="mt-6">
              <PreorderBanner
                expectedDelivery={product.expectedDelivery}
                releaseDate={product.releaseDate}
                note={product.preorderNote}
                nonCancellable={product.nonCancellable}
              />
            </div>
          )}

          {/* Specs */}
          <dl className="mt-8 space-y-2 border-t border-navy/10 pt-6 text-sm">
            {product.brand && <Spec k="Merk" v={product.brand} />}
            {product.language && <Spec k="Taal" v={product.language} />}
            {product.releaseDate && <Spec k="Releasedatum" v={formatDate(product.releaseDate)} />}
            {product.expectedDelivery && (
              <Spec k="Verwachte leverdatum" v={product.expectedDelivery} />
            )}
            {product.isCase && product.caseSize && (
              <Spec k="Inhoud" v={`Sealed case — ${product.caseSize} stuks`} />
            )}
          </dl>
        </div>
      </div>

      {/* Long description */}
      {product.description && (
        <section className="mt-12 max-w-3xl">
          <h2 className="text-xl font-bold">Beschrijving</h2>
          <div className="prose mt-3 whitespace-pre-line text-navy/80">{product.description}</div>
        </section>
      )}
    </div>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="font-semibold text-navy">{k}:</dt>
      <dd className="text-navy/70">{v}</dd>
    </div>
  );
}
