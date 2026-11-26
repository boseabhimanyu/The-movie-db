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

const UNIFIED_GENRES: DropdownOption[] = [
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
  { value: "2023", label: "2023" },
  { value: "2022", label: "2022" },
  { value: "2021", label: "2021" },
  { value: "2020", label: "2020" },
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

const LANGUAGE_OPTIONS: DropdownOption[] = [
  { value: "", label: "All Languages" },
  { value: "en", label: "English" },
  { value: "hi", label: "Hindi" },
  { value: "bn", label: "Bengali" },
  { value: "te", label: "Telugu" },
  { value: "ta", label: "Tamil" },
  { value: "kn", label: "Kannada" },
  { value: "ml", label: "Malayalam" },
  { value: "mr", label: "Marathi" },
  { value: "pa", label: "Punjabi" },
  { value: "ko", label: "Korean" },
  { value: "ja", label: "Japanese" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "it", label: "Italian" },
  { value: "zh", label: "Chinese" },
  { value: "th", label: "Thai" },
  { value: "tr", label: "Turkish" },
];

const REGION_OPTIONS: DropdownOption[] = [
  { value: "", label: "All Regions" },
  { value: "us", label: "United States" },
  { value: "gb", label: "United Kingdom" },
  { value: "in", label: "India" },
  { value: "kr", label: "South Korea" },
  { value: "jp", label: "Japan" },
  { value: "ca", label: "Canada" },
  { value: "au", label: "Australia" },
  { value: "fr", label: "France" },
  { value: "de", label: "Germany" },
  { value: "it", label: "Italy" },
  { value: "es", label: "Spain" },
  { value: "br", label: "Brazil" },
  { value: "mx", label: "Mexico" },
  { value: "cn", label: "China" },
  { value: "hk", label: "Hong Kong" },
  { value: "tw", label: "Taiwan" },
  { value: "th", label: "Thailand" },
  { value: "tr", label: "Turkey" },
  { value: "se", label: "Sweden" },
  { value: "dk", label: "Denmark" },
];

const STATUS_OPTIONS: DropdownOption[] = [
  { value: "", label: "All Show Statuses" },
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

  const [inputValue, setInputValue] = useState(query);
  const [selectedGenres, setSelectedGenres] = useState<string[]>(
    activeFilters.genres
  );
  const [year, setYear] = useState(activeFilters.year);
  const [minRating, setMinRating] = useState(activeFilters.minRating);
  const [language, setLanguage] = useState(activeFilters.language);
  const [country, setCountry] = useState(activeFilters.country);
  const [status, setStatus] = useState(activeFilters.status);

  useEffect(() => {
    setInputValue(query);
  }, [query]);

  const genresKey = activeFilters.genres.join(",");
  useEffect(() => {
    setSelectedGenres(activeFilters.genres);
    setYear(activeFilters.year);
    setMinRating(activeFilters.minRating);
    setLanguage(activeFilters.language);
    setCountry(activeFilters.country);
    setStatus(activeFilters.status);
  }, [
    genresKey,
    activeFilters.year,
    activeFilters.minRating,
    activeFilters.language,
    activeFilters.country,
    activeFilters.status,
  ]);

  const hasActiveFilters = Boolean(
    activeFilters.genres.length > 0 ||
      activeFilters.year ||
      activeFilters.minRating ||
      activeFilters.language ||
      activeFilters.country ||
      activeFilters.status
  );

  function buildSearchHref(
    nextQuery: string,
    nextTab: "all" | "movies" | "shows" | "people",
    nextFilters: ActiveSearchFilters
  ): string {
    const params = new URLSearchParams();
    const trimmed = nextQuery.trim();
    if (trimmed) params.set("q", trimmed);
    if (nextTab !== "all") params.set("type", nextTab);

    if (nextTab === "all" || nextTab === "movies" || nextTab === "shows") {
      if (nextFilters.genres.length > 0) {
        params.set("genres", nextFilters.genres.join(","));
      }
      if (nextFilters.year) params.set("year", nextFilters.year);
      if (nextFilters.minRating) params.set("min_rating", nextFilters.minRating);
      if (nextFilters.language) params.set("language", nextFilters.language);
      if (nextFilters.country) params.set("country", nextFilters.country);
      if (
        (nextTab === "all" || nextTab === "shows") &&
        nextFilters.status
      ) {
        params.set("status", nextFilters.status);
      }
    }

    const qs = params.toString();
    return qs ? `/search?${qs}` : "/search";
  }

  function pushSearchUrl(
    nextQuery: string,
    nextTab: "all" | "movies" | "shows" | "people",
    nextFilters: ActiveSearchFilters
  ) {
    router.push(buildSearchHref(nextQuery, nextTab, nextFilters));
  }

  function applyImmediately(patch: Partial<ActiveSearchFilters>) {
    const nextFilters: ActiveSearchFilters = {
      genres: patch.genres !== undefined ? patch.genres : selectedGenres,
      year: patch.year !== undefined ? patch.year : year,
      minRating: patch.minRating !== undefined ? patch.minRating : minRating,
      language: patch.language !== undefined ? patch.language : language,
      country: patch.country !== undefined ? patch.country : country,
      status: patch.status !== undefined ? patch.status : status,
    };

    if (patch.genres !== undefined) setSelectedGenres(patch.genres);
    if (patch.year !== undefined) setYear(patch.year);
    if (patch.minRating !== undefined) setMinRating(patch.minRating);
    if (patch.language !== undefined) setLanguage(patch.language);
    if (patch.country !== undefined) setCountry(patch.country);
    if (patch.status !== undefined) setStatus(patch.status);

    pushSearchUrl(inputValue || query, activeTab, nextFilters);
  }

  function toggleGenre(slug: string) {
    const nextGenres = selectedGenres.includes(slug)
      ? selectedGenres.filter((g) => g !== slug)
      : [...selectedGenres, slug];
    applyImmediately({ genres: nextGenres });
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    pushSearchUrl(inputValue, activeTab, {
      genres: selectedGenres,
      year,
      minRating,
      language,
      country,
      status,
    });
  }

  function handleClearSearch() {
    setInputValue("");
    pushSearchUrl("", activeTab, {
      genres: selectedGenres,
      year,
      minRating,
      language,
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

  const showMediaFilters =
    activeTab === "all" || activeTab === "movies" || activeTab === "shows";

  const hasSearchOrFilters = Boolean(query) || hasActiveFilters;

  return (
    <section className="relative z-20 border-b border-white/10 bg-zinc-900/50">
      <div className="mx-auto max-w-6xl px-4 pt-10 pb-8 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-amber-400 uppercase">
          <Search className="h-3.5 w-3.5" />
          <span>Catalog Search & Discovery</span>
        </div>

        <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
          {query ? (
            <>
              Results for <span className="text-amber-400">“{query}”</span>
            </>
          ) : hasActiveFilters ? (
            "Filtered Catalog Results"
          ) : (
            "Search & Browse CineVault"
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
                    ? "Search movies (optional when filtering)..."
                    : activeTab === "shows"
                    ? "Search TV shows (optional when filtering)..."
                    : activeTab === "people"
                    ? "Search actors, directors, writers..."
                    : "Search movies, TV shows, people — or filter below..."
                }
                className="h-11 w-full rounded-xl border border-white/10 bg-zinc-950 pr-10 pl-10 text-sm text-white placeholder:text-zinc-500 focus:border-amber-400/60 focus:ring-2 focus:ring-amber-400/20 focus:outline-none"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={handleClearSearch}
                  aria-label="Clear search text"
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

        {/* Tier 1: Category Selector (Preserves active filters when switching tabs) */}
        <div className="mt-6">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
            <SlidersHorizontal className="h-3 w-3 text-amber-400" />
            <span>1. Select Category</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = activeTab === cat.key;
              const activeQuery = inputValue.trim() || query;
              const href = buildSearchHref(activeQuery, cat.key, {
                genres: selectedGenres,
                year,
                minRating,
                language,
                country,
                status,
              });

              const badgeCount = hasSearchOrFilters
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

        {/* Tier 2: Unified Filters (Always available on All, Movies & TV Shows — even without a query) */}
        {showMediaFilters && (
          <div className="mt-5 rounded-2xl border border-white/10 bg-zinc-950/70 p-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                2. Refine{" "}
                {activeTab === "movies"
                  ? "Movie"
                  : activeTab === "shows"
                  ? "TV Show"
                  : "Movie & TV Show"}{" "}
                Results
              </span>
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
                  className="text-xs font-semibold text-amber-400 transition hover:text-amber-300"
                >
                  Reset filters
                </Link>
              )}
            </div>

            {/* Multi-select Genre Bubbles (AND matching, instant apply) */}
            <div className="mb-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium text-zinc-400">
                  Genres{" "}
                  <span className="text-zinc-500">
                    (select multiple to match all)
                  </span>
                </span>
                {selectedGenres.length > 0 && (
                  <button
                    type="button"
                    onClick={() => applyImmediately({ genres: [] })}
                    className="cursor-pointer text-[11px] font-medium text-zinc-400 hover:text-amber-300"
                  >
                    Clear genres ({selectedGenres.length})
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {UNIFIED_GENRES.map((g) => {
                  const isActive = selectedGenres.includes(g.value);
                  return (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => toggleGenre(g.value)}
                      className={`cursor-pointer rounded-full border px-3 py-1 text-xs font-medium transition ${
                        isActive
                          ? "border-amber-400 bg-amber-400/20 font-semibold text-amber-300"
                          : "border-white/10 bg-zinc-900/90 text-zinc-300 hover:border-white/25 hover:text-white"
                      }`}
                    >
                      {g.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Dropdown Filters (Instant apply on select) */}
            <div
              className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
                activeTab === "movies" ? "lg:grid-cols-4" : "lg:grid-cols-5"
              }`}
            >
              <DownwardSelect
                label={activeTab === "movies" ? "Release Year" : "Year"}
                value={year}
                options={YEAR_OPTIONS}
                onChange={(val) => applyImmediately({ year: val })}
              />

              <DownwardSelect
                label="Min Rating"
                value={minRating}
                options={RATING_OPTIONS}
                onChange={(val) => applyImmediately({ minRating: val })}
              />

              <DownwardSelect
                label="Language"
                value={language}
                options={LANGUAGE_OPTIONS}
                onChange={(val) => applyImmediately({ language: val })}
              />

              <DownwardSelect
                label="Region"
                value={country}
                options={REGION_OPTIONS}
                onChange={(val) => applyImmediately({ country: val })}
              />

              {(activeTab === "all" || activeTab === "shows") && (
                <DownwardSelect
                  label="Show Status"
                  value={status}
                  options={STATUS_OPTIONS}
                  onChange={(val) => applyImmediately({ status: val })}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}