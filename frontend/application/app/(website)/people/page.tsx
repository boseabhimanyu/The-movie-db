import type { Metadata } from "next";
import api from "@/lib/api";
import type { PersonSearchResponse } from "./types";
import PeopleSearchClient from "../components/people/PeopleSearchClient";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function pickParam(val: string | string[] | undefined): string {
  return Array.isArray(val) ? val[0] ?? "" : val ?? "";
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: SearchParams;
}): Promise<Metadata> {
  const sp = await searchParams;
  const q = pickParam(sp.q).trim();

  if (q) {
    return {
      title: `Search "${q}" — People`,
      description: `Browse actors, directors, and creators matching "${q}".`,
    };
  }

  return {
    title: "People — Cast & Crew Directory",
    description:
      "Discover popular actors and directors or search cast and crew to explore their complete movie and TV filmographies.",
  };
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = pickParam(sp.q).trim();
  const parsedPage = Number(pickParam(sp.page) || "1");
  const page = Number.isFinite(parsedPage) && parsedPage > 0 ? parsedPage : 1;

  let initialResults: PersonSearchResponse["results"] = [];
  let initialTotalPages = 0;
  let initialTotalItems = 0;

  try {
    const res = q
      ? await api.get<PersonSearchResponse>("/people/search", {
          params: { q, page, limit: 10 },
        })
      : await api.get<PersonSearchResponse>("/people/popular", {
          params: { page, limit: 10 },
        });

    initialResults = res.data?.results ?? [];
    initialTotalPages = res.data?.pagination?.totalPages ?? 1;
    initialTotalItems =
      res.data?.pagination?.totalItems ?? initialResults.length;
  } catch (error) {
    console.error("Failed to fetch initial people directory:", error);
  }

  return (
    <PeopleSearchClient
      initialQuery={q}
      initialPage={page}
      initialResults={initialResults}
      initialTotalPages={initialTotalPages}
      initialTotalItems={initialTotalItems}
    />
  );
}