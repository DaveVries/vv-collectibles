import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/account/ProfileForm";
import { ChangePasswordForm } from "@/components/account/ChangePasswordForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await auth();
  const user = session?.user?.id
    ? await prisma.user.findUnique({
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
      })
    : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Mijn gegevens</h1>
        <p className="mt-1 text-navy/60">Werk je gegevens en bezorgadres bij.</p>
      </div>
      <ProfileForm initial={user} />
      <div>
        <h2 className="text-lg font-semibold">Wachtwoord wijzigen</h2>
        <div className="mt-3">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
