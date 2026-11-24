import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import ShowDetailClient from "./sections/show-detail-client";
import { ShowDetail, ShowReviewsResponse } from "../../components/media/types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface PageProps {
  params: Promise<{ slug: string }>;
}

async function fetchShow(slug: string): Promise<ShowDetail | null> {
  try {
    const res = await fetch(`${API_BASE}/shows/${encodeURIComponent(slug)}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    const show = data?.show ?? data;
    return show?.title ? show : null;
  } catch {
    return null;
  }
}

async function fetchInitialReviews(
  slug: string,
  cookieHeader: string
): Promise<ShowReviewsResponse> {
  const fallback: ShowReviewsResponse = {
    stats: {
      mediaType: "show",
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
      limit: 5,
      totalPages: 1,
      totalItems: 0,
    },
  };

  try {
    const res = await fetch(
      `${API_BASE}/shows/${encodeURIComponent(slug)}/reviews?page=1&limit=5`,
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
  const show = await fetchShow(slug);

  if (!show) {
    return { title: "Show Not Found" };
  }

  return {
    title: show.year ? `${show.title} (${show.year})` : show.title,
    description:
      show.overview || `Details, ratings, and reviews for ${show.title}.`,
  };
}

export default async function ShowDetailPage({ params }: PageProps) {
  const { slug } = await params;
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const [show, initialReviews] = await Promise.all([
    fetchShow(slug),
    fetchInitialReviews(slug, cookieHeader),
  ]);

  if (!show) {
    notFound();
  }

  return (
    <ShowDetailClient
      show={show}
      initialReviews={initialReviews}
      apiBase={API_BASE}
    />
  );
}