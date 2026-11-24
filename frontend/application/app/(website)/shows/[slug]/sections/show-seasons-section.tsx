"use client";

import React, { useMemo, useState } from "react";
import { Calendar, Clock, Film, Star, Tv } from "lucide-react";
import { ShowSeason } from "@/app/(website)/components/media/types";
interface ShowSeasonsSectionProps {
  seasons: ShowSeason[];
  fallbackPoster?: string;
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return "";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function ShowSeasonsSection({
  seasons,
  fallbackPoster,
}: ShowSeasonsSectionProps) {
  const sortedSeasons = useMemo(() => {
    const regular = seasons
      .filter((s) => s.number > 0)
      .sort((a, b) => a.number - b.number);
    const specials = seasons.filter((s) => s.number === 0);
    return [...regular, ...specials];
  }, [seasons]);

  const defaultSeasonNumber =
    sortedSeasons.find((s) => s.number > 0)?.number ??
    sortedSeasons[0]?.number ??
    1;

  const [selectedSeasonNum, setSelectedSeasonNum] =
    useState<number>(defaultSeasonNumber);
  const [expandedEpisodes, setExpandedEpisodes] = useState<
    Record<number, boolean>
  >({});

  if (sortedSeasons.length === 0) return null;

  const activeSeason =
    sortedSeasons.find((s) => s.number === selectedSeasonNum) ??
    sortedSeasons[0];

  const episodes = [...(activeSeason.episodes ?? [])].sort(
    (a, b) => a.number - b.number
  );
  const seasonPoster = activeSeason.poster || fallbackPoster;

  function toggleEpisodeOverview(epNumber: number) {
    setExpandedEpisodes((prev) => ({
      ...prev,
      [epNumber]: !prev[epNumber],
    }));
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2.5">
          <Tv className="h-5 w-5 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Seasons & Episodes</h2>
        </div>

        {/* Season Selector Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {sortedSeasons.map((season) => {
            const isSelected = season.number === activeSeason.number;
            return (
              <button
                key={season.number}
                type="button"
                onClick={() => {
                  setSelectedSeasonNum(season.number);
                  setExpandedEpisodes({});
                }}
                className={`cursor-pointer rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
                  isSelected
                    ? "border-amber-400 bg-amber-400 text-zinc-950"
                    : "border-white/10 bg-zinc-950 text-zinc-300 hover:border-white/25 hover:text-white"
                }`}
              >
                {season.title || `Season ${season.number}`}
                <span
                  className={`ml-1.5 text-[11px] ${
                    isSelected ? "text-zinc-900/80" : "text-zinc-500"
                  }`}
                >
                  ({season.episodeCount ?? season.episodes?.length ?? 0})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Season Header Card */}
      <div className="mt-5 flex flex-col gap-4 rounded-2xl border border-white/10 bg-zinc-950/70 p-4 sm:flex-row">
        {seasonPoster && (
          <img
            src={seasonPoster}
            alt={activeSeason.title}
            className="h-36 w-24 shrink-0 rounded-xl border border-white/10 object-cover"
          />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-bold text-white">
              {activeSeason.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {typeof activeSeason.rating === "number" &&
                activeSeason.rating > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 font-bold text-amber-300">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {activeSeason.rating.toFixed(1)}
                  </span>
                )}
              <span className="rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-zinc-300">
                {activeSeason.airedEpisodes ?? episodes.length} /{" "}
                {activeSeason.episodeCount ?? episodes.length} Aired
              </span>
              {activeSeason.firstAired && (
                <span className="text-zinc-400">
                  Premiered {formatDate(activeSeason.firstAired)}
                </span>
              )}
            </div>
          </div>

          {activeSeason.overview ? (
            <p className="mt-2 text-sm leading-relaxed text-zinc-300">
              {activeSeason.overview}
            </p>
          ) : (
            <p className="mt-2 text-xs text-zinc-500">
              No season summary available.
            </p>
          )}
        </div>
      </div>

      {/* Episode List */}
      {episodes.length === 0 ? (
        <p className="py-8 text-center text-sm text-zinc-400">
          No episodes listed for this season yet.
        </p>
      ) : (
        <div className="mt-4 divide-y divide-white/10 rounded-2xl border border-white/10 bg-zinc-950/60">
          {episodes.map((ep) => {
            const isExpanded = Boolean(expandedEpisodes[ep.number]);
            const hasLongOverview = (ep.overview?.length ?? 0) > 180;
            const isUpcoming =
              ep.firstAired && new Date(ep.firstAired) > new Date();

            return (
              <div
                key={ep.ids?.trakt ?? `${activeSeason.number}-${ep.number}`}
                className="p-4 transition hover:bg-white/[0.02]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-8 w-11 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-zinc-900 text-xs font-bold text-amber-300">
                      E{String(ep.number).padStart(2, "0")}
                    </span>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-sm font-semibold text-white">
                          {ep.title}
                        </h4>
                        {isUpcoming && (
                          <span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-300">
                            Upcoming
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
                        {ep.firstAired && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                            {formatDate(ep.firstAired)}
                          </span>
                        )}
                        {typeof ep.runtime === "number" && ep.runtime > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-zinc-500" />
                            {ep.runtime}m
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {typeof ep.rating === "number" && ep.rating > 0 && (
                    <span className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-white/10 bg-zinc-900 px-2.5 py-1 text-xs font-semibold text-zinc-200">
                      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                      {ep.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                {ep.overview && (
                  <div className="mt-2.5 pl-14">
                    <p
                      className={`text-xs leading-relaxed text-zinc-400 ${
                        !isExpanded && hasLongOverview ? "line-clamp-2" : ""
                      }`}
                    >
                      {ep.overview}
                    </p>
                    {hasLongOverview && (
                      <button
                        type="button"
                        onClick={() => toggleEpisodeOverview(ep.number)}
                        className="mt-1 text-[11px] font-semibold text-amber-400 hover:text-amber-300"
                      >
                        {isExpanded ? "Show less" : "Read more"}
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}