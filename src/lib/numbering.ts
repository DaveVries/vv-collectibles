import { prisma } from "@/lib/prisma";

/**
 * Atomically produce a sequential, human-friendly number like VV-2026-0001.
 * Uses a per-year Counter row updated in a transaction to avoid race gaps.
 */
async function nextSeq(prefix: string, year: number): Promise<number> {
  const key = `${prefix}-${year}`;
  const counter = await prisma.counter.upsert({
    where: { key },
    update: { value: { increment: 1 } },
    create: { key, value: 1 },
  });
  return counter.value;
}

export async function nextOrderNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const seq = await nextSeq("order", year);
  return `VV-${year}-${String(seq).padStart(4, "0")}`;
}

export async function nextInvoiceNumber(now = new Date()): Promise<string> {
  const year = now.getFullYear();
  const seq = await nextSeq("invoice", year);
  return `INV-${year}-${String(seq).padStart(4, "0")}`;
}
