import { NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { sendWelcome } from "@/lib/email";

const schema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, "Minimaal 8 tekens"),
});

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const msg = parsed.error.issues[0]?.message ?? "Controleer de velden";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  const { name, email, password } = parsed.data;
  const lower = email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email: lower } });
  if (existing) {
    return NextResponse.json({ error: "Er bestaat al een account met dit e-mailadres" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { name, email: lower, passwordHash, role: "CUSTOMER" },
  });

  // Link any prior guest orders placed with this email to the new account.
  await prisma.order.updateMany({
    where: { customerEmail: lower, userId: null },
    data: { userId: user.id },
  });

  await sendWelcome(user).catch((e) => console.error("welcome email error", e));

  return NextResponse.json({ ok: true });
}
