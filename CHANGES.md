# What changed

## Security fixes
- **Payment amounts are server-side.** `/payments/intent` used to accept any `amount` from the browser. Charges now come from a server-priced, frozen checkout quote; orders are created from the verified PaymentIntent (browser callback + idempotent webhook). Stock is decremented atomically and discount usage limits are enforced.
- **Role escalation closed.** Any `support`/`warehouse` user could call the admin API and make themselves `super_admin`. Roles are now per-route; only `super_admin` can change roles; nobody can change their own role.
- **Shared guest cart fixed.** Every anonymous visitor used the same `anonymous` cart, and signed-in carts were never user-bound. Carts are now per user or per random browser id.
- **Mass assignment / NoSQL injection.** `req.body` was spread into `create`/`$set` in many routes. Every endpoint now validates with a strict whitelist schema (strings only, ids checked, unknown fields dropped).
- **Auth hardening.** Rotating hashed refresh tokens with reuse detection and server-side logout; access token kept in memory (not localStorage); login lockout and rate limits; non-enumerating register/forgot-password; timing-equalised login; JWT algorithm pinned; password reset/change revokes sessions; email verification via POST (scanner-safe); Google OAuth redirect built from config (not the Host header) and pre-registration account takeover blocked.
- **Other:** payment cancel/read now checks ownership; refunds really call Stripe; upload signatures restricted to image formats and a folder allowlist; Cloudinary URLs validated; error handler no longer leaks raw database error codes; JSON body limit 100 kb; wishlist/products only expose published items; hard-coded admin password removed from the seed; hidden shipping-"free if method missing" bug fixed; Stripe `allow_redirects: never` so card confirmation can't break.
- **Secrets:** the uploaded `.env` files contained live credentials and are not included here. Rotate them (see README).

## Broken / missing features now working
- Product page was a hard-coded T-shirt and every card linked to `/products/1`; now fully API-driven (gallery, options, stock, reviews, related products).
- Cart: persistent, server-synced, quantity controls, slide-over drawer, real item badge (was a hard-coded "3").
- Checkout: real flow (cart, address, shipping, review with discount codes, Stripe payment, confirmation).
- Forgot/reset password and email verification were fake screens; now real. Account page shows real data with orders, addresses, profile and password change (it was hard-coded, with card numbers saved to localStorage).
- Contact form and newsletter now save to the database.
- Admin: products can be published (new products stayed hidden drafts), options/variants and images are saved correctly (editing used to wipe images and drop variants), plus new Orders (shipping, refunds), Discounts, Reviews, Messages panels and accurate dashboard revenue.
- Shop: URL-driven search, category, sort and pagination from the API; discount prices and ratings shown.
- Modern touches: skeleton loaders, toasts, empty/error states, 404 page, error boundary, page titles, skip link, keyboard-accessible controls, code-split admin/checkout.

## Added in the second round
- **Cash on delivery** alongside online card payment (phone number captured for the courier, optional limit, stock checked, double-submit safe).
- **Payment status and delivery status** for customers (badges plus a step tracker with tracking numbers) and for staff.
- **Professional A4 invoice** in the admin order view, printable or savable as PDF.
- **Home-page reviews** above the footer: auto-scrolling testimonials (pauses on hover, respects reduced motion) with an average rating, and a new star-rating / review composer used on both the home page and product pages.

## Added in the third round
- **Category images:** upload an image when creating/editing a category. The file goes to Cloudinary, its URL and id are saved in MongoDB, and it appears on the home-page category cards. Replacing or removing an image also deletes the old file from Cloudinary.
- **Shipping tab in the admin:** add, edit, enable/disable and delete any number of shipping methods with title, description, price, min/max delivery days and an image (Cloudinary + MongoDB). Customers see them, with images, at checkout. Re-running `npm run seed` no longer overwrites shipping methods you changed.

## Added in the fourth round
- **Products now follow your schema:** name, category, description and variants, where each variant has selling price, purchasing cost, stock, discount, image, colour and size. The admin product form has a variant editor with a live profit-per-unit preview; the shop shows "From" prices and the product page has colour/size pickers with per-variant images, prices and stock. The cart, checkout, stock deduction and low-stock alerts all work per variant.
- **Accounts tab:** sales, net revenue, profit and margin, tax collected, refunds, cash received, COD outstanding, payment-method split, top products, stock value, chart and CSV export. Order items now record their purchasing cost at the time of sale (admin-only; never sent to customers).
- **Existing data:** products created before this change need `npm run migrate:variants -- --apply` in `backend` (back up first). Orders placed before this change have no recorded cost, so the Accounts tab flags them rather than guessing.

## Added in the fifth round
- **Currency setting (Admin → Settings):** pick the store currency (PKR included). Converting existing prices uses an exchange rate you confirm, with live-rate suggestion, rounding, preview and a typed confirmation. Prices, checkout, Stripe charges, invoices, emails and reports all follow the setting; old orders keep their original currency.
- **Cash-on-delivery limit** moved into the settings page (it is stored in the database and converted along with prices).

## Added in the sixth round
- **Redis caching** (optional, fail-open) for public catalogue endpoints and the admin dashboard/accounts reports, with version-based invalidation after every relevant successful write, request coalescing, structured logging, hit/miss counters (`GET /api/v1/admin/cache`) and a purge endpoint. Private, per-user and transactional endpoints are deliberately not cached. See `docs/CACHING.md`. Run `npm install` in `backend/` (new `redis` dependency).

## Vercel
- `backend/vercel.json`, `backend/api/index.js` (serverless entry) and `backend/.vercelignore` for deploying the API to Vercel; MongoDB pool size is capped on Vercel (`MONGODB_MAX_POOL_SIZE` to override).
