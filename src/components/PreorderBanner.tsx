import { formatDate } from "@/lib/utils";

/**
 * The prominent pre-order alert, modeled on the brief's screenshots:
 * a "🔔 Pre-order alert" pill plus a red warning about shifting lead times
 * and non-cancellable orders.
 */
export function PreorderBanner({
  expectedDelivery,
  releaseDate,
  note,
  nonCancellable,
}: {
  expectedDelivery?: string | null;
  releaseDate?: Date | string | null;
  note?: string | null;
  nonCancellable?: boolean;
}) {
  const defaultNote =
    "Let op: levertijden van pre-orders kunnen afwijken en verschuiven. " +
    (expectedDelivery ? `De verwachte levering staat momenteel gepland ${expectedDelivery}. ` : "") +
    (nonCancellable
      ? "Bestellingen voor pre-orders kunnen niet worden geannuleerd, dus overweeg je aankoop zorgvuldig voordat je bestelt."
      : "");

  return (
    <div className="overflow-hidden rounded-2xl border border-amber-200 bg-amber-50">
      <div className="flex items-center gap-2 bg-white px-4 py-3 text-lg font-bold text-navy shadow-sm">
        <span aria-hidden>🔔</span> Pre-order alert
      </div>
      <div className="space-y-2 px-4 py-4 text-sm">
        <p className="font-semibold text-red-600">{note?.trim() || defaultNote}</p>
        <dl className="grid grid-cols-1 gap-1 pt-2 text-navy/70 sm:grid-cols-2">
          {releaseDate && (
            <div className="flex gap-2">
              <dt className="font-medium">Releasedatum:</dt>
              <dd>{formatDate(releaseDate)}</dd>
            </div>
          )}
          {expectedDelivery && (
            <div className="flex gap-2">
              <dt className="font-medium">Verwachte levering:</dt>
              <dd>{expectedDelivery}</dd>
            </div>
          )}
        </dl>
      </div>
    </div>
  );
}
