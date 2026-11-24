"use client";

import React from "react";
import Link from "next/link";
import type {
  ReviewItem,
  ReviewStats,
  ShowDetail,
} from "../../../components/media/types";

interface ShowHeroProps {
  show: ShowDetail;
  stats: ReviewStats;
  myReview: ReviewItem | null;
  isAuthenticated: boolean;
  authChecked: boolean;
  hasYouTubeTrailer: boolean;
  onOpenTrailer: () => void;
  onOpenFullPoster: (fullUrl: string) => void;
  onScrollToComposer: (startEdit?: boolean) => void;
}

function formatRuntime(minutes?: number): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatGenreLabel(slug: string): string {
  return slug
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatusLabel(status?: string): string {
  if (!status) return "";
  return status
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toPreviewArtworkUrl(
  url: string,
  tmdbSize: "w300" | "w500" = "w500"
): string {
  if (!url) return "";
  if (url.includes("assets.fanart.tv/fanart/")) {
    return url.replace("assets.fanart.tv/fanart/", "assets.fanart.tv/preview/");
  }
  if (url.includes("image.tmdb.org/t/p/original/")) {
    return url.replace("/t/p/original/", `/t/p/${tmdbSize}/`);
  }
  return url;
}

function toFullArtworkUrl(url: string): string {
  if (!url) return "";
  if (url.includes("assets.fanart.tv/preview/")) {
    return url.replace("assets.fanart.tv/preview/", "assets.fanart.tv/fanart/");
  }
  return url;
}

function getPersonHref(person: {
  slug?: string;
  traktId?: number;
}): string | null {
  const id =
    person.slug?.trim() || (person.traktId ? String(person.traktId) : "");
  return id ? `/people/${encodeURIComponent(id)}` : null;
}

export default function ShowHero({
  show,
  stats,
  myReview,
  isAuthenticated,
  authChecked,
  hasYouTubeTrailer,
  onOpenTrailer,
  onOpenFullPoster,
  onScrollToComposer,
}: ShowHeroProps) {
  const artwork = show?.artwork ?? {
    poster: "",
    backdrop: "",
    logo: "",
    banner: "",
    thumb: "",
    posters: [],
    backdrops: [],
  };
  const credits = show?.credits ?? { directors: [], writers: [], cast: [] };

  const rawPoster = artwork.poster || artwork.posters?.[0] || "";
  const previewPosterUrl = toPreviewArtworkUrl(rawPoster, "w500");
  const fullPosterUrl = toFullArtworkUrl(rawPoster);

  const rawAmbient =
    artwork.thumb ||
    rawPoster ||
    artwork.backdrop ||
    artwork.backdrops?.[0] ||
    "";
  const ambientUrl = toPreviewArtworkUrl(rawAmbient, "w300");

  const regularSeasonCount =
    show.seasons?.filter((s) => s.number > 0).length ?? 0;

  return (
    <section className="relative overflow-hidden border-b border-white/10">
      {/* Lightweight Blurred Ambient Background */}
      {ambientUrl ? (
        <div className="pointer-events-none absolute inset-0">
          <img
            src={ambientUrl}
            alt=""
            loading="eager"
            decoding="async"
            className="h-full w-full scale-110 object-cover object-center opacity-25 blur-2xl"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/65" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/70 to-transparent" />
        </div>
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-900/60 to-zinc-950" />
      )}

      <div className="relative mx-auto max-w-6xl px-4 pt-10 pb-12 sm:px-6 lg:px-8">
        {/* Top Row: Framed Sharp Poster + Trailer | Title, Overview & Full Crew */}
        <div className="flex flex-col gap-8 md:flex-row md:items-start">
          {/* Left Media Column */}
          <div className="mx-auto w-56 shrink-0 sm:w-64 md:mx-0">
            {previewPosterUrl ? (
              <button
                type="button"
                onClick={() => onOpenFullPoster(fullPosterUrl)}
                aria-label={`View full resolution poster for ${show.title}`}
                className="group relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-zinc-900/90 p-5 shadow-2xl shadow-black/70 focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <div className="relative w-full max-w-[196px] overflow-hidden rounded-xl border border-white/15 bg-zinc-950 shadow-lg shadow-black/80">
                  <img
                    src={previewPosterUrl}
                    alt={`${show.title} poster`}
                    loading="eager"
                    decoding="async"
                    className="block h-auto w-full object-contain transition duration-300 group-hover:scale-[1.03]"
                  />
                </div>
                <span className="pointer-events-none absolute right-2.5 bottom-2.5 rounded-lg border border-white/15 bg-zinc-950/85 px-2.5 py-1 text-[11px] font-semibold text-zinc-200 opacity-0 backdrop-blur-md transition group-hover:opacity-100">
                  ⤢ Full Poster
                </span>
              </button>
            ) : (
              <div className="flex aspect-[2/3] w-full flex-col items-center justify-between overflow-hidden rounded-2xl border border-white/15 bg-gradient-to-b from-zinc-800/80 via-zinc-900 to-zinc-950 p-6 text-center shadow-2xl shadow-black/70">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                  {show.year || "SERIES"}
                </span>

                <div className="px-2">
                  <p className="text-lg leading-snug font-bold text-white">
                    {show.title}
                  </p>
                  <p className="mt-2 text-xs text-zinc-500">
                    No Poster Available
                  </p>
                </div>

                <span className="text-[11px] font-medium tracking-widest text-zinc-500 uppercase">
                  {show.certification || "TV SHOW"}
                </span>
              </div>
            )}

            {show.trailer &&
              (hasYouTubeTrailer ? (
                <button
                  type="button"
                  onClick={onOpenTrailer}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-900/90 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-amber-400/50 hover:text-amber-300"
                >
                  <svg
                    className="h-4 w-4 text-amber-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Trailer
                </button>
              ) : (
                <a
                  href={show.trailer}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-white/15 bg-zinc-900/90 px-4 py-2.5 text-sm font-semibold text-zinc-100 transition hover:border-amber-400/50 hover:text-amber-300"
                >
                  <svg
                    className="h-4 w-4 text-amber-400"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d="M8 5v14l11-7z" />
                  </svg>
                  Watch Trailer
                </a>
              ))}
          </div>

          {/* Right Column: Title, Facts, Overview & Full-Name Crew List */}
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-zinc-400">
              <Link href="/shows" className="hover:text-amber-400">
                TV Shows
              </Link>
              <span className="text-zinc-600">/</span>
              <span className="truncate text-zinc-300">{show.title}</span>
            </div>

            <h1 className="line-clamp-2 text-3xl font-extrabold tracking-tight text-white sm:text-4xl lg:text-5xl">
              {show.title}
            </h1>

            <p className="mt-2 min-h-[1.5rem] truncate text-base italic text-zinc-400">
              {show.tagline ? `“${show.tagline}”` : "\u00A0"}
            </p>

            {/* Quick Facts Strip */}
            <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs font-medium text-zinc-300 sm:text-sm">
              {show.year && <span>{show.year}</span>}
              {show.network && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="font-semibold text-amber-300">
                    {show.network}
                  </span>
                </>
              )}
              {regularSeasonCount > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>
                    {regularSeasonCount}{" "}
                    {regularSeasonCount === 1 ? "Season" : "Seasons"}
                  </span>
                </>
              )}
              {(show.runtime ?? 0) > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>{formatRuntime(show.runtime)} / ep</span>
                </>
              )}
              {show.certification && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="rounded-md border border-white/15 bg-white/5 px-2 py-0.5 text-xs font-semibold text-zinc-200">
                    {show.certification}
                  </span>
                </>
              )}
              {show.status && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span className="rounded-md border border-emerald-400/25 bg-emerald-400/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                    {formatStatusLabel(show.status)}
                  </span>
                </>
              )}
            </div>

            {/* Genre Chips */}
            <div className="mt-4 flex min-h-[2rem] flex-wrap gap-2">
              {show.genres?.map((genre) => (
                <Link
                  key={genre}
                  href={`/shows?genre=${encodeURIComponent(genre)}`}
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-zinc-900/80 px-3.5 py-1.5 text-xs leading-none font-medium text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
                >
                  {formatGenreLabel(genre)}
                </Link>
              ))}
            </div>

            {/* Fixed-Height Overview Section */}
            <div className="mt-6">
              <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Overview
              </h2>
              <div className="mt-2 h-24 overflow-y-auto pr-2 [scrollbar-color:rgba(255,255,255,0.2)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20 hover:[&::-webkit-scrollbar-thumb]:bg-white/35 [&::-webkit-scrollbar-track]:bg-transparent">
                <p className="max-w-3xl text-sm leading-relaxed text-zinc-200 sm:text-base">
                  {show.overview || "No overview available for this show."}
                </p>
              </div>
            </div>

            {/* Key Crew: Complete Names, Clickable & Each on Its Own Clean Line */}
            <div className="mt-5 grid grid-cols-1 gap-6 border-t border-white/10 pt-5 sm:grid-cols-2">
              <div>
                <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  {credits.directors?.length > 1 ? "Directors" : "Director"}
                </span>
                {credits.directors?.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {credits.directors.map((director, idx) => {
                      const href = getPersonHref(director);
                      return (
                        <li
                          key={`${director.traktId ?? idx}-${director.name}`}
                          className="text-sm leading-snug font-medium text-white"
                        >
                          {href ? (
                            <Link
                              href={href}
                              className="transition hover:text-amber-300 hover:underline hover:underline-offset-4"
                            >
                              {director.name}
                            </Link>
                          ) : (
                            <span>{director.name}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm font-medium text-zinc-500">—</p>
                )}
              </div>

              <div>
                <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                  {credits.writers?.length > 1 ? "Writers" : "Writer"}
                </span>
                {credits.writers?.length > 0 ? (
                  <ul className="mt-2 space-y-1.5">
                    {credits.writers.map((writer, idx) => {
                      const role =
                        writer.jobs?.[0] && writer.jobs[0] !== "Writer"
                          ? writer.jobs[0]
                          : "";
                      const href = getPersonHref(writer);
                      return (
                        <li
                          key={`${writer.traktId ?? idx}-${writer.name}-${role}`}
                          className="text-sm leading-snug font-medium text-white"
                        >
                          {href ? (
                            <Link
                              href={href}
                              className="transition hover:text-amber-300 hover:underline hover:underline-offset-4"
                            >
                              {writer.name}
                            </Link>
                          ) : (
                            <span>{writer.name}</span>
                          )}
                          {role && (
                            <span className="ml-1.5 text-xs font-normal text-zinc-400">
                              ({role})
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm font-medium text-zinc-500">—</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Full-Width Score & Personal Action Bar Below Poster & Trailer */}
        <div className="mt-8 flex w-full flex-wrap items-center justify-between gap-4 rounded-2xl border border-white/10 bg-zinc-900/90 px-6 py-4 backdrop-blur-xl">
          <div className="flex flex-wrap items-center gap-8">
            <div>
              <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                Global Score
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-amber-400">★</span>
                <span className="text-xl font-bold text-white">
                  {(show.rating ?? 0) > 0 ? show.rating!.toFixed(1) : "—"}
                </span>
                <span className="text-xs text-zinc-400">/ 10</span>
                {(show.votes ?? 0) > 0 && (
                  <span className="text-xs text-zinc-500">
                    ({show.votes!.toLocaleString()})
                  </span>
                )}
              </div>
            </div>

            <div className="h-8 w-px bg-white/10" />

            <div>
              <div className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                User Score
              </div>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="text-amber-400">★</span>
                <span className="text-xl font-bold text-white">
                  {stats.totalRatings > 0
                    ? stats.averageRating.toFixed(1)
                    : "—"}
                </span>
                <span className="text-xs text-zinc-400">/ 10</span>
                <span className="text-xs text-zinc-500">
                  ({stats.totalRatings})
                </span>
              </div>
            </div>
          </div>

          {/* Personal Action Slot */}
          <div>
            {!authChecked ? (
              <div className="h-10 w-36 animate-pulse rounded-xl bg-white/5" />
            ) : !isAuthenticated ? (
              <Link
                href={`/login?redirect=/shows/${show.ids?.slug ?? ""}`}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/40 bg-amber-400/15 px-4 py-2.5 text-sm font-semibold text-amber-300 transition hover:bg-amber-400/25"
              >
                Sign in to Rate & Review
              </Link>
            ) : myReview ? (
              <div className="flex items-center gap-2.5">
                <div className="rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-300">
                  Your Rating: ★ {myReview.rating}/10
                </div>
                <button
                  type="button"
                  onClick={() => onScrollToComposer(true)}
                  className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-white transition hover:border-amber-400/40 hover:text-amber-300"
                >
                  Edit Review
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onScrollToComposer(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-zinc-950 shadow-lg shadow-amber-400/20 transition hover:bg-amber-300"
              >
                <span>★</span> Rate & Review
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}