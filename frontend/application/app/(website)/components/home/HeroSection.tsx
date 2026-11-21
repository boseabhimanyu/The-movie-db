"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Bookmark,
  ChevronLeft,
  ChevronRight,
  Flame,
  Play,
  Sparkles,
  Star,
} from "lucide-react";
import type { MediaItem } from "./media-types";
import ArtworkPlaceholder from "./ArtworkPlaceholder";

type HeroSectionProps = {
  trendingMovies: MediaItem[];
  trendingShows: MediaItem[];
  popularMovies: MediaItem[];
  targetCount?: number;
};

function buildHeroPool(
  trendingMovies: MediaItem[],
  trendingShows: MediaItem[],
  popularMovies: MediaItem[],
  targetCount: number,
): MediaItem[] {
  const seen = new Set<string>();
  const pool: MediaItem[] = [];

  const pushUnique = (list: MediaItem[], maxToTake: number) => {
    let taken = 0;
    for (const item of list) {
      const key = `${item.type}-${item.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(item);
      taken++;
      if (taken >= maxToTake || pool.length >= targetCount) break;
    }
  };

  pushUnique(trendingMovies, 3);
  pushUnique(trendingShows, 2);
  if (pool.length < targetCount) pushUnique(trendingMovies, targetCount);
  if (pool.length < targetCount) pushUnique(trendingShows, targetCount);
  if (pool.length < targetCount) pushUnique(popularMovies, targetCount);

  return pool.slice(0, targetCount);
}

export default function HeroSection({
  trendingMovies,
  trendingShows,
  popularMovies,
  targetCount = 5,
}: HeroSectionProps) {
  const items = useMemo(
    () =>
      buildHeroPool(trendingMovies, trendingShows, popularMovies, targetCount),
    [trendingMovies, trendingShows, popularMovies, targetCount],
  );

  const [activeIndex, setActiveIndex] = useState(0);
  const [loadedLogos, setLoadedLogos] = useState<Record<string, boolean>>({});
  const [failedLogos, setFailedLogos] = useState<Record<string, boolean>>({});
  const [failedBgs, setFailedBgs] = useState<Record<string, boolean>>({});

  const poolSignature = useMemo(
    () => items.map((item) => `${item.type}-${item.id}`).join("|"),
    [items],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [poolSignature]);

  const safeIndex = items.length > 0 ? activeIndex % items.length : 0;
  const featured = items[safeIndex];

  if (!featured) {
    return (
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-300">
              <Sparkles className="h-3.5 w-3.5" />
              CineVault Discovery
            </span>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              Curated Cinema &amp; Series, Across Every Region.
            </h1>
            <p className="text-sm leading-relaxed text-zinc-400 sm:text-base">
              Browse trending films and television shows, filter by country or
              genre, and build your personal watchlist.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const goPrev = () => {
    setActiveIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goNext = () => {
    setActiveIndex((prev) => (prev + 1) % items.length);
  };

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      {/* 1. Persistent Backdrop Stack: All 5 backdrops mounted once for 0ms crossfading */}
      <div className="absolute inset-0 bg-zinc-950">
        {items.map((item, idx) => {
          const rawBg = item.backdropUrl || item.posterUrl;
          const bg = rawBg && !failedBgs[rawBg] ? rawBg : undefined;
          const isActive = idx === safeIndex;

          return (
            <div
              key={`${item.type}-${item.id}`}
              aria-hidden={!isActive}
              className={`absolute inset-0 transition-opacity duration-500 ${
                isActive ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              {bg ? (
                <img
                  src={bg}
                  alt={item.title}
                  fetchPriority={idx === 0 ? "high" : "low"}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={() =>
                    setFailedBgs((prev) =>
                      prev[bg] ? prev : { ...prev, [bg]: true },
                    )
                  }
                  className="h-full w-full object-cover object-center opacity-80"
                />
              ) : (
                <ArtworkPlaceholder
                  title={item.title}
                  type={item.type}
                  year={item.year}
                  variant="backdrop"
                />
              )}
            </div>
          );
        })}

        {/* Edge-only vignettes keep artwork vivid while preserving left/bottom legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-zinc-950/90 via-zinc-950/35 to-transparent" />
      </div>

      {/* 2. Fixed-Rhythm Hero Content Container (prevents vertical shift across slides) */}
      <div className="relative mx-auto flex h-[500px] max-w-7xl flex-col justify-end px-4 pt-12 pb-10 sm:h-[540px] sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          {/* Locked single-line Metadata Row (never wraps or pushes layout vertically) */}
          <div className="flex h-8 items-center gap-2 overflow-hidden whitespace-nowrap text-xs font-medium">
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/15 px-3 py-1 text-amber-300">
              <Flame className="h-3.5 w-3.5" />
              Trending {featured.type === "movie" ? "Film" : "Series"}
            </span>

            {featured.rating && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-white/15 bg-zinc-900/80 px-3 py-1 text-zinc-200 backdrop-blur-md">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {featured.rating}
              </span>
            )}

            {featured.year && (
              <span className="shrink-0 rounded-full border border-white/10 bg-zinc-900/70 px-3 py-1 text-zinc-300">
                {featured.year}
              </span>
            )}

            {featured.certification && (
              <span className="shrink-0 rounded-full border border-white/15 bg-zinc-900/70 px-2.5 py-1 text-[11px] font-semibold text-zinc-300">
                {featured.certification}
              </span>
            )}

            {featured.genres.slice(0, 2).map((genre) => (
              <span
                key={genre}
                className="hidden shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-zinc-300 capitalize sm:inline-block"
              >
                {genre}
              </span>
            ))}
          </div>

          {/* 3. Pre-mounted ClearLogo / Title Stack (fixed height + zero stale slide 1 logo) */}
          <div className="relative mt-4 h-28 sm:h-32">
            {items.map((item, idx) => {
              const isActive = idx === safeIndex;
              const logoUrl = item.logoUrl;
              const canShowLogo = Boolean(logoUrl && !failedLogos[logoUrl]);
              const isLogoReady = Boolean(logoUrl && loadedLogos[logoUrl]);

              return (
                <div
                  key={`logo-${item.type}-${item.id}`}
                  aria-hidden={!isActive}
                  className={`absolute inset-0 flex flex-col justify-end transition-opacity duration-200 ${
                    isActive ? "opacity-100" : "pointer-events-none opacity-0"
                  }`}
                >
                  {/* Keep text title visible until clearlogo PNG finishes loading (or when no logo exists) */}
                  {(!canShowLogo || !isLogoReady) && (
                    <h1 className="line-clamp-2 text-3xl leading-tight font-bold tracking-tight text-white sm:text-5xl">
                      {item.title}
                    </h1>
                  )}

                  {canShowLogo && logoUrl && (
                    <img
                      src={logoUrl}
                      alt={item.title}
                      decoding="async"
                      referrerPolicy="no-referrer"
                      onLoad={() =>
                        setLoadedLogos((prev) =>
                          prev[logoUrl] ? prev : { ...prev, [logoUrl]: true },
                        )
                      }
                      onError={() =>
                        setFailedLogos((prev) =>
                          prev[logoUrl] ? prev : { ...prev, [logoUrl]: true },
                        )
                      }
                      className={`max-h-24 w-auto max-w-full object-contain object-left drop-shadow-2xl sm:max-h-28 ${
                        isLogoReady ? "block" : "sr-only"
                      }`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Locked Tagline Slot (always reserves 1 line so layout stays anchored) */}
          <div className="mt-2 h-5">
            {featured.tagline && (
              <p className="truncate text-xs font-medium tracking-wide text-amber-300/90 uppercase">
                {featured.tagline}
              </p>
            )}
          </div>

          {/* Locked 3-Line Synopsis Slot */}
          <div className="mt-2.5 h-[4.5rem]">
            {featured.overview && (
              <p className="line-clamp-3 max-w-xl text-sm leading-relaxed text-zinc-300 sm:text-base">
                {featured.overview}
              </p>
            )}
          </div>

          {/* Primary Hero CTAs */}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <Link
              href={`/${featured.type === "movie" ? "movies" : "shows"}/${featured.slug}`}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-amber-400 px-6 text-sm font-semibold text-zinc-950 shadow-lg shadow-amber-500/20 transition hover:bg-amber-300"
            >
              <Play className="h-4 w-4 fill-zinc-950" />
              Explore Details
            </Link>

            <Link
              href="/bookmarks"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/15 bg-zinc-900/80 px-5 text-sm font-medium text-white backdrop-blur-md transition hover:border-white/30 hover:bg-zinc-800/90"
            >
              <Bookmark className="h-4 w-4 text-amber-400" />
              My Watchlist
            </Link>
          </div>
        </div>

        {/* Bottom Controls: Slide Dots + Prev/Next Buttons */}
        {items.length > 1 && (
          <div className="mt-7 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {items.map((item, idx) => (
                <button
                  key={`dot-${item.type}-${item.id}`}
                  type="button"
                  onClick={() => setActiveIndex(idx)}
                  aria-label={`Feature ${item.title}`}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === safeIndex
                      ? "w-8 bg-amber-400"
                      : "w-2.5 bg-white/25 hover:bg-white/50"
                  }`}
                />
              ))}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={goPrev}
                aria-label="Previous featured title"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-zinc-900/80 text-zinc-200 backdrop-blur-md transition hover:border-amber-400/50 hover:text-amber-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={goNext}
                aria-label="Next featured title"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/15 bg-zinc-900/80 text-zinc-200 backdrop-blur-md transition hover:border-amber-400/50 hover:text-amber-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}