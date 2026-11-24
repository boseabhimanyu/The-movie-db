"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import type { CreditPerson } from "./types";

type CastMember = CreditPerson & {
  headshot?: string;
  images?: { headshot?: string };
  artwork?: { headshot?: string };
};

interface MovieCastSectionProps {
  cast: CastMember[];
}

const STEP_SIZE = 10;

function resolveHeadshot(person: CastMember): string {
  const explicit =
    person.headshot ||
    person.images?.headshot ||
    person.artwork?.headshot ||
    "";
  if (explicit) return explicit;

  const traktId = person.traktId || person.ids?.trakt;
  if (traktId && traktId > 0) {
    return `https://media.trakt.tv/people/${traktId}/medium/headshot.webp`;
  }
  return "";
}

function resolveCharacter(person: CastMember): string {
  if (person.character) return person.character;
  if (Array.isArray(person.characters) && person.characters.length > 0) {
    return person.characters.join(", ");
  }
  return "";
}

function CastCard({ person }: { person: CastMember }) {
  const [imgFailed, setImgFailed] = useState(false);

  const slugOrId =
    person.slug ||
    person.ids?.slug ||
    (person.traktId ? String(person.traktId) : "");
  const href = slugOrId ? `/people/${encodeURIComponent(slugOrId)}` : "#";

  const headshotUrl = !imgFailed ? resolveHeadshot(person) : "";
  const characterLabel = resolveCharacter(person);

  const initials = person.name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

  return (
    <Link
      href={href}
      className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/75 transition hover:-translate-y-1 hover:border-amber-400/50 hover:bg-zinc-950"
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
        {headshotUrl ? (
          <img
            src={headshotUrl}
            alt={person.name}
            loading="lazy"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-xl font-bold tracking-wider text-zinc-500">
            {initials || "?"}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col justify-between p-3">
        <p className="line-clamp-1 text-sm font-bold text-white transition group-hover:text-amber-300">
          {person.name}
        </p>
        {characterLabel && (
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
            {characterLabel}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function MovieCastSection({ cast }: MovieCastSectionProps) {
  const [visibleCount, setVisibleCount] = useState(STEP_SIZE);

  const extraChunks = useMemo(() => {
    if (!cast || cast.length <= STEP_SIZE) return [];
    const chunks: CastMember[][] = [];
    for (let i = STEP_SIZE; i < cast.length; i += STEP_SIZE) {
      chunks.push(cast.slice(i, i + STEP_SIZE));
    }
    return chunks;
  }, [cast]);

  if (!cast || cast.length === 0) return null;

  const initialCast = cast.slice(0, STEP_SIZE);
  const shownCount = Math.min(visibleCount, cast.length);
  const canLoadMore = shownCount < cast.length;
  const canLoadLess = shownCount > STEP_SIZE;

  function handleLoadMore() {
    setVisibleCount((prev) => Math.min(prev + STEP_SIZE, cast.length));
  }

  function handleLoadLess() {
    setVisibleCount((prev) => Math.max(prev - STEP_SIZE, STEP_SIZE));
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2.5">
          <h2 className="text-lg font-bold tracking-tight text-white">Cast</h2>
          <span className="rounded-full border border-white/10 bg-zinc-950/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
            {cast.length}
          </span>
        </div>

        {cast.length > STEP_SIZE && (
          <span className="text-xs font-medium text-zinc-400">
            Showing {shownCount} of {cast.length}
          </span>
        )}
      </div>

      {/* Initial 10 Cast Cards (Always Visible) */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {initialCast.map((person, idx) => (
          <CastCard
            key={`${person.traktId || person.slug || person.name}-${idx}`}
            person={person}
          />
        ))}
      </div>

      {/* Smooth Slide-Down / Slide-Up Chunks of 10 */}
      {extraChunks.map((chunk, chunkIdx) => {
        const chunkStartIndex = STEP_SIZE + chunkIdx * STEP_SIZE;
        const isChunkVisible = shownCount > chunkStartIndex;

        return (
          <div
            key={`cast-chunk-${chunkIdx}`}
            aria-hidden={!isChunkVisible}
            className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
              isChunkVisible
                ? "grid-rows-[1fr] opacity-100"
                : "pointer-events-none grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden">
              <div
                className={`grid grid-cols-2 gap-4 pt-4 transition-transform duration-500 ease-in-out sm:grid-cols-3 md:grid-cols-5 ${
                  isChunkVisible ? "translate-y-0" : "-translate-y-3"
                }`}
              >
                {chunk.map((person, idx) => (
                  <CastCard
                    key={`${person.traktId || person.slug || person.name}-${
                      chunkStartIndex + idx
                    }`}
                    person={person}
                  />
                ))}
              </div>
            </div>
          </div>
        );
      })}

      {/* Load More / Load Less Controls */}
      {(canLoadMore || canLoadLess) && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {canLoadMore && (
            <button
              type="button"
              onClick={handleLoadMore}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-zinc-950/80 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300"
            >
              <span>Load More</span>
              <span className="text-xs">↓</span>
            </button>
          )}

          {canLoadLess && (
            <button
              type="button"
              onClick={handleLoadLess}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-zinc-950/80 px-5 py-2.5 text-sm font-semibold text-zinc-300 transition hover:border-amber-400/50 hover:text-amber-300"
            >
              <span>Load Less</span>
              <span className="text-xs">↑</span>
            </button>
          )}
        </div>
      )}
    </section>
  );
}