/**
 * The public origin of this site, e.g. "https://www.vvcollectibles.com".
 *
 * Used to build absolute URLs that leave the app: payment return URLs, links
 * in transactional email, invoice links. Never has a trailing slash.
 *
 * Resolution order:
 *
 *  1. NEXT_PUBLIC_SITE_URL — the configured value, and the only one that can
 *     express a preference between apex and www.
 *  2. VERCEL_PROJECT_PRODUCTION_URL — Vercel sets this to the project's
 *     production domain on every deployment, preview included. It is a bare
 *     hostname with no scheme. A safety net, not a substitute: Vercel picks
 *     the shortest production domain, which here is the apex, and the apex
 *     308-redirects to www.
 *  3. localhost — development only.
 *
 * Why the fallback chain matters: NEXT_PUBLIC_* values are inlined into the
 * bundle at BUILD time, so a deployment built before the variable was set
 * keeps whatever it was built with until something triggers a rebuild. Before
 * this chain existed, that meant a live shop sending customers to
 * http://localhost:3000 after payment.
 */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return stripTrailingSlash(configured);

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercel) return `https://${stripTrailingSlash(vercel)}`;

  return "http://localhost:3000";
}

/** Joins a path onto the site origin, tolerating a leading slash or not. */
export function siteUrlFor(path: string): string {
  return `${siteUrl()}/${path.replace(/^\/+/, "")}`;
}

function stripTrailingSlash(value: string): string {
  return value.trim().replace(/\/+$/, "");
}
