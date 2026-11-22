"use client";

import { MediaItem } from "./home/media-types";
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

export default function HomepageClient({
  initialTrendingMovies,
  initialPopularMovies,
  initialTrendingShows,
  initialPopularShows,
}: HomepageClientProps) {
  return (
    <div className="min-h-screen bg-zinc-950 pb-20 text-zinc-100">
      {/* 1. Hero Showcase */}
      <HeroSection
        trendingMovies={initialTrendingMovies}
        trendingShows={initialTrendingShows}
        popularMovies={initialPopularMovies}
        targetCount={5}
      />

      {/* 2–5. Content Slider Sections */}
      <div className="mx-auto max-w-[1400px] space-y-12 px-4 pt-10 sm:px-6 lg:px-8">
        <TrendingMoviesSection items={initialTrendingMovies} />
        <PopularMoviesSection items={initialPopularMovies} />
        <TrendingShowsSection items={initialTrendingShows} />
        <PopularShowsSection items={initialPopularShows} />
      </div>
    </div>
  );
}