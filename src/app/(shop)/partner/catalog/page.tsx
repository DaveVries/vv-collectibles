import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getPartnerForSession } from "@/lib/partner";
import { priceLine } from "@/lib/pricing";
import { PartnerOrderForm } from "@/components/partner/PartnerOrderForm";

export const dynamic = "force-dynamic";

export default async function PartnerCatalogPage() {
  const session = await auth();
  const partner = await getPartnerForSession(session?.user?.id, session?.user?.email);
  if (!partner) return null;

  const products = await prisma.product.findMany({
    where: { active: true },
    orderBy: [{ category: "asc" }, { name: "asc" }],
  });

  // Pre-compute net unit prices (normal vs bulk) per product, server-side.
  const rows = products.map((p) => {
    const normal = priceLine(p, 1, partner);
    const bulk = priceLine(p, partner.bulkThreshold, partner);
    return {
      productId: p.id,
      slug: p.slug,
      name: p.name,
      category: p.category,
      image: p.images[0] ?? null,
      currency: p.currency,
      isPreorder: p.isPreorder,
      consumerCents: p.priceCents,
      unitNormalCents: normal.unitNetCents,
      unitBulkCents: bulk.unitNetCents,
      discountPct: normal.discountPct,
      bulkDiscountPct: partner.bulkDiscountPct,
    };
  });

  const defaultAddress = {
    name: partner.companyName,
    street: partner.street ?? "",
    houseNr: partner.houseNr ?? "",
    zip: partner.zip ?? "",
    city: partner.city ?? "",
    country: partner.country ?? "NL",
    email: partner.email,
    phone: partner.phone ?? "",
  };

  return (
    <div>
      <h1 className="text-2xl font-bold">Bestellen — catalogus</h1>
      <p className="mt-1 text-navy/60">
        Prijzen zijn jouw netto inkoopprijzen. Bestel {partner.bulkThreshold}+ stuks van een
        artikel voor de bulkprijs (extra {partner.bulkDiscountPct}% korting).
      </p>
      <div className="mt-6">
        <PartnerOrderForm
          rows={rows}
          bulkThreshold={partner.bulkThreshold}
          defaultAddress={defaultAddress}
        />
      </div>
    </div>
  );
}
