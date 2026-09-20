"use client";

import { useRef, useState } from "react";

/**
 * Manages a product's image list. Add images by URL or by uploading a file
 * (POST /api/uploads). First image = primary (shown on cards/detail).
 * Controlled: parent passes value + onChange.
 */
export function ImageManager({
  value,
  onChange,
}: {
  value: string[];
  onChange: (images: string[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function addUrl() {
    const u = urlInput.trim();
    if (!u) return;
    if (value.includes(u)) {
      setUrlInput("");
      return;
    }
    onChange([...value, u]);
    setUrlInput("");
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    const added: string[] = [];
    for (const file of Array.from(files)) {
      const fd = new FormData();
      fd.append("file", file);
      try {
        const res = await fetch("/api/uploads", { method: "POST", body: fd });
        const data = await res.json();
        if (res.ok && data.url) added.push(data.url);
        else setError(data.error || "Upload mislukt");
      } catch {
        setError("Upload mislukt");
      }
    }
    setUploading(false);
    if (added.length) onChange([...value, ...added]);
    if (fileRef.current) fileRef.current.value = "";
  }

  function remove(url: string) {
    onChange(value.filter((v) => v !== url));
  }

  function makePrimary(url: string) {
    onChange([url, ...value.filter((v) => v !== url)]);
  }

  return (
    <div>
      <label className="label">Productfoto&apos;s</label>

      {value.length > 0 && (
        <ul className="mb-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
          {value.map((url, i) => (
            <li key={url} className="group relative overflow-hidden rounded-lg border border-navy/10 bg-navy-800">
              <div className="aspect-square">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={url} alt="" className="h-full w-full object-cover" />
              </div>
              {i === 0 && (
                <span className="absolute left-1 top-1 rounded bg-gold px-1.5 py-0.5 text-[10px] font-bold text-navy">
                  Hoofdfoto
                </span>
              )}
              <div className="absolute inset-x-0 bottom-0 flex justify-between gap-1 bg-navy/70 p-1 opacity-0 transition group-hover:opacity-100">
                {i !== 0 && (
                  <button
                    type="button"
                    onClick={() => makePrimary(url)}
                    className="text-[10px] font-semibold text-cream hover:text-gold"
                  >
                    ★ hoofdfoto
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove(url)}
                  className="ml-auto text-[10px] font-semibold text-cream hover:text-red-400"
                >
                  ✕ verwijder
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Upload from device */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
          multiple
          onChange={(e) => onFiles(e.target.files)}
          className="text-sm file:mr-3 file:rounded-full file:border-0 file:bg-navy file:px-4 file:py-2 file:text-sm file:font-semibold file:text-cream hover:file:bg-navy-700"
        />
        {uploading && <span className="text-sm text-navy/50">Uploaden…</span>}
      </div>

      {/* Add by URL */}
      <div className="mt-3 flex gap-2">
        <input
          type="url"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addUrl();
            }
          }}
          placeholder="…of plak een afbeeldings-URL"
          className="input flex-1"
        />
        <button type="button" onClick={addUrl} className="btn-outline whitespace-nowrap">
          URL toevoegen
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <p className="mt-2 text-xs text-navy/40">
        Eerste foto is de hoofdfoto. JPG, PNG, WEBP, GIF of AVIF — max 8 MB per bestand.
      </p>
    </div>
  );
}
