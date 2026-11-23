"use client";

import React from "react";
import Link from "next/link";
import type { NormalizedCreditItem } from "./types";

interface CreditCardProps {
  item: NormalizedCreditItem;
}

function toPreviewArtworkUrl(url?: string): string {
  if (!url) return "";
  if (url.includes("assets.fanart.tv/fanart/")) {
    return url.replace("assets.fanart.tv/fanart/", "assets.fanart.tv/preview/");
  }
  return url;
}

export default function CreditCard({ item }: CreditCardProps) {
  const slug = item.ids?.slug || (item.ids?.trakt ? String(item.ids.trakt) : "");
  const href =
    item.mediaType === "movie" ? `/movies/${slug}` : `/shows/${slug}`;
  const posterUrl = toPreviewArtworkUrl(item.poster);

  const subtitleParts: string[] = [];
  if (item.role) subtitleParts.push(`as ${item.role}`);
  if (item.jobs && item.jobs.length > 0) {
    subtitleParts.push(item.jobs.join(", "));
  }
  const creditSubtitle = subtitleParts.join(" • ");

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 transition duration-200 hover:-translate-y-0.5 hover:border-amber-400/40 hover:bg-zinc-900"
    >
      {/* Framed 2:3 Poster Area */}
      <div className="relative flex aspect-[2/3] w-full items-center justify-center overflow-hidden border-b border-white/10 bg-zinc-950/90 p-3.5">
        {posterUrl ? (
          <div className="relative h-full w-full overflow-hidden rounded-xl border border-white/10 bg-zinc-900 shadow-md shadow-black/70">
            <img
              src={posterUrl}
              alt={`${item.title} poster`}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
            />
          </div>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-between rounded-xl border border-white/10 bg-gradient-to-b from-zinc-800/60 via-zinc-900 to-zinc-950 p-4 text-center">
            <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-zinc-400 uppercase">
              {item.year || "TBA"}
            </span>
            <p className="line-clamp-3 text-sm font-bold text-zinc-200">
              {item.title}
            </p>
            <span className="text-[10px] font-medium tracking-widest text-zinc-500 uppercase">
              No Poster
            </span>
          </div>
        )}

        {/* Top-Left Media Badge */}
        <span className="absolute top-2.5 left-2.5 rounded-md border border-white/15 bg-zinc-950/85 px-2 py-0.5 text-[10px] font-bold tracking-wider text-zinc-200 uppercase backdrop-blur-md">
          {item.mediaType === "movie" ? "Movie" : "TV"}
        </span>

        {/* Top-Right Rating Pill */}
        {item.rating > 0 && (
          <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-md border border-white/15 bg-zinc-950/85 px-2 py-0.5 text-xs font-bold text-white backdrop-blur-md">
            <span className="text-amber-400">★</span>
            {item.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          <h3 className="line-clamp-1 text-sm font-bold text-white transition group-hover:text-amber-300 sm:text-base">
            {item.title}
          </h3>

          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-zinc-400">
            <span>{item.year > 0 ? item.year : "TBA"}</span>
            {item.mediaType === "show" &&
              typeof item.episodeCount === "number" &&
              item.episodeCount > 0 && (
                <>
                  <span className="text-zinc-600">•</span>
                  <span>
                    {item.episodeCount}{" "}
                    {item.episodeCount === 1 ? "ep" : "eps"}
                  </span>
                </>
              )}
          </div>
        </div>

        {creditSubtitle ? (
          <p
            title={creditSubtitle}
            className="mt-2.5 line-clamp-1 text-xs font-medium text-zinc-300"
          >
            {creditSubtitle}
          </p>
        ) : (
          <p className="mt-2.5 text-xs text-zinc-500">—</p>
        )}
      </div>
    </Link>
  );
}