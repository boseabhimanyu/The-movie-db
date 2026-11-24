"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { CreditPerson } from "../types";

interface MovieCastSectionProps {
  cast: (CreditPerson & { headshot?: string })[];
}

const INITIAL_VISIBLE = 5;

function CastCard({
  person,
}: {
  person: CreditPerson & { headshot?: string };
}) {
  const slugOrId =
    person.slug || (person.traktId ? String(person.traktId) : "");
  const href = slugOrId ? `/people/${encodeURIComponent(slugOrId)}` : "#";

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
        {person.headshot ? (
          <img
            src={person.headshot}
            alt={person.name}
            loading="lazy"
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
        {person.character && (
          <p className="mt-0.5 line-clamp-1 text-xs text-zinc-400">
            {person.character}
          </p>
        )}
      </div>
    </Link>
  );
}

export default function MovieCastSection({ cast }: MovieCastSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!cast || cast.length === 0) return null;

  const topCast = cast.slice(0, INITIAL_VISIBLE);
  const remainingCast = cast.slice(INITIAL_VISIBLE);
  const hasMore = remainingCast.length > 0;

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <h2 className="text-lg font-bold tracking-tight text-white">Cast</h2>
        <span className="rounded-full border border-white/10 bg-zinc-950/80 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
          {cast.length}
        </span>
      </div>

      {/* Top 5 Cast Row (Always Visible) */}
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-5">
        {topCast.map((person, idx) => (
          <CastCard
            key={`${person.traktId || person.name}-${idx}`}
            person={person}
          />
        ))}
      </div>

      {/* Smooth Slide-Down / Slide-Up Container for Remaining Cast */}
      {hasMore && (
        <div
          aria-hidden={!expanded}
          className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${
            expanded
              ? "grid-rows-[1fr] opacity-100"
              : "pointer-events-none grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="overflow-hidden">
            <div
              className={`grid grid-cols-2 gap-4 pt-4 transition-transform duration-500 ease-in-out sm:grid-cols-3 md:grid-cols-5 ${
                expanded ? "translate-y-0" : "-translate-y-3"
              }`}
            >
              {remainingCast.map((person, idx) => (
                <CastCard
                  key={`${person.traktId || person.name}-${INITIAL_VISIBLE + idx}`}
                  person={person}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Centered Expand / Collapse Button */}
      {hasMore && (
        <div className="mt-6 flex justify-center">
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
            className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-zinc-950/80 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300"
          >
            <span>{expanded ? "Show Less" : "View All"}</span>
            <span
              className={`inline-block text-xs transition-transform duration-500 ease-in-out ${
                expanded ? "rotate-180" : "rotate-0"
              }`}
            >
              ↓
            </span>
          </button>
        </div>
      )}
    </section>
  );
}