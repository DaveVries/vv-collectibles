import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: { order?: string };
}) {
  const order = searchParams.order
    ? await prisma.order.findUnique({
        where: { number: searchParams.order },
        include: { items: true },
      })
    : null;

  return (
    <div className="mx-auto max-w-2xl px-4 py-20 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-gold/20 text-3xl">
        ✓
      </div>
      <h1 className="mt-6 text-3xl font-bold">Bedankt voor je bestelling!</h1>
      {order ? (
        <p className="mt-3 text-navy/70">
          Je bestelnummer is <strong>{order.number}</strong>. Je ontvangt een bevestiging per
          e-mail{order.hasPreorderItems ? ", inclusief de pre-order voorwaarden" : ""}.
        </p>
      ) : (
        <p className="mt-3 text-navy/70">Je ontvangt een bevestiging per e-mail.</p>
      )}

      {order?.hasPreorderItems && (
        <p className="mt-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-red-600">
          Je bestelling bevat pre-order artikelen. Levertijden kunnen verschuiven; we houden je op
          de hoogte zodra je producten verzonden worden.
        </p>
      )}

      <Link href="/products" className="btn-gold mt-8">
        Verder winkelen
      </Link>
    </div>
  );
}
