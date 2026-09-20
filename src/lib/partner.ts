import { prisma } from "@/lib/prisma";
import type { Partner } from "@prisma/client";

/**
 * Resolve the approved Partner for a logged-in user, if any. Matches by linked
 * userId first, then by email (and lazily links the account on first match).
 * Returns null for non-partners or partners that aren't approved yet.
 */
export async function getPartnerForSession(
  userId?: string | null,
  email?: string | null,
): Promise<Partner | null> {
  if (!userId && !email) return null;

  let partner = userId ? await prisma.partner.findUnique({ where: { userId } }) : null;

  if (!partner && email) {
    partner = await prisma.partner.findUnique({ where: { email: email.toLowerCase() } });
    // Link the account for future lookups.
    if (partner && userId && !partner.userId) {
      partner = await prisma.partner.update({
        where: { id: partner.id },
        data: { userId },
      });
    }
  }

  if (!partner || partner.status !== "APPROVED") return null;
  return partner;
}
