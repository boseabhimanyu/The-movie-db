export type MediaType = "movie" | "show";
// Tracks image URLs already downloaded/decoded during this browser tab session
// so remounted cards paint immediately from browser memory without shimmer delay.
export const decodedImageCache = new Set<string>();

export type MediaItem = {
  id: number | string;
  type: MediaType;
  title: string;
  slug: string;
  year?: number;
  tagline?: string;
  overview?: string;
  rating?: number;
  ratingNum?: number;
  votes?: number;
  genres: string[];
  certification?: string;
  runtime?: number;
  status?: string;
  posterUrl?: string;
  backdropUrl?: string;
  logoUrl?: string;
};

export type PaginatedMediaResult = {
  items: MediaItem[];
  total: number;
  page: number;
  totalPages: number;
  isServerPaginated: boolean;
};

export const HOME_RAIL_LIMIT = 12;
export const CATALOG_PAGE_LIMIT = 24;

export function toFanartPreviewUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.replace(
    /^(https?:\/\/assets\.fanart\.tv)\/fanart\//i,
    "$1/preview/",
  );
}

export function normalizeMediaList(
  payload: unknown,
  fallbackType: MediaType,
): MediaItem[] {
  const rawList: unknown[] = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object"
      ? ((payload as Record<string, unknown>).items as unknown[]) ??
        ((payload as Record<string, unknown>).movies as unknown[]) ??
        ((payload as Record<string, unknown>).shows as unknown[]) ??
        ((payload as Record<string, unknown>).results as unknown[]) ??
        ((payload as Record<string, unknown>).data as unknown[]) ??
        []
      : [];

  return rawList
    .map((entry, idx) => normalizeSingleMedia(entry, fallbackType, idx))
    .filter((item): item is MediaItem => item !== null);
}

function normalizeSingleMedia(
  entry: unknown,
  fallbackType: MediaType,
  index: number,
): MediaItem | null {
  if (!entry || typeof entry !== "object") return null;

  const wrapper = entry as Record<string, unknown>;
  const core =
    (wrapper.movie as Record<string, unknown>) ??
    (wrapper.show as Record<string, unknown>) ??
    wrapper;

  const ids = (core.ids as Record<string, unknown>) ?? {};
  const rawId =
    core.id ??
    core._id ??
    ids.slug ??
    ids.trakt ??
    ids.tmdb ??
    ids.imdb ??
    `item-${index}`;

  const slug = String(ids.slug ?? core.slug ?? rawId);
  const title = String(core.title ?? core.name ?? "Untitled");

  const artwork =
    (core.artwork as Record<string, unknown>) ??
    (wrapper.artwork as Record<string, unknown>) ??
    {};

  const posterUrl = pickImageUrl(
    artwork.poster,
    artwork.posters,
    core.poster,
    core.posterUrl,
  );

  const backdropUrl = pickImageUrl(
    artwork.backdrop,
    artwork.backdrops,
    artwork.thumb,
    artwork.banner,
    core.backdrop,
    core.fanart,
  );

  const logoUrl = pickImageUrl(artwork.logo, core.logo, core.clearlogo);

  const rawRating = Number(core.rating ?? 0);
  const rating =
    Number.isFinite(rawRating) && rawRating > 0
      ? Number(rawRating.toFixed(1))
      : undefined;

  const rawYear = Number(core.year);
  const year = Number.isFinite(rawYear) && rawYear > 1800 ? rawYear : undefined;

  const rawRuntime = Number(core.runtime);
  const runtime =
    Number.isFinite(rawRuntime) && rawRuntime > 0 ? rawRuntime : undefined;

  const genres = Array.isArray(core.genres)
    ? core.genres.map((g) => String(g))
    : [];

  return {
    id: String(rawId),
    slug,
    type: fallbackType,
    title,
    tagline: core.tagline ? String(core.tagline) : undefined,
    year,
    runtime,
    certification: core.certification ? String(core.certification) : undefined,
    rating,
    overview: core.overview ? String(core.overview) : undefined,
    genres,
    posterUrl,
    backdropUrl,
    logoUrl,
  };
}

function pickImageUrl(...candidates: unknown[]): string | undefined {
  for (const candidate of candidates) {
    if (!candidate) continue;
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
    if (Array.isArray(candidate) && candidate.length > 0) {
      for (const item of candidate) {
        if (typeof item === "string" && item.trim().length > 0) {
          return item.trim();
        }
        if (item && typeof item === "object" && "url" in item) {
          const url = (item as { url?: unknown }).url;
          if (typeof url === "string" && url.trim().length > 0) {
            return url.trim();
          }
        }
      }
    }
  }
  return undefined;
}

// Add inside normalizeMediaItem return object:
// ratingNum: typeof rawRating === "number" ? rawRating : parseFloat(String(rawRating)) || undefined,
// runtime: typeof item.runtime === "number" ? item.runtime : undefined,
// status: typeof item.status === "string" ? item.status : undefined,

export function normalizePaginatedMedia(
  payload: unknown,
  type: MediaType,
  requestedPage = 1,
  limit = CATALOG_PAGE_LIMIT,
): PaginatedMediaResult {
  const items = normalizeMediaList(payload, type);

  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const obj = payload as Record<string, unknown>;
    const total =
      typeof obj.total === "number"
        ? obj.total
        : typeof obj.total_items === "number"
          ? obj.total_items
          : items.length;
    const page = typeof obj.page === "number" ? obj.page : requestedPage;
    const totalPages =
      typeof obj.total_pages === "number"
        ? obj.total_pages
        : Math.max(1, Math.ceil(total / limit));

    return {
      items,
      total,
      page,
      totalPages,
      isServerPaginated:
        typeof obj.total === "number" || typeof obj.total_pages === "number",
    };
  }

  return {
    items,
    total: items.length,
    page: requestedPage,
    totalPages: items.length >= limit ? requestedPage + 1 : requestedPage,
    isServerPaginated: false,
  };
}