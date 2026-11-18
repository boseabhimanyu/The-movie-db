# Movies & Shows Integration Architecture

## 1. Dual-Source API Stitching (Trakt + Fanart.tv)

Because **Trakt** provides rich metadata, search, cast/crew, and episode schedules—while **Fanart.tv** provides high-resolution posters, backdrops, logos, and banners—the backend stitches both APIs together on the server and caches the unified result in MongoDB (`movies` and `shows` collections).

### ID Bridging & Resolution Flow
1. **Primary Lookup (Trakt API):**
   - Queries Trakt (`?extended=full`) using a Trakt slug (e.g., `inception-2010`), Trakt numeric ID, or search query.
   - Extracts cross-platform external IDs returned by Trakt (`ids.trakt`, `ids.slug`, `ids.imdb`, `ids.tmdb`, `ids.tvdb`).
2. **Artwork Resolution (Fanart.tv API):**
   - **Movies** bridge via **`ids.tmdb`** (`GET /v3/movies/{tmdb_id}`).
   - **TV Shows** bridge via **`ids.tvdb`** (`GET /v3/tv/{tvdb_id}`), including season-specific posters mapped to each season number.
   - Retrieved image arrays are ranked by language priority (`en` > neutral `""`/`00` > fallback) and community `likes`, storing direct CDN URLs rather than binary image files.
3. **Concurrent Hydration:**
   - **Feeds & Search (`/trending`, `/popular`, `/search`):** Hydrates card-level metadata and artwork in bounded concurrent worker batches, upserting base documents into MongoDB so discovery grids load quickly without hitting rate limits.
   - **Detail Pages (`/:id`):** When a specific title is opened (or force-synced), the service concurrently fetches **Trakt `/people`** (cast, directors, writers), **Trakt `/seasons?extended=full,episodes`** (for shows), and **Fanart.tv artwork** before saving the complete document to MongoDB.

---

## 2. Cache-Aside Strategy & TTL Behavior

- **Persistent Storage:** Documents in `movies` and `shows` are **never automatically purged** by MongoDB, ensuring `_id` references used by user watchlists, ratings, reviews, and custom lists remain intact permanently.
- **Lazy Staleness Refresh:** Each cached document stores a `synced_at` timestamp. Public `GET /:id` requests check whether `time.Since(synced_at) < MEDIA_CACHE_TTL_HOURS` and whether full details (`credits` / `seasons`) are present:
  - **Fresh Cache Hit:** Served directly from MongoDB with zero external API calls.
  - **Stale or Incomplete Cache:** Refreshes concurrently from Trakt + Fanart.tv and updates the existing MongoDB document in place (preserving `_id` and `created_at`).
  - **Resilience Fallback:** If Trakt or Fanart.tv is temporarily unavailable, existing cached data is preserved and returned rather than failing.

---

## 3. Environment Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `TRAKT_CLIENT_ID` | *(required)* | Trakt API v2 application client ID (`trakt-api-key` header). |
| `FANART_API_KEY` | *(required)* | Fanart.tv v3 project API key (`api_key` query param). |
| `MEDIA_CACHE_TTL_HOURS` | `24` | Hours before a cached movie/show document is considered stale on public detail requests. |
| `MEDIA_BATCH_SYNC_LIMIT` | `10` | Maximum number of movie/show IDs or slugs allowed in a single admin batch sync request. |

---

## 4. Functions & Layers Added (Movies & Shows)

### Integration Clients (`integrations/`)
* **`integrations/trakt` (`trakt.Client`)**
  * `GetTrendingMovies`, `GetPopularMovies`, `SearchMovies`, `GetMovieSummary`, `GetMoviePeople`
  * `GetTrendingShows`, `GetPopularShows`, `SearchShows`, `GetShowSummary`, `GetShowSeasons`, `GetShowPeople`
* **`integrations/fanart` (`fanart.Client`)**
  * `GetMovieArtwork` (resolves `poster`, `backdrop`, `logo`, `banner`, `thumb`, plus ranked `posters` and `backdrops` lists)
  * `GetTVArtwork` (resolves show-level artwork + per-season `seasonposter` URLs)

### MongoDB Repositories (`repository/mongo/`)
* **`EnsureMovieIndexes` / `EnsureShowIndexes`:** Creates unique indexes on `ids.trakt` and `ids.slug`, plus indexes on `title` and `popularity`.
* **`MovieRepository` (`movie_repository.go`) & `ShowRepository` (`show_repository.go`):**
  * `FindByIDOrSlug` — Looks up by MongoDB `ObjectID`, numeric `ids.trakt`, or `ids.slug`.
  * `FindByTraktID` — Exact lookup by `ids.trakt`.
  * `UpsertByTraktID` — Atomic upsert preserving `_id` and `created_at` on updates while refreshing metadata, artwork, credits, and `synced_at`.
  * `SearchLocal` — Case-insensitive regex title search against cached MongoDB documents with pagination.

### Business Services (`services/`)
* **`MovieService` (`movie_service.go`):**
  * `GetTrendingMovies`, `GetPopularMovies`, `SearchMovies` — Fetches from Trakt (with local MongoDB fallback on search) and concurrently stitches & caches base movie records.
  * `GetMovieDetails` — Cache-aside detail loader fetching full summary, credits, and Fanart.tv artwork when uncached, stale, or missing full details.
  * `ForceSyncMovie` — Bypasses TTL to force-refresh a single movie by ID or slug.
  * `BatchForceSyncMovies` — Validates, deduplicates, and concurrently syncs up to `MEDIA_BATCH_SYNC_LIMIT` movies (bounded to 3 concurrent workers).
  * `AdminSearchMovies` — Read-only search across either local MongoDB (`source=local`) or Trakt (`source=trakt`) annotated with `inDb` and `isStale` flags without mutating the database.
* **`ShowService` (`show_service.go`):**
  * `GetTrendingShows`, `GetPopularShows`, `SearchShows`
  * `GetShowDetails` — Cache-aside detail loader including full seasons, episodes, season posters, and credits.
  * `ForceSyncShow`, `BatchForceSyncShows`, `AdminSearchShows`
* **Shared Helpers:**
  * `prepareBatchIDs` — Trims whitespace, deduplicates IDs/slugs case-insensitively, and enforces `1..MEDIA_BATCH_SYNC_LIMIT`.

### HTTP Handlers & Routes (`handler/` & `router/router.go`)
* **`MovieHandler` (`movie_handler.go`) & `ShowHandler` (`show_handler.go`):**
  * `GetTrending` -> `GET /api/v1/movies/trending`, `GET /api/v1/shows/trending`
  * `GetPopular` -> `GET /api/v1/movies/popular`, `GET /api/v1/shows/popular`
  * `Search` -> `GET /api/v1/movies/search?q=...`, `GET /api/v1/shows/search?q=...`
  * `GetDetails` -> `GET /api/v1/movies/:id`, `GET /api/v1/shows/:id`
  * `AdminSearch` *(Admin)* -> `GET /api/v1/admin/movies/search`, `GET /api/v1/admin/shows/search` (`?source=trakt|local`)
  * `BatchForceSync` *(Admin)* -> `POST /api/v1/admin/movies/sync`, `POST /api/v1/admin/shows/sync`
  * `ForceSync` *(Admin)* -> `POST /api/v1/admin/movies/:id/sync`, `POST /api/v1/admin/shows/:id/sync`

## 5. Feed Caching & Write-Skip Optimizations

To reduce external API latency and prevent redundant MongoDB writes during discovery browsing (`/trending` and `/popular`), a two-layer optimization was added to `MovieService` and `ShowService`:

### In-Memory Feed Cache (`services/media_feed_cache.go`)
- **Thread-Safe Generic TTL Cache (`feedCache[T]`):** Stores paginated feed entries (`cachedMoviePage` / `cachedShowPage`) in memory keyed by `<feed_type>:<page>:<limit>` (e.g., `trending:1:20`).
- **Trakt Pagination Cached Alongside Items:** Each cache entry retains both the hydrated media slice and the upstream Trakt pagination metadata (`page`, `limit`, `totalPages`, `totalItems` from Trakt's `X-Pagination-*` headers) inside `dto.PaginationResponse`, so cache hits return the complete upstream pagination state to the handler without hitting Trakt again.
- **Bounded Capacity:** Caps at `200` keys with automatic expired-entry eviction to keep memory usage predictable.
- **Automatic Invalidation:** Calling `ForceSyncMovie` or `ForceSyncShow` clears the corresponding feed cache so admin updates take effect immediately.

### Skipping Redundant Upserts on Fresh Items
- During `stitchAndCacheMovies` and `stitchAndCacheShows`, each item is checked against MongoDB (`FindByTraktID`) before calling Fanart.tv or writing to the database.
- If a cached document already exists, is within `MEDIA_CACHE_TTL_HOURS`, and already has a resolved `artwork.poster`, the existing record is returned immediately—skipping both the external Fanart.tv request and the `UpsertByTraktID` write.

### Additional Configuration

| Variable | Default | Description |
| :--- | :--- | :--- |
| `MEDIA_FEED_CACHE_TTL_MINUTES` | `15` | Minutes to cache `/trending` and `/popular` feed entries in memory before refreshing from Trakt. |
