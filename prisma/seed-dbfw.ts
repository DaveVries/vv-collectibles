import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { slugify } from "../src/lib/utils";

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

type SetDef = {
  code: string;
  title: string;
  kind: "booster" | "manga";
  preorder: boolean;
  image?: string; // override (real photo)
};

// Official Dragon Ball Super Card Game — Fusion World set names.
// FB08-FB10 + SB02 are upcoming → pre-order. Adjust stock/release per set in admin.
const SETS: SetDef[] = [
  { code: "FB01", title: "Awakened Pulse", kind: "booster", preorder: false },
  { code: "FB02", title: "Blazing Aura", kind: "booster", preorder: false },
  { code: "FB03", title: "Raging Roar", kind: "booster", preorder: false },
  { code: "FB04", title: "Ultra Limit", kind: "booster", preorder: false },
  { code: "FB05", title: "New Adventure", kind: "booster", preorder: false },
  { code: "FB06", title: "Rivals Clash", kind: "booster", preorder: false },
  { code: "FB07", title: "Wish for Shenron", kind: "booster", preorder: false },
  { code: "FB08", title: "Saiyan's Pride", kind: "booster", preorder: true },
  {
    code: "FB09",
    title: "Dual Evolution",
    kind: "booster",
    preorder: true,
    image: "/uploads/e2538529-a32d-44e6-862d-3728e7fd3a0f.jpg",
  },
  { code: "FB10", title: "Cross Force", kind: "booster", preorder: true },
  { code: "SB01", title: "Manga Booster 01", kind: "manga", preorder: false },
  { code: "SB02", title: "Manga Booster 02", kind: "manga", preorder: true },
];

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Generate a clean, on-brand placeholder image for a set. */
function makePlaceholderSvg(code: string, title: string, kindLabel: string) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" width="600" height="600">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#131d33"/><stop offset="1" stop-color="#080e1a"/>
    </linearGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#f1d27a"/><stop offset="0.5" stop-color="#d4af37"/><stop offset="1" stop-color="#a9821f"/>
    </linearGradient>
  </defs>
  <rect width="600" height="600" fill="url(#bg)"/>
  <g fill="none" stroke="url(#gold)" stroke-width="3" stroke-linejoin="round" opacity="0.9" transform="translate(300,150) scale(0.9)">
    <circle cx="0" cy="0" r="72" stroke-width="2" opacity="0.8"/>
    <path d="M0 -52 L38 -14 L0 0 L-38 -14 Z"/>
    <path d="M-38 -14 L0 52 L38 -14"/>
    <path d="M0 0 L0 52"/>
  </g>
  <text x="300" y="300" text-anchor="middle" fill="#f3efe6" font-family="Arial, sans-serif" font-size="92" font-weight="800">${esc(code)}</text>
  <text x="300" y="360" text-anchor="middle" fill="#d4af37" font-family="Arial, sans-serif" font-size="34" font-weight="700">${esc(title)}</text>
  <text x="300" y="410" text-anchor="middle" fill="#8a93a6" font-family="Arial, sans-serif" font-size="18" letter-spacing="3">DRAGON BALL SUPER · FUSION WORLD</text>
  <text x="300" y="442" text-anchor="middle" fill="#6b7686" font-family="Arial, sans-serif" font-size="15" letter-spacing="2">${esc(kindLabel.toUpperCase())}</text>
  <text x="300" y="556" text-anchor="middle" fill="#5a6473" font-family="Arial, sans-serif" font-size="14" letter-spacing="4">V&amp;V COLLECTIBLES</text>
</svg>`;
}

async function main() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  for (const s of SETS) {
    const isManga = s.kind === "manga";
    const productLabel = isManga ? "Manga Booster Display" : "Booster Display (24 packs)";

    // Image: real photo if provided, else generated placeholder.
    let image = s.image;
    if (!image) {
      const fileName = `dbfw-${s.code.toLowerCase()}.svg`;
      fs.writeFileSync(path.join(UPLOAD_DIR, fileName), makePlaceholderSvg(s.code, s.title, productLabel));
      image = `/uploads/${fileName}`;
    }

    const name = `Dragon Ball Super Card Game Fusion World — ${s.code} ${s.title} ${productLabel}`;
    const slug = slugify(`dbfw ${s.code} ${s.title}`);
    const priceCents = isManga ? 8995 : 9995;
    const wholesaleCents = isManga ? 7295 : 7995;

    const data = {
      slug,
      name,
      summary: `${s.code} ${s.title} — ${isManga ? "Manga Booster" : "Booster Display"} (Engels). Officiële Bandai release.`,
      description: `Officiële Dragon Ball Super Card Game — Fusion World ${s.code} "${s.title}" ${productLabel}.\n\n${
        isManga
          ? "Manga Booster met speciale manga-art kaarten."
          : "12 kaarten per pack, 24 packs per display."
      }\n\nEngelse versie (English ver.).`,
      category: isManga ? "Manga Booster" : "Booster Box",
      brand: "Bandai",
      language: "Engels",
      priceCents,
      wholesaleCents,
      currency: "EUR",
      images: [image],
      stock: s.preorder ? 0 : 12,
      soldOut: false,
      isPreorder: s.preorder,
      expectedDelivery: s.preorder ? "z.s.m. na release" : null,
      nonCancellable: s.preorder,
      isCase: false,
      active: true,
      featured: s.code === "FB09",
    };

    await prisma.product.upsert({ where: { slug }, update: data, create: data });
    console.log(`  ✓ ${s.code} ${s.title}${s.preorder ? " (pre-order)" : ""}`);
  }

  console.log(`Seeded ${SETS.length} Fusion World sets.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
