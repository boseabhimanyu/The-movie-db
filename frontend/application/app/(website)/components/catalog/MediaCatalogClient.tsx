"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ChevronLeft,
  ChevronRight,
  Clapperboard,
  Film,
  Flame,
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

type SortMode = "trending" | "popular";

type MediaCatalogClientProps = {
  type: MediaType;
  initialResult: PaginatedMediaResult;
  initialSort: SortMode;
  initialPage: number;
};

export default function MediaCatalogClient({
  type,
  initialResult,
  initialSort,
  initialPage,
}: MediaCatalogClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [sort, setSort] = useState<SortMode>(initialSort);
  const [page, setPage] = useState(initialPage);

  const [result, setResult] = useState<PaginatedMediaResult>(initialResult);
  const [isLoading, setIsLoading] = useState(false);

  const initialKey = `${initialSort}::${initialPage}`;
  const cacheRef = useRef<Record<string, PaginatedMediaResult>>({
    [initialKey]: initialResult,
  });

  // Sync state if user navigates via links with new query params
  useEffect(() => {
    const nextSort =
      searchParams.get("sort") === "popular" ? "popular" : "trending";
    setSort(nextSort);

    const parsedPage = Number(searchParams.get("page") ?? "1");
    setPage(Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1);
  }, [searchParams]);

  // Keep browser URL synchronized with active feed & page
  useEffect(() => {
    const params = new URLSearchParams();
    if (sort !== "trending") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));

    const queryString = params.toString();
    const nextUrl = queryString ? `${pathname}?${queryString}` : pathname;
    router.replace(nextUrl, { scroll: false });
  }, [sort, page, pathname, router]);

  // Fetch from backend whenever sort mode or page changes
  useEffect(() => {
    const cacheKey = `${sort}::${page}`;
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

      try {
        const res = await api.get(endpoint, {
          params: {
            limit: CATALOG_PAGE_LIMIT,
            page,
          },
        });
        if (cancelled) return;

        const normalized = normalizePaginatedMedia(
          res.data,
          type,
          page,
          CATALOG_PAGE_LIMIT
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
  }, [type, sort, page]);

  function switchSort(nextSort: SortMode) {
    if (nextSort === sort) return;
    setSort(nextSort);
    setPage(1);
  }

  const TitleIcon = type === "movie" ? Clapperboard : Tv;
  const items = result.items;

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
                  ? "Browse what is trending right now and all-time audience favorites."
                  : "Discover trending series right now and all-time audience favorites."}
              </p>
            </div>

            {/* Sort Mode Switcher (Trending vs Popular) */}
            <div className="inline-flex self-start rounded-xl border border-white/10 bg-zinc-900/90 p-1 md:self-auto">
              <button
                type="button"
                onClick={() => switchSort("trending")}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
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
                onClick={() => switchSort("popular")}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition ${
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

      {/* 6-Column Catalog Grid */}
      <section className="mx-auto max-w-[1400px] px-4 pt-8 sm:px-6 lg:px-8">
        {items.length === 0 && !isLoading ? (
          <div className="flex flex-col items-center justify-center rounded-3xl border border-white/10 bg-zinc-900/40 px-6 py-16 text-center">
            <TitleIcon className="h-10 w-10 text-zinc-600" />
            <h2 className="mt-4 text-lg font-semibold text-white">
              No {type === "movie" ? "movies" : "shows"} available right now
            </h2>
            <p className="mt-1 max-w-md text-sm text-zinc-400">
              Try switching between Trending and Popular feeds or check back
              shortly.
            </p>
          </div>
        ) : (
          <div
            className={`grid grid-cols-2 gap-4 transition-opacity duration-300 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 ${
              isLoading ? "opacity-55" : "opacity-100"
            }`}
          >
            {items.map((item) => (
              <PosterCard key={`${item.type}-${item.id}`} item={item} fluid />
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {(page > 1 ||
          result.totalPages > page ||
          items.length >= CATALOG_PAGE_LIMIT) && (
          <div className="mt-12 flex items-center justify-center gap-3">
            <button
              type="button"
              disabled={page <= 1 || isLoading}
              onClick={() => {
                setPage((p) => Math.max(1, p - 1));
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900 px-4 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
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
                  : items.length < CATALOG_PAGE_LIMIT)
              }
              onClick={() => {
                setPage((p) => p + 1);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
              className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-zinc-900 px-4 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
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