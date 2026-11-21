"use client";

import { useEffect, useRef, useState } from "react";
import { Globe, RotateCcw } from "lucide-react";

import api from "@/lib/api";
import { MediaItem, normalizeMediaList, HOME_RAIL_LIMIT } from "./home/media-types";
import HeroSection from "./home/HeroSection";
import TrendingMoviesSection from "./home/TrendingMoviesSection";
import PopularMoviesSection from "./home/PopularMoviesSection";
import TrendingShowsSection from "./home/TrendingShowsSection";
import PopularShowsSection from "./home/PopularShowsSection";

type HomepageClientProps = {
  initialTrendingMovies: MediaItem[];
  initialPopularMovies: MediaItem[];
  initialTrendingShows: MediaItem[];
  initialPopularShows: MediaItem[];
};

type FeedBundle = {
  trendingMovies: MediaItem[];
  popularMovies: MediaItem[];
  trendingShows: MediaItem[];
  popularShows: MediaItem[];
};

const COUNTRIES = [
  { code: "", label: "All Regions" },
  { code: "us", label: "United States" },
  { code: "gb", label: "United Kingdom" },
  { code: "in", label: "India" },
  { code: "kr", label: "South Korea" },
  { code: "jp", label: "Japan" },
  { code: "fr", label: "France" },
  { code: "es", label: "Spain" },
  { code: "de", label: "Germany" },
  { code: "ca", label: "Canada" },
  { code: "au", label: "Australia" },
];

const GENRES = [
  { slug: "", label: "All Genres" },
  { slug: "action", label: "Action" },
  { slug: "adventure", label: "Adventure" },
  { slug: "animation", label: "Animation" },
  { slug: "comedy", label: "Comedy" },
  { slug: "crime", label: "Crime" },
  { slug: "documentary", label: "Documentary" },
  { slug: "drama", label: "Drama" },
  { slug: "fantasy", label: "Fantasy" },
  { slug: "horror", label: "Horror" },
  { slug: "mystery", label: "Mystery" },
  { slug: "romance", label: "Romance" },
  { slug: "science-fiction", label: "Sci-Fi" },
  { slug: "thriller", label: "Thriller" },
];

export default function HomepageClient({
  initialTrendingMovies,
  initialPopularMovies,
  initialTrendingShows,
  initialPopularShows,
}: HomepageClientProps) {
  const [selectedCountry, setSelectedCountry] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");

  const [trendingMovies, setTrendingMovies] = useState(initialTrendingMovies);
  const [popularMovies, setPopularMovies] = useState(initialPopularMovies);
  const [trendingShows, setTrendingShows] = useState(initialTrendingShows);
  const [popularShows, setPopularShows] = useState(initialPopularShows);

  const [isFiltering, setIsFiltering] = useState(false);

  const feedCacheRef = useRef<Record<string, FeedBundle>>({
    "::": {
      trendingMovies: initialTrendingMovies,
      popularMovies: initialPopularMovies,
      trendingShows: initialTrendingShows,
      popularShows: initialPopularShows,
    },
  });

  const hasActiveFilters = Boolean(selectedCountry || selectedGenre);

  useEffect(() => {
    const cacheKey = `${selectedCountry}::${selectedGenre}`;
    const cached = feedCacheRef.current[cacheKey];

    if (cached) {
      setTrendingMovies(cached.trendingMovies);
      setPopularMovies(cached.popularMovies);
      setTrendingShows(cached.trendingShows);
      setPopularShows(cached.popularShows);
      setIsFiltering(false);
      return;
    }

    let cancelled = false;

    async function refreshFeeds() {
      setIsFiltering(true);

      const params: Record<string, string | number> = { limit: HOME_RAIL_LIMIT };
      if (selectedCountry) params.country = selectedCountry;
      if (selectedGenre) params.genre = selectedGenre;

      try {
        const [tmRes, pmRes, tsRes, psRes] = await Promise.all([
          api.get("/movies/trending", { params }),
          api.get("/movies/popular", { params }),
          api.get("/shows/trending", { params }),
          api.get("/shows/popular", { params }),
        ]);

        if (cancelled) return;

        const bundle: FeedBundle = {
          trendingMovies: normalizeMediaList(tmRes.data, "movie"),
          popularMovies: normalizeMediaList(pmRes.data, "movie"),
          trendingShows: normalizeMediaList(tsRes.data, "show"),
          popularShows: normalizeMediaList(psRes.data, "show"),
        };

        feedCacheRef.current[cacheKey] = bundle;

        setTrendingMovies(bundle.trendingMovies);
        setPopularMovies(bundle.popularMovies);
        setTrendingShows(bundle.trendingShows);
        setPopularShows(bundle.popularShows);
      } catch (error) {
        console.error("Failed to filter media feeds:", error);
      } finally {
        if (!cancelled) setIsFiltering(false);
      }
    }

    refreshFeeds();

    return () => {
      cancelled = true;
    };
  }, [selectedCountry, selectedGenre]);

  function resetFilters() {
    setSelectedCountry("");
    setSelectedGenre("");
  }

  return (
    <div className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      <HeroSection
        trendingMovies={trendingMovies}
        trendingShows={trendingShows}
        popularMovies={popularMovies}
        targetCount={5}
      />

      <section className="border-b border-white/10 bg-zinc-900/50 backdrop-blur-md">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold tracking-wider text-zinc-400 uppercase">
                <Globe className="h-3.5 w-3.5 text-amber-400" />
                Region
              </span>

              <select
                value={selectedCountry}
                onChange={(e) => setSelectedCountry(e.target.value)}
                aria-label="Filter by country"
                className="h-9 rounded-xl border border-white/10 bg-zinc-950 px-3 text-xs font-medium text-zinc-200 transition focus:border-amber-400/60 focus:outline-none"
              >
                {COUNTRIES.map((country) => (
                  <option key={country.code} value={country.code}>
                    {country.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3">
              {isFiltering && (
                <span className="text-xs text-amber-300">
                  Updating feeds...
                </span>
              )}

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-amber-400/40 hover:text-amber-300"
                >
                  <RotateCcw className="h-3 w-3" />
                  Reset filters
                </button>
              )}
            </div>
          </div>

          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-2 pt-1">
            {GENRES.map((genre) => {
              const active = selectedGenre === genre.slug;
              return (
                <button
                  key={genre.slug}
                  type="button"
                  onClick={() => setSelectedGenre(genre.slug)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition ${
                    active
                      ? "bg-amber-400 text-zinc-950 shadow-sm shadow-amber-500/20"
                      : "border border-white/10 bg-zinc-950/70 text-zinc-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  {genre.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* 2–5. Content Slider Sections */}
      <div
        className={`mx-auto max-w-[1400px] space-y-12 px-4 pt-10 transition-opacity duration-300 sm:px-6 lg:px-8 ${
          isFiltering ? "opacity-60" : "opacity-100"
        }`}
      >
        <TrendingMoviesSection items={trendingMovies} />
        <PopularMoviesSection items={popularMovies} />
        <TrendingShowsSection items={trendingShows} />
        <PopularShowsSection items={popularShows} />
      </div>
    </div>
  );
}