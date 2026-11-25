import api from "@/lib/api";
import MediaCatalogClient from "../components/catalog/MediaCatalogClient";
import {
  CATALOG_PAGE_LIMIT,
  normalizePaginatedMedia,
} from "../components/home/media-types";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickParam(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] ?? "" : val ?? "";
}

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const sort = pickParam(sp.sort) === "popular" ? "popular" : "trending";
  const parsedPage = Number(pickParam(sp.page) || "1");
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let initialResult = normalizePaginatedMedia(
    [],
    "movie",
    page,
    CATALOG_PAGE_LIMIT
  );

  try {
    const res = await api.get(`/movies/${sort}`, {
      params: {
        limit: CATALOG_PAGE_LIMIT,
        page,
      },
    });
    initialResult = normalizePaginatedMedia(
      res.data,
      "movie",
      page,
      CATALOG_PAGE_LIMIT
    );
  } catch (error) {
    console.error("Failed to fetch initial movies catalog:", error);
  }

  return (
    <MediaCatalogClient
      type="movie"
      initialResult={initialResult}
      initialSort={sort}
      initialPage={page}
    />
  );
}