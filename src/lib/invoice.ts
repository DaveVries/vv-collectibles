import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { nextInvoiceNumber } from "@/lib/numbering";
import { formatMoney, formatDate } from "@/lib/utils";
import type { Order, OrderItem, Invoice } from "@prisma/client";

const INVOICE_DIR = path.join(process.cwd(), "public", "invoices");

// Company / legal details printed on every invoice. Edit to match KvK/BTW.
const COMPANY = {
  name: "V&V Collectibles",
  addressLines: ["Voorbeeldstraat 1", "1234 AB Amsterdam", "Nederland"],
  email: "orders@vvcollectibles.nl",
  kvk: "KvK: 00000000",
  btw: "BTW: NL000000000B00",
  iban: "IBAN: NL00 BANK 0000 0000 00",
};

function ensureDir() {
  if (!fs.existsSync(INVOICE_DIR)) fs.mkdirSync(INVOICE_DIR, { recursive: true });
}

type OrderWithItems = Order & { items: OrderItem[] };

/** Render the PDF for an invoice number + order to disk; returns the relative path. */
function renderPdf(invoiceNumber: string, order: OrderWithItems): Promise<string> {
  ensureDir();
  const fileName = `${invoiceNumber}.pdf`;
  const filePath = path.join(INVOICE_DIR, fileName);

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const gold = "#a9821f";
    const navy = "#0c1424";

    // Header
    doc.fillColor(navy).fontSize(22).text(COMPANY.name, 50, 50);
    doc.fillColor(gold).fontSize(10).text("COLLECTIBLES", { characterSpacing: 3 });
    doc.moveDown(0.5);
    doc.fillColor("#444").fontSize(9);
    COMPANY.addressLines.forEach((l) => doc.text(l));
    doc.text(COMPANY.email);

    // Invoice meta (right aligned)
    doc.fillColor(navy).fontSize(18).text("FACTUUR", 400, 50, { align: "right" });
    doc.fillColor("#444").fontSize(10);
    doc.text(`Factuurnr: ${invoiceNumber}`, 400, 80, { align: "right" });
    doc.text(`Datum: ${formatDate(new Date())}`, { align: "right" });
    doc.text(`Bestelling: ${order.number}`, { align: "right" });

    // Bill to
    doc.moveDown(3);
    doc.fillColor(navy).fontSize(11).text("Factuuradres", 50, 160);
    doc.fillColor("#444").fontSize(10);
    doc.text(order.customerName);
    doc.text(`${order.shipStreet} ${order.shipHouseNr}`);
    doc.text(`${order.shipZip} ${order.shipCity}`);
    doc.text(order.shipCountry);
    doc.text(order.customerEmail);

    // Table header
    let y = 250;
    doc.fillColor(navy).fontSize(10);
    doc.text("Omschrijving", 50, y);
    doc.text("Aantal", 330, y, { width: 50, align: "right" });
    doc.text("Stukprijs", 390, y, { width: 70, align: "right" });
    doc.text("Totaal", 470, y, { width: 80, align: "right" });
    y += 16;
    doc.moveTo(50, y).lineTo(550, y).strokeColor("#ddd").stroke();
    y += 8;

    // Rows
    doc.fillColor("#222").fontSize(10);
    for (const item of order.items) {
      const lineTotal = item.unitPriceCents * item.quantity;
      const desc = item.isPreorder ? `${item.name}  (pre-order)` : item.name;
      doc.text(desc, 50, y, { width: 270 });
      doc.text(String(item.quantity), 330, y, { width: 50, align: "right" });
      doc.text(formatMoney(item.unitPriceCents, order.currency), 390, y, { width: 70, align: "right" });
      doc.text(formatMoney(lineTotal, order.currency), 470, y, { width: 80, align: "right" });
      const lines = Math.ceil(desc.length / 45);
      y += 18 * Math.max(1, lines);
      if (item.isPreorder && item.expectedDelivery) {
        doc.fillColor("#999").fontSize(8).text(`Verwachte levering: ${item.expectedDelivery}`, 50, y, { width: 270 });
        doc.fillColor("#222").fontSize(10);
        y += 12;
      }
    }

    // Totals
    y += 6;
    doc.moveTo(330, y).lineTo(550, y).strokeColor("#ddd").stroke();
    y += 10;
    const vatRate = 21;
    const totalIncl = order.totalCents;
    const net = Math.round(totalIncl / (1 + vatRate / 100));
    const vat = totalIncl - net;

    const totalRow = (label: string, value: string, bold = false) => {
      doc.fillColor(bold ? navy : "#444").fontSize(bold ? 12 : 10);
      doc.text(label, 330, y, { width: 100, align: "right" });
      doc.text(value, 440, y, { width: 110, align: "right" });
      y += bold ? 20 : 16;
    };
    totalRow("Subtotaal", formatMoney(order.subtotalCents, order.currency));
    totalRow("Verzending", formatMoney(order.shippingCents, order.currency));
    totalRow(`Waarvan BTW (${vatRate}%)`, formatMoney(vat, order.currency));
    totalRow("Totaal", formatMoney(totalIncl, order.currency), true);

    // Footer
    doc.fillColor("#888").fontSize(8);
    doc.text(`${COMPANY.kvk}   ${COMPANY.btw}   ${COMPANY.iban}`, 50, 770, {
      align: "center",
      width: 500,
    });

    doc.end();
    stream.on("finish", () => resolve(`/invoices/${fileName}`));
    stream.on("error", reject);
  });
}

/**
 * Create (or return existing) invoice for an order, rendering the PDF.
 * Idempotent: a second call returns the existing invoice.
 */
export async function ensureInvoiceForOrder(orderId: string): Promise<Invoice> {
  const existing = await prisma.invoice.findUnique({ where: { orderId } });
  if (existing?.pdfPath) return existing;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Order not found");

  const number = existing?.number ?? (await nextInvoiceNumber());
  const pdfPath = await renderPdf(number, order);

  return prisma.invoice.upsert({
    where: { orderId },
    update: { pdfPath },
    create: {
      number,
      orderId,
      totalCents: order.totalCents,
      currency: order.currency,
      pdfPath,
    },
  });
}

/**
 * Return the invoice PDF bytes for an order, generating the invoice and/or
 * re-rendering the file if it's missing. Robust in production where files
 * written to /public at runtime aren't served as static assets.
 */
export async function getInvoicePdf(
  orderId: string,
): Promise<{ buffer: Buffer; number: string } | null> {
  const invoice = await ensureInvoiceForOrder(orderId);
  const fileName = `${invoice.number}.pdf`;
  const filePath = path.join(INVOICE_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    // File gone (e.g. ephemeral disk on a fresh deploy) — re-render it.
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return null;
    await renderPdf(invoice.number, order);
  }

  return { buffer: fs.readFileSync(filePath), number: invoice.number };
}
