import { Resend } from "resend";
import { siteUrl } from "@/lib/site";
import { layout, p as para, button, note, facts, esc } from "@/lib/email-layout";

/**
 * Thin email helper. Without RESEND_API_KEY, emails are logged to the console
 * so order/partner flows are observable in development.
 */
/**
 * Resolved per call, not captured at module load. A module-level constant
 * freezes whatever the environment looked like at import time, which makes
 * the module untestable and silently wrong in any runtime that populates
 * env after import.
 */
let client: Resend | null = null;
let clientKey: string | undefined;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client || clientKey !== apiKey) {
    client = new Resend(apiKey);
    clientKey = apiKey;
  }
  return client;
}

function sender(): string {
  return process.env.EMAIL_FROM || "V&V Collectibles <orders@vvcollectibles.com>";
}

export async function sendEmail(opts: {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text alternative. Improves deliverability and serves clients
   *  that refuse HTML; without it a message looks more like bulk mail. */
  text?: string;
}) {
  const resend = getResend();
  const from = sender();

  if (!resend) {
    console.log("[email:stub]", { to: opts.to, subject: opts.subject });
    return { stub: true };
  }

  // The Resend SDK reports API failures in the returned `error` field rather
  // than by throwing: send() resolves to { data, error }. Ignoring that field
  // swallows every real failure — unverified domain, rejected sender, rate
  // limit — while the caller's .catch() never fires and the code looks like
  // it succeeded. Turn it into a throw so the existing handlers log it.
  const { data, error } = await resend.emails.send({
    from,
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
    ...(opts.text ? { text: opts.text } : {}),
  });

  if (error) {
    throw new Error(
      `Resend rejected the email to ${Array.isArray(opts.to) ? opts.to.join(", ") : opts.to} ` +
        `(from ${from}): ${error.name ?? "error"} — ${error.message}`,
    );
  }

  return { stub: false, id: data?.id };
}

export async function sendOrderConfirmation(order: {
  number: string;
  customerEmail: string;
  customerName: string;
  hasPreorderItems: boolean;
}) {
  const preorder = order.hasPreorderItems
    ? note(
        "<strong>Let op:</strong> je bestelling bevat pre-order artikelen. " +
          "Levertijden kunnen afwijken en verschuiven, en pre-orders kunnen niet worden geannuleerd.",
        "warn",
      )
    : "";

  return sendEmail({
    to: order.customerEmail,
    subject: `Bestelbevestiging ${order.number} — V&V Collectibles`,
    html: layout({
      heading: `Bedankt voor je bestelling, ${esc(order.customerName)}!`,
      preheader: `We hebben bestelling ${order.number} ontvangen.`,
      body:
        para("We hebben je bestelling in goede orde ontvangen en gaan er direct mee aan de slag.") +
        facts([["Bestelnummer", order.number]]) +
        preorder +
        para("Je krijgt automatisch bericht zodra je pakket onderweg is.") +
        button("Bekijk je bestelling", `${siteUrl()}/account/orders`),
    }),
    text:
      `Bedankt voor je bestelling, ${order.customerName}!\n\n` +
      `Bestelnummer: ${order.number}\n\n` +
      (order.hasPreorderItems
        ? "Let op: je bestelling bevat pre-order artikelen. Levertijden kunnen afwijken en verschuiven, en pre-orders kunnen niet worden geannuleerd.\n\n"
        : "") +
      `Je krijgt bericht zodra je pakket onderweg is.\n${siteUrl()}/account/orders\n`,
  });
}

export async function sendWelcome(user: { email: string; name?: string | null }) {
  const url = `${siteUrl()}/account`;
  return sendEmail({
    to: user.email,
    subject: "Welkom bij V&V Collectibles",
    html: layout({
      heading: `Welkom${user.name ? `, ${esc(user.name)}` : ""}!`,
      preheader: "Je account is aangemaakt.",
      body:
        para("Je account is aangemaakt. Vanaf nu kun je je bestellingen volgen en sneller afrekenen.") +
        button("Naar je account", url),
    }),
    text:
      `Welkom${user.name ? `, ${user.name}` : ""}!\n\n` +
      `Je account is aangemaakt. Vanaf nu kun je je bestellingen volgen en sneller afrekenen.\n\n${url}\n`,
  });
}

export async function sendPasswordReset(email: string, token: string) {
  const url = `${siteUrl()}/reset?token=${token}`;
  return sendEmail({
    to: email,
    subject: "Wachtwoord opnieuw instellen — V&V Collectibles",
    html: layout({
      heading: "Wachtwoord opnieuw instellen",
      preheader: "Deze link is 1 uur geldig.",
      body:
        para("Klik op de knop hieronder om een nieuw wachtwoord in te stellen.") +
        button("Nieuw wachtwoord instellen", url) +
        note("Deze link is <strong>1 uur</strong> geldig en kan één keer gebruikt worden.") +
        para(
          `<span style="color:#6b7280;font-size:14px;">Werkt de knop niet? Kopieer deze link:<br />` +
            `<a href="${esc(url)}" style="color:#a9821f;word-break:break-all;">${esc(url)}</a></span>`,
        ) +
        para(
          `<span style="color:#6b7280;font-size:14px;">Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren — ` +
            `je wachtwoord blijft ongewijzigd.</span>`,
        ),
    }),
    text:
      `Wachtwoord opnieuw instellen\n\n` +
      `Open deze link om een nieuw wachtwoord in te stellen (1 uur geldig):\n${url}\n\n` +
      `Heb je dit niet aangevraagd? Dan kun je deze e-mail negeren.\n`,
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
  const carrier = order.trackingCarrier ?? "PostNL";
  const rows: [string, string][] = [["Bestelnummer", order.number], ["Vervoerder", carrier]];
  if (order.trackingNumber) rows.push(["Trackingnummer", order.trackingNumber]);

  return sendEmail({
    to: order.customerEmail,
    subject: `Je bestelling ${order.number} is verzonden`,
    html: layout({
      heading: "Onderweg!",
      preheader: `Bestelling ${order.number} is verzonden met ${carrier}.`,
      body:
        para(`Hi ${esc(order.customerName)}, je bestelling is zojuist verzonden met ${esc(carrier)}.`) +
        facts(rows) +
        para("Het kan even duren voordat de track &amp; trace actief is bij de vervoerder.") +
        button("Bekijk je bestelling", `${siteUrl()}/account/orders`),
    }),
    text:
      `Onderweg!\n\nHi ${order.customerName}, je bestelling ${order.number} is verzonden met ${carrier}.\n` +
      (order.trackingNumber ? `Trackingnummer: ${order.trackingNumber}\n` : "") +
      `\n${siteUrl()}/account/orders\n`,
  });
}

/** Notify a partner/store when a new product is added (B2B announce). */
export async function sendNewProductAnnounce(
  partnerEmails: string[],
  product: { name: string; slug: string },
) {
  if (partnerEmails.length === 0) return { stub: true };
  const url = `${siteUrl()}/products/${product.slug}`;
  return sendEmail({
    to: partnerEmails,
    subject: `Nieuw in het assortiment: ${product.name}`,
    html: layout({
      heading: "Nieuw beschikbaar voor partners",
      preheader: `${product.name} is toegevoegd aan het assortiment.`,
      body:
        para(`<strong>${esc(product.name)}</strong> is toegevoegd aan het assortiment.`) +
        para("Log in op het partnerportaal voor jouw nettoprijzen en staffelkortingen.") +
        button("Bekijk product", url),
    }),
    text:
      `Nieuw beschikbaar voor partners\n\n${product.name} is toegevoegd aan het assortiment.\n` +
      `Log in voor jouw partnerprijzen.\n\n${url}\n`,
  });
}
