"use client";

import React from "react";
import type { ReviewStats } from "./types";

interface RatingBreakdownProps {
  stats: ReviewStats;
}

export default function RatingBreakdown({ stats }: RatingBreakdownProps) {
  const maxCount = Math.max(1, ...Object.values(stats.distribution || {}));

  return (
    <section className="rounded-3xl border border-white/10 bg-zinc-900/90 p-6 backdrop-blur-xl">
      <h2 className="text-lg font-bold text-white">Community Ratings</h2>
      <div className="mt-4 grid grid-cols-1 items-center gap-6 sm:grid-cols-[160px_minmax(0,1fr)]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-zinc-950/80 p-5 text-center">
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-extrabold text-amber-400">
              {stats.totalRatings > 0 ? stats.averageRating.toFixed(1) : "—"}
            </span>
            <span className="text-sm text-zinc-400">/ 10</span>
          </div>
          <p className="mt-1 text-xs text-zinc-400">
            {stats.totalRatings}{" "}
            {stats.totalRatings === 1 ? "rating" : "ratings"} •{" "}
            {stats.totalReviews}{" "}
            {stats.totalReviews === 1 ? "review" : "reviews"}
          </p>
        </div>

        <div className="space-y-1.5">
          {[10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((score) => {
            const count = stats.distribution?.[String(score)] ?? 0;
            const pct =
              stats.totalRatings > 0
                ? Math.round((count / maxCount) * 100)
                : 0;

            return (
              <div key={score} className="flex items-center gap-3 text-xs">
                <span className="w-5 text-right font-semibold text-zinc-400">
                  {score}
                </span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-amber-400 transition-all duration-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="w-6 text-right text-zinc-500">{count}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}