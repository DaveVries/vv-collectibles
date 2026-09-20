import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/lib/auth";
import { putFile } from "@/lib/storage";

/**
 * Admin image upload. Stores via lib/storage — Vercel Blob in production,
 * local public/uploads in development — and returns the public URL.
 */
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB
const EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

export async function POST(req: Request) {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "STAFF") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Geen bestand ontvangen" }, { status: 400 });
  }

  const ext = EXT[file.type];
  if (!ext) {
    return NextResponse.json(
      { error: "Ongeldig bestandstype (alleen JPG, PNG, WEBP, GIF, AVIF)" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Bestand te groot (max 8 MB)" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const url = await putFile(`uploads/${randomUUID()}.${ext}`, buffer, file.type);
    return NextResponse.json({ url });
  } catch (e) {
    console.error("upload error", e);
    return NextResponse.json(
      { error: "Uploaden mislukt. Probeer het opnieuw." },
      { status: 500 },
    );
  }
}
