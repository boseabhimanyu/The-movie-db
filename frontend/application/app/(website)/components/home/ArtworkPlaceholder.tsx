import { Clapperboard, Film, ImageOff, Tv } from "lucide-react";
import type { MediaType } from "./media-types";

type ArtworkPlaceholderProps = {
  title: string;
  type?: MediaType;
  year?: number;
  variant?: "poster" | "backdrop";
};

export default function ArtworkPlaceholder({
  title,
  type = "movie",
  year,
  variant = "poster",
}: ArtworkPlaceholderProps) {
  const TypeIcon = type === "show" ? Tv : Clapperboard;

  if (variant === "backdrop") {
    return (
      <div className="relative h-full w-full overflow-hidden bg-zinc-950 select-none">
        {/* Ambient Cinema Glow */}
        <div className="absolute -top-28 right-12 h-[28rem] w-[28rem] rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-80 w-80 rounded-full bg-zinc-800/40 blur-3xl" />

        {/* Subtle Architectural Grid + Diagonal Film Pattern */}
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff14_1px,transparent_1px)] [background-size:24px_24px] opacity-60" />
        <div className="absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.025)_0px,rgba(255,255,255,0.025)_1px,transparent_1px,transparent_18px)]" />

        {/* Right-Side Decorative Watermark & Status Pill (desktop) */}
        <div className="pointer-events-none absolute top-1/2 right-12 hidden -translate-y-1/2 flex-col items-center gap-3 rounded-3xl border border-white/10 bg-zinc-900/55 px-8 py-7 text-center backdrop-blur-md lg:flex">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-amber-400/20 bg-amber-400/10 text-amber-300/80">
            <Film className="h-7 w-7" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold tracking-wider text-zinc-300 uppercase">
              No Backdrop Artwork
            </p>
            <p className="text-[11px] text-zinc-500">
              Preview imagery unavailable for this title
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 p-3.5 text-center select-none">
      {/* Subtle Dot-Matrix & Diagonal Strip Pattern */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(#ffffff18_1px,transparent_1px)] [background-size:16px_16px] opacity-50" />
      <div className="pointer-events-none absolute inset-0 bg-[repeating-linear-gradient(135deg,rgba(255,255,255,0.02)_0px,rgba(255,255,255,0.02)_1px,transparent_1px,transparent_14px)]" />
      <div className="pointer-events-none absolute -top-10 -right-10 h-28 w-28 rounded-full bg-amber-400/10 blur-2xl" />

      {/* Top Status Badge */}
      <div className="relative flex items-center justify-between gap-1">
        <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-zinc-950/80 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-zinc-400 uppercase">
          <ImageOff className="h-2.5 w-2.5 text-amber-400/80" />
          No Poster
        </span>
      </div>

      {/* Center Emblem & Title */}
      <div className="relative my-auto flex flex-col items-center gap-2.5 px-1">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-zinc-400 shadow-inner">
          <TypeIcon className="h-5 w-5 text-amber-400/75" />
        </div>

        <p className="line-clamp-3 text-xs leading-snug font-semibold text-zinc-200">
          {title}
        </p>
      </div>

      {/* Bottom Footer Note */}
      <div className="relative border-t border-white/10 pt-2">
        <p className="text-[10px] font-medium tracking-wider text-zinc-500 uppercase">
          {year ? `${year} • ` : ""}Artwork Unavailable
        </p>
      </div>
    </div>
  );
}