"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import api from "@/lib/api";
import type { PersonSearchItem, PersonSearchResponse } from "../../people/types";
import PersonCard from "./PersonCard";

interface PeopleSearchClientProps {
  initialQuery: string;
  initialPage: number;
  initialResults: PersonSearchItem[];
  initialTotalPages: number;
  initialTotalItems: number;
}

const SUGGESTED_SEARCHES = [
  "Christopher Nolan",
  "Cillian Murphy",
  "Scarlett Johansson",
  "Leonardo DiCaprio",
  "Denis Villeneuve",
  "Zendaya",
];

const PAGE_LIMIT = 10;

export default function PeopleSearchClient({
  initialQuery,
  initialPage,
  initialResults,
  initialTotalPages,
  initialTotalItems,
}: PeopleSearchClientProps) {
  const router = useRouter();

  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(initialPage);
  const [results, setResults] = useState<PersonSearchItem[]>(initialResults);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalItems, setTotalItems] = useState(initialTotalItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const trimmed = query.trim();

    const urlParams = new URLSearchParams();
    if (trimmed) urlParams.set("q", trimmed);
    if (page > 1) urlParams.set("page", String(page));
    const nextUrl = urlParams.toString()
      ? `/people?${urlParams.toString()}`
      : "/people";
    router.replace(nextUrl, { scroll: false });

    let cancelled = false;
    setLoading(true);
    setError(null);

    const delay = trimmed ? 350 : 0;

    const timer = setTimeout(() => {
      const request = trimmed
        ? api.get<PersonSearchResponse>("/people/search", {
            params: { q: trimmed, page, limit: PAGE_LIMIT },
          })
        : api.get<PersonSearchResponse>("/people/popular", {
            params: { page, limit: PAGE_LIMIT },
          });

      request
        .then((res) => {
          if (cancelled) return;
          const items = res.data?.results ?? [];
          setResults(items);
          setTotalPages(res.data?.pagination?.totalPages ?? 1);
          setTotalItems(res.data?.pagination?.totalItems ?? items.length);
        })
        .catch(() => {
          if (!cancelled) {
            setError(
              trimmed
                ? "Failed to search people. Please try again."
                : "Failed to load popular people. Please try again."
            );
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }, delay);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, page, router]);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setPage(1);
  };

  const isSearching = query.trim().length > 0;

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
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

          <p className="mt-2 text-xs text-zinc-500">
            Tip: Searching by full name (e.g., &ldquo;Chris Evans&rdquo; instead
            of &ldquo;Chris&rdquo;) yields more accurate results.
          </p>

          {/* <div className="mt-4 flex flex-wrap items-center gap-2">
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
          </div> */}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        {loading ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 10 }).map((_, i) => (
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
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-10 text-center">
            <p className="text-base font-semibold text-zinc-200">
              {isSearching
                ? `No people found for "${query.trim()}"`
                : "No popular people available right now"}
            </p>
            <p className="mt-1 text-sm text-zinc-400">
              {isSearching
                ? "Check the spelling or try searching by full name."
                : "Try searching for an actor or director above."}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between">
              {isSearching ? (
                <p className="text-xs text-zinc-400 sm:text-sm">
                  Found{" "}
                  <span className="font-semibold text-white">{totalItems}</span>{" "}
                  {totalItems === 1 ? "result" : "results"} for{" "}
                  <span className="font-semibold text-amber-300">
                    &ldquo;{query.trim()}&rdquo;
                  </span>
                </p>
              ) : (
                <h2 className="text-base font-bold tracking-tight text-white sm:text-lg">
                  Popular in Movies Right Now
                </h2>
              )}

              {totalPages > 1 && (
                <span className="text-xs text-zinc-400">
                  Page {page} of {totalPages}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
              {results.map((person, idx) => (
                <PersonCard
                  key={`${person.ids?.trakt || person.ids?.slug || person.name}-${idx}`}
                  person={person}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                  className="rounded-xl border border-white/15 bg-zinc-900 px-4 py-2 text-xs font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  ← Previous
                </button>

                <span className="rounded-xl border border-white/10 bg-zinc-900/70 px-4 py-2 text-xs font-semibold text-zinc-300">
                  {page} / {totalPages}
                </span>

                <button
                  type="button"
                  disabled={page >= totalPages}
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