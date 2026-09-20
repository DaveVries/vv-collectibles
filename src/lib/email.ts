import { Resend } from "resend";

/**
 * Thin email helper. Without RESEND_API_KEY, emails are logged to the console
 * so order/partner flows are observable in development.
 */
const apiKey = process.env.RESEND_API_KEY;
const resend = apiKey ? new Resend(apiKey) : null;
const from = process.env.EMAIL_FROM ?? "V&V Collectibles <orders@vvcollectibles.nl>";

export async function sendEmail(opts: { to: string | string[]; subject: string; html: string }) {
  if (!resend) {
    console.log("[email:stub]", { to: opts.to, subject: opts.subject });
    return { stub: true };
  }
  await resend.emails.send({ from, to: opts.to, subject: opts.subject, html: opts.html });
  return { stub: false };
}

export async function sendOrderConfirmation(order: {
  number: string;
  customerEmail: string;
  customerName: string;
  hasPreorderItems: boolean;
}) {
  const preorderNote = order.hasPreorderItems
    ? `<p style="color:#b91c1c"><strong>Let op:</strong> je bestelling bevat pre-order artikelen.
       Levertijden kunnen afwijken en verschuiven. Pre-orders kunnen niet worden geannuleerd.</p>`
    : "";
  return sendEmail({
    to: order.customerEmail,
    subject: `Bestelbevestiging ${order.number} — V&V Collectibles`,
    html: `<h2>Bedankt voor je bestelling, ${order.customerName}!</h2>
      <p>Je bestelnummer is <strong>${order.number}</strong>.</p>
      ${preorderNote}
      <p>Je ontvangt bericht zodra je bestelling wordt verzonden.</p>`,
  });
}

export async function sendWelcome(user: { email: string; name?: string | null }) {
  return sendEmail({
    to: user.email,
    subject: "Welkom bij V&V Collectibles",
    html: `<h2>Welkom${user.name ? `, ${user.name}` : ""}!</h2>
      <p>Je account is aangemaakt. Je kunt voortaan je bestellingen volgen in je account
      en sneller afrekenen.</p>
      <p><a href="${process.env.NEXT_PUBLIC_SITE_URL}/account">Naar je account</a></p>`,
  });
}

export async function sendPasswordReset(email: string, token: string) {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/reset?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Wachtwoord opnieuw instellen — V&V Collectibles",
    html: `<h2>Wachtwoord opnieuw instellen</h2>
      <p>Klik op de onderstaande link om een nieuw wachtwoord in te stellen. Deze link is
      1 uur geldig.</p>
      <p><a href="${url}">${url}</a></p>
      <p>Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.</p>`,
  });
}

/** Notify the customer when their order ships (tracking added). */
export async function sendShippedEmail(order: {
  number: string;
  customerEmail: string;
  customerName: string;
  trackingNumber: string | null;
  trackingCarrier: string | null;
}) {
  return sendEmail({
    to: order.customerEmail,
    subject: `Je bestelling ${order.number} is verzonden`,
    html: `<h2>Onderweg!</h2>
      <p>Hi ${order.customerName}, je bestelling <strong>${order.number}</strong> is verzonden
      met ${order.trackingCarrier ?? "PostNL"}.</p>
      ${order.trackingNumber ? `<p>Trackingnummer: <strong>${order.trackingNumber}</strong></p>` : ""}`,
  });
}

/** Notify a partner/store when a new product is added (B2B announce). */
export async function sendNewProductAnnounce(
  partnerEmails: string[],
  product: { name: string; slug: string },
) {
  if (partnerEmails.length === 0) return { stub: true };
  const url = `${process.env.NEXT_PUBLIC_SITE_URL}/products/${product.slug}`;
  return sendEmail({
    to: partnerEmails,
    subject: `Nieuw in het assortiment: ${product.name}`,
    html: `<h2>Nieuw beschikbaar voor partners</h2>
      <p><strong>${product.name}</strong> is toegevoegd. Log in voor jouw partnerprijzen.</p>
      <p><a href="${url}">Bekijk product</a></p>`,
  });
}
