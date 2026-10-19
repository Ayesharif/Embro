# Redis caching

Redis is an **optional speed-up** in front of MongoDB. MongoDB stays the only source of truth, and the API works identically with Redis switched off, missing, or crashing.

## How it works

1. A cacheable `GET` request arrives (for example `/api/v1/products?sort=price_asc&page=2`).
2. A cache key is built from the endpoint, the relevant query parameters and a *version* for each data group the response depends on.
3. Redis hit → the stored JSON is returned without touching MongoDB (`X-Cache: HIT`).
4. Redis miss → the normal route handler runs; if it answers `200`, that JSON is stored with a TTL (`X-Cache: MISS`) and returned unchanged.
5. Redis down, slow or disconnected → the handler simply runs against MongoDB (`X-Cache: BYPASS`).

Response bodies are stored exactly as they are sent, so the frontend sees the same shape either way.

### Invalidation: namespace versions
Every cached entry's key contains the current version of the groups ("namespaces") it depends on, e.g. `lembro:v1:product-list:1700000000000:<hash>`. When something changes, the code does one atomic `INCR` on the namespace version. Old entries become unreachable immediately and expire on their own TTL. This means:

- no `FLUSHDB`, no `KEYS`/`SCAN`, no lists of keys to delete - O(1) per invalidation;
- a request that read old data just before a change can only write under the *old* version, so it can never put stale data back;
- invalidation only happens **after** the database write succeeded (a failed write changes nothing);
- if Redis is unreachable when a change happens, the invalidation is remembered in memory and applied the moment Redis reconnects.

| Change | Namespaces invalidated |
| --- | --- |
| Product created / edited / archived, bulk discount, stock adjustment | `products`, `admin-stats` |
| Order placed (stock taken), order cancelled/restocked, refund restock | `products`, `admin-stats` |
| Category created / edited / archived | `categories`, `products` |
| Shipping method created / edited / deleted | `shipping` |
| Cash-on-delivery settings changed | `settings` |
| Store currency changed | everything |
| Review approved / rejected / hidden | `reviews`, `products` (ratings) |
| Order status, shipment, refund, new order | `admin-stats` |

## What is cached

| Endpoint | TTL (default) | Depends on | Key varies by |
| --- | --- | --- | --- |
| `GET /api/v1/products` | 5 min (`CACHE_TTL_PRODUCT_LIST`) | products | `q, category, featured, newArrival, sort, page, limit` |
| `GET /api/v1/products/:idOrSlug` | 2 min (`CACHE_TTL_PRODUCT_DETAIL`) | products | id/slug |
| `GET /api/v1/categories` | 15 min (`CACHE_TTL_CATEGORIES`) | categories | - |
| `GET /api/v1/settings/public`, `GET /api/v1/checkout/options` | 5 min (`CACHE_TTL_SETTINGS`) | settings | - |
| `GET /api/v1/shipping/methods` | 10 min (`CACHE_TTL_SHIPPING`) | shipping | - |
| `GET /api/v1/reviews/featured` | 5 min (`CACHE_TTL_REVIEWS`) | reviews, products | - |
| `GET /api/v1/products/:id/reviews` (shared list only) | 5 min | reviews | product id |
| `GET /api/v1/admin/dashboard` | 1 min (`CACHE_TTL_DASHBOARD`) | admin-stats | staff scope |
| `GET /api/v1/admin/accounts` | 1 min (`CACHE_TTL_ACCOUNTS`) | admin-stats | `from, to, tz` |

Only query parameters on the list above are part of a key; any other parameter is ignored, so a client cannot fill Redis with endless unique keys. Only `200` responses are stored; validation errors, 404s and server errors are never cached. Entries larger than `CACHE_MAX_VALUE_BYTES` are skipped. TTLs get ±10% jitter so entries created together don't all expire together. Concurrent identical misses on one server share a single database query.

### Deliberately **not** cached
Authentication (`/auth/*`, `/auth/me`), cart, wishlist, addresses, orders, payments and webhooks, checkout quotes, cash-on-delivery orders, stock-changing operations, `/reviews/eligible`, every write, and the admin list/detail endpoints. These are per-user, security-sensitive or transactional, and are always read from MongoDB. The per-user part of the product-reviews endpoint (`mine`) is also always read fresh; only the public list is cached. A test fails if `cacheResponse` is ever added to a file outside the approved list.

### Security model
- Admin endpoints run authentication and role checks **before** the cache, so a cached body is only reachable by someone who passes them. The cache layer additionally refuses to serve a `staff`/`user`-scoped route when there is no authenticated user.
- Shared entries only contain public catalogue data (purchasing cost is never in the public product JSON). The middleware also supports `scope: 'user'` (key includes the user id) for any future per-user caching.
- Redis credentials live only in `backend/.env`; nothing about Redis reaches the React app, logs never contain cached values or the Redis URL.
- Cart, checkout and stock checks always hit MongoDB, so a stale product page can never oversell: the price and stock used to create an order are read from the database at quote and payment time.

## Setup

### Install and start Redis locally
- **Docker (any OS):** `docker run -d --name lembro-redis -p 6379:6379 redis:7-alpine`
- **macOS:** `brew install redis && brew services start redis`
- **Ubuntu/Debian:** `sudo apt install redis-server && sudo systemctl enable --now redis-server`
- **Windows:** use WSL2 (Ubuntu steps) or Docker Desktop.

Check it: `redis-cli ping` → `PONG`.

### Configure the app
```bash
cd backend
npm install            # installs the new "redis" dependency (use install, not ci - the lockfile changed)
# in backend/.env
REDIS_URL=redis://localhost:6379
npm run dev
```
Startup logs `Redis connected`. The API does not wait for Redis: if it is down at startup it still serves requests and connects when it can.

### Hosted Redis (Upstash, Redis Cloud, AWS ElastiCache, Render, ...)
Copy the provider's connection string into `REDIS_URL`. Use `rediss://` (TLS) when the provider requires it, e.g. `REDIS_URL=rediss://default:PASSWORD@host:6380`. Keep it in your host's secret/environment settings, never in the repo. Any `maxmemory-policy` works; entries all have TTLs and a lost version key is detected safely. Use a separate `REDIS_PREFIX` per environment if environments share one Redis.

### Turn caching off
Any of these, then restart the API: leave `REDIS_URL` empty, set `CACHE_ENABLED=false`, or uninstall `redis`. No code changes needed. To drop cached data without restarting: `POST /api/v1/admin/cache/purge` (admin/super_admin).

All settings are in `backend/.env.example`.

## Verifying it works

```bash
curl -si "http://localhost:4000/api/v1/products?limit=3" | grep -i x-cache   # X-Cache: MISS
curl -si "http://localhost:4000/api/v1/products?limit=3" | grep -i x-cache   # X-Cache: HIT
```
- **Counters:** `GET /api/v1/admin/cache` (admin token) returns `hits`, `misses`, `hitRatio`, per-endpoint counts, `errors`, `coalesced`, `invalidations`, `invalidationFailures` and `connected`. Counters are per API process and reset on restart.
- **Health:** `GET /api/v1/health/ready` includes `"cache": "connected" | "unavailable" | "disabled"`. Redis never affects readiness.
- **Logs:** JSON lines. Connection problems and invalidation failures are logged (rate-limited, no secrets). Set `CACHE_DEBUG=true` and `LOG_LEVEL=debug` to also log each hit/miss/invalidation (names only, never values).
- **Redis side (development only):** `redis-cli --scan --pattern 'lembro:v1:*'`, `redis-cli ttl <key>`.
- **Invalidation:** load `/api/v1/categories` twice (MISS, HIT), create a category in the admin, load again → MISS.
- **Outage:** stop Redis; the same URLs keep working with `X-Cache: BYPASS`; start Redis and caching resumes by itself.

After changing the database *outside* the API (the seed script, `migrate:variants`, manual edits), run the purge endpoint or wait for the TTLs.

## Tests

```bash
cd backend && npm test
```
`test/cache.test.js` covers the cache core and middleware; `test/cache-routes.test.js` drives the real Express app (real routes, auth, validation) with stubbed MongoDB models. Between them: miss→hit, TTL expiry, key variation, auth/role gating, user isolation, Redis erroring/disconnected/slow, errors not cached, concurrency coalescing, invalidation (including after a Redis outage and after a lost version key), and failed writes not invalidating.

**Honest limits:** these tests use an in-memory fake Redis client (`test/helpers/fakeRedis.js`) and mocked Mongoose models, because the development sandbox had no Redis server, no network, and could not install the `redis` package. They verify this project's logic, not the behaviour of the real `redis` package or server, and nothing was run against a real MongoDB. Before relying on it in production, run the checks in "Verifying it works" against a real Redis once.

## Known trade-offs
- Within a TTL, data changed directly in MongoDB (not through the API) can look stale until you purge.
- Request coalescing and the stats counters are per server process; with several instances each can run one query per miss.
- Each lookup costs two fast Redis round trips (read versions, read entry); the cached payload size is bounded by `CACHE_MAX_VALUE_BYTES`.
