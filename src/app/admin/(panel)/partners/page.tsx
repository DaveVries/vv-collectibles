import { prisma } from "@/lib/prisma";
import { PartnerRow } from "@/components/admin/PartnerRow";

export const dynamic = "force-dynamic";

export default async function AdminPartnersPage() {
  const partners = await prisma.partner.findMany({ orderBy: { createdAt: "desc" } });
  const pending = partners.filter((p) => p.status === "PENDING").length;

  return (
    <div>
      <h1 className="text-2xl font-bold">Partners</h1>
      <p className="mt-1 text-sm text-navy/50">
        {partners.length} aanvragen · {pending} wachten op goedkeuring. Stel per partner het niveau,
        de korting en de bulkdrempel in.
      </p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-navy/10 bg-white">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="bg-navy/5 text-navy/60">
            <tr>
              <th className="px-4 py-3">Bedrijf</th>
              <th className="px-4 py-3">Plaats</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Niveau</th>
              <th className="px-4 py-3 text-right">Acties</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-navy/10">
            {partners.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-navy/40">
                  Nog geen partneraanvragen.
                </td>
              </tr>
            )}
            {partners.map((p) => (
              <PartnerRow key={p.id} partner={p} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
