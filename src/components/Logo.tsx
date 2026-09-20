import { cn } from "@/lib/utils";

/**
 * V&V Collectibles brand mark, recreated as SVG from the supplied logo:
 * a thin gold ring containing a faceted gem (diamond top + chevron gem body),
 * with the "V&V" / "COLLECTIBLES" wordmark.
 *
 * Drop a raster/vector original into /public/logo.svg to override if desired.
 */

export function VVMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" className={className} role="img" aria-label="V&V Collectibles">
      <defs>
        <linearGradient id="vvGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f1d27a" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#a9821f" />
        </linearGradient>
      </defs>
      <g fill="none" stroke="url(#vvGold)" strokeWidth="3" strokeLinejoin="round">
        {/* outer ring */}
        <circle cx="100" cy="100" r="72" strokeWidth="2" opacity="0.85" />
        {/* diamond top */}
        <path d="M100 48 L138 86 L100 100 L62 86 Z" />
        {/* gem body / chevron */}
        <path d="M62 86 L100 152 L138 86" />
        <path d="M100 100 L100 152" />
      </g>
    </svg>
  );
}

export function VVLogo({
  className,
  variant = "light",
  showTagline = true,
}: {
  className?: string;
  /** "light" = cream text on dark bg, "dark" = navy text on light bg */
  variant?: "light" | "dark";
  showTagline?: boolean;
}) {
  const vColor = variant === "light" ? "#f3efe6" : "#0c1424";
  const tagColor = variant === "light" ? "#8a93a6" : "#6b7280";
  return (
    <span className={cn("inline-flex items-center gap-3", className)}>
      <VVMark className="h-10 w-10 shrink-0" />
      <span className="flex flex-col leading-none">
        <span className="flex items-baseline text-2xl font-extrabold tracking-tight">
          <span style={{ color: vColor }}>V</span>
          <span style={{ color: "#d4af37" }} className="px-[1px]">
            &amp;
          </span>
          <span style={{ color: vColor }}>V</span>
        </span>
        {showTagline && (
          <span
            className="mt-1 text-[10px] font-medium tracking-[0.35em]"
            style={{ color: tagColor }}
          >
            COLLECTIBLES
          </span>
        )}
      </span>
    </span>
  );
}
