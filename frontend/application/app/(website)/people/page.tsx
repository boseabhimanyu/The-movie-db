import type { Metadata } from "next";
import api from "@/lib/api";
import { PersonSearchResponse } from "./types";
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
      "Search actors, actresses, directors, and creators to explore their complete movie and TV show filmographies.",
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

  if (q) {
    try {
      const res = await api.get<PersonSearchResponse>("/people/search", {
        params: { q, page, limit: 12 },
      });
      initialResults = res.data?.results ?? [];
      initialTotalPages = res.data?.pagination?.totalPages ?? 1;
      initialTotalItems = res.data?.pagination?.totalItems ?? 0;
    } catch (error) {
      console.error("Failed to fetch initial people search:", error);
    }
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