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

export default async function ShowsPage({
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
    "show",
    page,
    CATALOG_PAGE_LIMIT
  );

  try {
    const res = await api.get(`/shows/${sort}`, {
      params: {
        limit: CATALOG_PAGE_LIMIT,
        page,
      },
    });
    initialResult = normalizePaginatedMedia(
      res.data,
      "show",
      page,
      CATALOG_PAGE_LIMIT
    );
  } catch (error) {
    console.error("Failed to fetch initial shows catalog:", error);
  }

  return (
    <MediaCatalogClient
      type="show"
      initialResult={initialResult}
      initialSort={sort}
      initialPage={page}
    />
  );
}