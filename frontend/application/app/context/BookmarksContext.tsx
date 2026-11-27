"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api from "@/lib/api";
import { useAuth } from "@/app/context/AuthContext";
import type { User } from "@/lib/types";

export type BookmarkMediaType = "movie" | "show";

export interface BookmarkItem {
  id: string;
  mediaType: BookmarkMediaType;
  mediaId: string;
  slug?: string;
  title?: string;
  year?: number;
  poster?: string;
  rating?: number;
  createdAt: string;
}

interface BookmarksContextValue {
  bookmarkedKeys: Set<string>;
  bookmarksLoading: boolean;
  isBookmarked: (mediaType: BookmarkMediaType, mediaId?: string | number) => boolean;
  isPending: (mediaType: BookmarkMediaType, mediaId?: string | number) => boolean;
  toggleBookmark: (
    mediaType: BookmarkMediaType,
    mediaId?: string | number
  ) => Promise<boolean>;
  syncSingleStatus: (
    mediaType: BookmarkMediaType,
    mediaId?: string | number
  ) => Promise<void>;
  refreshBookmarks: () => Promise<BookmarkItem[]>;
}

const BookmarksContext = createContext<BookmarksContextValue | undefined>(
  undefined
);

function makeKey(mediaType: BookmarkMediaType, mediaId?: string | number): string {
  return `${mediaType}:${String(mediaId ?? "").trim().toLowerCase()}`;
}

export function extractBookmarkList(payload: unknown): BookmarkItem[] {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return [];

  const obj = payload as Record<string, unknown>;
  if (Array.isArray(obj.bookmarks)) return obj.bookmarks as BookmarkItem[];
  if (Array.isArray(obj.results)) return obj.results as BookmarkItem[];
  if (Array.isArray(obj.items)) return obj.items as BookmarkItem[];

  if (obj.data && typeof obj.data === "object") {
    return extractBookmarkList(obj.data);
  }
  return [];
}

export function BookmarksProvider({
  children,
  initialUser,
}: {
  children: React.ReactNode;
  initialUser?: User | null;
}) {
  const { user: contextUser, authLoading } = useAuth();
  const effectiveUser = contextUser ?? initialUser ?? null;
  const isAuthenticated = Boolean(effectiveUser);
  const authSettled = Boolean(effectiveUser) || !authLoading;

  const [bookmarkedKeys, setBookmarkedKeys] = useState<Set<string>>(new Set());
  const [bookmarksLoading, setBookmarksLoading] = useState<boolean>(false);
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set());
  const loadedUserIdRef = useRef<string | null>(null);

  const refreshBookmarks = useCallback(async (): Promise<BookmarkItem[]> => {
    if (!isAuthenticated) {
      setBookmarkedKeys(new Set());
      setBookmarksLoading(false);
      return [];
    }

    setBookmarksLoading(true);
    try {
      const res = await api.get("/auth/bookmarks", {
        params: { page: 1, limit: 100 },
      });
      const list = extractBookmarkList(res.data);

      setBookmarkedKeys((prev) => {
        const next = new Set<string>();
        for (const item of list) {
          if (item.mediaType && item.mediaId) {
            next.add(makeKey(item.mediaType, item.mediaId));
          }
          if (item.mediaType && item.slug) {
            next.add(makeKey(item.mediaType, item.slug));
          }
        }
        for (const pKey of pendingKeys) {
          if (prev.has(pKey)) next.add(pKey);
        }
        return next;
      });

      return list;
    } catch {
      return [];
    } finally {
      setBookmarksLoading(false);
    }
  }, [isAuthenticated, pendingKeys]);

  useEffect(() => {
    if (!authSettled) return;

    if (!isAuthenticated || !effectiveUser?.id) {
      loadedUserIdRef.current = null;
      setBookmarkedKeys(new Set());
      setPendingKeys(new Set());
      return;
    }

    if (loadedUserIdRef.current !== effectiveUser.id) {
      loadedUserIdRef.current = effectiveUser.id;
      refreshBookmarks();
    }
  }, [authSettled, isAuthenticated, effectiveUser?.id, refreshBookmarks]);

  const isBookmarked = useCallback(
    (mediaType: BookmarkMediaType, mediaId?: string | number): boolean => {
      if (!mediaId) return false;
      return bookmarkedKeys.has(makeKey(mediaType, mediaId));
    },
    [bookmarkedKeys]
  );

  const isPending = useCallback(
    (mediaType: BookmarkMediaType, mediaId?: string | number): boolean => {
      if (!mediaId) return false;
      return pendingKeys.has(makeKey(mediaType, mediaId));
    },
    [pendingKeys]
  );

  const syncSingleStatus = useCallback(
    async (mediaType: BookmarkMediaType, mediaId?: string | number) => {
      const raw = String(mediaId ?? "").trim();
      if (!isAuthenticated || !raw) return;

      const key = makeKey(mediaType, raw);
      try {
        const res = await api.get<{ bookmarked?: boolean }>(
          `/auth/bookmarks/${mediaType}/${encodeURIComponent(raw)}/status`
        );
        setBookmarkedKeys((prev) => {
          const next = new Set(prev);
          if (res.data?.bookmarked) {
            next.add(key);
          } else {
            next.delete(key);
          }
          return next;
        });
      } catch {
        // Ignore transient error
      }
    },
    [isAuthenticated]
  );

  const toggleBookmark = useCallback(
    async (
      mediaType: BookmarkMediaType,
      mediaId?: string | number
    ): Promise<boolean> => {
      const raw = String(mediaId ?? "").trim();
      if (!isAuthenticated || !raw) return false;

      const key = makeKey(mediaType, raw);
      if (pendingKeys.has(key)) return bookmarkedKeys.has(key);

      const wasBookmarked = bookmarkedKeys.has(key);
      const nextState = !wasBookmarked;

      setPendingKeys((prev) => new Set(prev).add(key));
      setBookmarkedKeys((prev) => {
        const next = new Set(prev);
        if (nextState) {
          next.add(key);
        } else {
          next.delete(key);
        }
        return next;
      });

      try {
        if (nextState) {
          const res = await api.post("/auth/bookmarks", {
            mediaType,
            mediaId: raw,
          });
          const savedItem = res.data?.bookmark as BookmarkItem | undefined;
          setBookmarkedKeys((prev) => {
            const next = new Set(prev);
            next.add(key);
            if (savedItem?.mediaId) {
              next.add(makeKey(mediaType, savedItem.mediaId));
            }
            if (savedItem?.slug) {
              next.add(makeKey(mediaType, savedItem.slug));
            }
            return next;
          });
        } else {
          await api.delete(
            `/auth/bookmarks/${mediaType}/${encodeURIComponent(raw)}`
          );
        }
        return nextState;
      } catch {
        setBookmarkedKeys((prev) => {
          const next = new Set(prev);
          if (wasBookmarked) {
            next.add(key);
          } else {
            next.delete(key);
          }
          return next;
        });
        return wasBookmarked;
      } finally {
        setPendingKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [isAuthenticated, bookmarkedKeys, pendingKeys]
  );

  const value = useMemo(
    () => ({
      bookmarkedKeys,
      bookmarksLoading,
      isBookmarked,
      isPending,
      toggleBookmark,
      syncSingleStatus,
      refreshBookmarks,
    }),
    [
      bookmarkedKeys,
      bookmarksLoading,
      isBookmarked,
      isPending,
      toggleBookmark,
      syncSingleStatus,
      refreshBookmarks,
    ]
  );

  return (
    <BookmarksContext.Provider value={value}>
      {children}
    </BookmarksContext.Provider>
  );
}

export function useBookmarks(): BookmarksContextValue {
  const ctx = useContext(BookmarksContext);
  if (!ctx) {
    throw new Error("useBookmarks must be used inside <BookmarksProvider>");
  }
  return ctx;
}