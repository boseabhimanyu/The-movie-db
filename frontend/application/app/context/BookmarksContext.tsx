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

const EMPTY_SET = new Set<string>();

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

  // Once auth finishes loading on client, trust contextUser (which becomes null on logout)
  const effectiveUser = authLoading ? (contextUser ?? initialUser ?? null) : contextUser;
  const activeUserId = effectiveUser?.id ?? null;
  const isAuthenticated = Boolean(activeUserId);

  const [store, setStore] = useState<{
    ownerId: string | null;
    keys: Set<string>;
  }>({ ownerId: null, keys: EMPTY_SET });

  const [pendingKeys, setPendingKeys] = useState<Set<string>>(EMPTY_SET);
  const [bookmarksLoading, setBookmarksLoading] = useState<boolean>(false);
  const loadedUserIdRef = useRef<string | null>(null);

  // Scoped to the active user; automatically empty on logout with zero effect setState
  const bookmarkedKeys =
    activeUserId && store.ownerId === activeUserId ? store.keys : EMPTY_SET;

  const refreshBookmarks = useCallback(async (): Promise<BookmarkItem[]> => {
    if (!activeUserId) {
      return [];
    }

    const targetUserId = activeUserId;
    setBookmarksLoading(true);
    try {
      const res = await api.get("/auth/bookmarks", {
        params: { page: 1, limit: 100 },
      });
      const list = extractBookmarkList(res.data);

      setStore((prev) => {
        const next = new Set<string>();
        for (const item of list) {
          if (item.mediaType && item.mediaId) {
            next.add(makeKey(item.mediaType, item.mediaId));
          }
          if (item.mediaType && item.slug) {
            next.add(makeKey(item.mediaType, item.slug));
          }
        }
        if (prev.ownerId === targetUserId) {
          for (const pKey of pendingKeys) {
            if (prev.keys.has(pKey)) next.add(pKey);
          }
        }
        return { ownerId: targetUserId, keys: next };
      });

      return list;
    } catch {
      return [];
    } finally {
      setBookmarksLoading(false);
    }
  }, [activeUserId, pendingKeys]);

  useEffect(() => {
    if (!activeUserId) {
      loadedUserIdRef.current = null;
      return;
    }

    if (loadedUserIdRef.current !== activeUserId) {
      loadedUserIdRef.current = activeUserId;
      void refreshBookmarks();
    }
  }, [activeUserId, refreshBookmarks]);

  const isBookmarked = useCallback(
    (mediaType: BookmarkMediaType, mediaId?: string | number): boolean => {
      if (!activeUserId || !mediaId) return false;
      return bookmarkedKeys.has(makeKey(mediaType, mediaId));
    },
    [activeUserId, bookmarkedKeys]
  );

  const isPending = useCallback(
    (mediaType: BookmarkMediaType, mediaId?: string | number): boolean => {
      if (!activeUserId || !mediaId) return false;
      return pendingKeys.has(makeKey(mediaType, mediaId));
    },
    [activeUserId, pendingKeys]
  );

  const syncSingleStatus = useCallback(
    async (mediaType: BookmarkMediaType, mediaId?: string | number) => {
      const raw = String(mediaId ?? "").trim();
      if (!activeUserId || !raw) return;

      const targetUserId = activeUserId;
      const key = makeKey(mediaType, raw);
      try {
        const res = await api.get<{ bookmarked?: boolean }>(
          `/auth/bookmarks/${mediaType}/${encodeURIComponent(raw)}/status`
        );
        setStore((prev) => {
          const base =
            prev.ownerId === targetUserId ? new Set(prev.keys) : new Set<string>();
          if (res.data?.bookmarked) {
            base.add(key);
          } else {
            base.delete(key);
          }
          return { ownerId: targetUserId, keys: base };
        });
      } catch {
        // Ignore transient error
      }
    },
    [activeUserId]
  );

  const toggleBookmark = useCallback(
    async (
      mediaType: BookmarkMediaType,
      mediaId?: string | number
    ): Promise<boolean> => {
      const raw = String(mediaId ?? "").trim();
      if (!activeUserId || !raw) return false;

      const targetUserId = activeUserId;
      const key = makeKey(mediaType, raw);
      if (pendingKeys.has(key)) return bookmarkedKeys.has(key);

      const wasBookmarked = bookmarkedKeys.has(key);
      const nextState = !wasBookmarked;

      setPendingKeys((prev) => new Set(prev).add(key));
      setStore((prev) => {
        const base =
          prev.ownerId === targetUserId ? new Set(prev.keys) : new Set<string>();
        if (nextState) {
          base.add(key);
        } else {
          base.delete(key);
        }
        return { ownerId: targetUserId, keys: base };
      });

      try {
        if (nextState) {
          const res = await api.post("/auth/bookmarks", {
            mediaType,
            mediaId: raw,
          });
          const savedItem = res.data?.bookmark as BookmarkItem | undefined;
          setStore((prev) => {
            if (prev.ownerId !== targetUserId) return prev;
            const next = new Set(prev.keys);
            next.add(key);
            if (savedItem?.mediaId) {
              next.add(makeKey(mediaType, savedItem.mediaId));
            }
            if (savedItem?.slug) {
              next.add(makeKey(mediaType, savedItem.slug));
            }
            return { ownerId: targetUserId, keys: next };
          });
        } else {
          await api.delete(
            `/auth/bookmarks/${mediaType}/${encodeURIComponent(raw)}`
          );
        }
        return nextState;
      } catch {
        setStore((prev) => {
          if (prev.ownerId !== targetUserId) return prev;
          const next = new Set(prev.keys);
          if (wasBookmarked) {
            next.add(key);
          } else {
            next.delete(key);
          }
          return { ownerId: targetUserId, keys: next };
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
    [activeUserId, bookmarkedKeys, pendingKeys]
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