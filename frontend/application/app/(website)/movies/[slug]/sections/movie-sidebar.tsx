"use client";

import React from "react";
import type { MovieDetail } from "../../../components/media/types";

interface MovieSidebarProps {
  movie: MovieDetail;
}

function formatRuntime(minutes: number): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "TBA";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function MovieSidebar({ movie }: MovieSidebarProps) {
  const hasExternalLinks = Boolean(
    movie.ids.imdb ||
      movie.ids.tmdb > 0 ||
      movie.ids.trakt > 0 ||
      movie.homepage
  );

  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
        <h2 className="text-base font-bold text-white">Movie Details</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
            <dt className="text-zinc-400">Status</dt>
            <dd className="font-medium capitalize text-zinc-100">
              {movie.status || "Released"}
            </dd>
          </div>

          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
            <dt className="text-zinc-400">Release Date</dt>
            <dd className="font-medium text-zinc-100">
              {formatDate(movie.released)}
            </dd>
          </div>

          {movie.runtime > 0 && (
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
              <dt className="text-zinc-400">Runtime</dt>
              <dd className="font-medium text-zinc-100">
                {formatRuntime(movie.runtime)}
              </dd>
            </div>
          )}

          {movie.country && (
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
              <dt className="text-zinc-400">Country</dt>
              <dd className="font-medium uppercase text-zinc-100">
                {movie.country}
              </dd>
            </div>
          )}

          {movie.language && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-400">Language</dt>
              <dd className="font-medium uppercase text-zinc-100">
                {movie.language}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {hasExternalLinks && (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
          <h2 className="text-base font-bold text-white">External Links</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {movie.ids.imdb && (
              <a
                href={`https://www.imdb.com/title/${movie.ids.imdb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                IMDb ↗
              </a>
            )}

            {movie.ids.tmdb > 0 && (
              <a
                href={`https://www.themoviedb.org/movie/${movie.ids.tmdb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                TMDB ↗
              </a>
            )}

            {movie.ids.trakt > 0 && (
              <a
                href={`https://trakt.tv/movies/${movie.ids.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                Trakt ↗
              </a>
            )}

            {movie.homepage && (
              <a
                href={movie.homepage}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                Official Site ↗
              </a>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}