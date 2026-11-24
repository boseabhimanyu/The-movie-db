"use client";

import React from "react";
import type { ShowDetail } from "../../../components/media/types";

interface ShowSidebarProps {
  show: ShowDetail;
}

function formatRuntime(minutes?: number): string {
  if (!minutes || minutes <= 0) return "";
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "TBA";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatAirs(airs?: ShowDetail["airs"]): string {
  if (!airs?.day) return "";
  return airs.time ? `${airs.day}s at ${airs.time}` : `${airs.day}s`;
}

export default function ShowSidebar({ show }: ShowSidebarProps) {
  const airsLabel = formatAirs(show.airs);

  const hasExternalLinks = Boolean(
    show.ids?.imdb ||
      (show.ids?.tmdb ?? 0) > 0 ||
      (show.ids?.trakt ?? 0) > 0 ||
      (show.ids?.tvdb ?? 0) > 0 ||
      show.homepage
  );

  return (
    <aside className="space-y-6 lg:sticky lg:top-24">
      <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
        <h2 className="text-base font-bold text-white">Show Details</h2>
        <dl className="mt-4 space-y-3 text-sm">
          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
            <dt className="text-zinc-400">Status</dt>
            <dd className="font-medium capitalize text-zinc-100">
              {show.status || "Returning Series"}
            </dd>
          </div>

          {show.network && (
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
              <dt className="text-zinc-400">Network</dt>
              <dd className="font-medium text-zinc-100">{show.network}</dd>
            </div>
          )}

          <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
            <dt className="text-zinc-400">First Aired</dt>
            <dd className="font-medium text-zinc-100">
              {formatDate(show.firstAired)}
            </dd>
          </div>

          {airsLabel && (
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
              <dt className="text-zinc-400">Airs</dt>
              <dd className="font-medium text-zinc-100">{airsLabel}</dd>
            </div>
          )}

          {(show.airedEpisodes ?? 0) > 0 && (
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
              <dt className="text-zinc-400">Aired Episodes</dt>
              <dd className="font-medium text-zinc-100">
                {show.airedEpisodes}
              </dd>
            </div>
          )}

          {(show.runtime ?? 0) > 0 && (
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
              <dt className="text-zinc-400">Episode Runtime</dt>
              <dd className="font-medium text-zinc-100">
                {formatRuntime(show.runtime)}
              </dd>
            </div>
          )}

          {show.country && (
            <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2.5">
              <dt className="text-zinc-400">Country</dt>
              <dd className="font-medium uppercase text-zinc-100">
                {show.country}
              </dd>
            </div>
          )}

          {show.language && (
            <div className="flex items-center justify-between gap-4">
              <dt className="text-zinc-400">Language</dt>
              <dd className="font-medium uppercase text-zinc-100">
                {show.language}
              </dd>
            </div>
          )}
        </dl>
      </div>

      {hasExternalLinks && (
        <div className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
          <h2 className="text-base font-bold text-white">External Links</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {show.ids?.imdb && (
              <a
                href={`https://www.imdb.com/title/${show.ids.imdb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                IMDb ↗
              </a>
            )}

            {(show.ids?.tmdb ?? 0) > 0 && (
              <a
                href={`https://www.themoviedb.org/tv/${show.ids.tmdb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                TMDB ↗
              </a>
            )}

            {(show.ids?.trakt ?? 0) > 0 && (
              <a
                href={`https://trakt.tv/shows/${show.ids.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                Trakt ↗
              </a>
            )}

            {(show.ids?.tvdb ?? 0) > 0 && (
              <a
                href={`https://thetvdb.com/?tab=series&id=${show.ids.tvdb}`}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                TVDB ↗
              </a>
            )}

            {show.homepage && (
              <a
                href={show.homepage}
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