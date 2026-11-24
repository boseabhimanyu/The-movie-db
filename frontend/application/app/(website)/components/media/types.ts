export interface MediaIds {
  trakt: number;
  slug: string;
  imdb: string;
  tmdb: number;
  tvdb: number;
}

export interface MediaArtwork {
  poster: string;
  backdrop: string;
  logo: string;
  banner: string;
  thumb: string;
  posters: string[];
  backdrops: string[];
}

export type MovieArtwork = MediaArtwork;

export interface CreditPerson {
  traktId: number;
  name: string;
  slug: string;
  jobs?: string[];
  ids: MediaIds;
  character?: string;
  characters?: string[];
}

export interface MediaCredits {
  cast: CreditPerson[];
  directors: CreditPerson[];
  writers: CreditPerson[];
}

export type MovieCredits = MediaCredits;

export interface MovieDetail {
  id: string;
  title: string;
  year: number;
  ids: MediaIds;
  tagline: string;
  overview: string;
  released: string;
  runtime: number;
  country: string;
  trailer: string;
  homepage: string;
  status: string;
  rating: number;
  votes: number;
  language: string;
  genres: string[];
  certification: string;
  artwork: MediaArtwork;
  credits: MediaCredits;
  syncedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShowAirs {
  day?: string;
  time?: string;
  timezone?: string;
}

export interface ShowEpisode {
  number: number;
  title: string;
  overview?: string;
  firstAired?: string;
  runtime?: number;
  rating?: number;
  votes?: number;
  ids?: MediaIds;
}

export interface ShowSeason {
  number: number;
  title: string;
  overview?: string;
  episodeCount?: number;
  airedEpisodes?: number;
  rating?: number;
  firstAired?: string;
  network?: string;
  poster?: string;
  ids?: MediaIds;
  episodes?: ShowEpisode[];
}

export interface ShowDetail {
  id: string;
  title: string;
  year?: number;
  ids: MediaIds;
  tagline?: string;
  overview?: string;
  firstAired?: string;
  airs?: ShowAirs;
  runtime?: number;
  certification?: string;
  network?: string;
  country?: string;
  trailer?: string;
  homepage?: string;
  status?: string;
  rating?: number;
  votes?: number;
  language?: string;
  genres?: string[];
  airedEpisodes?: number;
  seasons?: ShowSeason[];
  artwork?: MediaArtwork;
  credits?: MediaCredits;
  syncedAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReviewUser {
  id: string;
  name: string;
  username: string;
}

export interface ReviewItem {
  id: string;
  user: ReviewUser;
  mediaType: string;
  mediaId: string;
  media: unknown;
  rating: number;
  title: string;
  body: string;
  isSpoiler: boolean;
  helpfulCount: number;
  isHelpful: boolean;
  isOwner: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewStats {
  mediaType: string;
  mediaId: string;
  averageRating: number;
  totalRatings: number;
  totalReviews: number;
  distribution: Record<string, number>;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

export interface MediaReviewsResponse {
  stats: ReviewStats;
  myReview: ReviewItem | null;
  results: ReviewItem[];
  pagination: PaginationMeta;
}

export type MovieReviewsResponse = MediaReviewsResponse;
export type ShowReviewsResponse = MediaReviewsResponse;