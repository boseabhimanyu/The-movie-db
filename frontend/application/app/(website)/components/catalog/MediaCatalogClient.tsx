"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  Flame,
  Globe,
  RotateCcw,
  SlidersHorizontal,
  Star,
  Tv,
} from "lucide-react";

import api from "@/lib/api";
import PosterCard from "../home/PosterCard";
import {
  CATALOG_PAGE_LIMIT,
  MediaType,
  normalizePaginatedMedia,
  PaginatedMediaResult,
} from "../home/media-types";
import {
  CATALOG_COUNTRIES,
  CATALOG_GENRES,
  RATING_FILTERS,
  SHOW_STATUS_FILTERS,
  YEAR_FILTERS,
} from "./catalog-constants";

type SortMode = "trending" | "popular";

type MediaCatalogClientProps = {
  type: MediaType;
  initialResult: PaginatedMediaResult;
  initialSort: SortMode;
  initialCountry: string;
  initialGenre: string;
  initialYear: string;
  initialMinRating: string;
  initialStatus: string;
  initialPage: number;
};

function matchesYearFilter(year: number | undefined, filter: string): boolean {
  if (!filter) return true;
  if (!year) return false;
  if (filter === "2020s") return year >= 2020 && year <= 2026;
  if (filter === "2010s") return year >= 2010 && year <= 2019;
  if (filter === "2000s") return year >= 2000 && year <= 2009;
  if (filter === "classic") return year < 2000;
  const exact = Number(filter);
  return Number.isFinite(exact) ? year === exact : true;
}

export default function MediaCatalogClient({
  type,
  initialResult,
  initialSort,
  initialCountry,
  initialGenre,
  initialYear,
  initialMinRating,
  initialStatus,
  initialPage,
}: MediaCatalogClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sort, setSort] = useState<SortMode>(initialSort);
  const [country, setCountry] = useState(initialCountry);
  const [genre, setGenre] = useState(initialGenre);
  const [year, setYear] = useState(initialYear);
  const [minRating, setMinRating] = useState(initialMinRating);
  const [status, setStatus] = useState(initialStatus);
  const [page, setPage] = useState(initialPage);

  const [result, setResult] = useState<PaginatedMediaResult>(initialResult);
  const [isLoading, setIsLoading] = useState(false);

  const initialKey = `${initialSort}::${initialCountry}::${initialGenre}::${initialYear}::${initialMinRating}::${initialStatus}::${initialPage}`;
  const cacheRef = useRef<Record<string, PaginatedMediaResult>>({
    [initialKey]: initialResult,
  });

  // Sync state if user navigates via navbar/header links with new query params
  useEffect(() => {
    const nextSort =
      searchParams.get("sort") === "popular" ? "popular" : "trending";
    setSort(nextSort);
    setCountry(searchParams.get("country") ?? "");
    setGenre(searchParams.get("genre") ?? "");
    setYear(searchParams.get("year") ?? "");
    setMinRating(searchParams.get("min_rating") ?? "");
    setStatus(searchParams.get("status") ?? "");
    const parsedPage = Number(searchParams.get("page") ?? "1");
    setPage(Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1);
  }, [searchParams]);

  // Keep browser URL synchronized with active filters
  useEffect(() => {
    const params = new URLSearchParams();
    if (sort !== "trending") params.set("sort", sort);
    if (country) params.set("country", country);
    if (genre) params.set("genre", genre);
    if (year) params.set("year", year);
    if (minRating) params.set("min_rating", minRating);
    if (type === "show" && status) params.set("status", status);
    if (page > 1) params.set("page", String(page));

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [sort, country, genre, year, minRating, status, page, pathname, router, type]);

  // Fetch from Go/Gin backend whenever filter state changes
  useEffect(() => {
    const cacheKey = `${sort}::${country}::${genre}::${year}::${minRating}::${status}::${page}`;
    const cached = cacheRef.current[cacheKey];

    if (cached) {
      setResult(cached);
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCatalog() {
      setIsLoading(true);
      const endpoint =
        type === "movie" ? `/movies/${sort}` : `/shows/${sort}`;

      const params: Record<string, string | number> = {
        limit: CATALOG_PAGE_LIMIT,
        page,
      };
      if (country) params.country = country;
      if (genre) params.genre = genre;
      if (year) params.year = year;
      if (minRating) params.min_rating = minRating;
      if (type === "show" && status) params.status = status;

      try {
        const res = await api.get(endpoint, { params });
        if (cancelled) return;

        const normalized = normalizePaginatedMedia(
          res.data,
          type,
          page,
          CATALOG_PAGE_LIMIT,
        );
        cacheRef.current[cacheKey] = normalized;
        setResult(normalized);
      } catch (error) {
        console.error(`Failed to load ${type} catalog:`, error);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [type, sort, country, genre, year, minRating, status, page]);

  // Defensive client-side refinement in case backend handler ignores year/min_rating/status yet
  const visibleItems = useMemo(() => {
    const ratingThreshold = minRating ? parseFloat(minRating) : 0;

    return result.items.filter((item) => {
      if (!matchesYearFilter(item.year, year)) return false;
      if (
        ratingThreshold > 0 &&
        (item.ratingNum === undefined || item.ratingNum < ratingThreshold)
      ) {
        return false;
      }
      if (
        type === "show" &&
        status &&
        item.status &&
        item.status.toLowerCase() !== status.toLowerCase()
      ) {
        return false;
      }
      return true;
    });
  }, [result.items, year, minRating, status, type]);

  const hasActiveFilters = Boolean(
    country || genre || year || minRating || (type === "show" && status),
  );

  function resetAllFilters() {
    setCountry("");
    setGenre("");
    setYear("");
    setMinRating("");
    setStatus("");
    setPage(1);
  }

  function updateFilter<T>(setter: (val: T) => void, value: T) {
    setter(value);
    setPage(1);
  }

  const TitleIcon = type === "movie" ? Clapperboard : Tv;

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      {/* Compact Catalog Header */}
      <section className="border-b border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950">
        <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/25 bg-amber-400/10 px-3 py-1 text-xs font-semibold text-amber-300">
                <TitleIcon className="h-3.5 w-3.5" />
                {type === "movie" ? "Cinema Catalog" : "Television Catalog"}
              </div>
              <h1 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
                {type === "movie" ? "Explore Movies" : "Explore TV Shows"}
              </h1>
              <p className="max-w-2xl text-sm text-zinc-400">
                {type === "movie"
                  ? "Browse trending theatrical releases and all-time audience favorites by region, genre, release era, and rating."
                  : "Discover trending series and binge-worthy classics filtered by region, genre, air status, and rating."}
              </p>
            </div>

            {/* Sort Mode Switcher (Trending vs Popular) */}
            <div className="inline-flex self-start rounded-xl border border-white/10 bg-zinc-900/90 p-1 md:self-auto">
              <button
                type="button"
                onClick={() => updateFilter(setSort, "trending")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  sort === "trending"
                    ? "bg-amber-400 text-zinc-950 shadow-sm"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                <Flame className="h-3.5 w-3.5" />
                Trending
              </button>
              <button
                type="button"
                onClick={() => updateFilter(setSort, "popular")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
                  sort === "popular"
                    ? "bg-amber-400 text-zinc-950 shadow-sm"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                <Film className="h-3.5 w-3.5" />
                Popular
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Filter Toolbar */}
      <section className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-md">
        <div className="mx-auto max-w-[1400px] space-y-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                <SlidersHorizontal className="h-3.5 w-3.5 text-amber-400" />
                Filters
              </span>

              {/* Region */}
              <div className="relative inline-flex items-center">
                <Globe className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-zinc-400" />
                <select
                  value={country}
                  onChange={(e) => updateFilter(setCountry, e.target.value)}
                  aria-label="Filter by region"
                  className="h-9 rounded-xl border border-white/10 bg-zinc-950 pr-3 pl-8 text-xs font-medium text-zinc-200 transition focus:border-amber-400/60 focus:outline-none"
                >
                  {CATALOG_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Release Year / Era */}
              <select
                value={year}
                onChange={(e) => updateFilter(setYear, e.target.value)}
                aria-label="Filter by release year"
                className="h-9 rounded-xl border border-white/10 bg-zinc-950 px-3 text-xs font-medium text-zinc-200 transition focus:border-amber-400/60 focus:outline-none"
              >
                {YEAR_FILTERS.map((y) => (
                  <option key={y.value} value={y.value}>
                    {y.label}
                  </option>
                ))}
              </select>

              {/* Minimum Rating */}
              <div className="relative inline-flex items-center">
                <Star className="pointer-events-none absolute left-3 h-3.5 w-3.5 text-amber-400" />
                <select
                  value={minRating}
                  onChange={(e) => updateFilter(setMinRating, e.target.value)}
                  aria-label="Filter by minimum rating"
                  className="h-9 rounded-xl border border-white/10 bg-zinc-950 pr-3 pl-8 text-xs font-medium text-zinc-200 transition focus:border-amber-400/60 focus:outline-none"
                >
                  {RATING_FILTERS.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* TV Show Air Status (Shows catalog only) */}
              {type === "show" && (
                <select
                  value={status}
                  onChange={(e) => updateFilter(setStatus, e.target.value)}
                  aria-label="Filter by show status"
                  className="h-9 rounded-xl border border-white/10 bg-zinc-950 px-3 text-xs font-medium text-zinc-200 transition focus:border-amber-400/60 focus:outline-none"
                >
                  {SHOW_STATUS_FILTERS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center gap-3">
              {isLoading ? (
                <span className="text-xs text-amber-300">Loading...</span>
              ) : (
                <span className="text-xs text-zinc-400">
                  Showing{" "}
                  <strong className="font-semibold text-zinc-200">
                    {visibleItems.length}
                  </strong>
                  {result.isServerPaginated && result.total > visibleItems.length
                    ? ` of ${result.total}`
                    : ""}{" "}
                  {type === "movie" ? "movies" : "shows"}
                </span>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-400/40 hover:text-amber-300"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Centered Two-Row Genre Pills (matching homepage visual language) */}
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 pt-1">
            {CATALOG_GENRES.map((g) => {
              const active = genre === g.slug;
              return (
                <button
                  key={g.slug}
                  type="button"
                  onClick={() => updateFilter(setGenre, g.slug)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-amber-400 text-zinc-950 shadow-sm shadow-amber-500/20"
                      : "border border-white/10 bg-zinc-950/70 text-zinc-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {g.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 6-Column Catalog Grid */}
      <section className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6 lg:px-8">
        {visibleItems.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
            <TitleIcon className="h-10 w-10 text-zinc-600" />
            <h2 className="mt-4 text-lg font-semibold text-white">
              No {type === "movie" ? "movies" : "shows"} match these filters
            </h2>
            <p className="mt-1 max-w-md text-sm text-zinc-400">
              Try clearing one of your active filters or switching between
              Trending and Popular feeds.
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetAllFilters}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-amber-300"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset all filters
              </button>
            )}
          </div>
        ) : (
          <div
            className={`grid grid-cols-2 gap-4 transition-opacity duration-300 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${
              isLoading ? "opacity-55" : "opacity-100"
            }`}
          >
            {visibleItems.map((item) => (
              <PosterCard key={`${item.type}-${item.id}`} item={item} fluid />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {(page > 1 || result.totalPages > page || visibleItems.length >= CATALOG_PAGE_LIMIT) && (
          <div className="mt-12 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900 px-4 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>

            <span className="rounded-xl border border-white/10 bg-zinc-900/60 px-4 py-2 text-xs font-medium text-zinc-300">
              Page <strong className="text-white">{page}</strong>
              {result.isServerPaginated ? ` of ${result.totalPages}` : ""}
            </span>

            <button
              type="button"
              disabled={
                isLoading ||
                (result.isServerPaginated
                  ? page >= result.totalPages
                  : result.items.length < CATALOG_PAGE_LIMIT)
              }
              onClick={() => {
                setPage((p) => p + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900 px-4 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}