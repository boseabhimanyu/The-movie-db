"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Bookmark, Clapperboard, Loader2, Tv } from "lucide-react";
import api from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import {
  type BookmarkItem,
  extractBookmarkList,
  useBookmarks,
} from "@/app/context/BookmarksContext";
import PosterCard from "../components/home/PosterCard";
import { MediaItem } from "../components/home/media-types";

type TabFilter = "all" | "movie" | "show";

const INITIAL_LIMIT = 30;
const LOAD_MORE_STEP = 20;

function bookmarkToMediaItem(b: BookmarkItem): MediaItem {
  const slug = b.slug || b.mediaId;
  return {
    id: b.id || slug,
    type: b.mediaType,
    title: b.title || slug,
    slug,
    year: b.year && b.year > 0 ? b.year : undefined,
    rating:
      typeof b.rating === "number" && b.rating > 0
        ? Number(b.rating.toFixed(1))
        : undefined,
    genres: [],
    posterUrl: b.poster || undefined,
  };
}

function getBookmarkKey(b: BookmarkItem): string {
  return `${b.mediaType}:${(b.slug || b.mediaId).toLowerCase()}`;
}

function extractTotalCount(payload: unknown, fallback: number): number {
  if (!payload || typeof payload !== "object") return fallback;
  const obj = payload as Record<string, unknown>;

  const directCandidates = [
    obj.totalItems,
    obj.totalCount,
    obj.total_items,
    obj.total_count,
    obj.total,
    obj.count,
  ];
  for (const val of directCandidates) {
    if (typeof val === "number" && Number.isFinite(val)) return val;
  }

  const nested =
    (obj.pagination as Record<string, unknown> | undefined) ??
    (obj.meta as Record<string, unknown> | undefined) ??
    (obj.data as Record<string, unknown> | undefined);

  if (nested && typeof nested === "object") {
    const nestedCandidates = [
      nested.totalItems,
      nested.totalCount,
      nested.total_items,
      nested.total_count,
      nested.total,
      nested.count,
    ];
    for (const val of nestedCandidates) {
      if (typeof val === "number" && Number.isFinite(val)) return val;
    }
  }

  return fallback;
}

export default function BookmarksPage() {
  const { isAuthenticated, authLoading } = useAuth();
  const { bookmarkedKeys, bookmarksLoading } = useBookmarks();

  const [tab, setTab] = useState<TabFilter>("all");
  const [items, setItems] = useState<BookmarkItem[]>([]);
  const [totalItems, setTotalItems] = useState<number>(0);
  const [counts, setCounts] = useState<{
    all: number;
    movie: number;
    show: number;
  }>({ all: 0, movie: 0, show: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);

  const fetchInitialBookmarks = useCallback(async () => {
    if (!isAuthenticated) {
      setItems([]);
      setTotalItems(0);
      setCounts({ all: 0, movie: 0, show: 0 });
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const params: Record<string, string | number> = {
        page: 1,
        limit: INITIAL_LIMIT,
      };
      if (tab !== "all") {
        params.mediaType = tab;
      }

      const [listRes, allCountRes, movieCountRes, showCountRes] =
        await Promise.all([
          api.get("/auth/bookmarks", { params }),
          api.get("/auth/bookmarks", { params: { page: 1, limit: 1 } }),
          api.get("/auth/bookmarks", {
            params: { page: 1, limit: 1, mediaType: "movie" },
          }),
          api.get("/auth/bookmarks", {
            params: { page: 1, limit: 1, mediaType: "show" },
          }),
        ]);

      const incoming = extractBookmarkList(listRes.data);
      const movieTotal = extractTotalCount(movieCountRes.data, 0);
      const showTotal = extractTotalCount(showCountRes.data, 0);
      const rawAllTotal = extractTotalCount(
        allCountRes.data,
        movieTotal + showTotal
      );
      const allTotal = Math.max(rawAllTotal, movieTotal + showTotal);

      setCounts({
        all: allTotal,
        movie: movieTotal,
        show: showTotal,
      });

      const activeTotal =
        tab === "movie"
          ? movieTotal
          : tab === "show"
            ? showTotal
            : allTotal;

      setItems(incoming);
      setTotalItems(Math.max(activeTotal, incoming.length));
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, tab]);

  useEffect(() => {
    if (authLoading) return;
    fetchInitialBookmarks();
  }, [authLoading, fetchInitialBookmarks]);

  async function handleLoadMore() {
    if (loadingMore || items.length >= totalItems) return;

    setLoadingMore(true);
    try {
      const baseParams: Record<string, string | number> =
        tab !== "all" ? { mediaType: tab } : {};

      const currentCount = items.length;
      const targetCount = Math.min(currentCount + LOAD_MORE_STEP, totalItems);

      const startPage = Math.floor(currentCount / LOAD_MORE_STEP) + 1;
      const endPage = Math.ceil(targetCount / LOAD_MORE_STEP);

      const pageRequests = [];
      for (let p = startPage; p <= endPage; p++) {
        pageRequests.push(
          api.get("/auth/bookmarks", {
            params: { ...baseParams, page: p, limit: LOAD_MORE_STEP },
          })
        );
      }

      const responses = await Promise.all(pageRequests);
      const fetched: BookmarkItem[] = responses.flatMap((res) =>
        extractBookmarkList(res.data)
      );

      const lastRes = responses[responses.length - 1];
      const latestTotal = extractTotalCount(lastRes?.data, totalItems);
      setTotalItems((prev) => Math.max(prev, latestTotal));

      setItems((prev) => {
        const seen = new Set(prev.map(getBookmarkKey));
        const uniqueNew = fetched.filter((b) => {
          const key = getBookmarkKey(b);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return [...prev, ...uniqueNew.slice(0, LOAD_MORE_STEP)];
      });
    } finally {
      setLoadingMore(false);
    }
  }

  // Only remove items explicitly unbookmarked during this session
  const removedItems = bookmarksLoading
    ? []
    : items.filter((b) => {
        const key1 = `${b.mediaType}:${b.mediaId.toLowerCase()}`;
        const key2 = b.slug ? `${b.mediaType}:${b.slug.toLowerCase()}` : "";
        return (
          !bookmarkedKeys.has(key1) &&
          (key2 === "" || !bookmarkedKeys.has(key2))
        );
      });

  const removedSet = new Set(removedItems.map(getBookmarkKey));
  const visibleItems = items.filter((b) => !removedSet.has(getBookmarkKey(b)));

  const removedMovies = removedItems.filter(
    (b) => b.mediaType === "movie"
  ).length;
  const removedShows = removedItems.filter(
    (b) => b.mediaType === "show"
  ).length;

  const adjustedCounts = {
    all: Math.max(0, counts.all - removedItems.length),
    movie: Math.max(0, counts.movie - removedMovies),
    show: Math.max(0, counts.show - removedShows),
  };

  const adjustedTotal =
    tab === "movie"
      ? adjustedCounts.movie
      : tab === "show"
        ? adjustedCounts.show
        : adjustedCounts.all;

  const hasMore = items.length < totalItems;

  if (authLoading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center bg-zinc-950">
        <Loader2 className="h-6 w-6 animate-spin text-amber-400" />
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="mx-auto flex min-h-[60vh] max-w-xl flex-col items-center justify-center px-4 text-center">
        <Bookmark className="h-10 w-10 text-amber-400" />
        <h1 className="mt-4 text-2xl font-bold text-white">Your Bookmarks</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Sign in to save movies and TV shows to your personal watchlist.
        </p>
        <Link
          href="/login?redirect=/bookmarks"
          className="mt-6 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
        >
          Sign In
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 pt-10 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="flex items-center gap-2.5">
              <Bookmark className="h-6 w-6 text-amber-400" />
              <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                Saved Bookmarks
              </h1>
              {!loading && adjustedTotal > 0 && (
                <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                  {adjustedTotal}
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              Movies and TV shows saved to your account
            </p>
          </div>

          <div className="inline-flex rounded-xl border border-white/10 bg-zinc-900/90 p-1">
            {(
              [
                {
                  id: "all",
                  label: "All",
                  count: adjustedCounts.all,
                  icon: Bookmark,
                },
                {
                  id: "movie",
                  label: "Movies",
                  count: adjustedCounts.movie,
                  icon: Clapperboard,
                },
                {
                  id: "show",
                  label: "TV Shows",
                  count: adjustedCounts.show,
                  icon: Tv,
                },
              ] as const
            ).map(({ id, label, count, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                  tab === id
                    ? "bg-amber-400 text-zinc-950"
                    : "text-zinc-300 hover:text-white"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{label}</span>
                {!loading && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[11px] ${
                      tab === id
                        ? "bg-zinc-950/15 text-zinc-950"
                        : "bg-white/10 text-zinc-400"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
              {Array.from({ length: 12 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[2/3] animate-pulse rounded-2xl bg-zinc-900"
                />
              ))}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-12 text-center">
              <Bookmark className="mx-auto h-8 w-8 text-amber-400/80" />
              <p className="mt-3 text-base font-semibold text-white">
                No bookmarks yet
              </p>
              <p className="mt-1 text-sm text-zinc-400">
                Tap the bookmark icon on any movie or TV show to save it here.
              </p>
              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/movies"
                  className="rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-amber-300"
                >
                  Browse Movies
                </Link>
                <Link
                  href="/shows"
                  className="rounded-xl border border-white/15 bg-zinc-900 px-4 py-2 text-xs font-semibold text-zinc-200 hover:border-amber-400/40"
                >
                  Browse TV Shows
                </Link>
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                {visibleItems.map((b) => (
                  <PosterCard
                    key={`${b.mediaType}-${b.mediaId}`}
                    item={bookmarkToMediaItem(b)}
                    fluid
                  />
                ))}
              </div>

              {hasMore && (
                <div className="mt-10 flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {loadingMore ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <span>
                        Load More ({visibleItems.length} of {adjustedTotal})
                      </span>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}