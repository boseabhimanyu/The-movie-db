"use client";

import React, { useMemo, useState } from "react";
import type {
  NormalizedCreditItem,
  PersonDetailResponse,
} from "./types";
import CreditCard from "./CreditCard";

interface PersonFilmographyProps {
  data: PersonDetailResponse;
}

type MediaFilter = "all" | "movie" | "show";
type SortOption = "newest" | "rating" | "votes";

const INITIAL_VISIBLE_COUNT = 8;
const LOAD_MORE_STEP = 4;

function formatDepartmentLabel(raw: string): string {
  return raw
    .trim()
    .replace(/-/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function mergeCreditsByTitle(
  items: NormalizedCreditItem[]
): NormalizedCreditItem[] {
  const map = new Map<string, NormalizedCreditItem>();

  for (const item of items) {
    const idKey = item.ids?.trakt
      ? String(item.ids.trakt)
      : item.ids?.slug || item.title;
    const key = `${item.mediaType}:${idKey}`;

    const existing = map.get(key);
    if (!existing) {
      map.set(key, {
        ...item,
        jobs: item.jobs ? [...item.jobs] : undefined,
      });
      continue;
    }

    if (item.role && !existing.role) {
      existing.role = item.role;
    }
    if (item.jobs?.length) {
      const mergedJobs = new Set([...(existing.jobs ?? []), ...item.jobs]);
      existing.jobs = Array.from(mergedJobs);
    }
    if (!existing.poster && item.poster) {
      existing.poster = item.poster;
    }
  }

  return Array.from(map.values());
}

export default function PersonFilmography({ data }: PersonFilmographyProps) {
  const { movieCredits, showCredits } = data;

  const availableDepartments = useMemo(() => {
    const keys: string[] = [];
    const hasActing =
      (movieCredits?.acting?.length ?? 0) > 0 ||
      (showCredits?.acting?.length ?? 0) > 0;
    if (hasActing) keys.push("acting");

    const crewSet = new Set<string>([
      ...Object.keys(movieCredits?.departments ?? {}),
      ...Object.keys(showCredits?.departments ?? {}),
    ]);
    Array.from(crewSet)
      .sort()
      .forEach((k) => {
        const count =
          (movieCredits?.departments?.[k]?.length ?? 0) +
          (showCredits?.departments?.[k]?.length ?? 0);
        if (count > 0) keys.push(k);
      });

    return keys;
  }, [movieCredits, showCredits]);

  const [mediaFilter, setMediaFilter] = useState<MediaFilter>("all");
  // null = show everything; string = specific department filter
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);

  const activeDept =
    selectedDept && availableDepartments.includes(selectedDept)
      ? selectedDept
      : null;

  // Collect items either for the selected department or across ALL departments
  const departmentItems = useMemo<NormalizedCreditItem[]>(() => {
    const collectDept = (dept: string): NormalizedCreditItem[] => {
      const rawMovies =
        dept === "acting"
          ? movieCredits?.acting ?? []
          : movieCredits?.departments?.[dept] ?? [];

      const rawShows =
        dept === "acting"
          ? showCredits?.acting ?? []
          : showCredits?.departments?.[dept] ?? [];

      const movies: NormalizedCreditItem[] = rawMovies.map((m) => ({
        mediaType: "movie",
        title: m.title,
        year: m.year,
        rating: m.rating,
        votes: m.votes,
        poster: m.poster,
        role: m.role,
        jobs: m.jobs,
        ids: m.ids,
      }));

      const shows: NormalizedCreditItem[] = rawShows.map((s) => ({
        mediaType: "show",
        title: s.title,
        year: s.year,
        rating: s.rating,
        votes: s.votes,
        poster: s.poster,
        role: s.role,
        jobs: s.jobs,
        episodeCount: s.episodeCount,
        status: s.status,
        ids: s.ids,
      }));

      return [...movies, ...shows];
    };

    if (activeDept) {
      return collectDept(activeDept);
    }

    const combined = availableDepartments.flatMap((dept) => collectDept(dept));
    return mergeCreditsByTitle(combined);
  }, [activeDept, availableDepartments, movieCredits, showCredits]);

  // Counts per media type within the active view
  const mediaCounts = useMemo(() => {
    let movie = 0;
    let show = 0;
    for (const item of departmentItems) {
      if (item.mediaType === "movie") movie++;
      else show++;
    }
    return { all: departmentItems.length, movie, show };
  }, [departmentItems]);

  // Apply media filter, search query, and sorting
  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();

    const filtered = departmentItems.filter((item) => {
      if (mediaFilter !== "all" && item.mediaType !== mediaFilter) {
        return false;
      }
      if (!q) return true;

      const inTitle = item.title.toLowerCase().includes(q);
      const inRole = item.role?.toLowerCase().includes(q) ?? false;
      const inJobs =
        item.jobs?.some((j) => j.toLowerCase().includes(q)) ?? false;
      return inTitle || inRole || inJobs;
    });

    return [...filtered].sort((a, b) => {
      if (sortBy === "rating") {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.votes - a.votes;
      }
      if (sortBy === "votes") {
        if (b.votes !== a.votes) return b.votes - a.votes;
        return b.year - a.year;
      }
      if (b.year !== a.year) return b.year - a.year;
      return b.votes - a.votes;
    });
  }, [departmentItems, mediaFilter, searchQuery, sortBy]);

  const visibleItems = filteredItems.slice(0, visibleCount);
  const remainingCount = Math.max(0, filteredItems.length - visibleItems.length);

  const handleMediaFilterChange = (next: MediaFilter) => {
    setMediaFilter(next);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleToggleDept = (dept: string) => {
    setSelectedDept((prev) => (prev === dept ? null : dept));
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  const handleSortChange = (next: SortOption) => {
    setSortBy(next);
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  };

  if (availableDepartments.length === 0) {
    return (
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
          No filmography credits available yet.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      {/* Header + Media Type Filter */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Filmography
          </h2>
          <p className="mt-1 text-xs text-zinc-400 sm:text-sm">
            Showing {visibleItems.length} of {filteredItems.length}{" "}
            {filteredItems.length === 1 ? "credit" : "credits"}
            {activeDept && (
              <>
                {" "}
                in{" "}
                <span className="font-semibold text-amber-300">
                  {activeDept === "acting"
                    ? "Acting"
                    : formatDepartmentLabel(activeDept)}
                </span>
              </>
            )}
          </p>
        </div>

        {/* Media Type Pills */}
        <div className="inline-flex rounded-xl border border-white/10 bg-zinc-900/90 p-1">
          {(
            [
              { id: "all", label: "All", count: mediaCounts.all },
              { id: "movie", label: "Movies", count: mediaCounts.movie },
              { id: "show", label: "TV Shows", count: mediaCounts.show },
            ] as const
          ).map((tab) => {
            const active = mediaFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => handleMediaFilterChange(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "bg-amber-400 text-zinc-950 shadow"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                {tab.label}{" "}
                <span
                  className={active ? "text-zinc-900/80" : "text-zinc-500"}
                >
                  ({tab.count})
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Role / Department Filter Chips (Click to filter, click again to unset) + Search & Sort */}
      <div className="mt-6 flex flex-col gap-4 border-b border-white/10 pb-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {availableDepartments.map((dept) => {
            const active = activeDept === dept;
            const totalForDept =
              dept === "acting"
                ? (movieCredits?.acting?.length ?? 0) +
                  (showCredits?.acting?.length ?? 0)
                : (movieCredits?.departments?.[dept]?.length ?? 0) +
                  (showCredits?.departments?.[dept]?.length ?? 0);

            return (
              <button
                key={dept}
                type="button"
                aria-pressed={active}
                onClick={() => handleToggleDept(dept)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition ${
                  active
                    ? "border-amber-400/50 bg-amber-400/15 text-amber-300"
                    : "border-white/10 bg-zinc-900/80 text-zinc-300 hover:border-white/25 hover:text-white"
                }`}
              >
                <span>
                  {dept === "acting" ? "Acting" : formatDepartmentLabel(dept)}
                </span>
                <span className="text-[11px] opacity-75">({totalForDept})</span>
                {/* {active && (
                  <span className="ml-0.5 text-[11px] text-amber-300/80">
                    ×
                  </span>
                )} */}
              </button>
            );
          })}
        </div>

        {/* Search & Sort */}
        <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Filter by title or role..."
            className="w-full rounded-xl border border-white/10 bg-zinc-900/90 px-3.5 py-2 text-xs text-white placeholder-zinc-500 focus:border-amber-400/50 focus:outline-none sm:w-56"
          />

          <select
            value={sortBy}
            onChange={(e) => handleSortChange(e.target.value as SortOption)}
            aria-label="Sort filmography"
            className="rounded-xl border border-white/10 bg-zinc-900/90 px-3.5 py-2 text-xs font-medium text-zinc-200 focus:border-amber-400/50 focus:outline-none"
          >
            <option value="newest">Sort: Newest</option>
            <option value="rating">Sort: Highest Rated</option>
            <option value="votes">Sort: Most Popular</option>
          </select>
        </div>
      </div>

      {/* 4-Column Poster Grid */}
      {visibleItems.length > 0 ? (
        <>
          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {visibleItems.map((item, idx) => (
              <CreditCard
                key={`${item.mediaType}-${item.ids?.trakt || item.ids?.slug || item.title}-${idx}`}
                item={item}
              />
            ))}
          </div>

          {/* Load More (+4) Button */}
         {remainingCount > 0 && (
  <div className="mt-8 flex justify-center">
    <button
      type="button"
      onClick={() => setVisibleCount((prev) => prev + LOAD_MORE_STEP)}
      className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-zinc-900/90 px-6 py-3 text-sm font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300"
    >
      <span>
        Load More ({Math.min(LOAD_MORE_STEP, remainingCount)})
      </span>
      <span className="text-xs text-zinc-400">
        • {remainingCount} remaining
      </span>
    </button>
  </div>
)}  
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-8 text-center text-sm text-zinc-400">
          No credits match your current filter.
        </div>
      )}
    </section>
  );
}