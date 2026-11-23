"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { PersonSearchItem, PersonSearchResponse } from "../../people/types";
import PersonCard from "./PersonCard";

interface PeopleSearchClientProps {
  initialQuery: string;
  initialPage: number;
  initialResults: PersonSearchItem[];
}

const SUGGESTED_SEARCHES = [
  "Christopher Nolan",
  "Cillian Murphy",
  "Scarlett Johansson",
  "Leonardo DiCaprio",
  "Denis Villeneuve",
  "Zendaya",
];

const CARDS_PER_PAGE = 12;
const FETCH_LIMIT = 50;

export default function PeopleSearchClient({
  initialQuery,
  initialPage,
  initialResults,
}: PeopleSearchClientProps) {
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [allResults, setAllResults] =
    useState<PersonSearchItem[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirstRender = useRef(true);

  // Sync URL whenever query or page changes
  useEffect(() => {
    if (isFirstRender.current) return;

    const trimmed = query.trim();
    const urlParams = new URLSearchParams();
    if (trimmed) urlParams.set("q", trimmed);
    if (page > 1) urlParams.set("page", String(page));

    const nextUrl = urlParams.toString()
      ? `/people?${urlParams.toString()}`
      : "/people";
    router.replace(nextUrl, { scroll: false });
  }, [query, page, router]);

  // Fetch up to FETCH_LIMIT results when query changes
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const trimmed = query.trim();
    if (!trimmed) {
      setAllResults([]);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const timer = setTimeout(() => {
      api
        .get<PersonSearchResponse>("/people/search", {
          params: { q: trimmed, page: 1, limit: FETCH_LIMIT },
        })
        .then((res) => {
          if (cancelled) return;
          setAllResults(res.data?.results ?? []);
        })
        .catch(() => {
          if (!cancelled) {
            setError("Failed to search people. Please try again.");
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const totalItems = allResults.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / CARDS_PER_PAGE));
  const safePage = Math.min(page, totalPages);

  const paginatedResults = useMemo(() => {
    const start = (safePage - 1) * CARDS_PER_PAGE;
    return allResults.slice(start, start + CARDS_PER_PAGE);
  }, [allResults, safePage]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      {/* Header & Search Hero */}
      <section className="border-b border-white/10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-500/10 via-zinc-900/50 to-zinc-950">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
          <span className="inline-flex rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold tracking-wider text-amber-300 uppercase">
            Cast &amp; Crew Directory
          </span>

          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            Search People
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400 sm:text-base">
            Find actors, actresses, directors, and creators to explore their
            full movie and TV filmographies.
          </p>

          {/* Search Bar */}
          <div className="relative mt-6 max-w-2xl">
            <input
              type="search"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              placeholder="Search by actor, actress, or director name..."
              autoFocus
              className="w-full rounded-2xl border border-white/15 bg-zinc-900/95 px-5 py-3.5 pr-12 text-sm text-white placeholder-zinc-500 shadow-xl shadow-black/40 transition focus:border-amber-400/60 focus:outline-none sm:text-base"
            />
            {query && (
              <button
                type="button"
                onClick={() => handleQueryChange("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-4 -translate-y-1/2 rounded-lg px-2 py-1 text-xs font-semibold text-zinc-400 hover:bg-white/10 hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Suggestion Chips */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-zinc-500">Try:</span>
            {SUGGESTED_SEARCHES.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => handleQueryChange(name)}
                className="rounded-full border border-white/10 bg-zinc-900/80 px-3 py-1 text-xs font-medium text-zinc-300 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Results Section */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {!query.trim() ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-10 text-center">
            <p className="text-base font-semibold text-zinc-200">
              Start typing a name above to search
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Click any person card to view their biography and full movie &amp;
              TV credits.
            </p>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="aspect-[2/3] animate-pulse rounded-2xl bg-zinc-900"
              />
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-8 text-center text-sm text-red-300">
            {error}
          </div>
        ) : totalItems === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-10 text-center">
            <p className="text-base font-semibold text-zinc-200">
              No people found for &ldquo;{query.trim()}&rdquo;
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              Check the spelling or try searching by first or last name.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-xs text-zinc-400 sm:text-sm">
                Showing{" "}
                <span className="font-semibold text-white">
                  {(safePage - 1) * CARDS_PER_PAGE + 1}–
                  {Math.min(safePage * CARDS_PER_PAGE, totalItems)}
                </span>{" "}
                of <span className="font-semibold text-white">{totalItems}</span>{" "}
                results for{" "}
                <span className="font-semibold text-amber-300">
                  &ldquo;{query.trim()}&rdquo;
                </span>
              </p>
              {totalPages > 1 && (
                <span className="text-xs text-zinc-400">
                  Page {safePage} of {totalPages}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {paginatedResults.map((person, idx) => (
                <PersonCard
                  key={`${person.ids?.trakt || person.ids?.slug || person.name}-${idx}`}
                  person={person}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={safePage <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-xl border border-white/15 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                <span className="rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2 text-xs font-semibold text-zinc-300">
                  {safePage} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={safePage >= totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-xl border border-white/15 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}