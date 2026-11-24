"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { PaginationMeta, ReviewItem } from "./types";

interface CommunityReviewsProps {
  movieSlug: string;
  isAuthenticated: boolean;
  reviews: ReviewItem[];
  pagination: PaginationMeta;
  loadingPage: boolean;
  loadingMore?: boolean;
  helpfulPending: Record<string, boolean>;
  onToggleHelpful: (reviewId: string) => void;
  onLoadMore: () => void;
}

const INITIAL_LIMIT = 5;

function formatDate(dateStr: string): string {
  if (!dateStr) return "";
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return dateStr;
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export default function CommunityReviews({
  movieSlug,
  isAuthenticated,
  reviews,
  pagination,
  loadingPage,
  loadingMore = false,
  helpfulPending,
  onToggleHelpful,
  onLoadMore,
}: CommunityReviewsProps) {
  const [revealedSpoilers, setRevealedSpoilers] = useState<
    Record<string, boolean>
  >({});

  function toggleSpoiler(reviewId: string) {
    setRevealedSpoilers((prev) => ({
      ...prev,
      [reviewId]: !prev[reviewId],
    }));
  }

  const displayedReviews = isAuthenticated
    ? reviews
    : reviews.slice(0, INITIAL_LIMIT);

  const totalCount = Math.max(pagination.totalItems, reviews.length);
  const hasMoreToLoad = isAuthenticated
    ? reviews.length < totalCount || pagination.page < pagination.totalPages
    : totalCount > INITIAL_LIMIT;

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
      <div className="border-b border-white/10 pb-4">
        <h2 className="text-lg font-bold text-white">
          User Reviews ({totalCount})
        </h2>
      </div>

      {loadingPage ? (
        <div className="space-y-4 pt-5">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-28 animate-pulse rounded-2xl bg-zinc-950/70"
            />
          ))}
        </div>
      ) : displayedReviews.length === 0 ? (
        <p className="py-10 text-center text-sm text-zinc-400">
          No reviews to display yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {displayedReviews.map((review) => {
            const isSpoilerRevealed = Boolean(revealedSpoilers[review.id]);
            const isMasked = review.isSpoiler && !isSpoilerRevealed;
            const hasTitle = Boolean(review.title?.trim());
            const hasBody = Boolean(review.body?.trim());
            const toggleId = `spoiler-switch-${review.id}`;

            return (
              <article
                key={review.id}
                className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-zinc-800 text-xs font-bold text-amber-300">
                      {getInitials(review.user.name || review.user.username)}
                    </div>
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {review.user.name}
                        </span>
                        <span className="text-xs text-zinc-500">
                          @{review.user.username}
                        </span>
                        {review.isOwner && (
                          <span className="rounded bg-amber-400/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                            You
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500">
                        {formatDate(review.createdAt)}
                      </p>
                    </div>
                  </div>

                  <span className="shrink-0 rounded-lg border border-amber-400/30 bg-amber-400/10 px-2.5 py-1 text-xs font-bold text-amber-300">
                    ★ {review.rating} / 10
                  </span>
                </div>

                {(hasTitle || hasBody || review.isSpoiler) && (
                  <div className="mt-3.5">
                    {hasTitle && (
                      <h3 className="text-base font-bold text-white">
                        {review.title}
                      </h3>
                    )}

                    {isMasked ? (
                      <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3 text-xs font-medium text-amber-300/90">
                        This review contains spoilers. Turn on{" "}
                        <span className="font-semibold text-amber-200">
                          Spoilers
                        </span>{" "}
                        below to read.
                      </div>
                    ) : (
                      hasBody && (
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                          {review.body}
                        </p>
                      )
                    )}
                  </div>
                )}

                {(review.isSpoiler || !review.isOwner) && (
                  <div
                    className={`mt-4 flex items-center border-t border-white/5 pt-3 ${
                      review.isSpoiler && !review.isOwner
                        ? "justify-between"
                        : review.isSpoiler
                        ? "justify-start"
                        : "justify-end"
                    }`}
                  >
                    {review.isSpoiler && (
                      <div className="flex items-center gap-2.5">
                        <button
                          id={toggleId}
                          type="button"
                          role="switch"
                          aria-checked={isSpoilerRevealed}
                          onClick={() => toggleSpoiler(review.id)}
                          className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus:outline-none ${
                            isSpoilerRevealed
                              ? "border-amber-400 bg-amber-400"
                              : "border-white/15 bg-zinc-900"
                          }`}
                        >
                          <span
                            className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${
                              isSpoilerRevealed
                                ? "translate-x-4 bg-zinc-950"
                                : "translate-x-0.5 bg-zinc-400"
                            }`}
                          />
                        </button>
                        <label
                          htmlFor={toggleId}
                          className="cursor-pointer text-xs font-medium text-zinc-300 select-none"
                        >
                          Spoilers
                        </label>
                      </div>
                    )}

                    {!review.isOwner && (
                      <button
                        type="button"
                        onClick={() => onToggleHelpful(review.id)}
                        disabled={Boolean(helpfulPending[review.id])}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
                          review.isHelpful
                            ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
                            : "border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/25 hover:text-zinc-200"
                        }`}
                      >
                        <span>👍</span>
                        <span>Helpful</span>
                        <span className="text-zinc-500">
                          ({review.helpfulCount})
                        </span>
                      </button>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {!loadingPage && hasMoreToLoad && (
        <div className="mt-6 border-t border-white/10 pt-5">
          {isAuthenticated ? (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-zinc-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300 disabled:opacity-50"
              >
                {loadingMore ? "Loading..." : "Load More"}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-white/10 bg-zinc-950/80 px-5 py-4 text-center sm:flex-row sm:text-left">
              <div>
                <p className="text-sm font-semibold text-white">
                  Want to read all {totalCount} user reviews?
                </p>
                <p className="mt-0.5 text-xs text-zinc-400">
                  Sign in to load more reviews and vote on helpful comments.
                </p>
              </div>
              <Link
                href={`/login?redirect=/movies/${movieSlug}`}
                className="shrink-0 rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-amber-300"
              >
                Sign In to View More
              </Link>
            </div>
          )}
        </div>
      )}
    </section>
  );
}