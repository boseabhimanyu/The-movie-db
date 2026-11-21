"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
  itemsPerStep?: number;
};

export default function MediaRail({
  title,
  subtitle,
  icon,
  viewAllHref,
  items,
  emptyLabel,
  itemsPerStep = 2,
}: MediaRailProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const isDraggingRef = useRef(false);

  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const updateScrollState = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(maxScroll - el.scrollLeft > 8);
    setScrollProgress(
      maxScroll > 0 ? Math.min(1, Math.max(0, el.scrollLeft / maxScroll)) : 0,
    );
  }, []);

  useEffect(() => {
    updateScrollState();
    window.addEventListener("resize", updateScrollState);
    return () => window.removeEventListener("resize", updateScrollState);
  }, [items, updateScrollState]);

  function scrollByCards(direction: "left" | "right") {
    const el = scrollerRef.current;
    if (!el) return;

    const firstCard = el.firstElementChild as HTMLElement | null;
    const cardStep = firstCard ? firstCard.offsetWidth + 16 : 208;
    const distance = cardStep * itemsPerStep;

    el.scrollBy({
      left: direction === "left" ? -distance : distance,
      behavior: "smooth",
    });
  }

  function scrubToClientX(clientX: number, smooth: boolean) {
    const scroller = scrollerRef.current;
    const track = trackRef.current;
    if (!scroller || !track) return;

    const rect = track.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    const maxScroll = scroller.scrollWidth - scroller.clientWidth;

    scroller.scrollTo({
      left: ratio * maxScroll,
      behavior: smooth ? "smooth" : "auto",
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

        <Link
          href={viewAllHref}
          className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-400/40 hover:text-amber-300"
        >
          View all →
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-zinc-900/40 px-5 py-8 text-sm text-zinc-400">
          <Info className="h-4 w-4 shrink-0 text-zinc-500" />
          <span>{emptyLabel}</span>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => scrollByCards("left")}
              disabled={!canScrollLeft}
              aria-label={`Scroll ${title} left`}
              className={`mb-10 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border transition duration-200 sm:flex ${
                canScrollLeft
                  ? "border-white/15 bg-zinc-900 text-zinc-100 shadow-lg hover:border-amber-400/60 hover:bg-zinc-800 hover:text-amber-300"
                  : "cursor-not-allowed border-white/5 bg-zinc-900/30 text-zinc-600"
              }`}
            >
              <ChevronLeft className="h-5 w-5" />
            </button>

            <div
              ref={scrollerRef}
              onScroll={updateScrollState}
              className="flex min-w-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto pt-1 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
            >
              {items.map((item) => (
                <PosterCard key={`${item.type}-${item.id}`} item={item} />
              ))}
            </div>

            <button
              type="button"
              onClick={() => scrollByCards("right")}
              disabled={!canScrollRight}
              aria-label={`Scroll ${title} right`}
              className={`mb-10 hidden h-10 w-10 shrink-0 items-center justify-center rounded-full border transition duration-200 sm:flex ${
                canScrollRight
                  ? "border-white/15 bg-zinc-900 text-zinc-100 shadow-lg hover:border-amber-400/60 hover:bg-zinc-800 hover:text-amber-300"
                  : "cursor-not-allowed border-white/5 bg-zinc-900/30 text-zinc-600"
              }`}
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>

          {/* Interactive Clickable & Draggable Progress Bar */}
          {(canScrollLeft || canScrollRight) && (
            <div className="flex items-center justify-center">
              <div
                ref={trackRef}
                role="slider"
                tabIndex={0}
                aria-label={`${title} scroll position`}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(scrollProgress * 100)}
                onPointerDown={(e) => {
                  isDraggingRef.current = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  scrubToClientX(e.clientX, true);
                }}
                onPointerMove={(e) => {
                  if (!isDraggingRef.current) return;
                  scrubToClientX(e.clientX, false);
                }}
                onPointerUp={(e) => {
                  if (!isDraggingRef.current) return;
                  isDraggingRef.current = false;
                  e.currentTarget.releasePointerCapture(e.pointerId);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowLeft") scrollByCards("left");
                  if (e.key === "ArrowRight") scrollByCards("right");
                }}
                className="group/bar flex h-5 w-44 cursor-pointer touch-none items-center select-none"
              >
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10 transition-all group-hover/bar:h-2 group-hover/bar:bg-white/20">
                  <div
                    className="h-full rounded-full bg-amber-400/80 transition-colors group-hover/bar:bg-amber-400"
                    style={{
                      width: "35%",
                      transform: `translateX(${scrollProgress * 185}%)`,
                    }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}