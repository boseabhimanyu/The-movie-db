"use client";

import React from "react";
import Link from "next/link";
import type { PersonDetailResponse } from "../types";
import PersonHero from "../PersonHero";
import PersonFilmography from "../PersonFilmography";
interface PersonDetailClientProps {
  initialData: PersonDetailResponse | null;
  notFound: boolean;
  error: string | null;
}

export default function PersonDetailClient({
  initialData,
  notFound,
  error,
}: PersonDetailClientProps) {
  if (notFound || !initialData) {
    return (
      <main className="flex min-h-[75vh] flex-col items-center justify-center bg-zinc-950 px-4 text-center text-white">
        <span className="rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-300 uppercase">
          404 • Not Found
        </span>
        <h1 className="mt-4 text-2xl font-extrabold sm:text-3xl">
          Person Not Found
        </h1>
        <p className="mt-2 max-w-md text-sm text-zinc-400">
          {error ||
            "We couldn't find a profile matching this person. They may not exist in Trakt or the link may be outdated."}
        </p>
        <div className="mt-6 flex gap-3">
          <Link
            href="/movies"
            className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
          >
            Browse Movies
          </Link>
          <Link
            href="/shows"
            className="rounded-xl border border-white/15 bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/40 hover:text-amber-300"
          >
            Browse Shows
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <PersonHero data={initialData} />
      <PersonFilmography data={initialData} />
    </main>
  );
}