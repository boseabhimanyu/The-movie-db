"use client";

import Link from "next/link";
import { useRef } from "react";
import { ChevronLeft, ChevronRight, Info } from "lucide-react";
import PosterCard from "./PosterCard";
import type { MediaItem } from "./media-types";

type MediaRailProps = {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  viewAllHref: string;
  items: MediaItem[];
  emptyLabel: string;
};

export default function MediaRail({
  title,
  subtitle,
  icon,
  viewAllHref,
  items,
  emptyLabel,
}: MediaRailProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  function scrollByAmount(direction: "left" | "right") {
    const el = scrollerRef.current;
    if (!el) return;
    const distance = Math.max(el.clientWidth * 0.78, 320);
    el.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  }

  return (
    <section className="space-y-4">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {icon}
            <h2 className="text-xl font-bold tracking-tight text-white sm:text-2xl">
              {title}
            </h2>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400 sm:text-sm">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          {items.length > 0 && (
            <div className="hidden items-center gap-1.5 sm:flex">
              <button
                type="button"
                onClick={() => scrollByAmount("left")}
                aria-label={`Scroll ${title} left`}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 text-zinc-300 transition hover:border-amber-400/40 hover:text-white"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => scrollByAmount("right")}
                aria-label={`Scroll ${title} right`}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 text-zinc-300 transition hover:border-amber-400/40 hover:text-white"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          <Link
            href={viewAllHref}
            className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-400/40 hover:text-amber-300"
          >
            View all →
          </Link>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 px-5 py-8 text-sm text-zinc-400">
          <Info className="h-4 w-4 shrink-0 text-zinc-500" />
          <span>{emptyLabel}</span>
        </div>
      ) : (
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto pb-2"
        >
          {items.map((item) => (
            <PosterCard key={`${item.type}-${item.id}`} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}