# Lembro - e-commerce web app

React 19 + Vite + Tailwind CSS 4 storefront and admin portal, backed by an Express 5 / MongoDB API with Stripe payments.

## Quick start

```bash
# 1. API
cd backend
cp .env.example .env        # fill in MONGODB_URI at minimum (see "Configuration")
npm install
npm run seed                # categories, products, shipping methods and an admin account
npm run dev                 # http://localhost:4000

# 2. Web app (new terminal, from the project root)
cp .env.example .env        # set VITE_STRIPE_PUBLISHABLE_KEY to enable card payments
npm install
npm run dev                 # http://localhost:5173
```

`npm run seed` prints the admin email and a one-time random password (or uses `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` if set). Sign in at `/admin/login`.

Without SMTP settings the API prints verification and password-reset links to its console in development, so you can register and sign in without a mail server.

## Scripts

| Where | Command | What it does |
| --- | --- | --- |
| root | `npm run dev` / `build` / `preview` | Vite dev server, production build, preview |
| root | `npm run lint` | ESLint for the frontend and backend |
| backend | `npm run dev` / `start` | API with auto-reload / plain |
| backend | `npm test` | Unit + API tests (no database or Redis needed) |
| backend | `npm run seed` | Idempotent seed data |
| backend | `npm run migrate:variants` | Converts products created before the variants change (dry run; add `-- --apply` to write) |

## Configuration

Backend (`backend/.env`, see `.env.example`):

- **Required in production:** `MONGODB_URI`, `JWT_ACCESS_SECRET` (32+ chars), `WEB_APP_URL`, `API_PUBLIC_URL` (both https), `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`. The server refuses to start without them.
- `TRUST_PROXY=1` when running behind one reverse proxy so rate limiting sees real client IPs.
- `COOKIE_SAMESITE` defaults to `lax`; use `none` only if the web app and API are on unrelated domains.
- `CURRENCY`, `COD_ENABLED` and `COD_MAX_AMOUNT` only seed the initial store settings; afterwards manage them in **Admin → Settings**.
- Optional: SMTP (`MAIL_*`), Google sign-in (`GOOGLE_*`, redirect URI `{API_PUBLIC_URL}/api/v1/auth/oauth/google`), Cloudinary uploads (`CLOUDINARY_*`), `TAX_RATE`.

Frontend SEO configuration:

- Set `VITE_SITE_URL` to the canonical public storefront origin in production.
- Optionally set `VITE_SITE_LOGO` to an absolute or site-relative logo URL and `VITE_STORE_CURRENCY` as the build-time fallback currency.
- The backend exposes `GET /robots.txt` and `GET /sitemap.xml`. These use `WEB_APP_URL` and include only active categories and published, sellable products.
- Product pages load the current currency from the public settings endpoint and emit Product/Offer structured data only for API-backed products. Approved ratings are included only when genuine review data exists.

Stripe webhook: point an endpoint at `{API_PUBLIC_URL}/api/v1/payments/webhook` for `payment_intent.succeeded` and `charge.refunded`. Locally: `stripe listen --forward-to localhost:4000/api/v1/payments/webhook`.

## How it works

- **Auth:** short-lived JWT access token held in memory only; a rotating, hashed, httpOnly refresh cookie restores the session on reload. Reusing a rotated refresh token revokes the whole session family. Passwords are bcrypt (cost 12), with per-account lockout and IP rate limits.
- **Cart:** stored on the server per user (or per anonymous browser id) and merged on sign-in.
- **Checkout:** the server prices the cart into a *quote* (items, shipping method, tax, discount). The Stripe PaymentIntent amount is always taken from that quote - never from the browser. The order is created from the verified payment, by the browser callback and/or the webhook (idempotent), then stock is decremented atomically.
- **Payment methods:** customers choose *Pay online* (Stripe) or *Cash on delivery*. COD orders start as payment "pending"; when staff mark them delivered the cash is recorded as received. Unpaid, unshipped COD orders can be cancelled by staff (stock is returned); paid online orders are refunded instead.
- **Order tracking:** customers see a payment status and a delivery tracker (placed, processing, on the way, delivered, plus tracking numbers) in *My account*.
- **Invoices:** *Admin, Orders, open an order, Print invoice* opens an A4 invoice (use *Save as PDF* in the print dialog).
- **Reviews:** customers rate and review from a product page, or from the home page for products they bought. Reviews are moderated in *Admin, Reviews*; approved 4-5 star reviews scroll across the home page.
- **Products & variants:** a product has a name, category and description; everything sellable lives on its variants - selling price, purchasing cost, discount %, stock, image, colour and size. A simple product has one variant with no colour/size. The shop shows a "From" price and the product page lets customers pick colour and size (the image switches with the variant).
- **Accounts (admin):** pick a date range to see net revenue (excluding tax), profit (revenue minus the purchasing cost saved on each order item at the time of sale), tax collected, refunds, cash received, cash-on-delivery still to collect, payment-method split, top products, stock value, and a revenue/profit chart. Export to CSV. Cancelled orders are ignored and refunds reduce revenue proportionally. Profit does not include overheads, courier or payment-processor fees.
- **Currency (Admin → Settings):** the store runs in one currency (USD, PKR, EUR, GBP, AED, SAR, INR, BDT, CAD, AUD). Switching it can convert every product price, purchasing cost, shipping price, fixed discount and the COD limit at an exchange rate you enter (live-rate suggestion, rounding step, before/after preview, type-the-code confirmation, runs in a transaction on Atlas/replica sets). Existing orders keep the currency they were placed in, and Accounts/Dashboard only total orders in the current currency. Card payments need a Stripe account that supports the currency; cash on delivery works in any.
- **Admin roles:** `super_admin` and `admin` manage catalogue, users, discounts and refunds; `warehouse` handles fulfilment; `support` handles reviews/messages. Only `super_admin` can change roles.

## Security notes

- Never commit `.env` files. If a `.env` was ever shared (zip, chat, repo), rotate every secret in it: database password, SMTP password, Google client secret, Stripe keys, Cloudinary secret, JWT secrets.
- All request bodies/queries are validated with strict schemas; unknown fields are dropped (no mass assignment) and non-string values are rejected (no operator injection).
- Card data never touches this app: Stripe Elements collects it.

## Caching (optional)

Set `REDIS_URL` to put a Redis cache in front of the read-heavy public endpoints (products, categories, settings, shipping, featured reviews) and the admin dashboard/accounts reports. MongoDB stays the source of truth, the API works the same without Redis, and a Redis outage just means requests are served from MongoDB. See [`docs/CACHING.md`](docs/CACHING.md) for setup, TTLs, invalidation, how to disable it and how to verify it (`X-Cache: HIT/MISS` response header, `GET /api/v1/admin/cache` for hit/miss counters).

## Known limitations

- Each variant is one colour/size combination you create yourself (there is no automatic colour x size grid generator).
- Saved payment methods are not implemented; cards are entered at checkout.
- Search is a case-insensitive name match, fine for small catalogues; use a text/search index for large ones.

More background lives in `docs/` (original design notes; they predate this version and may differ from the code).
