# Phase 1: Architecture & Data Sync Flow (Trakt + Fanart.tv)

## 1. System Overview & Stack

* **Frontend:** Next.js (App Router / Pages) — consumes internal REST APIs only.
* **Backend:** Go (Gin) — handles authentication (via existing template), external API orchestration, data normalization, and on-demand caching.
* **Database:** MongoDB — stores normalized media metadata, artwork URLs, people profiles, user reviews, and custom lists.
* **External Providers:**
* **Trakt API:** Primary source for Movies, TV Shows, Cast/Crew, Trending feeds, and Search.
* **Fanart.tv API:** Primary source for Posters, Backdrops, and Logos (linked via Trakt's `tmdb` / `tvdb` IDs).



---

## 2. End-to-End Sync Architecture

```text
+-------------+       1. Request        +--------------------+
|   Next.js   | ----------------------> |    Go (Gin) API    |
|  (Frontend) | <---------------------- |   (Orchestrator)   |
+-------------+    6. Unified JSON      +--------------------+
                                           |      |        |
                         2. Check Cache    |      |        | 4. Fetch Art
                         & 5. Upsert       v      |        v
                                   +-----------+  |   +-----------+
                                   |  MongoDB  |  |   | Fanart.tv |
                                   |  (Cache)  |  |   |  (Images) |
                                   +-----------+  |   +-----------+
                                                  |
                                                  | 3. Fetch Metadata
                                                  v
                                            +-----------+
                                            | Trakt API |
                                            | (Metadata)|
                                            +-----------+

```

---

## 3. Core Sync Workflows

### Flow A: Media Detail Page (`GET /api/media/:type/:slug`)

*Used when a user opens a specific Movie or TV Show page (e.g., `/movie/inception-2010` or `/tv/breaking-bad`).*

1. **Lookup in MongoDB:** Query `media_items` by `media_type` + `trakt_slug`.
2. **Cache Check:**
* **Hit (Fresh):** Document exists, `is_full_detail == true`, and `last_synced_at` is within TTL (e.g., **7 days**) → Return document immediately.
* **Miss or Stale:** Proceed to external fetch.


3. **Fetch Metadata from Trakt:**
* Call `GET /movies/{slug}?extended=full` (or `/shows/{slug}?extended=full`).
* Call `GET /movies/{slug}/people` (or `/shows/{slug}/people`) for cast & crew.
* Extract cross-platform IDs: `ids.trakt`, `ids.slug`, `ids.imdb`, `ids.tmdb`, `ids.tvdb`.


4. **Fetch Artwork from Fanart.tv:**
* **If Movie:** Call `GET /v3.2/movies/{ids.tmdb}`.
* **If TV Show:** Call `GET /v3.2/tv/{ids.tvdb}`.
* Select the highest-liked `poster` and `background` URLs (defaulting to empty string if none exist yet).


5. **Normalize & Upsert:** Merge Trakt metadata + Fanart.tv URLs, set `is_full_detail = true` and `last_synced_at = now()`, upsert into `media_items`, and return JSON to Next.js.

---

### Flow B: Trending Feeds & Multi-Search (`GET /api/discover/trending`, `GET /api/search`)

*Used for the Home feed (Trending Movies/TV) and Search results.*

1. **Fetch List from Trakt:**
* Call `GET /movies/trending?extended=full` or `GET /search/movie,show?query={q}&extended=full` (returns 10–20 items with `ids` and basic metadata).


2. **Bulk Cache Check:** Extract all `trakt_id`s from the Trakt response and query MongoDB `media_items` in a single `$in` query to retrieve already-cached posters.
3. **Concurrent Artwork Hydration (Cache Misses Only):**
* For items not yet in MongoDB, spawn bounded Go goroutines (`errgroup`, max concurrency `5`) to call Fanart.tv using `ids.tmdb` (movies) or `ids.tvdb` (TV).
* Upsert lightweight stub records (`is_full_detail = false`) into MongoDB so subsequent feed loads and user clicks have instant poster URLs.


4. **Return Unified Feed:** Merge cached + newly hydrated items in Trakt's original ranking order and return to Next.js.

---

### Flow C: Cast & Crew Profiles (`GET /api/people/:slug`)

1. **Lookup in MongoDB:** Query `people` by `trakt_slug`. If fresh (within **14 days**), return immediately.
2. **Fetch from Trakt:** Call `GET /people/{slug}?extended=full` and `GET /people/{slug}/movies` + `/shows`.
3. **Upsert & Return:** Save normalized bio and filmography credits into `people` and return to Next.js *(UI renders styled initials/avatar fallback when `profile_url` is empty)*.

---

### Flow D: User Interactions (Ratings, Reviews & Custom Lists)

*Guarantees user-referenced media always exists locally in MongoDB.*

1. **Ensure Media Exists:** When a user rates, reviews, or adds a movie/show to a custom list, verify the item exists in `media_items` (triggering Flow A if not yet cached).
2. **Write Interaction:**
* **Rating/Review:** Upsert into `reviews` (`user_id` + `trakt_id` + `media_type`) and recalculate `local_avg_rating` and `local_rating_count` on `media_items`.
* **Custom List:** Push/pull `{ trakt_id, media_type, added_at }` on the user's `user_lists` document.



---

## 4. MongoDB Collections Schema

### `media_items`

```json
{
  "_id": "ObjectId",
  "trakt_id": 1396,
  "trakt_slug": "breaking-bad",
  "imdb_id": "tt0903747",
  "tmdb_id": 1396,
  "tvdb_id": 81189,
  "media_type": "tv",
  "title": "Breaking Bad",
  "year": 2008,
  "overview": "A chemistry teacher diagnosed with inoperable lung cancer...",
  "runtime": 45,
  "genres": ["drama", "crime", "thriller"],
  "trailer_url": "https://youtube.com/watch?v=...",
  "trakt_rating": 9.2,
  "poster_url": "https://assets.fanart.tv/fanart/tv/81189/tvposter/...",
  "backdrop_url": "https://assets.fanart.tv/fanart/tv/81189/showbackground/...",
  "credits": [
    {
      "trakt_id": 142,
      "trakt_slug": "bryan-cranston",
      "name": "Bryan Cranston",
      "character": "Walter White",
      "role_type": "cast"
    }
  ],
  "local_avg_rating": 4.8,
  "local_rating_count": 12,
  "is_full_detail": true,
  "last_synced_at": "ISODate"
}

```

### `people`

```json
{
  "_id": "ObjectId",
  "trakt_id": 142,
  "trakt_slug": "bryan-cranston",
  "imdb_id": "nm0186505",
  "name": "Bryan Cranston",
  "biography": "Bryan Lee Cranston is an American actor...",
  "birthday": "1956-03-07",
  "birthplace": "Hollywood, Los Angeles, California, USA",
  "credits": [
    {
      "trakt_id": 1396,
      "trakt_slug": "breaking-bad",
      "media_type": "tv",
      "title": "Breaking Bad",
      "year": 2008,
      "character": "Walter White"
    }
  ],
  "last_synced_at": "ISODate"
}

```

### `reviews`

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (from template users collection)",
  "trakt_id": 1396,
  "media_type": "tv",
  "rating": 5,
  "review_text": "One of the greatest character arcs ever written.",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}

```

### `user_lists`

```json
{
  "_id": "ObjectId",
  "user_id": "ObjectId (from template users collection)",
  "name": "All-Time Favorites",
  "description": "Shows and movies worth rewatching.",
  "is_public": true,
  "items": [
    {
      "trakt_id": 1396,
      "media_type": "tv",
      "added_at": "ISODate"
    }
  ],
  "created_at": "ISODate",
  "updated_at": "ISODate"
}

```

---

## 5. Required MongoDB Indexes

* `media_items`: Unique compound index on `{ trakt_id: 1, media_type: 1 }`, plus `{ trakt_slug: 1, media_type: 1 }`.
* `people`: Unique index on `{ trakt_id: 1 }`, plus `{ trakt_slug: 1 }`.
* `reviews`: Unique compound index on `{ user_id: 1, trakt_id: 1, media_type: 1 }`, plus `{ trakt_id: 1, media_type: 1, created_at: -1 }`.
* `user_lists`: Index on `{ user_id: 1 }`.

---
