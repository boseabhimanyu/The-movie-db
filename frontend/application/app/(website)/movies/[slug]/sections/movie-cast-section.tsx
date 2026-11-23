"use client";

import React from "react";
import type { CreditPerson } from "../types";

interface MovieCastSectionProps {
  cast: CreditPerson[];
}

export default function MovieCastSection({ cast }: MovieCastSectionProps) {
  if (!cast || cast.length === 0) return null;

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
      <h2 className="text-lg font-bold text-white">Top Cast</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
        {cast.slice(0, 8).map((person) => (
          <div
            key={`${person.traktId}-${person.name}`}
            className="rounded-2xl border border-white/10 bg-zinc-950/70 p-3.5"
          >
            <p className="truncate text-sm font-semibold text-white">
              {person.name}
            </p>
            {person.character && (
              <p className="mt-0.5 truncate text-xs text-zinc-400">
                {person.character}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}