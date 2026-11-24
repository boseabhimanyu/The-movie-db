import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import SearchResultsClient, {
  type SearchMediaItem,
  type SearchPersonItem,
} from "./search-results-client";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1";

interface SearchPageProps {
  searchParams: Promise<{ q?: string; type?: string }>;
}

async function fetchSearchResults(query: string, activeTab: string) {
  if (!query) {
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
  const limit = activeTab === "all" ? 10 : 20;

  const [moviesRes, showsRes, peopleRes] = await Promise.allSettled([
    fetch(`${API_BASE}/movies/search?q=${encoded}&page=1&limit=${limit}`, {
      cache: "no-store",
    }),
    fetch(`${API_BASE}/shows/search?q=${encoded}&page=1&limit=${limit}`, {
      cache: "no-store",
    }),
    fetch(`${API_BASE}/people/search?q=${encoded}&page=1&limit=${limit}`, {
      cache: "no-store",
    }),
  ]);

  let movies: SearchMediaItem[] = [];
  let moviesTotal = 0;
  if (moviesRes.status === "fulfilled" && moviesRes.value.ok) {
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
  if (showsRes.status === "fulfilled" && showsRes.value.ok) {
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
  if (peopleRes.status === "fulfilled" && peopleRes.value.ok) {
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
    title: query ? `Search: ${query} | CineVault` : "Search | CineVault",
  };
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q, type } = await searchParams;
  const query = q?.trim() || "";
  const activeTab =
    type === "movies" || type === "shows" || type === "people" ? type : "all";

  const {
    movies,
    moviesTotal,
    shows,
    showsTotal,
    people,
    peopleTotal,
  } = await fetchSearchResults(query, activeTab);

  const totalCount = moviesTotal + showsTotal + peopleTotal;

  const tabs = [
    { key: "all", label: "All Results", count: totalCount },
    { key: "movies", label: "Movies", count: moviesTotal },
    { key: "shows", label: "TV Shows", count: showsTotal },
    { key: "people", label: "People", count: peopleTotal },
  ] as const;

  return (
    <main className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      {/* Search Header */}
      <section className="border-b border-white/10 bg-zinc-900/50">
        <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 uppercase">
            <Search className="h-3.5 w-3.5" />
            <span>Catalog Search</span>
          </div>

          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            {query ? (
              <>
                Results for <span className="text-amber-400">“{query}”</span>
              </>
            ) : (
              "Search CineVault"
            )}
          </h1>

          {/* Inline Search Form for quick refinement */}
          <form action="/search" method="GET" className="mt-5 max-w-xl">
            {activeTab !== "all" && (
              <input type="hidden" name="type" value={activeTab} />
            )}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <input
                  type="search"
                  name="q"
                  defaultValue={query}
                  placeholder="Search movies, TV shows, or people..."
                  className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950 pr-4 pl-10 text-sm text-white placeholder:text-zinc-500 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="h-11 cursor-pointer rounded-xl bg-amber-400 px-5 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
              >
                Search
              </button>
            </div>
          </form>

          {/* Filter Tabs */}
          {query && (
            <div className="mt-6 flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const isSelected = activeTab === tab.key;
                const href =
                  tab.key === "all"
                    ? `/search?q=${encodeURIComponent(query)}`
                    : `/search?q=${encodeURIComponent(query)}&type=${tab.key}`;

                return (
                  <Link
                    key={tab.key}
                    href={href}
                    className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                      isSelected
                        ? "border-amber-400 bg-amber-400 text-zinc-950"
                        : "border-white/10 bg-zinc-950/80 text-zinc-300 hover:border-white/25 hover:text-white"
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        isSelected
                          ? "bg-zinc-950/15 text-zinc-950"
                          : "bg-white/5 text-zinc-400"
                      }`}
                    >
                      {tab.count}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Results Body */}
      <div className="mx-auto mt-8 max-w-6xl px-4 sm:px-6 lg:px-8">
        {!query ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-12 text-center">
            <p className="text-base font-medium text-zinc-300">
              Enter a title or person name above to search across movies, series,
              and cast.
            </p>
          </div>
        ) : totalCount === 0 ? (
          <div className="rounded-3xl border border-white/10 bg-zinc-900/60 p-12 text-center">
            <p className="text-lg font-bold text-white">
              No matches found for “{query}”
            </p>
            <p className="mt-2 text-sm text-zinc-400">
              Try checking your spelling or searching with fewer keywords.
            </p>
          </div>
        ) : (
          <SearchResultsClient
            query={query}
            activeTab={activeTab}
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