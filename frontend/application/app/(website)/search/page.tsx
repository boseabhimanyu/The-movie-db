import type { Metadata } from "next";
import Link from "next/link";
import { Clapperboard } from "lucide-react";
import SearchOptions from "./search-options";
import SearchResultsClient, {
  type ActiveSearchFilters,
  type SearchMediaItem,
  type SearchPersonItem,
} from "./search-results-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface SearchPageProps {
  searchParams: Promise<{
    q?: string;
    type?: string;
    genres?: string;
    genre?: string;
    year?: string;
    min_rating?: string;
    language?: string;
    country?: string;
    status?: string;
  }>;
}

function buildFilterQueryString(filters: ActiveSearchFilters): string {
  const params = new URLSearchParams();
  if (filters.genres.length > 0) params.set("genres", filters.genres.join(","));
  if (filters.year) params.set("year", filters.year);
  if (filters.minRating) params.set("min_rating", filters.minRating);
  if (filters.language) params.set("language", filters.language);
  if (filters.country) params.set("country", filters.country);
  if (filters.status) params.set("status", filters.status);
  const str = params.toString();
  return str ? `&${str}` : "";
}

async function fetchSearchResults(
  query: string,
  activeTab: "all" | "movies" | "shows" | "people",
  filters: ActiveSearchFilters,
  hasActiveFilters: boolean
) {
  if (!query && !hasActiveFilters) {
    return {
      movies: [] as SearchMediaItem[],
      moviesTotal: 0,
      shows: [] as SearchMediaItem[],
      showsTotal: 0,
      people: [] as SearchPersonItem[],
      peopleTotal: 0,
    };
  }

  const encoded = encodeURIComponent(query);
  const limit = 30;
  const applyMediaFilters =
    activeTab === "all" || activeTab === "movies" || activeTab === "shows";

  const movieFilterSuffix = applyMediaFilters
    ? buildFilterQueryString({ ...filters, status: "" })
    : "";
  const showFilterSuffix = applyMediaFilters
    ? buildFilterQueryString(filters)
    : "";

  const [moviesRes, showsRes, peopleRes] = await Promise.allSettled([
    fetch(
      `${API_BASE}/movies/search?q=${encoded}&page=1&limit=${limit}${movieFilterSuffix}`,
      { cache: "no-store" }
    ),
    fetch(
      `${API_BASE}/shows/search?q=${encoded}&page=1&limit=${limit}${showFilterSuffix}`,
      { cache: "no-store" }
    ),
    query
      ? fetch(`${API_BASE}/people/search?q=${encoded}&page=1&limit=${limit}`, {
          cache: "no-store",
        })
      : Promise.resolve(null),
  ]);

  let movies: SearchMediaItem[] = [];
  let moviesTotal = 0;
  if (
    moviesRes.status === "fulfilled" &&
    moviesRes.value &&
    moviesRes.value.ok
  ) {
    const data = await moviesRes.value.json();
    movies = Array.isArray(data?.movies)
      ? data.movies
      : Array.isArray(data?.results)
      ? data.results
      : [];
    moviesTotal = data?.pagination?.totalItems ?? movies.length;
  }

  let shows: SearchMediaItem[] = [];
  let showsTotal = 0;
  if (
    showsRes.status === "fulfilled" &&
    showsRes.value &&
    showsRes.value.ok
  ) {
    const data = await showsRes.value.json();
    shows = Array.isArray(data?.shows)
      ? data.shows
      : Array.isArray(data?.results)
      ? data.results
      : [];
    showsTotal = data?.pagination?.totalItems ?? shows.length;
  }

  let people: SearchPersonItem[] = [];
  let peopleTotal = 0;
  if (
    peopleRes.status === "fulfilled" &&
    peopleRes.value &&
    peopleRes.value.ok
  ) {
    const data = await peopleRes.value.json();
    people = Array.isArray(data?.people)
      ? data.people
      : Array.isArray(data?.results)
      ? data.results
      : [];
    peopleTotal = data?.pagination?.totalItems ?? people.length;
  }

  return {
    movies,
    moviesTotal,
    shows,
    showsTotal,
    people,
    peopleTotal,
  };
}

export async function generateMetadata({
  searchParams,
}: SearchPageProps): Promise<Metadata> {
  const { q } = await searchParams;
  const query = q?.trim() || "";
  return {
    title: query ? `Search: ${query} | CineVault` : "Search & Browse | CineVault",
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = await searchParams;
  const query = params.q?.trim() || "";
  const activeTab: "all" | "movies" | "shows" | "people" =
    params.type === "movies" ||
    params.type === "shows" ||
    params.type === "people"
      ? params.type
      : "all";

  const canFilterMedia =
    activeTab === "all" || activeTab === "movies" || activeTab === "shows";

  const rawGenres = params.genres?.trim() || params.genre?.trim() || "";
  const parsedGenres = canFilterMedia
    ? Array.from(
        new Set(
          rawGenres
            .split(",")
            .map((g) => g.trim().toLowerCase())
            .filter(Boolean)
        )
      )
    : [];

  const activeFilters: ActiveSearchFilters = {
    genres: parsedGenres,
    year: canFilterMedia ? params.year?.trim() || "" : "",
    minRating: canFilterMedia ? params.min_rating?.trim() || "" : "",
    language: canFilterMedia ? params.language?.trim() || "" : "",
    country: canFilterMedia ? params.country?.trim() || "" : "",
    status:
      activeTab === "all" || activeTab === "shows"
        ? params.status?.trim() || ""
        : "",
  };

  const hasActiveFilters = Boolean(
    activeFilters.genres.length > 0 ||
      activeFilters.year ||
      activeFilters.minRating ||
      activeFilters.language ||
      activeFilters.country ||
      activeFilters.status
  );

  const {
    movies,
    moviesTotal,
    shows,
    showsTotal,
    people,
    peopleTotal,
  } = await fetchSearchResults(query, activeTab, activeFilters, hasActiveFilters);

  const allCategoriesTotal =
    hasActiveFilters || !query
      ? moviesTotal + showsTotal
      : moviesTotal + showsTotal + peopleTotal;

  const totalCount =
    activeTab === "movies"
      ? moviesTotal
      : activeTab === "shows"
      ? showsTotal
      : activeTab === "people"
      ? peopleTotal
      : allCategoriesTotal;

  return (
    <main className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      {/* Section 1: Search Options */}
      <SearchOptions
        query={query}
        activeTab={activeTab}
        activeFilters={activeFilters}
        totalCount={allCategoriesTotal}
        moviesTotal={moviesTotal}
        showsTotal={showsTotal}
        peopleTotal={peopleTotal}
      />

      {/* Sections 2, 3 & 4: Movie Results, Show Results, People Results */}
      <div className="mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
        {!query && !hasActiveFilters ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-12 text-center">
            <Clapperboard className="mx-auto h-8 w-8 text-amber-400/80" />
            <p className="mt-3 text-base font-medium text-zinc-300">
              Enter a title or person name above, or pick genres, language, and
              filters to browse CineVault.
            </p>
          </div>
        ) : totalCount === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-12 text-center">
            <p className="text-lg font-bold text-white">
              {query ? (
                <>
                  No matches found for “{query}”
                  {hasActiveFilters ? " with the selected filters" : ""}
                </>
              ) : (
                "No cached titles matched the selected filters yet"
              )}
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              {hasActiveFilters
                ? "Try removing a genre or broadening your year, rating, language, or region filters above."
                : "Try checking your spelling, switching categories, or searching with fewer keywords."}
            </p>
            {hasActiveFilters && (
              <Link
                href={
                  query
                    ? `/search?q=${encodeURIComponent(query)}${
                        activeTab !== "all" ? `&type=${activeTab}` : ""
                      }`
                    : activeTab !== "all"
                    ? `/search?type=${activeTab}`
                    : "/search"
                }
                className="mt-5 inline-flex items-center rounded-xl bg-amber-400 px-4 py-2 text-xs font-bold text-zinc-950 transition hover:bg-amber-300"
              >
                Clear All Filters
              </Link>
            )}
          </div>
        ) : (
          <SearchResultsClient
            query={query}
            activeTab={activeTab}
            activeFilters={activeFilters}
            initialMovies={movies}
            initialMoviesTotal={moviesTotal}
            initialShows={shows}
            initialShowsTotal={showsTotal}
            initialPeople={people}
            initialPeopleTotal={peopleTotal}
            apiBase={API_BASE}
          />
        )}
      </div>
    </main>
  );
}