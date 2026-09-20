# V&V Collectibles

Webshop + B2B distribution platform for sealed collectibles & TCG pre-orders
(Pokémon, Bandai, …). Built as a self-contained app — no external webshop.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · PostgreSQL · Prisma ·
NextAuth v4 · Rabo OnlineKassa (payments) · PostNL (labels) · Resend (email) · pdfkit (invoices).

## What's included (phase 1)

- **Storefront** — home, catalog, product detail with first-class **pre-order** alerts
  (shifting lead times, non-cancellable notice, expected delivery), cart, checkout.
- **Payments** — Rabo OnlineKassa redirect checkout (iDEAL | Wero, cards, Bancontact,
  PayPal). Runs in **stub mode** until `RABO_REFRESH_TOKEN` + `RABO_SIGNING_KEY` are set.
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
| Rabo OnlineKassa | `RABO_REFRESH_TOKEN` + `RABO_SIGNING_KEY` | checkout auto-"pays", order → PROCESSING |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` | invoices + uploads written to `public/` on local disk |
| PostNL | `POSTNL_API_KEY` + customer codes | label returns a placeholder barcode |
| Resend | `RESEND_API_KEY` | emails logged to console |

Set `NEXT_PUBLIC_SITE_URL` / `NEXTAUTH_URL` to your real domain in production (payment
return URLs and invoice/label URLs are built from it).

### Rabo OnlineKassa

Rabo OnlineKassa is Rabobank's online gateway, formerly branded Rabo OmniKassa 2.0 and
now part of Rabo Smart Pay. Integration code lives in `src/lib/rabo/`.

Flow: the refresh token from the dashboard is exchanged for a short-lived access token →
the order is announced → the customer is redirected to Rabo's hosted payment page → Rabo
POSTs a notification to our webhook → we call back with the notification's token to pull
the authoritative order results.

Setup:

1. Request Rabo OnlineKassa and open the **Rabo Smart Pay dashboard**.
2. Copy the **refresh token** and **signing key** into `RABO_REFRESH_TOKEN` /
   `RABO_SIGNING_KEY`. The signing key is base64 — paste it as-is.
3. Register the webhook URL in the dashboard:
   `https://<your-domain>/api/webhooks/rabo`. Unlike Mollie there is no
   per-payment webhook URL; it is configured once.
4. Leave `RABO_ENVIRONMENT="sandbox"` until you have tested end to end.

> **Before going live**, check the constants in `src/lib/rabo/spec.ts` against the API
> manual on the [Rabobank Developer Portal](https://developer.rabobank.nl/api-documentation/rabo-omnikassa/2-0-16).
> The base URLs, endpoint paths and — above all — the signature field orders were taken
> from public SDK documentation rather than the manual itself. They are deliberately kept
> in that one file so correcting them touches nothing else. A wrong field order shows up
> as a signature error on every request.

`npm run test:rabo` exercises the signature mechanics (determinism, tamper rejection,
expiry handling, status mapping) against a dummy key. It cannot confirm the field order
is right — only a sandbox call can — but re-run it after editing `spec.ts` to check
nothing else broke.

The webhook is the only thing that marks an order paid. The `order_id`/`status`/`signature`
parameters Rabo appends to the return URL are verified too, but only to show the customer
immediate feedback — a customer who closes the browser still gets a correct order.

## Notable files

- `prisma/schema.prisma` — Product (pre-order fields), Order, OrderItem, Invoice, Partner, User
- `src/lib/pricing.ts` — tier + bulk B2B pricing
- `src/lib/rabo/` — OnlineKassa client, signatures, protocol constants (`spec.ts`)
- `src/lib/order-finalize.ts`, `src/lib/postnl.ts`, `src/lib/invoice.ts`, `src/lib/email.ts`
- `src/app/(shop)/` — storefront · `src/app/admin/` — admin panel · `src/app/api/` — routes
