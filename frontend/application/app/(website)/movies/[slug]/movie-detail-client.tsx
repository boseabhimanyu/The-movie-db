"use client";

import React, { useEffect, useRef, useState } from "react";
import type {
  MovieDetail,
  MovieReviewsResponse,
  ReviewItem,
} from "./types";
import MovieHero from "./sections/movie-hero";
import MovieCastSection from "./sections/movie-cast-section";
import RatingBreakdown from "./sections/rating-breakdown";
import MyReviewSection from "./sections/my-review-section";
import CommunityReviews from "./sections/community-reviews";
import MovieSidebar from "./sections/movie-sidebar";
import TrailerModal from "./sections/trailer-modal";
import PosterModal from "./sections/poster-modal"; // 1. Import PosterModal

interface MovieDetailClientProps {
  movie: MovieDetail;
  initialReviews: MovieReviewsResponse;
  apiBase: string;
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, "");

    if (host === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsed.pathname === "/watch") {
        return parsed.searchParams.get("v");
      }
      if (parsed.pathname.startsWith("/embed/")) {
        return parsed.pathname.split("/embed/")[1]?.split("/")[0] || null;
      }
      if (parsed.pathname.startsWith("/shorts/")) {
        return parsed.pathname.split("/shorts/")[1]?.split("/")[0] || null;
      }
    }
  } catch {
    return null;
  }
  return null;
}

export default function MovieDetailClient({
  movie,
  initialReviews,
  apiBase,
}: MovieDetailClientProps) {
  const composerRef = useRef<HTMLDivElement>(null);

  const [trailerOpen, setTrailerOpen] = useState(false);
  const [fullPosterUrl, setFullPosterUrl] = useState<string | null>(null); // 2. Add fullPosterUrl state

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    Boolean(initialReviews.myReview)
  );
  const [authChecked, setAuthChecked] = useState<boolean>(
    Boolean(initialReviews.myReview)
  );

  const [stats, setStats] = useState(initialReviews.stats);
  const [myReview, setMyReview] = useState<ReviewItem | null>(
    initialReviews.myReview
  );
  const [reviews, setReviews] = useState<ReviewItem[]>(initialReviews.results);
  const [pagination, setPagination] = useState(initialReviews.pagination);
  const [loadingPage, setLoadingPage] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState<number>(
    initialReviews.myReview?.rating ?? 8
  );
  const [title, setTitle] = useState<string>(
    initialReviews.myReview?.title ?? ""
  );
  const [body, setBody] = useState<string>(initialReviews.myReview?.body ?? "");
  const [isSpoiler, setIsSpoiler] = useState<boolean>(
    initialReviews.myReview?.isSpoiler ?? false
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [helpfulPending, setHelpfulPending] = useState<Record<string, boolean>>(
    {}
  );

  const youtubeId = extractYouTubeId(movie.trailer);

  useEffect(() => {
    let active = true;
    async function checkSession() {
      try {
        const res = await fetch(`${apiBase}/auth/me`, {
          credentials: "include",
        });
        if (!active) return;
        setIsAuthenticated(res.ok);
      } catch {
        if (!active) return;
        setIsAuthenticated(false);
      } finally {
        if (active) setAuthChecked(true);
      }
    }
    checkSession();
    return () => {
      active = false;
    };
  }, [apiBase]);

  async function refreshReviews(page = pagination.page) {
    setLoadingPage(true);
    try {
      const res = await fetch(
        `${apiBase}/movies/${encodeURIComponent(
          movie.ids.slug
        )}/reviews?page=${page}&limit=${pagination.limit}`,
        { credentials: "include" }
      );
      if (!res.ok) return;
      const data: MovieReviewsResponse = await res.json();
      setStats(data.stats);
      setMyReview(data.myReview ?? null);
      setReviews(data.results ?? []);
      setPagination(data.pagination);
      if (data.myReview && !isEditing) {
        setRating(data.myReview.rating);
        setTitle(data.myReview.title);
        setBody(data.myReview.body);
        setIsSpoiler(data.myReview.isSpoiler);
      }
    } finally {
      setLoadingPage(false);
    }
  }

  function scrollToComposer(startEdit = false) {
    if (startEdit && myReview) {
      setRating(myReview.rating);
      setTitle(myReview.title);
      setBody(myReview.body);
      setIsSpoiler(myReview.isSpoiler);
      setIsEditing(true);
    }
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  async function handleSubmitReview(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!title.trim() || !body.trim()) {
      setFormError("Please provide both a headline and review text.");
      return;
    }

    setSubmitting(true);
    try {
      const isUpdate = Boolean(myReview);
      const endpoint = `${apiBase}/movies/${encodeURIComponent(
        movie.ids.slug
      )}/reviews`;

      const res = await fetch(endpoint, {
        method: isUpdate ? "PATCH" : "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          title: title.trim(),
          body: body.trim(),
          isSpoiler,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data?.error || data?.message || "Failed to save review.");
        return;
      }

      setIsEditing(false);
      await refreshReviews(1);
    } catch {
      setFormError("Network error while saving your review.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDeleteReview() {
    if (!myReview || deleting) return;
    setDeleting(true);
    setFormError(null);

    try {
      const res = await fetch(`${apiBase}/reviews/${myReview.id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) {
        setFormError("Could not delete review.");
        return;
      }

      setMyReview(null);
      setIsEditing(false);
      setRating(8);
      setTitle("");
      setBody("");
      setIsSpoiler(false);
      await refreshReviews(1);
    } catch {
      setFormError("Network error while deleting review.");
    } finally {
      setDeleting(false);
    }
  }

  async function handleToggleHelpful(reviewId: string) {
    if (!isAuthenticated) {
      window.location.href = `/login?redirect=/movies/${movie.ids.slug}`;
      return;
    }
    if (helpfulPending[reviewId]) return;

    setHelpfulPending((prev) => ({ ...prev, [reviewId]: true }));
    try {
      const res = await fetch(`${apiBase}/reviews/${reviewId}/helpful`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.review) {
        setReviews((prev) =>
          prev.map((item) => (item.id === reviewId ? data.review : item))
        );
        if (myReview?.id === reviewId) {
          setMyReview(data.review);
        }
      }
    } finally {
      setHelpfulPending((prev) => ({ ...prev, [reviewId]: false }));
    }
  }

  return (
    <main className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      <MovieHero
        movie={movie}
        stats={stats}
        myReview={myReview}
        isAuthenticated={isAuthenticated}
        authChecked={authChecked}
        hasYouTubeTrailer={Boolean(youtubeId)}
        onOpenTrailer={() => setTrailerOpen(true)}
        onOpenFullPoster={(url) => setFullPosterUrl(url)} // 3. Pass handler to MovieHero
        onScrollToComposer={scrollToComposer}
      />

      <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 items-start gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="min-w-0 space-y-8">
          <MovieCastSection cast={movie.credits.cast} />

          <RatingBreakdown stats={stats} />

          <div ref={composerRef}>
            <MyReviewSection
              movieTitle={movie.title}
              movieSlug={movie.ids.slug}
              isAuthenticated={isAuthenticated}
              myReview={myReview}
              isEditing={isEditing}
              rating={rating}
              title={title}
              body={body}
              isSpoiler={isSpoiler}
              submitting={submitting}
              deleting={deleting}
              formError={formError}
              onRatingChange={setRating}
              onTitleChange={setTitle}
              onBodyChange={setBody}
              onSpoilerChange={setIsSpoiler}
              onStartEdit={() => scrollToComposer(true)}
              onCancelEdit={() => setIsEditing(false)}
              onSubmit={handleSubmitReview}
              onDelete={handleDeleteReview}
            />
          </div>

          <CommunityReviews
            reviews={reviews}
            pagination={pagination}
            loadingPage={loadingPage}
            helpfulPending={helpfulPending}
            onToggleHelpful={handleToggleHelpful}
            onPageChange={refreshReviews}
          />
        </div>

        <MovieSidebar movie={movie} />
      </div>

      <TrailerModal
        open={trailerOpen}
        movieTitle={movie.title}
        youtubeId={youtubeId}
        onClose={() => setTrailerOpen(false)}
      />

      {/* 4. Render PosterModal */}
      <PosterModal
        open={Boolean(fullPosterUrl)}
        movieTitle={movie.title}
        fullImageUrl={fullPosterUrl || ""}
        onClose={() => setFullPosterUrl(null)}
      />
    </main>
  );
}