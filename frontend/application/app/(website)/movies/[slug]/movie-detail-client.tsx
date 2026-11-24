"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import type {
  MovieDetail,
  MovieReviewsResponse,
  PaginationMeta,
  ReviewItem,
  ReviewStats,
} from "./types";
import MovieHero from "./sections/movie-hero";
import MovieCastSection from "./sections/movie-cast-section";
import RatingBreakdown from "./sections/rating-breakdown";
import MyReviewSection from "./sections/my-review-section";
import CommunityReviews from "./sections/community-reviews";
import MovieSidebar from "./sections/movie-sidebar";
import TrailerModal from "./sections/trailer-modal";
import PosterModal from "./sections/poster-modal";

interface MovieDetailClientProps {
  movie?: MovieDetail | null;
  initialReviews?: MovieReviewsResponse;
  apiBase?: string;
}

const DEFAULT_STATS: ReviewStats = {
  mediaType: "movie",
  mediaId: "",
  averageRating: 0,
  totalRatings: 0,
  totalReviews: 0,
  distribution: {},
};

const DEFAULT_PAGINATION: PaginationMeta = {
  page: 1,
  limit: 5,
  totalPages: 1,
  totalItems: 0,
};

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
  movie: initialMovie,
  initialReviews,
  apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1",
}: MovieDetailClientProps) {
  const params = useParams<{ slug?: string }>();
  const routeSlug = typeof params?.slug === "string" ? params.slug : "";

  const [movie, setMovie] = useState<MovieDetail | null>(initialMovie ?? null);
  const [movieFetchError, setMovieFetchError] = useState(false);

  const composerRef = useRef<HTMLDivElement>(null);
  const initialMyReview = initialReviews?.myReview ?? null;

  const [trailerOpen, setTrailerOpen] = useState(false);
  const [fullPosterUrl, setFullPosterUrl] = useState<string | null>(null);

  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    Boolean(initialMyReview)
  );
  const [authChecked, setAuthChecked] = useState<boolean>(
    Boolean(initialMyReview)
  );

  const [stats, setStats] = useState<ReviewStats>(
    initialReviews?.stats ?? DEFAULT_STATS
  );
  const [myReview, setMyReview] = useState<ReviewItem | null>(initialMyReview);
  const [reviews, setReviews] = useState<ReviewItem[]>(
    initialReviews?.results ?? []
  );
  const [pagination, setPagination] = useState<PaginationMeta>(
    initialReviews?.pagination ?? DEFAULT_PAGINATION
  );
  const [loadingPage, setLoadingPage] = useState(false);

  const [isEditing, setIsEditing] = useState(false);
  const [rating, setRating] = useState<number>(initialMyReview?.rating ?? 0);
  const [title, setTitle] = useState<string>(initialMyReview?.title ?? "");
  const [body, setBody] = useState<string>(initialMyReview?.body ?? "");
  const [isSpoiler, setIsSpoiler] = useState<boolean>(
    initialMyReview?.isSpoiler ?? false
  );
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [helpfulPending, setHelpfulPending] = useState<Record<string, boolean>>(
    {}
  );

  // Sync prop updates if SSR movie arrives
  useEffect(() => {
    if (initialMovie) {
      setMovie(initialMovie);
    }
  }, [initialMovie]);

  // Self-healing client fetch if `movie` prop wasn't passed by page.tsx
  useEffect(() => {
    if (movie || !routeSlug) return;
    let active = true;

    async function loadMovieOnClient() {
      try {
        const res = await fetch(
          `${apiBase}/movies/${encodeURIComponent(routeSlug)}`,
          { credentials: "include" }
        );
        if (!active) return;
        if (!res.ok) {
          setMovieFetchError(true);
          return;
        }
        const data = await res.json();
        const resolved = data?.movie ?? data;
        if (resolved?.title) {
          setMovie(resolved);
        } else {
          setMovieFetchError(true);
        }
      } catch {
        if (active) setMovieFetchError(true);
      }
    }

    loadMovieOnClient();
    return () => {
      active = false;
    };
  }, [movie, routeSlug, apiBase]);

  const movieSlug = movie?.ids?.slug || routeSlug;
  const youtubeId = extractYouTubeId(movie?.trailer ?? "");
  
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

  useEffect(() => {
    if (!initialReviews && movieSlug) {
      refreshReviews(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movieSlug]);

  const [loadingMore, setLoadingMore] = useState(false);

async function refreshReviews(page = 1, append = false) {
  if (!movieSlug) return;
  if (append) {
    setLoadingMore(true);
  } else {
    setLoadingPage(true);
  }
  try {
    const limit = 5;
    const res = await fetch(
      `${apiBase}/movies/${encodeURIComponent(
        movieSlug
      )}/reviews?page=${page}&limit=${limit}`,
      { credentials: "include" }
    );
    if (!res.ok) return;
    const data: MovieReviewsResponse = await res.json();
    setStats(data.stats ?? DEFAULT_STATS);
    setMyReview(data.myReview ?? null);
    setReviews((prev) => {
      const incoming = data.results ?? [];
      if (!append) return incoming;
      const existingIds = new Set(prev.map((r) => r.id));
      return [...prev, ...incoming.filter((r) => !existingIds.has(r.id))];
    });
    setPagination(data.pagination ?? DEFAULT_PAGINATION);
    if (data.myReview && !isEditing) {
      setRating(data.myReview.rating);
      setTitle(data.myReview.title);
      setBody(data.myReview.body);
      setIsSpoiler(data.myReview.isSpoiler);
    }
  } finally {
    if (append) {
      setLoadingMore(false);
    } else {
      setLoadingPage(false);
    }
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

    setSubmitting(true);
    try {
      const isUpdate = Boolean(myReview);
      const endpoint = `${apiBase}/movies/${encodeURIComponent(
        movieSlug
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
      setRating(0);
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
      window.location.href = `/login?redirect=/movies/${movieSlug}`;
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

  if (movieFetchError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        Unable to load movie details.
      </main>
    );
  }

  if (!movie) {
    return (
      <main className="min-h-screen bg-zinc-950 px-4 pt-12 pb-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl animate-pulse space-y-8">
          <div className="flex flex-col gap-8 md:flex-row">
            <div className="mx-auto aspect-[2/3] w-56 rounded-2xl bg-zinc-900 sm:w-64 md:mx-0" />
            <div className="flex-1 space-y-4">
              <div className="h-8 w-2/3 rounded-xl bg-zinc-900" />
              <div className="h-4 w-1/3 rounded-lg bg-zinc-900" />
              <div className="h-24 w-full rounded-xl bg-zinc-900" />
            </div>
          </div>
        </div>
      </main>
    );
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
        onOpenFullPoster={(url) => setFullPosterUrl(url)}
        onScrollToComposer={scrollToComposer}
      />

      {/* Full-Width Horizontal Cast Carousel */}
      <div className="mx-auto mt-10 max-w-6xl px-4 sm:px-6 lg:px-8">
        <MovieCastSection cast={movie?.credits?.cast ?? []} />
      </div>

      {/* Two-Column Reviews & Movie Details Sidebar Below */}
      <div className="mx-auto mt-8 grid max-w-6xl grid-cols-1 items-start gap-8 px-4 sm:px-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:px-8">
        <div className="min-w-0 space-y-8">
          <RatingBreakdown stats={stats} />

          <div ref={composerRef}>
            <MyReviewSection
              movieTitle={movie.title}
              movieSlug={movieSlug}
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
  movieSlug={movieSlug}
  isAuthenticated={isAuthenticated}
  reviews={reviews}
  pagination={pagination}
  loadingPage={loadingPage}
  loadingMore={loadingMore}
  helpfulPending={helpfulPending}
  onToggleHelpful={handleToggleHelpful}
  onLoadMore={() => refreshReviews(pagination.page + 1, true)}
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

      <PosterModal
        open={Boolean(fullPosterUrl)}
        movieTitle={movie.title}
        fullImageUrl={fullPosterUrl || ""}
        onClose={() => setFullPosterUrl(null)}
      />
    </main>
  );
}