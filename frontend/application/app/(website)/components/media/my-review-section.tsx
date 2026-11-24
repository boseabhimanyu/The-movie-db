"use client";

import React, { useState } from "react";
import Link from "next/link";
import type { ReviewItem } from "./types";

interface MyReviewSectionProps {
  movieTitle: string;
  movieSlug: string;
  isAuthenticated: boolean;
  myReview: ReviewItem | null;
  isEditing: boolean;
  rating: number;
  title: string;
  body: string;
  isSpoiler: boolean;
  submitting: boolean;
  deleting: boolean;
  formError: string | null;
  onRatingChange: (val: number) => void;
  onTitleChange: (val: string) => void;
  onBodyChange: (val: string) => void;
  onSpoilerChange: (val: boolean) => void;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onDelete: () => void;
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

export default function MyReviewSection({
  movieTitle,
  movieSlug,
  isAuthenticated,
  myReview,
  isEditing,
  rating,
  title,
  body,
  isSpoiler,
  submitting,
  deleting,
  formError,
  onRatingChange,
  onTitleChange,
  onBodyChange,
  onSpoilerChange,
  onStartEdit,
  onCancelEdit,
  onSubmit,
  onDelete,
}: MyReviewSectionProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  const activeScorePreview = hoverRating ?? rating;
  const hasSelectedRating = rating > 0;
  const hasWrittenContent = Boolean(
    myReview?.title?.trim() || myReview?.body?.trim()
  );

  function handleResetRating() {
    setHoverRating(null);
    onRatingChange(0);
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
      {!isAuthenticated ? (
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-white">
              Watched "{movieTitle}"?
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Sign in to rate out of 10 and share your review with the
              community.
            </p>
          </div>
          <Link
            href={`/login?redirect=/movies/${movieSlug}`}
            className="shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
          >
            Sign In to Review
          </Link>
        </div>
      ) : myReview && !isEditing ? (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="rounded-full border border-emerald-400/30 bg-emerald-400/15 px-3 py-0.5 text-xs font-semibold text-emerald-300">
                {hasWrittenContent ? "Your Review" : "Your Rating"}
              </span>
              <span className="text-xs text-zinc-400">
                Updated {formatDate(myReview.updatedAt)}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onStartEdit}
                className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:border-amber-400/40 hover:text-amber-300"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={deleting}
                className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-emerald-400/25 bg-zinc-950/70 p-4">
            <div className="flex items-center justify-between gap-3">
              {myReview.title?.trim() ? (
                <h3 className="text-base font-bold text-white">
                  {myReview.title}
                </h3>
              ) : (
                <p className="text-sm font-medium text-zinc-400">
                  {myReview.body?.trim()
                    ? "Your thoughts"
                    : "Rated without a written review"}
                </p>
              )}

              <span className="shrink-0 rounded-lg border border-emerald-400/30 bg-emerald-400/15 px-2.5 py-1 text-xs font-bold text-emerald-300">
                ★ {myReview.rating} / 10
              </span>
            </div>

            {myReview.body?.trim() && (
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
                {myReview.body}
              </p>
            )}

            {myReview.isSpoiler && (
              <span className="mt-3 inline-block rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                Marked as Spoiler
              </span>
            )}
          </div>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">
              {isEditing ? "Edit Your Rating & Review" : "Rate & Write a Review"}
            </h2>
            {isEditing && (
              <button
                type="button"
                onClick={onCancelEdit}
                className="text-xs font-medium text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                Your Rating <span className="text-amber-400">*</span>
              </label>
              <span
                className={`text-sm font-bold transition ${
                  activeScorePreview > 0 ? "text-amber-400" : "text-zinc-500"
                }`}
              >
                {activeScorePreview > 0
                  ? `★ ${activeScorePreview} / 10`
                  : "Select a rating"}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-10 gap-1.5">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                const active = activeScorePreview > 0 && num <= activeScorePreview;
                return (
                  <button
                    key={num}
                    type="button"
                    onMouseEnter={() => setHoverRating(num)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => onRatingChange(num)}
                    className={`flex h-9 items-center justify-center rounded-lg border text-xs font-bold transition ${
                      active
                        ? "border-amber-400 bg-amber-400 text-zinc-950"
                        : "border-white/10 bg-zinc-950 text-zinc-400 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label
              htmlFor="review-title"
              className="block text-xs font-semibold tracking-wider text-zinc-400 uppercase"
            >
              Headline{" "}
              <span className="font-normal text-zinc-500 normal-case">
                (Optional)
              </span>
            </label>
            <input
              id="review-title"
              type="text"
              value={title}
              onChange={(e) => onTitleChange(e.target.value)}
              placeholder="Sum up your thoughts in a few words..."
              maxLength={140}
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="review-body"
              className="block text-xs font-semibold tracking-wider text-zinc-400 uppercase"
            >
              Review{" "}
              <span className="font-normal text-zinc-500 normal-case">
                (Optional)
              </span>
            </label>
            <textarea
              id="review-body"
              rows={4}
              value={body}
              onChange={(e) => onBodyChange(e.target.value)}
              placeholder="What stood out about the story, performances, or direction?"
              className="mt-1.5 w-full rounded-xl border border-white/10 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
            />
          </div>

          {formError && (
            <p className="text-xs font-medium text-red-400">{formError}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
            {/* Small Spoiler Toggle */}
            <div className="flex items-center gap-2.5">
              <button
                id="spoiler-toggle"
                type="button"
                role="switch"
                aria-checked={isSpoiler}
                onClick={() => onSpoilerChange(!isSpoiler)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border transition-colors duration-200 focus:outline-none ${
                  isSpoiler
                    ? "border-amber-400 bg-amber-400"
                    : "border-white/15 bg-zinc-950"
                }`}
              >
                <span
                  className={`inline-block h-3.5 w-3.5 transform rounded-full transition-transform duration-200 ${
                    isSpoiler
                      ? "translate-x-4 bg-zinc-950"
                      : "translate-x-0.5 bg-zinc-400"
                  }`}
                />
              </button>
              <label
                htmlFor="spoiler-toggle"
                className="cursor-pointer text-xs font-medium text-zinc-300 select-none"
              >
                Contains spoilers
              </label>
            </div>

            {/* Action Buttons: Delete (Edit Mode) | Reset rating | Submit */}
            <div className="flex flex-wrap items-center gap-2.5">
              {isEditing && myReview && (
                <button
                  type="button"
                  onClick={onDelete}
                  disabled={deleting || submitting}
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/20 disabled:opacity-50"
                >
                  {deleting ? "Deleting..." : "Delete"}
                </button>
              )}

              {hasSelectedRating && (
                <button
                  type="button"
                  onClick={handleResetRating}
                  disabled={submitting || deleting}
                  className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-bold text-zinc-200 transition hover:border-white/30 hover:text-white disabled:opacity-50"
                >
                  Reset rating
                </button>
              )}

              <button
                type="submit"
                disabled={submitting || deleting}
                className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-bold text-zinc-950 transition hover:bg-amber-300 disabled:opacity-50"
              >
                {submitting
                  ? "Saving..."
                  : isEditing
                  ? "Update"
                  : title.trim() || body.trim()
                  ? "Publish Review"
                  : "Submit Rating"}
              </button>
            </div>
          </div>
        </form>
      )}
    </section>
  );
}