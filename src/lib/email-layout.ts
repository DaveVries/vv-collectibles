import { siteUrl } from "@/lib/site";

/**
 * Branded HTML email layout.
 *
 * Email clients are not browsers: Gmail strips <style> blocks and SVG,
 * Outlook renders through Word and ignores flexbox, grid and most modern
 * CSS. So everything here is tables with inline styles, the brand mark is
 * styled text rather than the site's SVG, and the button is a table cell
 * rather than a styled <a>.
 *
 * Palette matches tailwind.config.ts.
 */
const NAVY = "#0c1424";
const NAVY_SOFT = "#1c2942";
const GOLD = "#d4af37";
const GOLD_DARK = "#a9821f";
const CREAM = "#f3efe6";
const BORDER = "#e3ddd0";
const MUTED = "#6b7280";

/** Email clients render user content as markup, so never interpolate raw. */
export function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

/** A paragraph of body copy. */
export function p(html: string): string {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.6;color:${NAVY};">${html}</p>`;
}

/** Bulletproof call-to-action button. */
export function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr><td align="center" bgcolor="${GOLD}" style="border-radius:8px;">
    <a href="${esc(url)}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:700;color:${NAVY};text-decoration:none;border-radius:8px;">${esc(label)}</a>
  </td></tr>
</table>`;
}

/** Highlighted note. `tone` picks the accent: a warning or a neutral aside. */
export function note(html: string, tone: "warn" | "info" = "info"): string {
  const accent = tone === "warn" ? "#b91c1c" : GOLD_DARK;
  const bg = tone === "warn" ? "#fef6f6" : "#faf7ef";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;">
  <tr><td style="border-left:3px solid ${accent};background:${bg};padding:14px 16px;border-radius:0 6px 6px 0;font-family:${FONT};font-size:15px;line-height:1.55;color:${NAVY};">${html}</td></tr>
</table>`;
}

/** Label/value rows, e.g. order number and tracking code. */
export function facts(rows: [string, string][]): string {
  const body = rows
    .map(
      ([label, value]) =>
        `<tr>
  <td style="padding:8px 0;font-family:${FONT};font-size:14px;color:${MUTED};white-space:nowrap;">${esc(label)}</td>
  <td style="padding:8px 0 8px 20px;font-family:${FONT};font-size:15px;font-weight:700;color:${NAVY};">${esc(value)}</td>
</tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border-top:1px solid ${BORDER};border-bottom:1px solid ${BORDER};width:100%;">${body}</table>`;
}

/**
 * Wraps body content in the branded shell.
 *
 * `preheader` is the snippet inboxes show beside the subject. Without one,
 * clients grab whatever text comes first, which is usually the wordmark.
 */
export function layout(opts: { heading: string; preheader: string; body: string }): string {
  const site = siteUrl();
  return `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="nl">
<head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="color-scheme" content="light only" />
<meta name="supported-color-schemes" content="light only" />
<title>${esc(opts.heading)}</title>
</head>
<body style="margin:0;padding:0;background:${CREAM};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${CREAM};padding:32px 16px;">
<tr><td align="center">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">

    <tr><td align="center" bgcolor="${NAVY}" style="padding:28px 24px;border-radius:12px 12px 0 0;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:700;letter-spacing:1px;color:${GOLD};">V&amp;V</div>
      <div style="margin-top:4px;font-family:${FONT};font-size:11px;letter-spacing:4px;color:${CREAM};">COLLECTIBLES</div>
    </td></tr>

    <tr><td bgcolor="#ffffff" style="padding:32px 32px 8px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};">
      <h1 style="margin:0 0 20px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;color:${NAVY};">${esc(opts.heading)}</h1>
      ${opts.body}
    </td></tr>

    <tr><td bgcolor="#ffffff" style="padding:0 32px 32px;border-left:1px solid ${BORDER};border-right:1px solid ${BORDER};border-bottom:1px solid ${BORDER};border-radius:0 0 12px 12px;">
      <div style="border-top:1px solid ${BORDER};padding-top:20px;font-family:${FONT};font-size:13px;line-height:1.6;color:${MUTED};">
        <a href="${esc(site)}" style="color:${GOLD_DARK};text-decoration:none;font-weight:600;">vvcollectibles.com</a>
        &nbsp;·&nbsp; Sealed collectibles &amp; pre-orders
      </div>
    </td></tr>

    <tr><td align="center" style="padding:20px 24px;font-family:${FONT};font-size:12px;line-height:1.6;color:${NAVY_SOFT};opacity:0.7;">
      Je ontvangt deze e-mail omdat je een account of bestelling hebt bij V&amp;V Collectibles.
    </td></tr>

  </table>
</td></tr>
</table>
</body>
</html>`;
}
