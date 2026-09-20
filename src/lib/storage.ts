import fs from "fs";
import path from "path";
import { put } from "@vercel/blob";

/**
 * File storage for generated invoices and admin image uploads.
 *
 * Two backends, chosen by whether BLOB_READ_WRITE_TOKEN is set:
 *
 *   - **Vercel Blob** (token present) — used in production. Vercel's
 *     serverless filesystem is read-only apart from /tmp, which is wiped
 *     between invocations, so anything written to public/ at runtime is lost
 *     and never served.
 *   - **Local disk under public/** (no token) — used in development, where
 *     writing to public/ works and Next serves it as a static asset.
 *
 * Callers store whatever `putFile` returns and hand it back to `getFile`
 * later; it is a blob URL in the first case and a /public path in the second.
 */

const PUBLIC_DIR = path.join(process.cwd(), "public");

/** True when Vercel Blob is configured; otherwise we fall back to local disk. */
export function isBlobStorage(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

/**
 * Stores a file and returns the reference to persist.
 *
 * `key` is a storage-relative path such as "invoices/INV-2026-0001.pdf".
 */
export async function putFile(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<string> {
  if (isBlobStorage()) {
    const blob = await put(key, body, {
      access: "public",
      contentType,
      // Keep our own key rather than a randomised one, so an invoice number
      // maps to a predictable object.
      addRandomSuffix: false,
      // Re-rendering an invoice must not fail on an existing object.
      allowOverwrite: true,
    });
    return blob.url;
  }

  const filePath = path.join(PUBLIC_DIR, key);
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, body);
  return `/${key}`;
}

/**
 * Reads a file back from whatever `putFile` returned.
 * Returns null when it is missing, rather than throwing — callers that can
 * regenerate the content treat null as "regenerate".
 */
export async function getFile(ref: string): Promise<Buffer | null> {
  if (/^https?:\/\//i.test(ref)) {
    try {
      const res = await fetch(ref, { cache: "no-store" });
      if (!res.ok) return null;
      return Buffer.from(await res.arrayBuffer());
    } catch {
      return null;
    }
  }

  const filePath = path.join(PUBLIC_DIR, ref.replace(/^\//, ""));
  try {
    return await fs.promises.readFile(filePath);
  } catch {
    return null;
  }
}
