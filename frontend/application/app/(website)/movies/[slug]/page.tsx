import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import MovieDetailClient from "./movie-detail-client";
import type { MovieDetail, MovieReviewsResponse } from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchMovie(slug: string): Promise<MovieDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/movies/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.movie ?? null;
  } catch {
    return null;
  }
}

async function fetchInitialReviews(
  slug: string,
  cookieHeader: string
): Promise<MovieReviewsResponse> {
  const fallback: MovieReviewsResponse = {
    stats: {
      mediaType: "movie",
      mediaId: "",
      averageRating: 0,
      totalRatings: 0,
      totalReviews: 0,
      distribution: {},
    },
    myReview: null,
    results: [],
    pagination: {
      page: 1,
      limit: 10,
      totalPages: 1,
      totalItems: 0,
    },
  };

  try {
    const res = await fetch(
      `${API_BASE}/movies/${encodeURIComponent(slug)}/reviews?page=1&limit=10`,
      {
        cache: "no-store",
        headers: cookieHeader ? { Cookie: cookieHeader } : undefined,
      }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    return {
      stats: data.stats ?? fallback.stats,
      myReview: data.myReview ?? null,
      results: Array.isArray(data.results) ? data.results : [],
      pagination: data.pagination ?? fallback.pagination,
    };
  } catch {
    return fallback;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const movie = await fetchMovie(slug);

  if (!movie) {
    return { title: "Movie Not Found" };
  }

  return {
    title: `${movie.title} (${movie.year})`,
    description:
      movie.overview || `Details, ratings, and reviews for ${movie.title}.`,
  };
}

export default async function MovieDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [movie, initialReviews] = await Promise.all([
    fetchMovie(slug),
    fetchInitialReviews(slug, cookieHeader),
  ]);

  if (!movie) {
    notFound();
  }

  return (
    <MovieDetailClient
      movie={movie}
      initialReviews={initialReviews}
      apiBase={API_BASE}
    />
  );
}