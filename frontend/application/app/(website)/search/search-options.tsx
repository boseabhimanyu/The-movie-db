"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Check,
  ChevronDown,
  Film,
  Search,
  SlidersHorizontal,
  Tv,
  Users,
  X,
} from "lucide-react";
import type { ActiveSearchFilters } from "./search-results-client";

interface DropdownOption {
  value: string;
  label: string;
}

interface DownwardSelectProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
}

function DownwardSelect({
  label,
  value,
  options,
  onChange,
}: DownwardSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutsideClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  const selectedOption =
    options.find((opt) => opt.value === value) || options[0];

  return (
    <div ref={containerRef} className="relative">
      <span className="mb-1 block text-[11px] font-medium text-zinc-400">
        {label}
      </span>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="flex h-10 w-full cursor-pointer items-center justify-between rounded-xl border border-white/10 bg-zinc-900 px-3 text-left text-xs font-medium text-zinc-200 transition hover:border-white/25 focus:border-amber-400/60 focus:outline-none"
      >
        <span className="truncate">{selectedOption?.label}</span>
        <ChevronDown
          className={`ml-2 h-3.5 w-3.5 shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-180 text-amber-400" : ""
          }`}
        />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute top-full left-0 z-50 mt-1.5 max-h-60 w-full overflow-y-auto rounded-xl border border-white/15 bg-zinc-900 py-1 shadow-2xl shadow-black/80"
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                role="option"
                aria-selected={isSelected}
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer items-center justify-between px-3 py-2 text-left text-xs transition ${
                  isSelected
                    ? "bg-amber-400/15 font-semibold text-amber-300"
                    : "text-zinc-300 hover:bg-white/5 hover:text-white"
                }`}
              >
                <span className="truncate">{opt.label}</span>
                {isSelected && (
                  <Check className="ml-2 h-3.5 w-3.5 shrink-0 text-amber-400" />
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface SearchOptionsProps {
  query: string;
  activeTab: "all" | "movies" | "shows" | "people";
  activeFilters: ActiveSearchFilters;
  totalCount: number;
  moviesTotal: number;
  showsTotal: number;
  peopleTotal: number;
}

const MOVIE_GENRES: DropdownOption[] = [
  { value: "", label: "All Genres" },
  { value: "action", label: "Action" },
  { value: "adventure", label: "Adventure" },
  { value: "animation", label: "Animation" },
  { value: "comedy", label: "Comedy" },
  { value: "crime", label: "Crime" },
  { value: "documentary", label: "Documentary" },
  { value: "drama", label: "Drama" },
  { value: "family", label: "Family" },
  { value: "fantasy", label: "Fantasy" },
  { value: "horror", label: "Horror" },
  { value: "mystery", label: "Mystery" },
  { value: "romance", label: "Romance" },
  { value: "science-fiction", label: "Sci-Fi" },
  { value: "superhero", label: "Superhero" },
  { value: "thriller", label: "Thriller" },
  { value: "war", label: "War" },
];

const SHOW_GENRES: DropdownOption[] = [
  { value: "", label: "All Genres" },
  { value: "action", label: "Action" },
  { value: "adventure", label: "Adventure" },
  { value: "animation", label: "Animation" },
  { value: "anime", label: "Anime" },
  { value: "comedy", label: "Comedy" },
  { value: "crime", label: "Crime" },
  { value: "documentary", label: "Documentary" },
  { value: "drama", label: "Drama" },
  { value: "family", label: "Family" },
  { value: "fantasy", label: "Fantasy" },
  { value: "horror", label: "Horror" },
  { value: "mystery", label: "Mystery" },
  { value: "romance", label: "Romance" },
  { value: "science-fiction", label: "Sci-Fi" },
  { value: "superhero", label: "Superhero" },
  { value: "thriller", label: "Thriller" },
  { value: "war", label: "War" },
];

const YEAR_OPTIONS: DropdownOption[] = [
  { value: "", label: "Any Year" },
  { value: "2026", label: "2026" },
  { value: "2025", label: "2025" },
  { value: "2024", label: "2024" },
  { value: "2020s", label: "2020s (2020–2029)" },
  { value: "2010s", label: "2010s (2010–2019)" },
  { value: "2000s", label: "2000s (2000–2009)" },
  { value: "1990s", label: "1990s (1990–1999)" },
  { value: "classic", label: "Classic (Before 1990)" },
];

const RATING_OPTIONS: DropdownOption[] = [
  { value: "", label: "Any Rating" },
  { value: "6", label: "6.0+ Good" },
  { value: "7", label: "7.0+ Great" },
  { value: "8", label: "8.0+ Acclaimed" },
  { value: "9", label: "9.0+ Masterpiece" },
];

const REGION_OPTIONS: DropdownOption[] = [
  { value: "", label: "All Regions" },
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "in", label: "India" },
  { value: "kr", label: "South Korea" },
  { value: "jp", label: "Japan" },
  { value: "fr", label: "France" },
  { value: "de", label: "Germany" },
  { value: "it", label: "Italy" },
  { value: "es", label: "Spain" },
];

const STATUS_OPTIONS: DropdownOption[] = [
  { value: "", label: "All Statuses" },
  { value: "returning series", label: "Returning Series" },
  { value: "ended", label: "Ended" },
  { value: "canceled", label: "Canceled" },
  { value: "in production", label: "In Production" },
];

export default function SearchOptions({
  query,
  activeTab,
  activeFilters,
  totalCount,
  moviesTotal,
  showsTotal,
  peopleTotal,
}: SearchOptionsProps) {
  const router = useRouter();

  // Controlled search text that stays in sync whenever URL `query` changes (e.g., from Navbar)
  const [inputValue, setInputValue] = useState(query);
  const [genre, setGenre] = useState(activeFilters.genre);
  const [year, setYear] = useState(activeFilters.year);
  const [minRating, setMinRating] = useState(activeFilters.minRating);
  const [country, setCountry] = useState(activeFilters.country);
  const [status, setStatus] = useState(activeFilters.status);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  useEffect(() => {
    setGenre(activeFilters.genre);
    setYear(activeFilters.year);
    setMinRating(activeFilters.minRating);
    setCountry(activeFilters.country);
    setStatus(activeFilters.status);
  }, [
    activeFilters.genre,
    activeFilters.year,
    activeFilters.minRating,
    activeFilters.country,
    activeFilters.status,
  ]);

  const hasActiveFilters = Boolean(
    activeFilters.genre ||
      activeFilters.year ||
      activeFilters.minRating ||
      activeFilters.country ||
      activeFilters.status
  );

  function pushSearchUrl(
    nextQuery: string,
    nextTab: "all" | "movies" | "shows" | "people",
    nextFilters: ActiveSearchFilters
  ) {
    const params = new URLSearchParams();
    const trimmed = nextQuery.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextTab !== "all") params.set("type", nextTab);

    if (trimmed && (nextTab === "movies" || nextTab === "shows")) {
      if (nextFilters.genre) params.set("genre", nextFilters.genre);
      if (nextFilters.year) params.set("year", nextFilters.year);
      if (nextFilters.minRating) params.set("min_rating", nextFilters.minRating);
      if (nextFilters.country) params.set("country", nextFilters.country);
      if (nextTab === "shows" && nextFilters.status) {
        params.set("status", nextFilters.status);
      }
    }

    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushSearchUrl(inputValue, activeTab, {
      genre,
      year,
      minRating,
      country,
      status,
    });
  }

  function handleClearSearch() {
    setInputValue("");
    setGenre("");
    setYear("");
    setMinRating("");
    setCountry("");
    setStatus("");
    const params = new URLSearchParams();
    if (activeTab !== "all") params.set("type", activeTab);
    const qs = params.toString();
    router.push(qs ? `/search?${qs}` : "/search");
  }

  function handleApplyFilters(e: React.FormEvent) {
    e.preventDefault();
    pushSearchUrl(inputValue || query, activeTab, {
      genre,
      year,
      minRating,
      country,
      status,
    });
  }

  const categories = [
    { key: "all", label: "All Categories", icon: Search },
    { key: "movies", label: "Movies", icon: Film },
    { key: "shows", label: "TV Shows", icon: Tv },
    { key: "people", label: "People", icon: Users },
  ] as const;

  return (
    <section className="relative z-20 border-b border-white/10 bg-zinc-900/50">
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

        {/* Search Input with Custom Reset (×) Button */}
        <form onSubmit={handleSearchSubmit} className="mt-5 max-w-2xl">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder={
                  activeTab === "movies"
                    ? "Search movies..."
                    : activeTab === "shows"
                    ? "Search TV shows..."
                    : activeTab === "people"
                    ? "Search actors, directors, writers..."
                    : "Search movies, TV shows, or people..."
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950 pr-10 pl-10 text-sm text-white placeholder:text-zinc-500 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search"
                  className="absolute top-1/2 right-3 -translate-y-1/2 cursor-pointer rounded-md p-1 text-zinc-400 transition hover:bg-white/10 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
            <button
              type="submit"
              className="h-11 cursor-pointer rounded-xl bg-amber-400 px-5 text-sm font-bold text-zinc-950 transition hover:bg-amber-300"
            >
              Search
            </button>
          </div>
        </form>

        {/* Tier 1: Category Selector */}
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
            <SlidersHorizontal className="h-3 w-3 text-amber-400" />
            <span>1. Select Category</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeTab === cat.key;
              const nextParams = new URLSearchParams();
              const activeQuery = inputValue.trim() || query;
              if (activeQuery) nextParams.set("q", activeQuery);
              if (cat.key !== "all") nextParams.set("type", cat.key);
              const qs = nextParams.toString();
              const href = qs ? `/search?${qs}` : "/search";

              const badgeCount = query
                ? cat.key === "all"
                  ? totalCount
                  : cat.key === "movies"
                  ? moviesTotal
                  : cat.key === "shows"
                  ? showsTotal
                  : peopleTotal
                : null;

              return (
                <Link
                  key={cat.key}
                  href={href}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-xs font-semibold transition ${
                    isSelected
                      ? "border-amber-400 bg-amber-400 text-zinc-950"
                      : "border-white/10 bg-zinc-950/80 text-zinc-300 hover:border-white/25 hover:text-white"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{cat.label}</span>
                  {badgeCount !== null && (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${
                        isSelected
                          ? "bg-zinc-950/15 text-zinc-950"
                          : "bg-white/5 text-zinc-400"
                      }`}
                    >
                      {badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Tier 2: Category-Specific Filters (Downward Dropdowns) */}
        {query && (activeTab === "movies" || activeTab === "shows") && (
          <form
            onSubmit={handleApplyFilters}
            className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/70 p-4"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                2. Refine {activeTab === "movies" ? "Movie" : "TV Show"} Results
              </span>
              {hasActiveFilters && (
                <Link
                  href={`/search?q=${encodeURIComponent(
                    query
                  )}&type=${activeTab}`}
                  className="text-xs font-semibold text-amber-400 transition hover:text-amber-300"
                >
                  Reset filters
                </Link>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <DownwardSelect
                label="Genre"
                value={genre}
                options={activeTab === "shows" ? SHOW_GENRES : MOVIE_GENRES}
                onChange={setGenre}
              />

              <DownwardSelect
                label={activeTab === "movies" ? "Release Year" : "First Aired"}
                value={year}
                options={YEAR_OPTIONS}
                onChange={setYear}
              />

              <DownwardSelect
                label="Min Rating"
                value={minRating}
                options={RATING_OPTIONS}
                onChange={setMinRating}
              />

              <DownwardSelect
                label="Region"
                value={country}
                options={REGION_OPTIONS}
                onChange={setCountry}
              />

              {activeTab === "shows" ? (
                <DownwardSelect
                  label="Show Status"
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={setStatus}
                />
              ) : (
                <div className="flex items-end">
                  <button
                    type="submit"
                    className="h-10 w-full cursor-pointer rounded-xl bg-amber-400 px-4 text-xs font-bold text-zinc-950 transition hover:bg-amber-300"
                  >
                    Apply Filters
                  </button>
                </div>
              )}
            </div>

            {activeTab === "shows" && (
              <div className="mt-3 flex justify-end">
                <button
                  type="submit"
                  className="h-9 cursor-pointer rounded-xl bg-amber-400 px-5 text-xs font-bold text-zinc-950 transition hover:bg-amber-300"
                >
                  Apply Filters
                </button>
              </div>
            )}
          </form>
        )}

        {query && activeTab === "all" && (
          <p className="mt-4 text-xs text-zinc-400">
            Tip: Select{" "}
            <Link
              href={`/search?q=${encodeURIComponent(query)}&type=movies`}
              className="font-semibold text-amber-400 hover:underline"
            >
              Movies
            </Link>{" "}
            or{" "}
            <Link
              href={`/search?q=${encodeURIComponent(query)}&type=shows`}
              className="font-semibold text-amber-400 hover:underline"
            >
              TV Shows
            </Link>{" "}
            above to expand results and unlock genre, year, rating, and region
            filters.
          </p>
        )}
      </div>
    </section>
  );
}