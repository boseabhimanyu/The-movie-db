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

## 6. Email Verification & Unverified Review Quota

To support account verification and protect review endpoints from unverified spam without blocking initial user engagement, a standalone email verification flow and dynamic admin-configurable review quota were implemented.

### Email Verification Token Persistence (`models/email_verification_token.go`, `repository/mongo/email_verification_repository.go`)

* **Dedicated Collection (`email_verification_tokens`):** Stores SHA-256 hashed verification tokens (`token_hash`) linked to `user_id`, `email`, `expires_at`, and `created_at` rather than embedding temporary token state inside the user document.
* **Database Indexes:** Enforces a unique index on `token_hash` and a MongoDB TTL index (`ExpireAfterSeconds: 0`) on `expires_at` for automatic cleanup of expired tokens.
* **Single Active Token Enforcement:** Issuing a new verification token clears any prior pending tokens for that user (`DeleteByUserID`), and successful verification deletes the consumed token immediately.

### User Verification State & Profile Reset (`models/user.go`, `repository/mongo/user_repository.go`, `services/user_service.go`)

* **User Model Fields:** Added `email_verified` (`bool`) and `email_verified_at` (`*time.Time`) to `models.User` and exposed them in user/auth profile payloads.
* **Persistence & Email-Change Reset:** Updated `UserRepository.Update` to persist `email_verified` and `email_verified_at`. In `UserService.UpdateProfile`, changing a user's email resets `email_verified` to `false` and `email_verified_at` to `nil` prior to saving, without automatically triggering a new email.

### Email Delivery & Verification Service (`services/email_service.go`, `services/email_verification_service.go`)

* **SMTP with Dev Console Fallback:** `EmailService` sends verification emails via standard `net/smtp` when `SMTP_HOST` is configured, and logs the full verification link (`<FRONTEND_URL>/verify-email?token=<raw_token>`) to the console when running without SMTP credentials.
* **Abuse & Cooldown Guards:** `EmailVerificationService.SendVerification` rejects already-verified accounts (`409 Conflict` / `ErrEmailAlreadyVerified`) and enforces a configurable resend cooldown (`429 Too Many Requests` / `ErrVerificationEmailTooSoon`).
* **Non-Blocking Signup Trigger:** `AuthService.Register` dispatches the initial verification email asynchronously after user creation so registration latency is unaffected by SMTP delivery.

### Auth Verification Endpoints (`handler/auth_handler.go`, `dto/auth_dto.go`, `router/router.go`)

* `POST /api/v1/auth/send-verification-email` *(Authenticated)*: Generates and dispatches a verification link for the logged-in unverified user.
* `POST /api/v1/auth/verify-email` *(Public)*: Accepts `dto.VerifyEmailRequest` (`{"token": "..."}`), validates the hashed token and matching email, marks the user's email verified, and returns `{"message": "email verified successfully", "emailVerified": true}`.

### Dynamic Unverified Review Quota (`models/application_settings.go`, `services/settings_service.go`, `services/review_service.go`)

* **Configurable Setting (`unverified_max_reviews`):** Added `UnverifiedMaxReviews` (`int`) to `ApplicationSettings` (initialized to `10` in `EnsureDefaults`), exposed in `GET /api/v1/admin/settings`, and updatable via `PATCH /api/v1/admin/settings` (rejecting negative values `< 0`; `0` enforces verified-only reviews).
* **Review Creation Enforcement:** `ReviewService.CreateReview` checks `user.EmailVerified`; if `false`, it queries `SettingsService.GetUnverifiedMaxReviews` and compares it against the user's combined review count (`ListByUser` across movies and shows), returning `403 Forbidden` (`ErrEmailVerificationRequired`) once the quota is reached.

### Additional Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `FRONTEND_URL` | `http://localhost:3000` | Base URL used when constructing email verification links. |
| `EMAIL_VERIFICATION_TTL_MINUTES` | `60` | Lifetime in minutes before an email verification token expires. |
| `EMAIL_VERIFICATION_RESEND_COOLDOWN_SECONDS` | `60` | Minimum wait time in seconds between verification email resend requests. |
| `SMTP_HOST` | `""` | SMTP server hostname (when empty, verification emails log to console). |
| `SMTP_PORT` | `587` | SMTP server port. |
| `SMTP_USERNAME` | `""` | SMTP authentication username. |
| `SMTP_PASSWORD` | `""` | SMTP authentication password. |
| `SMTP_FROM` | `""` | Sender email address displayed in outgoing verification emails. |
