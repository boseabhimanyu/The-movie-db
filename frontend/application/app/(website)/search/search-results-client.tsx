"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clapperboard, Loader2, Star, Tv, Users } from "lucide-react";

export interface SearchMediaItem {
  id?: string;
  title: string;
  year?: number;
  rating?: number;
  network?: string;
  ids?: { slug?: string; trakt?: number; imdb?: string };
  artwork?: { poster?: string; posters?: string[] };
  images?: { poster?: string };
}

export interface SearchPersonItem {
  id?: string;
  name: string;
  slug?: string;
  birthplace?: string;
  ids?: { slug?: string; trakt?: number; imdb?: string };
  artwork?: { headshot?: string; headshots?: string[] };
  images?: { headshot?: string };
}

interface SearchResultsClientProps {
  query: string;
  activeTab: "all" | "movies" | "shows" | "people";
  initialMovies: SearchMediaItem[];
  initialMoviesTotal: number;
  initialShows: SearchMediaItem[];
  initialShowsTotal: number;
  initialPeople: SearchPersonItem[];
  initialPeopleTotal: number;
  apiBase: string;
}

const SINGLE_TAB_LIMIT = 20;

function toPreviewArtworkUrl(url?: string): string {
  if (!url) return "";
  if (url.includes("assets.fanart.tv/fanart/")) {
    return url.replace("assets.fanart.tv/fanart/", "assets.fanart.tv/preview/");
  }
  if (url.includes("image.tmdb.org/t/p/original/")) {
    return url.replace("/t/p/original/", "/t/p/w500/");
  }
  return url;
}

function getMediaKey(item: SearchMediaItem, fallbackIdx: number): string {
  return (
    item.id ||
    item.ids?.slug ||
    (item.ids?.trakt ? `trakt-${item.ids.trakt}` : `media-${fallbackIdx}`)
  );
}

function getPersonKey(person: SearchPersonItem, fallbackIdx: number): string {
  return (
    person.id ||
    person.slug ||
    person.ids?.slug ||
    (person.ids?.trakt ? `trakt-${person.ids.trakt}` : `person-${fallbackIdx}`)
  );
}

export default function SearchResultsClient({
  query,
  activeTab,
  initialMovies,
  initialMoviesTotal,
  initialShows,
  initialShowsTotal,
  initialPeople,
  initialPeopleTotal,
  apiBase,
}: SearchResultsClientProps) {
  const [movies, setMovies] = useState<SearchMediaItem[]>(initialMovies);
  const [moviesTotal, setMoviesTotal] = useState(initialMoviesTotal);
  const [moviesPage, setMoviesPage] = useState(1);
  const [loadingMoreMovies, setLoadingMoreMovies] = useState(false);

  const [shows, setShows] = useState<SearchMediaItem[]>(initialShows);
  const [showsTotal, setShowsTotal] = useState(initialShowsTotal);
  const [showsPage, setShowsPage] = useState(1);
  const [loadingMoreShows, setLoadingMoreShows] = useState(false);

  const [people, setPeople] = useState<SearchPersonItem[]>(initialPeople);
  const [peopleTotal, setPeopleTotal] = useState(initialPeopleTotal);
  const [peoplePage, setPeoplePage] = useState(1);
  const [loadingMorePeople, setLoadingMorePeople] = useState(false);

  // Reset state whenever server props change (new query or tab)
  useEffect(() => {
    setMovies(initialMovies);
    setMoviesTotal(initialMoviesTotal);
    setMoviesPage(1);
  }, [initialMovies, initialMoviesTotal, query, activeTab]);

  useEffect(() => {
    setShows(initialShows);
    setShowsTotal(initialShowsTotal);
    setShowsPage(1);
  }, [initialShows, initialShowsTotal, query, activeTab]);

  useEffect(() => {
    setPeople(initialPeople);
    setPeopleTotal(initialPeopleTotal);
    setPeoplePage(1);
  }, [initialPeople, initialPeopleTotal, query, activeTab]);

  async function handleLoadMoreMovies() {
    if (loadingMoreMovies) return;
    setLoadingMoreMovies(true);
    const nextPage = moviesPage + 1;
    try {
      const res = await fetch(
        `${apiBase}/movies/search?q=${encodeURIComponent(
          query
        )}&page=${nextPage}&limit=${SINGLE_TAB_LIMIT}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const incoming: SearchMediaItem[] = Array.isArray(data?.movies)
        ? data.movies
        : Array.isArray(data?.results)
        ? data.results
        : [];
      setMovies((prev) => {
        const seen = new Set(prev.map((m, i) => getMediaKey(m, i)));
        return [
          ...prev,
          ...incoming.filter((m, i) => !seen.has(getMediaKey(m, i))),
        ];
      });
      if (typeof data?.pagination?.totalItems === "number") {
        setMoviesTotal(data.pagination.totalItems);
      }
      setMoviesPage(nextPage);
    } finally {
      setLoadingMoreMovies(false);
    }
  }

  async function handleLoadMoreShows() {
    if (loadingMoreShows) return;
    setLoadingMoreShows(true);
    const nextPage = showsPage + 1;
    try {
      const res = await fetch(
        `${apiBase}/shows/search?q=${encodeURIComponent(
          query
        )}&page=${nextPage}&limit=${SINGLE_TAB_LIMIT}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const incoming: SearchMediaItem[] = Array.isArray(data?.shows)
        ? data.shows
        : Array.isArray(data?.results)
        ? data.results
        : [];
      setShows((prev) => {
        const seen = new Set(prev.map((s, i) => getMediaKey(s, i)));
        return [
          ...prev,
          ...incoming.filter((s, i) => !seen.has(getMediaKey(s, i))),
        ];
      });
      if (typeof data?.pagination?.totalItems === "number") {
        setShowsTotal(data.pagination.totalItems);
      }
      setShowsPage(nextPage);
    } finally {
      setLoadingMoreShows(false);
    }
  }

  async function handleLoadMorePeople() {
    if (loadingMorePeople) return;
    setLoadingMorePeople(true);
    const nextPage = peoplePage + 1;
    try {
      const res = await fetch(
        `${apiBase}/people/search?q=${encodeURIComponent(
          query
        )}&page=${nextPage}&limit=${SINGLE_TAB_LIMIT}`
      );
      if (!res.ok) return;
      const data = await res.json();
      const incoming: SearchPersonItem[] = Array.isArray(data?.people)
        ? data.people
        : Array.isArray(data?.results)
        ? data.results
        : [];
      setPeople((prev) => {
        const seen = new Set(prev.map((p, i) => getPersonKey(p, i)));
        return [
          ...prev,
          ...incoming.filter((p, i) => !seen.has(getPersonKey(p, i))),
        ];
      });
      if (typeof data?.pagination?.totalItems === "number") {
        setPeopleTotal(data.pagination.totalItems);
      }
      setPeoplePage(nextPage);
    } finally {
      setLoadingMorePeople(false);
    }
  }

  const showMoviesSection =
    (activeTab === "all" || activeTab === "movies") && movies.length > 0;
  const showShowsSection =
    (activeTab === "all" || activeTab === "shows") && shows.length > 0;
  const showPeopleSection =
    (activeTab === "all" || activeTab === "people") && people.length > 0;

  return (
    <div className="space-y-10">
      {/* Movies Section */}
      {showMoviesSection && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Clapperboard className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">Movies</h2>
              <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                {moviesTotal}
              </span>
            </div>

            {activeTab === "all" && moviesTotal > movies.length && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&type=movies`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 transition hover:text-amber-300"
              >
                <span>View all ({moviesTotal})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {movies.map((movie, idx) => {
              const slug =
                movie.ids?.slug || String(movie.ids?.trakt || movie.id || idx);
              const poster = toPreviewArtworkUrl(
                movie.artwork?.poster ||
                  movie.artwork?.posters?.[0] ||
                  movie.images?.poster
              );

              return (
                <Link
                  key={getMediaKey(movie, idx)}
                  href={`/movies/${encodeURIComponent(slug)}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 transition hover:-translate-y-1 hover:border-amber-400/50"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
                    {poster ? (
                      <img
                        src={poster}
                        alt={movie.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs font-semibold text-zinc-500">
                        {movie.title}
                      </div>
                    )}
                    {(movie.rating ?? 0) > 0 && (
                      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-950/85 px-2 py-1 text-xs font-bold text-amber-300 backdrop-blur-md">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {movie.rating!.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-3">
                    <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-amber-300">
                      {movie.title}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-400">
                      {movie.year && movie.year > 0 ? movie.year : "TBA"}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>

          {activeTab === "movies" && movies.length < moviesTotal && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleLoadMoreMovies}
                disabled={loadingMoreMovies}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMoreMovies ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>
                    Load More ({movies.length} of {moviesTotal})
                  </span>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* TV Shows Section */}
      {showShowsSection && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Tv className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">TV Shows</h2>
              <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                {showsTotal}
              </span>
            </div>

            {activeTab === "all" && showsTotal > shows.length && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&type=shows`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 transition hover:text-amber-300"
              >
                <span>View all ({showsTotal})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {shows.map((show, idx) => {
              const slug =
                show.ids?.slug || String(show.ids?.trakt || show.id || idx);
              const poster = toPreviewArtworkUrl(
                show.artwork?.poster ||
                  show.artwork?.posters?.[0] ||
                  show.images?.poster
              );

              return (
                <Link
                  key={getMediaKey(show, idx)}
                  href={`/shows/${encodeURIComponent(slug)}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 transition hover:-translate-y-1 hover:border-amber-400/50"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
                    {poster ? (
                      <img
                        src={poster}
                        alt={show.title}
                        loading="lazy"
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center p-4 text-center text-xs font-semibold text-zinc-500">
                        {show.title}
                      </div>
                    )}
                    {(show.rating ?? 0) > 0 && (
                      <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 rounded-lg border border-white/10 bg-zinc-950/85 px-2 py-1 text-xs font-bold text-amber-300 backdrop-blur-md">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        {show.rating!.toFixed(1)}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-3">
                    <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-amber-300">
                      {show.title}
                    </h3>
                    <div className="mt-1 flex items-center justify-between gap-2 text-xs text-zinc-400">
                      <span>
                        {show.year && show.year > 0 ? show.year : "TBA"}
                      </span>
                      {show.network && (
                        <span className="truncate text-zinc-500">
                          {show.network}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {activeTab === "shows" && shows.length < showsTotal && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleLoadMoreShows}
                disabled={loadingMoreShows}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMoreShows ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>
                    Load More ({shows.length} of {showsTotal})
                  </span>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* People Section */}
      {showPeopleSection && (
        <section>
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">People</h2>
              <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
                {peopleTotal}
              </span>
            </div>

            {activeTab === "all" && peopleTotal > people.length && (
              <Link
                href={`/search?q=${encodeURIComponent(query)}&type=people`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 transition hover:text-amber-300"
              >
                <span>View all ({peopleTotal})</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {people.map((person, idx) => {
              const slug =
                person.slug ||
                person.ids?.slug ||
                String(person.ids?.trakt || person.id || idx);
              const headshot = toPreviewArtworkUrl(
                person.images?.headshot ||
                  person.artwork?.headshot ||
                  person.artwork?.headshots?.[0]
              );
              const initials = person.name
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((part) => part[0]?.toUpperCase())
                .join("");

              return (
                <Link
                  key={getPersonKey(person, idx)}
                  href={`/people/${encodeURIComponent(slug)}`}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/80 transition hover:-translate-y-1 hover:border-amber-400/50"
                >
                  <div className="relative aspect-[2/3] w-full overflow-hidden bg-zinc-800">
                    {headshot ? (
                      <img
                        src={headshot}
                        alt={person.name}
                        loading="lazy"
                        className="h-full w-full object-cover object-top transition duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-900 text-xl font-bold text-zinc-500">
                        {initials || "?"}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-3">
                    <h3 className="line-clamp-1 text-sm font-bold text-white group-hover:text-amber-300">
                      {person.name}
                    </h3>
                    {person.birthplace && (
                      <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
                        {person.birthplace}
                      </p>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>

          {activeTab === "people" && people.length < peopleTotal && (
            <div className="mt-8 flex flex-col items-center gap-2">
              <button
                type="button"
                onClick={handleLoadMorePeople}
                disabled={loadingMorePeople}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/15 bg-zinc-900 px-6 py-2.5 text-sm font-semibold text-white transition hover:border-amber-400/50 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loadingMorePeople ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                    <span>Loading...</span>
                  </>
                ) : (
                  <span>
                    Load More ({people.length} of {peopleTotal})
                  </span>
                )}
              </button>
            </div>
          )}
        </section>
      )}
    </div>
  );
}