"use client";

import React, { useState } from "react";
import type { PaginationMeta, ReviewItem } from "../types";

interface CommunityReviewsProps {
  reviews: ReviewItem[];
  pagination: PaginationMeta;
  loadingPage: boolean;
  helpfulPending: Record<string, boolean>;
  onToggleHelpful: (reviewId: string) => void;
  onPageChange: (page: number) => void;
}

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
  reviews,
  pagination,
  loadingPage,
  helpfulPending,
  onToggleHelpful,
  onPageChange,
}: CommunityReviewsProps) {
  const [hideSpoilersGlobally, setHideSpoilersGlobally] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState<
    Record<string, boolean>
  >({});

  const displayedReviews = hideSpoilersGlobally
    ? reviews.filter((r) => !r.isSpoiler)
    : reviews;

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <h2 className="text-lg font-bold text-white">
          User Reviews ({pagination.totalItems})
        </h2>

        <button
          type="button"
          onClick={() => setHideSpoilersGlobally((prev) => !prev)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
            hideSpoilersGlobally
              ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
              : "border-white/10 bg-zinc-950 text-zinc-400 hover:text-zinc-200"
          }`}
        >
          {hideSpoilersGlobally ? "Showing Non-Spoilers" : "Hide Spoilers"}
        </button>
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
            const isMasked =
              review.isSpoiler && !revealedSpoilers[review.id];

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

                <div className="mt-3.5">
                  <h3 className="text-base font-bold text-white">
                    {review.title}
                  </h3>

                  {isMasked ? (
                    <div className="mt-2 flex items-center justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/5 px-4 py-3">
                      <span className="text-xs font-medium text-amber-300">
                        This review contains spoilers.
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setRevealedSpoilers((prev) => ({
                            ...prev,
                            [review.id]: true,
                          }))
                        }
                        className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-semibold text-amber-200 transition hover:bg-amber-400/25"
                      >
                        Reveal Spoiler
                      </button>
                    </div>
                  ) : (
                    <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                      {review.body}
                    </p>
                  )}
                </div>

                <div className="mt-4 flex items-center justify-end border-t border-white/5 pt-3">
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
                </div>
              </article>
            );
          })}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4 text-xs">
          <button
            type="button"
            disabled={pagination.page <= 1}
            onClick={() => onPageChange(pagination.page - 1)}
            className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-1.5 font-semibold text-zinc-200 transition hover:border-amber-400/40 disabled:opacity-40"
          >
            ← Previous
          </button>
          <span className="text-zinc-400">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => onPageChange(pagination.page + 1)}
            className="rounded-lg border border-white/10 bg-zinc-950 px-3 py-1.5 font-semibold text-zinc-200 transition hover:border-amber-400/40 disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}