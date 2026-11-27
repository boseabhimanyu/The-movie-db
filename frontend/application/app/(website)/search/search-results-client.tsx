"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clapperboard, Loader2, Star, Tv, Users } from "lucide-react";
import BookmarkButton from "../components/BookmarkButton";

export interface SearchMediaItem {
  id?: string;
  title: string;
  year?: number;
  rating?: number;
  language?: string;
  network?: string;
  status?: string;
  genres?: string[];
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

export interface ActiveSearchFilters {
  genres: string[];
  year: string;
  minRating: string;
  language: string;
  country: string;
  status: string;
}

interface SearchResultsClientProps {
  query: string;
  activeTab: "all" | "movies" | "shows" | "people";
  activeFilters: ActiveSearchFilters;
  initialMovies: SearchMediaItem[];
  initialMoviesTotal: number;
  initialShows: SearchMediaItem[];
  initialShowsTotal: number;
  initialPeople: SearchPersonItem[];
  initialPeopleTotal: number;
  apiBase: string;
}

const API_PAGE_LIMIT = 30;
const ALL_TAB_PREVIEW_COUNT = 10;
const INITIAL_VISIBLE_COUNT = 20;
const LOAD_MORE_STEP = 10;

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

function buildFilterParams(
  filters: ActiveSearchFilters,
  includeStatus: boolean
): string {
  const params = new URLSearchParams();
  if (filters.genres.length > 0) params.set("genres", filters.genres.join(","));
  if (filters.year) params.set("year", filters.year);
  if (filters.minRating) params.set("min_rating", filters.minRating);
  if (filters.language) params.set("language", filters.language);
  if (filters.country) params.set("country", filters.country);
  if (includeStatus && filters.status) params.set("status", filters.status);
  const str = params.toString();
  return str ? `&${str}` : "";
}

export default function SearchResultsClient({
  query,
  activeTab,
  activeFilters,
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
  const [moviesVisible, setMoviesVisible] = useState(INITIAL_VISIBLE_COUNT);
  const [moviesPage, setMoviesPage] = useState(1);
  const [loadingMoreMovies, setLoadingMoreMovies] = useState(false);

  const [shows, setShows] = useState<SearchMediaItem[]>(initialShows);
  const [showsTotal, setShowsTotal] = useState(initialShowsTotal);
  const [showsVisible, setShowsVisible] = useState(INITIAL_VISIBLE_COUNT);
  const [showsPage, setShowsPage] = useState(1);
  const [loadingMoreShows, setLoadingMoreShows] = useState(false);

  const [people, setPeople] = useState<SearchPersonItem[]>(initialPeople);
  const [peopleTotal, setPeopleTotal] = useState(initialPeopleTotal);
  const [peopleVisible, setPeopleVisible] = useState(INITIAL_VISIBLE_COUNT);
  const [peoplePage, setPeoplePage] = useState(1);
  const [loadingMorePeople, setLoadingMorePeople] = useState(false);

  const movieFilterKey = buildFilterParams(activeFilters, false);
  const showFilterKey = buildFilterParams(activeFilters, true);

  const hasActiveMediaFilters = Boolean(
    activeFilters.genres.length > 0 ||
      activeFilters.year ||
      activeFilters.minRating ||
      activeFilters.language ||
      activeFilters.country ||
      activeFilters.status
  );

  useEffect(() => {
    setMovies(initialMovies);
    setMoviesTotal(initialMoviesTotal);
    setMoviesVisible(INITIAL_VISIBLE_COUNT);
    setMoviesPage(1);
  }, [initialMovies, initialMoviesTotal, query, activeTab, movieFilterKey]);

  useEffect(() => {
    setShows(initialShows);
    setShowsTotal(initialShowsTotal);
    setShowsVisible(INITIAL_VISIBLE_COUNT);
    setShowsPage(1);
  }, [initialShows, initialShowsTotal, query, activeTab, showFilterKey]);

  useEffect(() => {
    setPeople(initialPeople);
    setPeopleTotal(initialPeopleTotal);
    setPeopleVisible(INITIAL_VISIBLE_COUNT);
    setPeoplePage(1);
  }, [initialPeople, initialPeopleTotal, query, activeTab]);

  async function handleLoadMoreMovies() {
    if (loadingMoreMovies) return;
    const nextVisible = moviesVisible + LOAD_MORE_STEP;
    if (nextVisible <= movies.length || movies.length >= moviesTotal) {
      setMoviesVisible(Math.min(nextVisible, movies.length));
      return;
    }

    setLoadingMoreMovies(true);
    const nextPage = moviesPage + 1;
    try {
      const res = await fetch(
        `${apiBase}/movies/search?q=${encodeURIComponent(
          query
        )}&page=${nextPage}&limit=${API_PAGE_LIMIT}${movieFilterKey}`
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
      setMoviesVisible(nextVisible);
    } finally {
      setLoadingMoreMovies(false);
    }
  }

  async function handleLoadMoreShows() {
    if (loadingMoreShows) return;
    const nextVisible = showsVisible + LOAD_MORE_STEP;
    if (nextVisible <= shows.length || shows.length >= showsTotal) {
      setShowsVisible(Math.min(nextVisible, shows.length));
      return;
    }

    setLoadingMoreShows(true);
    const nextPage = showsPage + 1;
    try {
      const res = await fetch(
        `${apiBase}/shows/search?q=${encodeURIComponent(
          query
        )}&page=${nextPage}&limit=${API_PAGE_LIMIT}${showFilterKey}`
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
      setShowsVisible(nextVisible);
    } finally {
      setLoadingMoreShows(false);
    }
  }

  async function handleLoadMorePeople() {
    if (loadingMorePeople) return;
    const nextVisible = peopleVisible + LOAD_MORE_STEP;
    if (nextVisible <= people.length || people.length >= peopleTotal) {
      setPeopleVisible(Math.min(nextVisible, people.length));
      return;
    }

    setLoadingMorePeople(true);
    const nextPage = peoplePage + 1;
    try {
      const res = await fetch(
        `${apiBase}/people/search?q=${encodeURIComponent(
          query
        )}&page=${nextPage}&limit=${API_PAGE_LIMIT}`
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
      setPeopleVisible(nextVisible);
    } finally {
      setLoadingMorePeople(false);
    }
  }

  const displayedMovies =
    activeTab === "all"
      ? movies.slice(0, ALL_TAB_PREVIEW_COUNT)
      : movies.slice(0, moviesVisible);
  const displayedShows =
    activeTab === "all"
      ? shows.slice(0, ALL_TAB_PREVIEW_COUNT)
      : shows.slice(0, showsVisible);
  const displayedPeople =
    activeTab === "all"
      ? people.slice(0, ALL_TAB_PREVIEW_COUNT)
      : people.slice(0, peopleVisible);

  const showMoviesSection =
    (activeTab === "all" || activeTab === "movies") && displayedMovies.length > 0;
  const showShowsSection =
    (activeTab === "all" || activeTab === "shows") && displayedShows.length > 0;
  const showPeopleSection =
    Boolean(query) &&
    (activeTab === "people" || (activeTab === "all" && !hasActiveMediaFilters)) &&
    displayedPeople.length > 0;

  const queryPrefix = query ? `q=${encodeURIComponent(query)}&` : "";

  return (
    <div className="space-y-12">
      {/* Section 2: Movie Results */}
      {showMoviesSection && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Clapperboard className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Movies</h2>
            <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
              {moviesTotal}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {displayedMovies.map((movie, idx) => {
              const slug =
                movie.ids?.slug || String(movie.ids?.trakt || movie.id || idx);
              const bookmarkId =
                movie.ids?.slug ||
                (movie.ids?.trakt ? String(movie.ids.trakt) : movie.id || "");
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
                    <BookmarkButton
                      mediaType="movie"
                      mediaId={bookmarkId}
                      title={movie.title}
                      variant="card"
                      className="absolute top-2.5 left-2.5 z-10"
                    />
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

          {activeTab === "all" && moviesTotal > displayedMovies.length && (
            <div className="mt-6 flex justify-center">
              <Link
                href={`/search?${queryPrefix}type=movies${movieFilterKey}`}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-2.5 text-xs font-bold text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-400/20"
              >
                <span>View all {moviesTotal} Movies</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {activeTab === "movies" && displayedMovies.length < moviesTotal && (
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
                    Load More ({displayedMovies.length} of {moviesTotal})
                  </span>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Section 3: Show Results */}
      {showShowsSection && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Tv className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">TV Shows</h2>
            <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
              {showsTotal}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {displayedShows.map((show, idx) => {
              const slug =
                show.ids?.slug || String(show.ids?.trakt || show.id || idx);
              const bookmarkId =
                show.ids?.slug ||
                (show.ids?.trakt ? String(show.ids.trakt) : show.id || "");
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
                    <BookmarkButton
                      mediaType="show"
                      mediaId={bookmarkId}
                      title={show.title}
                      variant="card"
                      className="absolute top-2.5 left-2.5 z-10"
                    />
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

          {activeTab === "all" && showsTotal > displayedShows.length && (
            <div className="mt-6 flex justify-center">
              <Link
                href={`/search?${queryPrefix}type=shows${showFilterKey}`}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-2.5 text-xs font-bold text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-400/20"
              >
                <span>View all {showsTotal} TV Shows</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {activeTab === "shows" && displayedShows.length < showsTotal && (
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
                    Load More ({displayedShows.length} of {showsTotal})
                  </span>
                )}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Section 4: People Results */}
      {showPeopleSection && (
        <section>
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-5 w-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">People</h2>
            <span className="rounded-full border border-white/10 bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-zinc-400">
              {peopleTotal}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {displayedPeople.map((person, idx) => {
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

          {activeTab === "all" && peopleTotal > displayedPeople.length && (
            <div className="mt-6 flex justify-center">
              <Link
                href={`/search?q=${encodeURIComponent(query)}&type=people`}
                className="inline-flex items-center gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 px-5 py-2.5 text-xs font-bold text-amber-300 transition hover:border-amber-400/60 hover:bg-amber-400/20"
              >
                <span>View all {peopleTotal} People</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {activeTab === "people" && displayedPeople.length < peopleTotal && (
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
                    Load More ({displayedPeople.length} of {peopleTotal})
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