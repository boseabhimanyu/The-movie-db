"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bookmark, Loader2 } from "lucide-react";
import { useAuth } from "@/app/context/AuthContext";
import {
  type BookmarkMediaType,
  useBookmarks,
} from "@/app/context/BookmarksContext";

interface BookmarkButtonProps {
  mediaType: BookmarkMediaType;
  mediaId?: string | number;
  title?: string;
  variant?: "card" | "detail";
  className?: string;
}

export default function BookmarkButton({
  mediaType,
  mediaId,
  title,
  variant = "card",
  className = "",
}: BookmarkButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, authLoading } = useAuth();
  const { isBookmarked, isPending, toggleBookmark } = useBookmarks();

  if (!mediaId) return null;

  const saved = isAuthenticated && isBookmarked(mediaType, mediaId);
  const pending = isPending(mediaType, mediaId);

  async function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    e.preventDefault();
    e.stopPropagation();

    if (authLoading || pending) return;

    if (!isAuthenticated) {
      const redirectTo = pathname || `/${mediaType === "movie" ? "movies" : "shows"}/${mediaId}`;
      router.push(`/login?redirect=${encodeURIComponent(redirectTo)}`);
      return;
    }

    await toggleBookmark(mediaType, mediaId);
  }

  const label = saved
    ? `Remove ${title ?? mediaType} from bookmarks`
    : `Bookmark ${title ?? mediaType}`;

  if (variant === "detail") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-pressed={saved}
        aria-label={label}
        className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
          saved
            ? "border-amber-400/50 bg-amber-400/15 text-amber-300 hover:bg-amber-400/25"
            : "border-white/15 bg-white/5 text-zinc-100 hover:border-amber-400/40 hover:text-amber-300"
        } ${className}`}
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
        ) : (
          <Bookmark
            className={`h-4 w-4 ${
              saved ? "fill-amber-400 text-amber-400" : "text-amber-400"
            }`}
          />
        )}
        <span>{saved ? "Bookmarked" : "Bookmark"}</span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      aria-pressed={saved}
      aria-label={label}
      title={saved ? "Bookmarked" : "Bookmark"}
      className={`inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg border backdrop-blur-md transition disabled:cursor-not-allowed ${
        saved
          ? "border-amber-400/60 bg-zinc-950/90 text-amber-400 shadow-md shadow-amber-500/10"
          : "border-white/15 bg-zinc-950/75 text-zinc-200 opacity-90 hover:border-amber-400/50 hover:text-amber-300 group-hover:opacity-100"
      } ${className}`}
    >
      {pending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-400" />
      ) : (
        <Bookmark
          className={`h-3.5 w-3.5 ${
            saved ? "fill-amber-400 text-amber-400" : ""
          }`}
        />
      )}
    </button>
  );
}