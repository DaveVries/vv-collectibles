# V&V Collectibles

Webshop + B2B distribution platform for sealed collectibles & TCG pre-orders
(Pokémon, Bandai, …). Built as a self-contained app — no external webshop.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · PostgreSQL · Prisma ·
NextAuth v4 · Mollie (payments) · PostNL (labels) · Resend (email) · pdfkit (invoices).

## What's included (phase 1)

- **Storefront** — home, catalog, product detail with first-class **pre-order** alerts
  (shifting lead times, non-cancellable notice, expected delivery), cart, checkout.
- **Payments** — Mollie redirect checkout (iDEAL, Bancontact, PayPal, Belfius, KBC/CBC,
  Trustly, bank transfer). Runs in **stub mode** until `MOLLIE_API_KEY` is set.
- **Invoices** — a PDF invoice is generated automatically when an order is paid; the
  shop owner can also (re)open it from the order page.
- **Admin dashboard** (`/admin`) — orders table with status (processing/completed/…),
  tracking number, **PostNL label** button (pre-fills recipient address), invoice
  download; product list + create (auto-emails partners); partner management.
- **B2B partners** — stores apply at `/partners`; admin approves and sets tier
  (Standaard/Partner/Distributeur), extra discount and bulk thresholds. Approved
  partners are auto-notified when new products are added. Pricing logic in
  `src/lib/pricing.ts`.

## Setup

```bash
cp .env.example .env          # then fill DATABASE_URL etc.
npm install
npm run db:push               # create tables
npm run db:seed               # admin user + sample products
npm run dev
```

Demo logins (change in production):
- Admin: **admin@vvcollectibles.nl / admin123**
- Partner portal: **inkoop@cardshop-demo.nl / partner123** (approved PARTNER tier)
- Customer: register at `/register`

### Customer & partner areas
- `/register`, `/login`, `/forgot`, `/reset` — customer auth + password reset
- `/account` — overview, order tracking, profile/address, change password
- `/partner` — B2B portal (approved partners): tier/discount summary, catalog with
  net + bulk prices, quick-order, B2B order history. A store applies at `/partners`,
  the admin approves + sets tier/discount/bulk, then the store logs in (matched by email).

## Integrations / going live

All three external integrations are stubbed until keys are provided, so the whole
flow is testable locally:

| Integration | Env var(s) | Stub behavior |
|---|---|---|
| Mollie | `MOLLIE_API_KEY` | checkout auto-"pays", order → PROCESSING |
| PostNL | `POSTNL_API_KEY` + customer codes | label returns a placeholder barcode |
| Resend | `RESEND_API_KEY` | emails logged to console |

Set `NEXT_PUBLIC_SITE_URL` / `NEXTAUTH_URL` to your real domain in production (Mollie
webhooks and invoice/label URLs are built from it).

## Notable files

- `prisma/schema.prisma` — Product (pre-order fields), Order, OrderItem, Invoice, Partner, User
- `src/lib/pricing.ts` — tier + bulk B2B pricing
- `src/lib/mollie.ts`, `src/lib/postnl.ts`, `src/lib/invoice.ts`, `src/lib/email.ts`
- `src/app/(shop)/` — storefront · `src/app/admin/` — admin panel · `src/app/api/` — routes
