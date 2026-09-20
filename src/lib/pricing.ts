import type { Partner, PartnerTier, Product } from "@prisma/client";

/**
 * Baseline discount each approved tier gets off the consumer price, before any
 * partner-specific or bulk adjustments. Distribution = best pricing.
 */
export const TIER_BASE_DISCOUNT_PCT: Record<PartnerTier, number> = {
  STANDARD: 10,
  PARTNER: 18,
  DISTRIBUTOR: 25,
};

export const TIER_LABEL: Record<PartnerTier, string> = {
  STANDARD: "Standaard",
  PARTNER: "Partner",
  DISTRIBUTOR: "Distributeur",
};

export type PricedLine = {
  unitConsumerCents: number;
  unitNetCents: number; // what the buyer actually pays per unit
  quantity: number;
  lineCents: number;
  discountPct: number; // total effective discount applied
  bulkApplied: boolean;
};

/** Wholesale base used as the starting point for a partner (falls back to consumer price). */
export function wholesaleBase(product: Pick<Product, "priceCents" | "wholesaleCents">): number {
  return product.wholesaleCents ?? product.priceCents;
}

/**
 * Compute the price a given buyer pays for `quantity` of a product.
 * - No partner -> consumer price.
 * - Partner -> tier base discount + partner discountPct, plus a bulk discount
 *   when the line quantity meets the partner's threshold.
 */
export function priceLine(
  product: Pick<Product, "priceCents" | "wholesaleCents">,
  quantity: number,
  partner?: Pick<Partner, "tier" | "discountPct" | "bulkThreshold" | "bulkDiscountPct"> | null,
): PricedLine {
  const unitConsumerCents = product.priceCents;

  if (!partner) {
    return {
      unitConsumerCents,
      unitNetCents: unitConsumerCents,
      quantity,
      lineCents: unitConsumerCents * quantity,
      discountPct: 0,
      bulkApplied: false,
    };
  }

  const base = wholesaleBase(product);
  let discountPct = TIER_BASE_DISCOUNT_PCT[partner.tier] + partner.discountPct;

  const bulkApplied = quantity >= partner.bulkThreshold;
  if (bulkApplied) discountPct += partner.bulkDiscountPct;

  discountPct = Math.min(discountPct, 60); // safety cap

  const unitNetCents = Math.round(base * (1 - discountPct / 100));
  return {
    unitConsumerCents,
    unitNetCents,
    quantity,
    lineCents: unitNetCents * quantity,
    discountPct,
    bulkApplied,
  };
}
