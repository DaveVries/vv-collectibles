import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { verifyReturnParams } from "@/lib/rabo";

export const dynamic = "force-dynamic";

/**
 * Landing page after the customer returns from Rabo OnlineKassa.
 *
 * Rabo appends `order_id`, `status` and `signature` to our return URL. We
 * verify that signature for immediate feedback, but the order state shown
 * comes from our own database — the webhook is the authoritative source, and
 * it may not have landed yet when the customer gets here.
 */
export default async function SuccessPage({
  searchParams,
}: {
  searchParams: {
    order?: string;
    order_id?: string;
    status?: string;
    signature?: string;
  };
}) {
  const order = searchParams.order
    ? await prisma.order.findUnique({
        where: { number: searchParams.order },
        include: { items: true },
      })
    : null;

  const returned = verifyReturnParams(searchParams);

  // Trust our own record first; fall back to the signed return status.
  const paid = order?.paymentStatus === "PAID" || returned?.status === "COMPLETED";
  const failed = returned?.status === "CANCELLED" || returned?.status === "EXPIRED";

  if (failed && !paid) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-3xl text-red-600">
          !
        </div>
        <h1 className="mt-6 text-3xl font-bold">Betaling niet afgerond</h1>
        <p className="mt-3 text-navy/70">
          {returned?.status === "EXPIRED"
            ? "De betaling is verlopen."
            : "De betaling is geannuleerd."}{" "}
          {order ? (
            <>
              Bestelling <strong>{order.number}</strong> is nog niet betaald.
            </>
          ) : null}{" "}
          Je kunt het opnieuw proberen — er is niets afgeschreven.
        </p>
        <Link href="/cart" className="btn-gold mt-8">
          Terug naar winkelwagen
        </Link>
      </div>
    );
  }

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

      {!paid && (
        <p className="mt-4 rounded-xl bg-blue-50 px-4 py-3 text-sm text-navy/80">
          We wachten nog op de bevestiging van je betaling. Dit duurt meestal enkele seconden —
          je ontvangt de bevestiging per e-mail zodra de betaling verwerkt is.
        </p>
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
