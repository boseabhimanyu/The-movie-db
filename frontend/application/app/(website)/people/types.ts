export interface PersonIDs {
  trakt: number;
  slug: string;
  imdb?: string;
}

export interface PersonSocialIDs {
  twitter?: string;
  facebook?: string;
  instagram?: string;
  wikipedia?: string;
}

export interface PersonImages {
  headshot?: string;
  fanart?: string;
}

export interface PersonProfile {
  name: string;
  ids: PersonIDs;
  biography: string;
  birthday?: string;
  death?: string;
  birthplace?: string;
  homepage?: string;
  socialIds: PersonSocialIDs;
  images: PersonImages;
  knownForDepartments: string[];
}

export interface PersonMovieCreditItem {
  role?: string;
  jobs?: string[];
  title: string;
  year: number;
  rating: number;
  votes: number;
  overview?: string;
  genres?: string[];
  poster?: string;
  ids: PersonIDs;
}

export interface PersonShowCreditItem {
  role?: string;
  jobs?: string[];
  episodeCount?: number;
  title: string;
  year: number;
  rating: number;
  votes: number;
  status?: string;
  genres?: string[];
  poster?: string;
  ids: PersonIDs;
}

export interface PersonMovieCreditsGroup {
  acting: PersonMovieCreditItem[];
  departments: Record<string, PersonMovieCreditItem[]>;
}

export interface PersonShowCreditsGroup {
  acting: PersonShowCreditItem[];
  departments: Record<string, PersonShowCreditItem[]>;
}

export interface PersonDetailResponse {
  person: PersonProfile;
  movieCredits: PersonMovieCreditsGroup;
  showCredits: PersonShowCreditsGroup;
}

export interface PersonSearchItem {
  score: number;
  name: string;
  ids: PersonIDs;
  biography?: string;
  birthday?: string;
  birthplace?: string;
  images: PersonImages;
}

export interface PersonPaginationMeta {
  page: number;
  limit: number;
  totalPages: number;
  totalItems: number;
}

export interface PersonSearchResponse {
  results: PersonSearchItem[];
  pagination: PersonPaginationMeta;
}

/** Normalized union item used by the filmography grid & CreditCard */
export interface NormalizedCreditItem {
  mediaType: "movie" | "show";
  title: string;
  year: number;
  rating: number;
  votes: number;
  poster?: string;
  role?: string;
  jobs?: string[];
  episodeCount?: number;
  status?: string;
  ids: PersonIDs;
}