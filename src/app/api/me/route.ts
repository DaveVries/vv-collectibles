import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Returns the logged-in user's profile for prefilling checkout. */
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json(null);
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      name: true,
      email: true,
      phone: true,
      street: true,
      houseNr: true,
      zip: true,
      city: true,
      country: true,
    },
  });
  return NextResponse.json(user);
}
