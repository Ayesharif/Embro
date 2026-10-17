> **Note:** original backend notes, kept for reference. See the main README for the current setup.

# Embro Backend

This document is the backend specification for the Embro ecommerce frontend. The current frontend is a React/Vite prototype, so browser `localStorage` currently supplies demo products, categories, addresses, payment metadata, wishlist data, and authentication. The backend described here replaces those demo stores with secure, shared, persistent services.

The API should be implemented under:

```text
/api/v1
```

Technology stack:

- Node.js 20+
- JavaScript with Express.js
- MongoDB with Mongoose
- JWT authentication and authorization
- Google OAuth 2.0
- Nodemailer
- Stripe
- Cloudinary

The implementation status and actual backend source files are documented in the root [`BACKEND.md`](../BACKEND.md).

## Frontend contract

The frontend currently provides these customer routes:

| Frontend route | Required backend capability |
|---|---|
| `/` | Homepage content, featured products, new arrivals, reviews, public settings |
| `/products` | Search, category filters, sorting, cursor pagination, stock availability |
| `/products/:id` | Product detail, images, variants, related products, rating summary, reviews |
| `/checkout` | Cart validation, addresses, shipping quote, tax, payment intent, order creation |
| `/account` | Profile, order history, addresses, payment-provider references, logout |
| `/wishlist` | User wishlist CRUD |
| `/auth/login` | Email/password authentication |
| `/auth/register` | Account creation and verification email |
| `/auth/forgot-password` | Password reset email |
| `/auth/reset-password` | One-time password reset |
| `/auth/verify-email` | Email verification |
| `/auth/callback` | OAuth 2.0 authorization-code callback |
| `/admin` | Role-protected catalog, categories, users, orders, discounts, invoices, settings |

## Core API rules

- Use JSON for requests and responses.
- Use UTC ISO 8601 timestamps.
- Use UUIDs for resource identifiers.
- Represent money as integer minor units, not floating point:

```json
{
  "amount": 4999,
  "currency": "USD"
}
```

- Use `Authorization: Bearer <access-token>` for API authentication.
- Prefer a secure, httpOnly refresh-token cookie.
- Require `Idempotency-Key` for order creation, payment, refund, and other retryable mutations.
- Return a request ID in every response for support and debugging.
- Use cursor pagination for products, orders, users, reviews, and audit logs.

Example error:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contains invalid fields.",
    "fields": {
      "email": "Enter a valid email address."
    },
    "requestId": "req_01JABC"
  }
}
```

## Authentication and OAuth 2.0

### Email/password endpoints

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/auth/register` | Create a customer and send verification email | Public |
| POST | `/auth/login` | Sign in with verified email and password | Public |
| POST | `/auth/refresh` | Rotate refresh token and issue access token | Refresh cookie |
| POST | `/auth/logout` | Revoke current refresh session | Authenticated |
| GET | `/auth/verify-email?token=` | Verify email address | Public token |
| POST | `/auth/forgot-password` | Send password reset email | Public |
| POST | `/auth/reset-password` | Set a new password using a one-time token | Public token |
| GET | `/me` | Return current user | Authenticated |
| PATCH | `/me` | Update name, phone, and profile fields | Authenticated |

Passwords must be hashed with Argon2id or bcrypt. Never return password hashes, reset tokens, OAuth provider tokens, or raw payment data.

### OAuth 2.0 endpoints

The frontend OAuth buttons call:

```text
GET  /auth/oauth/google/start?redirect_uri=http://localhost:5173/auth/callback
POST /auth/oauth/callback
```

Required flow:

1. Validate the requested redirect URI against an allowlist.
2. Generate a random `state` value and PKCE verifier/challenge.
3. Redirect to Google using Authorization Code with PKCE.
4. Verify `state` on callback.
5. Exchange the provider code server-side.
6. Validate provider identity and email.
7. Create or update the local user and OAuth account link.
8. Redirect to the frontend with a short-lived, single-use backend exchange code.
9. The frontend posts that code to `/auth/oauth/callback`.
10. Return the user profile and establish the application session.

Example callback response:

```json
{
  "user": {
    "id": "user_uuid",
    "name": "Customer",
    "email": "customer@example.com",
    "role": "customer"
  },
  "accessToken": "short-lived-access-token"
}
```

Never put a provider client secret in the frontend. Validate issuer, audience, nonce/state, redirect URI, and token expiry. Prevent replay by consuming the exchange code once.

### Roles and authorization

Roles:

```text
customer
admin
super_admin
support
warehouse
```

Every admin endpoint must enforce authorization on the server. Hiding an admin link in the frontend is not security.

## Catalog

### Products

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/products` | Search and paginate published products | Public |
| POST | `/products` | Create product | Admin |
| GET | `/products/:id` | Product detail | Public |
| PATCH | `/products/:id` | Update product | Admin |
| DELETE | `/products/:id` | Archive product | Admin |
| POST | `/products/:id/publish` | Publish/unpublish product | Admin |
| GET | `/products/:id/related` | Related products | Public |
| GET | `/products/:id/inventory` | Stock and variant inventory | Admin |
| POST | `/products/:id/inventory-adjustments` | Adjust stock with audit reason | Admin/warehouse |

Supported query parameters for `GET /products`:

```text
q, category, minPrice, maxPrice, sort, cursor, limit, inStock, featured, newArrival
```

Product response:

```json
{
  "id": "product_uuid",
  "name": "Premium Yarn Basket",
  "slug": "premium-yarn-basket",
  "description": "Product description",
  "category": { "id": "category_uuid", "name": "Yarn", "slug": "yarn" },
  "sellingAmount": 4900,
  "originalAmount": 5500,
  "discountPercent": 10,
  "currency": "USD",
  "stockStatus": "in_stock",
  "images": [
    {
      "id": "media_uuid",
      "url": "https://cdn.example.com/yarn.webp",
      "alt": "Premium yarn basket",
      "sortOrder": 0
    }
  ],
  "variants": [
    { "id": "variant_uuid", "type": "color", "label": "Purple", "value": "#c084fc", "stock": 12 },
    { "id": "variant_uuid_2", "type": "size", "label": "Large", "value": "large", "stock": 8 },
    { "id": "variant_uuid_3", "type": "weight", "label": "500g", "value": "500g", "stock": 8 }
  ],
  "rating": { "average": 4.8, "count": 42 }
}
```

Cost price must only be returned to authorized admin users. Product prices and stock must always be re-read from the database during checkout.

### Categories

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/categories` | List active categories with images | Public |
| POST | `/categories` | Create category | Admin |
| GET | `/categories/:id` | Category details and product count | Public |
| PATCH | `/categories/:id` | Rename, update slug, or image | Admin |
| DELETE | `/categories/:id` | Archive category | Admin |

Do not delete a category that has products without an explicit reassignment or archive policy.

### Image uploads

Product and category images should not be stored as base64 in the database or browser storage.

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| POST | `/uploads/presign` | Return short-lived object-storage upload URL | Authenticated |
| POST | `/uploads/complete` | Validate uploaded object and create media record | Authenticated |
| DELETE | `/media/:id` | Delete or detach media | Admin |

Validate MIME type, file size, dimensions, file signature, and ownership. Process images into web-friendly formats and serve them through a CDN.

## Homepage and content

The homepage needs featured products, new arrivals, rotating customer reviews, hero slides, and public store settings.

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/home` | Return homepage sections in one request | Public |
| GET | `/home/slides` | List active hero slides | Public |
| POST | `/admin/home/slides` | Create hero slide | Admin |
| PATCH | `/admin/home/slides/:id` | Update or reorder slide | Admin |
| DELETE | `/admin/home/slides/:id` | Archive slide | Admin |
| GET | `/settings/public` | Store name, currency, contact, hours, shipping text | Public |
| PATCH | `/admin/settings` | Update store settings | Admin |

The frontend slider animation is client-side; the backend only supplies ordered, active slides.

## Cart

The server must own the cart for authenticated users and support a guest cart token before login.

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/cart` | Get current cart and server-calculated totals | Authenticated/guest token |
| POST | `/cart/items` | Add product variant and quantity | Authenticated/guest token |
| PATCH | `/cart/items/:id` | Update quantity or selected variant | Authenticated/guest token |
| DELETE | `/cart/items/:id` | Remove item | Authenticated/guest token |
| DELETE | `/cart` | Clear cart | Authenticated/guest token |
| POST | `/cart/merge` | Merge guest cart after login | Authenticated |

Revalidate product status, variant selection, current price, discount, and stock on every cart read and checkout request. Never trust a total submitted by the browser.

## Wishlist

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/wishlist` | List saved products | Authenticated |
| POST | `/wishlist/items` | Save a product | Authenticated |
| DELETE | `/wishlist/items/:productId` | Remove a product | Authenticated |
| DELETE | `/wishlist` | Clear wishlist | Authenticated |

Enforce a unique `(user_id, product_id)` constraint.

## Customer account

### Addresses

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/me/addresses` | List saved addresses | Authenticated |
| POST | `/me/addresses` | Add address | Authenticated |
| PATCH | `/me/addresses/:id` | Edit own address | Authenticated |
| DELETE | `/me/addresses/:id` | Delete own address | Authenticated |
| POST | `/me/addresses/:id/default` | Set default address | Authenticated |

Validate country, postal code, phone, recipient name, and required address fields. A user may have only one default address.

### Payment methods

The frontend may show saved payment method metadata, but the backend must store only provider customer/payment-method IDs and safe display metadata such as brand, last four digits, and expiry month/year.

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/me/payment-methods` | List provider-backed payment methods | Authenticated |
| POST | `/me/payment-methods/setup-intent` | Create provider setup intent | Authenticated |
| POST | `/me/payment-methods/:id/default` | Set default method | Authenticated |
| DELETE | `/me/payment-methods/:id` | Detach provider method | Authenticated |

Never accept, log, or persist raw PAN, CVV, or full card numbers.

## Checkout and shipping

### Checkout endpoints

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/shipping/methods` | List available shipping methods | Public |
| POST | `/checkout/quote` | Calculate subtotal, discounts, shipping, tax, and total | Authenticated |
| POST | `/checkout/validate` | Re-check stock, address, coupon, and quote expiry | Authenticated |
| POST | `/payments/intent` | Create payment-provider intent for validated quote | Authenticated |
| POST | `/orders` | Create order after payment authorization | Authenticated |

Quote response:

```json
{
  "quoteId": "quote_uuid",
  "expiresAt": "2026-10-10T10:15:00Z",
  "currency": "USD",
  "subtotal": 9800,
  "discount": 1000,
  "shipping": 700,
  "tax": 950,
  "total": 10450,
  "items": [
    { "productId": "product_uuid", "variantId": "variant_uuid", "quantity": 2, "unitAmount": 4900 }
  ]
}
```

### Order transaction

Order creation must be transactional:

1. Lock inventory rows.
2. Re-check product publication, variant availability, and stock.
3. Recalculate all prices, discounts, tax, and shipping.
4. Verify the payment intent belongs to the user and amount/currency match.
5. Reserve or decrement inventory.
6. Create immutable order and order-item snapshots.
7. Create payment and shipment records.
8. Clear the cart.
9. Queue confirmation email and invoice generation.

If any step fails, the transaction must roll back. Use idempotency keys to make retries safe.

## Payments and webhooks

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/payments/:id` | Read payment status | Authenticated |
| POST | `/payments/:id/cancel` | Cancel unpaid payment | Authenticated |
| POST | `/payments/:id/refund` | Refund captured payment | Admin |
| POST | `/webhooks/payments/:provider` | Receive signed provider event | Provider signature |

Payment status must be updated from verified provider webhooks, not only from the browser success page. Verify signatures, reject replayed events, store provider event IDs uniquely, and make processing idempotent.

## Orders, invoices, shipping, and returns

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/orders` | Current user's order list | Authenticated |
| GET | `/orders/:id` | Order details | Owner or Admin |
| POST | `/orders/:id/cancel` | Cancel eligible order | Owner or Admin |
| GET | `/orders/:id/invoice` | Download invoice PDF | Owner or Admin |
| POST | `/orders/:id/return-request` | Request return | Owner |
| GET | `/admin/orders` | Filter all orders | Admin |
| PATCH | `/admin/orders/:id/status` | Update fulfillment status | Admin |
| POST | `/admin/orders/:id/refund` | Start refund | Admin |
| POST | `/admin/orders/:id/shipment` | Add carrier/tracking data | Admin/warehouse |

Recommended statuses:

```text
pending_payment
paid
processing
packed
shipped
delivered
cancelled
refunded
partially_refunded
return_requested
returned
```

Store shipping and billing address snapshots on the order so historical invoices remain correct after a customer edits an address.

## Reviews and contact

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/products/:id/reviews` | List approved reviews | Public |
| POST | `/products/:id/reviews` | Submit review | Authenticated |
| PATCH | `/reviews/:id` | Edit own review | Review owner |
| DELETE | `/reviews/:id` | Delete own review | Owner or Admin |
| PATCH | `/admin/reviews/:id/moderate` | Approve, reject, or hide review | Admin |
| POST | `/contact-messages` | Submit contact form | Public |
| GET | `/admin/contact-messages` | List contact messages | Admin |
| PATCH | `/admin/contact-messages/:id` | Mark message open/resolved | Admin |

Only allow a `verifiedPurchase` review when the user has a delivered order containing that product. Protect public contact endpoints with rate limiting and spam controls.

## Discounts and admin portal

| Method | Endpoint | Purpose | Auth |
|---|---|---|---|
| GET | `/discounts/active` | List public active discounts | Public |
| POST | `/admin/discounts` | Create global, category, product, or coupon discount | Admin |
| PATCH | `/admin/discounts/:id` | Update discount | Admin |
| DELETE | `/admin/discounts/:id` | Disable discount | Admin |
| GET | `/admin/dashboard` | Revenue, orders, customers, stock metrics | Admin |
| GET | `/admin/audit-logs` | View admin activity | Admin |
| GET | `/admin/users` | Search and paginate users | Admin |
| PATCH | `/admin/users/:id/status` | Suspend or restore user | Admin |

Discount rules must define:

- Percentage or fixed amount
- Product/category/global scope
- Start and end time
- Minimum order value
- Usage limit and per-user limit
- Whether discounts can stack
- Active/inactive status

Admin product creation must support the current frontend fields: name, description, cost price, selling price, discount percentage, images, stock, category, colors, sizes, and weights.

## Database schema

Use PostgreSQL migrations. Recommended tables:

### Identity

- `users`
- `refresh_tokens`
- `oauth_accounts`
- `email_verification_tokens`
- `password_reset_tokens`

### Catalog

- `categories`
- `products`
- `product_images`
- `product_variants`
- `media`
- `inventory_movements`

### Shopping

- `carts`
- `cart_items`
- `wishlists`
- `wishlist_items`

### Customers

- `addresses`
- `payment_customers`
- `payment_methods`

### Orders

- `checkout_quotes`
- `orders`
- `order_items`
- `payments`
- `shipments`
- `returns`
- `refunds`

### Content and operations

- `reviews`
- `contact_messages`
- `discounts`
- `home_slides`
- `store_settings`
- `audit_logs`
- `provider_webhook_events`

Important constraints:

- Unique user email, product slug, category slug
- Unique OAuth provider/account ID
- Unique wishlist product per user
- Unique cart product/variant per cart
- Unique provider webhook event ID
- Non-negative money, stock, quantity, and tax values
- Ratings between 1 and 5
- Foreign keys with deliberate archive/delete behavior
- Index product status/category, product search fields, order user/status/date, and review product/status

## Security requirements

- HTTPS in every non-local environment.
- Argon2id or bcrypt password hashing.
- Short-lived access tokens and rotating refresh tokens.
- Secure, httpOnly, same-site cookies where cookies are used.
- OAuth 2.0 Authorization Code with PKCE.
- Strict redirect URI and CORS allowlists.
- Request validation with Zod, Joi, or class-validator.
- Role and resource ownership authorization on every protected endpoint.
- Rate limiting for login, registration, password reset, contact, reviews, and checkout.
- CSRF protection when cookie authentication is used.
- Payment-provider webhook signature verification.
- Idempotency for orders, payments, refunds, and webhook events.
- Never trust client prices, totals, stock, discount values, roles, or order status.
- Never log credentials, access tokens, raw card data, or reset tokens.
- Upload MIME/signature checks, size limits, malware scanning, and safe image processing.
- Audit logs for admin changes, inventory adjustments, refunds, role changes, and settings changes.

## Notifications and background jobs

Use Redis/BullMQ or an equivalent queue for:

- Verification emails
- Password reset emails
- Order confirmation emails
- Payment failure emails
- Shipping and delivery updates
- Invoice PDF generation
- Image resizing and optimization
- Abandoned-cart reminders
- Review moderation notifications
- Low-stock alerts

API requests should not wait for email delivery or PDF generation.

## Health, logging, and operations

Required endpoints:

```text
GET /health/live
GET /health/ready
```

Operational requirements:

- Structured JSON logs
- Request/correlation IDs
- Error monitoring such as Sentry
- Metrics for latency, 4xx/5xx errors, checkout failures, payment failures, webhook failures, and stock conflicts
- PostgreSQL backups and restore testing
- Redis monitoring
- Staging and production environments
- Migration command as an explicit deployment step
- Secrets managed by a deployment secret manager

## Environment variables

```env
PORT=4000
WEB_APP_URL=http://localhost:5173
API_URL=http://localhost:4000
DATABASE_URL=postgresql://user:password@localhost:5432/embro
REDIS_URL=redis://localhost:6379

JWT_ACCESS_SECRET=replace-in-production
JWT_REFRESH_SECRET=replace-in-production

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_ALLOWED_REDIRECT_URIS=http://localhost:5173/auth/callback

STORAGE_BUCKET=embro-media
STORAGE_REGION=us-east-1
STORAGE_ENDPOINT=
STORAGE_ACCESS_KEY=
STORAGE_SECRET_KEY=

PAYMENT_PROVIDER=stripe
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

EMAIL_FROM=orders@example.com
EMAIL_API_KEY=
```

Never commit `.env` files or secrets. Use separate provider credentials for development, staging, and production.

## Frontend migration checklist

- [ ] Replace `productStorage.js` with `/products` API calls.
- [ ] Replace `categoryStorage.js` with `/categories` and media upload APIs.
- [ ] Replace `accountStorage.js` with `/me`, `/me/addresses`, and payment-method APIs.
- [ ] Replace `wishlistStorage.js` with `/wishlist` APIs.
- [ ] Replace demo auth users with `/auth/register`, `/auth/login`, and `/auth/refresh`.
- [ ] Connect the Google OAuth button to configured provider credentials.
- [ ] Replace demo cart data with server cart and guest-cart merge.
- [ ] Connect checkout quote, shipping, tax, payment intent, webhook, and order APIs.
- [ ] Load real order history and invoice URLs in the account page.
- [ ] Connect admin CRUD to role-protected APIs.
- [ ] Replace base64 image persistence with signed object-storage uploads.
- [ ] Add API loading, empty, expired-session, validation, and conflict states.
- [ ] Add integration tests for authentication, checkout, payment webhooks, stock races, and admin authorization.

## Minimum implementation order

1. Database, migrations, configuration, health checks, and error format.
2. Users, email/password auth, refresh sessions, and protected middleware.
3. OAuth 2.0 Google flow with PKCE.
4. Categories, products, variants, media uploads, search, and pagination.
5. Cart and wishlist.
6. Addresses, shipping methods, checkout quotes, and tax.
7. Payment intents and signed webhooks.
8. Transactional order creation, inventory, invoices, and order status.
9. Reviews, contact messages, discounts, and notifications.
10. Admin authorization, audit logs, dashboard metrics, and deployment monitoring.
