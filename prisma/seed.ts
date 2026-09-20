import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // --- Admin user ---
  const passwordHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { email: "admin@vvcollectibles.nl" },
    update: {},
    create: {
      email: "admin@vvcollectibles.nl",
      name: "V&V Admin",
      passwordHash,
      role: "ADMIN",
    },
  });

  // --- Products (modeled on the brief's screenshots) ---
  const products = [
    {
      slug: "pokemon-30th-celebration-elite-trainer-box-langere-levertijd",
      name: "(Pre-order) Pokémon TCG — 30th Celebration Elite Trainer Box (Langere levertijd)",
      summary: "Officiële jubileumrelease rond 30 jaar Pokémon. Losse ETB.",
      description:
        "Dit betreft een losse ETB. Als je een sealed case van 10 stuks wilt, dien je een case te bestellen via de daarvoor bestemde advertentie.\n\nDe Pokémon 30th Celebration Elite Trainer Box is nu te bestellen en verschijnt in september. Het gaat om een officiële jubileumrelease rond 30 jaar Pokémon. Foto's en details over de inhoud zijn op dit moment nog niet beschikbaar.",
      category: "Elite Trainer Box",
      brand: "Pokémon",
      language: "Engels",
      priceCents: 6995,
      isPreorder: true,
      releaseDate: new Date("2026-09-01"),
      expectedDelivery: "rond januari 2027",
      preorderNote:
        "Let op: Deze batch heeft een langere levertijd. De verwachte levering staat momenteel gepland rond januari 2027. Bestellingen voor deze batch kunnen niet worden geannuleerd, dus overweeg je aankoop zorgvuldig voordat je bestelt. Deze batch is daarom vooral interessant voor investeerders en verzamelaars die het product gesealed willen houden en niet van plan zijn het te openen.",
      nonCancellable: true,
      featured: true,
      stock: 0,
      wholesaleCents: 5495,
    },
    {
      slug: "pokemon-30th-celebration-booster-bundle",
      name: "(Pre-order) Pokémon TCG — 30th Celebration Booster Bundle",
      summary: "Booster bundle (6 boosters) — 30th Celebration.",
      description:
        "Officiële 30th Celebration Booster Bundle met 6 booster packs. Releasedatum september 2026.",
      category: "Booster Bundle",
      brand: "Pokémon",
      language: "Engels",
      priceCents: 2995,
      isPreorder: true,
      releaseDate: new Date("2026-09-01"),
      expectedDelivery: "maximaal één maand na release",
      nonCancellable: true,
      featured: true,
      stock: 0,
      wholesaleCents: 2295,
    },
    {
      slug: "pokemon-mega-evolution-pitch-black-elite-trainer-box",
      name: "(Pre-order) Pokémon TCG — Mega Evolution Pitch Black Elite Trainer Box",
      summary: "Mega Evolution 'Pitch Black' ETB — pre-order.",
      description: "Mega Evolution Pitch Black Elite Trainer Box. Pre-order.",
      category: "Elite Trainer Box",
      brand: "Pokémon",
      language: "Engels",
      priceCents: 5995,
      isPreorder: true,
      releaseDate: new Date("2026-10-15"),
      expectedDelivery: "oktober 2026",
      nonCancellable: true,
      stock: 0,
      wholesaleCents: 4795,
    },
    {
      slug: "pokemon-30th-celebration-sealed-case-10x-etb",
      name: "Pokémon TCG — 30th Celebration Sealed Case (10× ETB)",
      summary: "Sealed case met 10 Elite Trainer Boxes. Voor winkels & investeerders.",
      description:
        "Sealed case met 10× 30th Celebration Elite Trainer Box. Ideaal voor wederverkopers. Partnerprijzen beschikbaar na goedkeuring.",
      category: "Case",
      brand: "Pokémon",
      language: "Engels",
      priceCents: 65995,
      isPreorder: true,
      releaseDate: new Date("2026-09-01"),
      expectedDelivery: "rond januari 2027",
      nonCancellable: true,
      isCase: true,
      caseSize: 10,
      stock: 0,
      wholesaleCents: 52995,
    },
    {
      slug: "bandai-dragon-ball-fusion-world-booster-box",
      name: "Bandai Dragon Ball Super — Fusion World Booster Box",
      summary: "In voorraad — direct leverbaar.",
      description: "Dragon Ball Super Card Game Fusion World booster box. Direct uit voorraad leverbaar.",
      category: "Booster Box",
      brand: "Bandai",
      language: "Engels",
      priceCents: 8995,
      compareAtCents: 9995,
      isPreorder: false,
      stock: 24,
      featured: true,
      wholesaleCents: 6995,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  // --- Sample partner (with a linked login for the portal) ---
  const partnerPwHash = await bcrypt.hash("partner123", 10);
  const partnerUser = await prisma.user.upsert({
    where: { email: "inkoop@cardshop-demo.nl" },
    update: {},
    create: {
      email: "inkoop@cardshop-demo.nl",
      name: "Card Shop Demo",
      passwordHash: partnerPwHash,
      role: "CUSTOMER",
    },
  });

  await prisma.partner.upsert({
    where: { email: "inkoop@cardshop-demo.nl" },
    update: { userId: partnerUser.id },
    create: {
      userId: partnerUser.id,
      companyName: "Card Shop Demo",
      contactName: "Jan de Vries",
      email: "inkoop@cardshop-demo.nl",
      phone: "+31 6 12345678",
      vatNumber: "NL123456789B01",
      street: "Oudegracht",
      houseNr: "100",
      zip: "3511AV",
      city: "Utrecht",
      country: "NL",
      message: "We willen graag cases afnemen voor onze fysieke winkel.",
      status: "APPROVED",
      tier: "PARTNER",
      discountPct: 2,
      bulkThreshold: 6,
      bulkDiscountPct: 5,
    },
  });

  console.log("Seed complete.");
  console.log("  Admin:   admin@vvcollectibles.nl / admin123");
  console.log("  Partner: inkoop@cardshop-demo.nl / partner123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
