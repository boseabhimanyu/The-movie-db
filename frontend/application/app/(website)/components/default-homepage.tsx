import api from "@/lib/api";
import HomepageClient from "./homepage-client";
import { MediaItem, normalizeMediaList, HOME_RAIL_LIMIT } from "./home/media-types";

async function fetchFeed(endpoint: string): Promise<MediaItem[]> {
  try {
    const res = await api.get(endpoint, {
      params: { limit: HOME_RAIL_LIMIT },
    });
    return normalizeMediaList(
      res.data,
      endpoint.includes("/shows") ? "show" : "movie",
    );
  } catch (error) {
    console.error(`Failed to fetch ${endpoint}:`, error);
    return [];
  }
}

export default async function DefaultHomepage() {
  const [trendingMovies, popularMovies, trendingShows, popularShows] =
    await Promise.all([
      fetchFeed("/movies/trending"),
      fetchFeed("/movies/popular"),
      fetchFeed("/shows/trending"),
      fetchFeed("/shows/popular"),
    ]);

  return (
    <HomepageClient
      initialTrendingMovies={trendingMovies}
      initialPopularMovies={popularMovies}
      initialTrendingShows={trendingShows}
      initialPopularShows={popularShows}
    />
  );
}