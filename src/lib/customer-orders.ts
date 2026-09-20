import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

/**
 * Orders belonging to a logged-in user: those linked by userId, plus any guest
 * orders placed with the same email (so pre-account purchases still show up).
 */
export function customerOrderWhere(userId?: string, email?: string | null): Prisma.OrderWhereInput {
  const or: Prisma.OrderWhereInput[] = [];
  if (userId) or.push({ userId });
  if (email) or.push({ customerEmail: email.toLowerCase() });
  return or.length ? { OR: or } : { id: "__none__" };
}
