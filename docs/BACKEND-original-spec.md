> **Note:** this is the original design spec written before the security/UX overhaul. Where it disagrees with the code (auth flow, checkout, admin permissions, route list), the code and the main README are authoritative.

# Embro Backend Implementation Specification

This document is the complete backend contract for the Embro React/Vite ecommerce frontend. It describes the APIs, database models, relationships, request/response shapes, seed data, authentication, authorization, checkout, payments, inventory, uploads, admin operations, and deployment requirements.

The current frontend is a prototype. It currently uses browser `localStorage` and hardcoded demo arrays in several places. The backend must replace those values with a secure, shared source of truth.

## 1. Backend goals

The backend must provide:

- Customer registration, login, logout, email verification, and password reset
- OAuth 2.0 login with Google
- Protected customer routes and role-protected admin routes
- Product catalog with search, filtering, sorting, pagination, and infinite-scroll support
- Product descriptions, prices, costs, discounts, stock, images, and variants
- Category management and category images
- Featured products, new arrivals, hero slides, and customer reviews
- Server-side cart and guest-cart merge
- Wishlist management
- Customer profile and account details
- Saved addresses
- Secure payment-method references through a payment provider
- Five-step checkout
- Shipping methods, tax, discount, and total calculation
- Payment intents and signed payment webhooks
- Orders, order history, invoices, shipments, refunds, and returns
- Product reviews with verified-purchase status
- Contact messages
- Admin dashboard, products, categories, users, orders, discounts, settings, and audit logs
- Image uploads using Cloudinary
- Email notifications and background jobs

## 2. Technology stack

- **Node.js 20+** - Backend runtime
- **Express.js** - REST API development
- **MongoDB** - Primary database
- **Mongoose** - MongoDB schemas, validation, and indexes
- **JWT** - Short-lived access-token authentication and authorization
- **OAuth 2.0** - Google social login
- **Nodemailer** - Email verification, password reset, OTPs, and order notifications
- **Stripe** - Secure online payment processing
- **Cloudinary** - Product, category, avatar, and other image uploads
- **MongoDB TTL indexes** - Expiring refresh sessions, reset tokens, verification tokens, guest carts, and checkout quotes

Suggested npm packages:

```text
express mongoose dotenv cors helmet express-rate-limit
jsonwebtoken bcryptjs cookie-parser express-validator
passport passport-google-oauth20
nodemailer stripe cloudinary multer
uuid pino-http
```

Use `/api/v1` as the API prefix:

```text
http://localhost:4000/api/v1
```

## 3. Frontend integration map

| Frontend feature | Backend replacement |
|---|---|
| `productStorage.js` | Product and category APIs |
| `categoryStorage.js` | Category and media APIs |
| `accountStorage.js` | User, address, and payment-method APIs |
| `wishlistStorage.js` | Wishlist APIs |
| Hardcoded `AddCart.jsx` items | Server cart APIs |
| Hardcoded checkout items | Cart, quote, payment, and order APIs |
| Demo auth session | Auth, OAuth, refresh-session APIs |
| Base64/local image storage | Cloudinary uploads and stored public IDs |
| Demo admin products | Admin product APIs |
| Demo admin orders | Admin order APIs |
| Demo admin users | Admin user APIs |
| Theme local storage | Optional user/storefront preferences API |

The backend, not the browser, must be the source of truth for user identity, prices, discounts, inventory, payment status, and orders.

## 4. API conventions

### Request and response rules

- JSON request and response bodies
- ISO 8601 timestamps in UTC
- MongoDB `ObjectId` resource IDs
- Cursor pagination for large lists
- Integer minor-unit money values instead of floating-point prices
- `Authorization: Bearer <access-token>` for protected requests
- Secure httpOnly refresh-token cookie
- `Idempotency-Key` for order, payment, refund, and webhook mutations
- Request/correlation ID in every response

Money example:

```json
{
  "amount": 4900,
  "currency": "PKR"
}
```

Standard error:

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

### Pagination response

```json
{
  "data": [],
  "pagination": {
    "nextCursor": "cursor_value",
    "hasNextPage": true
  }
}
```

## 5. Authentication and authorization APIs

### Endpoints

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/auth/register` | Create a customer account | Public |
| POST | `/auth/login` | Sign in with email/password | Public |
| POST | `/auth/refresh` | Rotate refresh session | Refresh cookie |
| POST | `/auth/logout` | Revoke current session | Authenticated |
| GET | `/auth/verify-email?token=` | Verify email | Token |
| POST | `/auth/forgot-password` | Send reset email | Public |
| POST | `/auth/reset-password` | Change password with one-time token | Token |
| GET | `/me` | Get current user | Authenticated |
| PATCH | `/me` | Update account details | Authenticated |

### Register request

```json
{
  "name": "Madison Ruiz",
  "email": "madison@example.com",
  "password": "StrongPassword123!"
}
```

### Login response

```json
{
  "user": {
    "id": "user_uuid",
    "name": "Madison Ruiz",
    "email": "madison@example.com",
    "role": "customer",
    "emailVerified": true
  },
  "accessToken": "short-lived-access-token"
}
```

Passwords must be hashed with Argon2id or bcrypt. Never store passwords, reset tokens, access tokens, or OAuth provider secrets in plaintext.

### OAuth 2.0

The frontend uses:

```text
GET  /auth/oauth/google/start?redirect_uri=http://localhost:5173/auth/callback
POST /auth/oauth/callback
```

Implement OAuth 2.0 Authorization Code with PKCE:

1. Validate the requested redirect URI against an allowlist.
2. Generate and store `state`, nonce, and PKCE verifier.
3. Redirect to Google.
4. Validate `state` and provider response.
5. Exchange the authorization code on the server.
6. Validate provider issuer, audience, nonce, email, and expiry.
7. Create or link the local user.
8. Create a short-lived, single-use exchange code.
9. Redirect to `/auth/callback?code=<exchange-code>`.
10. Exchange the code through `POST /auth/oauth/callback`.

OAuth callback request:

```json
{
  "code": "single-use-backend-exchange-code",
  "redirectUri": "http://localhost:5173/auth/callback"
}
```

OAuth must never expose provider client secrets to the frontend.

### Roles

```text
customer
admin
super_admin
support
warehouse
```

Enforce roles on the server:

- Customer: own profile, addresses, cart, wishlist, reviews, and orders
- Support: customer/order support tools
- Warehouse: stock and shipment operations
- Admin: catalog, orders, users, discounts, reviews, settings
- Super admin: roles, provider settings, and destructive administration

## 6. Database models

The following Mongoose models are the minimum production schema. Use MongoDB `ObjectId` values for all IDs and references. All schemas should have `timestamps: true` where applicable. In the model tables below, `UUID` means a MongoDB `ObjectId` reference and should be implemented as `Schema.Types.ObjectId`.

### 6.1 User

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `email` | string | Unique, normalized lowercase |
| `passwordHash` | string nullable | Null for OAuth-only account |
| `name` | string | Required |
| `phone` | string nullable | Optional |
| `role` | enum | `customer`, `admin`, `super_admin`, `support`, `warehouse` |
| `status` | enum | `active`, `suspended`, `deleted` |
| `emailVerifiedAt` | datetime nullable | Required for normal login |
| `lastLoginAt` | datetime nullable | Audit |

Relations:

```text
User 1---N Address
User 1---N OAuthAccount
User 1---N RefreshToken
User 1---1 Cart
User 1---1 Wishlist
User 1---N Order
User 1---N Review
```

### 6.2 OAuthAccount

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key |
| `provider` | enum | `google` |
| `providerAccountId` | string | Unique with provider |
| `providerEmail` | string | Provider email |
| `createdAt` | datetime | Required |

Do not store provider access tokens unless a provider feature requires them. Encrypt any token that must be retained.

### 6.3 RefreshToken

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key |
| `tokenHash` | string | Store hash only |
| `expiresAt` | datetime | Required |
| `revokedAt` | datetime nullable | Logout/reuse detection |
| `userAgent` | string nullable | Security audit |
| `ipAddress` | string nullable | Security audit |

### 6.4 Address

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Foreign key |
| `recipientName` | string | Required |
| `addressLine1` | string | Required |
| `addressLine2` | string nullable | Optional |
| `city` | string | Required |
| `country` | string | Required |
| `postalCode` | string | Required |
| `phone` | string | Required |
| `isDefault` | boolean | One default per user |

The current frontend fields map as follows:

```text
name       -> recipientName
address    -> addressLine1
city       -> city
country    -> country
postalCode -> postalCode
phone      -> phone
```

### 6.5 Category

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `name` | string | Required |
| `slug` | string | Unique |
| `description` | text nullable | Optional |
| `imageMediaId` | UUID nullable | Category image |
| `status` | enum | `active`, `archived` |
| `sortOrder` | integer | Category display order |

### 6.6 Product

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `categoryId` | UUID | Foreign key |
| `name` | string | Required |
| `slug` | string | Unique |
| `description` | text | Required |
| `costAmount` | integer | Private admin cost |
| `sellingAmount` | integer | Base selling price |
| `discountPercent` | decimal | 0 to 100 |
| `stock` | integer | Non-negative aggregate stock |
| `status` | enum | `draft`, `published`, `archived` |
| `isFeatured` | boolean | Homepage featured section |
| `isNewArrival` | boolean | Homepage new-arrivals section |
| `publishedAt` | datetime nullable | Publication date |

Calculated public price:

```text
finalAmount = sellingAmount - (sellingAmount * discountPercent / 100)
```

Never accept `finalAmount` from the frontend. Calculate it on the server.

### 6.7 ProductImage

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `productId` | UUID | Foreign key |
| `mediaId` | UUID | Foreign key |
| `altText` | string | Accessibility |
| `sortOrder` | integer | Gallery order |
| `isPrimary` | boolean | One primary image |

### 6.8 ProductVariant

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `productId` | UUID | Foreign key |
| `type` | enum | `color`, `size`, `weight` |
| `label` | string | Display label |
| `value` | string | Hex color or normalized value |
| `sku` | string | Unique stock identifier |
| `stock` | integer | Non-negative |
| `priceDeltaAmount` | integer | Optional price adjustment |
| `status` | enum | `active`, `archived` |

The current admin product form maps to:

```json
{
  "variants": [
    { "type": "color", "label": "Purple", "value": "#c084fc" },
    { "type": "size", "label": "Large", "value": "large" },
    { "type": "weight", "label": "500g", "value": "500g" }
  ]
}
```

### 6.9 Media

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `cloudinaryPublicId` | string | Cloudinary asset identifier |
| `secureUrl` | string | Cloudinary HTTPS URL |
| `resourceType` | string | Usually `image` |
| `mimeType` | string | Validated image type |
| `sizeBytes` | integer | Upload limit |
| `width` | integer | Image metadata |
| `height` | integer | Image metadata |
| `altText` | string nullable | Accessibility |
| `uploadedById` | UUID | Admin/user uploader |

### 6.10 Cart and CartItem

#### Cart

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID nullable | Null for guest cart |
| `guestTokenHash` | string nullable | Guest identity |
| `expiresAt` | datetime nullable | Guest cart expiry |

#### CartItem

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `cartId` | UUID | Foreign key |
| `productId` | UUID | Foreign key |
| `variantId` | UUID nullable | Selected variant |
| `quantity` | integer | Greater than zero |

Unique constraint:

```text
(cartId, productId, variantId)
```

The current `AddCart.jsx` demo item shape:

```json
{
  "id": 1,
  "name": "Premium Yarn Basket",
  "price": 29,
  "quantity": 1,
  "image": "/banner1.png"
}
```

Production cart items must use `productId`, `variantId`, and `quantity`. The server should join the current product name, image, and price instead of trusting those values from the browser.

### 6.11 Wishlist

#### Wishlist

| Field | Type |
|---|---|
| `id` | UUID |
| `userId` | UUID unique |

#### WishlistItem

| Field | Type |
|---|---|
| `wishlistId` | UUID |
| `productId` | UUID |
| `createdAt` | datetime |

Unique constraint:

```text
(wishlistId, productId)
```

### 6.12 CheckoutQuote

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `userId` | UUID | Owner |
| `cartSnapshot` | JSONB | Items and quantities |
| `subtotalAmount` | integer | Server calculated |
| `discountAmount` | integer | Server calculated |
| `shippingAmount` | integer | Server calculated |
| `taxAmount` | integer | Server calculated |
| `totalAmount` | integer | Server calculated |
| `currency` | string | Required |
| `shippingMethodId` | UUID | Required |
| `addressSnapshot` | JSONB | Checkout snapshot |
| `expiresAt` | datetime | Short-lived |
| `status` | enum | `active`, `used`, `expired` |

### 6.13 Order

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `orderNumber` | string | Human-readable unique number |
| `userId` | UUID | Customer |
| `status` | enum | Fulfillment status |
| `paymentStatus` | enum | Payment status |
| `currency` | string | Required |
| `subtotalAmount` | integer | Immutable |
| `discountAmount` | integer | Immutable |
| `shippingAmount` | integer | Immutable |
| `taxAmount` | integer | Immutable |
| `totalAmount` | integer | Immutable |
| `shippingAddressSnapshot` | JSONB | Historical address |
| `billingAddressSnapshot` | JSONB | Historical address |
| `placedAt` | datetime nullable | Payment-confirmed time |

Order statuses:

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

### 6.14 OrderItem

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `orderId` | UUID | Foreign key |
| `productId` | UUID nullable | Keep null if product is later archived |
| `variantId` | UUID nullable | Selected variant |
| `productNameSnapshot` | string | Immutable invoice name |
| `skuSnapshot` | string nullable | Immutable SKU |
| `variantSnapshot` | JSONB | Color/size/weight |
| `unitAmount` | integer | Price at purchase |
| `quantity` | integer | Purchased quantity |
| `lineTotalAmount` | integer | Immutable |

### 6.15 Payment

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `orderId` | UUID | Foreign key |
| `provider` | string | Stripe/PayPal/etc. |
| `providerPaymentId` | string | Unique provider ID |
| `status` | enum | `requires_action`, `authorized`, `captured`, `failed`, `refunded` |
| `amount` | integer | Provider amount |
| `currency` | string | Required |
| `failureCode` | string nullable | Safe provider code |

### 6.16 PaymentMethodReference

Store only provider references and safe display details:

| Field | Type |
|---|---|
| `id` | UUID |
| `userId` | UUID |
| `provider` | string |
| `providerCustomerId` | string |
| `providerPaymentMethodId` | string |
| `brand` | string |
| `last4` | string |
| `expiryMonth` | integer |
| `expiryYear` | integer |
| `isDefault` | boolean |

Never store full card numbers, CVV, PIN, or magnetic-stripe data.

### 6.17 ShippingMethod and Shipment

#### ShippingMethod

| Field | Type |
|---|---|
| `id` | UUID |
| `name` | string |
| `code` | string unique |
| `amount` | integer |
| `estimatedDaysMin` | integer |
| `estimatedDaysMax` | integer |
| `isActive` | boolean |

The current frontend expects:

```text
standard -> $8 demo value
express  -> $15 demo value
pickup   -> $0 demo value
```

These should become database-configured values, not frontend constants.

#### Shipment

| Field | Type |
|---|---|
| `id` | UUID |
| `orderId` | UUID |
| `carrier` | string nullable |
| `trackingNumber` | string nullable |
| `status` | enum |
| `shippedAt` | datetime nullable |
| `deliveredAt` | datetime nullable |

### 6.18 Review

| Field | Type | Rules |
|---|---|---|
| `id` | UUID | Primary key |
| `productId` | UUID | Product |
| `userId` | UUID | Reviewer |
| `orderId` | UUID nullable | Verified purchase source |
| `rating` | integer | 1 to 5 |
| `title` | string nullable | Optional |
| `body` | text | Required |
| `status` | enum | `pending`, `approved`, `rejected`, `hidden` |
| `verifiedPurchase` | boolean | Server calculated |

Only mark a review as verified when a delivered order contains the product.

### 6.19 Discount

| Field | Type |
|---|---|
| `id` | UUID |
| `code` | string nullable |
| `type` | enum: `percentage`, `fixed` |
| `value` | integer/decimal |
| `scope` | enum: `global`, `category`, `product`, `coupon` |
| `productId` | UUID nullable |
| `categoryId` | UUID nullable |
| `startsAt` | datetime |
| `endsAt` | datetime nullable |
| `minimumOrderAmount` | integer nullable |
| `usageLimit` | integer nullable |
| `perUserLimit` | integer nullable |
| `stackable` | boolean |
| `isActive` | boolean |

### 6.20 ContactMessage

| Field | Type |
|---|---|
| `id` | UUID |
| `name` | string |
| `email` | string |
| `phone` | string nullable |
| `message` | text |
| `status` | enum: `new`, `in_progress`, `resolved`, `spam` |
| `assignedToId` | UUID nullable |

### 6.21 Admin and system models

- `HomeSlide`: image, title, subtitle, link, sort order, active dates, status
- `StoreSetting`: key, value, type, public/private flag
- `AuditLog`: actor, action, entity type, entity ID, metadata, IP, timestamp
- `InventoryMovement`: product/variant, quantity delta, reason, reference, actor
- `WebhookEvent`: provider, provider event ID, payload hash, processed status, processed time
- `EmailJob`: template, recipient, payload, status, attempts

## 7. Product APIs

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/products` | Search/filter/paginate products | Public |
| POST | `/products` | Create product | Admin |
| GET | `/products/:id` | Product details | Public |
| PATCH | `/products/:id` | Update product | Admin |
| DELETE | `/products/:id` | Archive product | Admin |
| POST | `/products/:id/publish` | Publish/unpublish | Admin |
| GET | `/products/:id/related` | Related products | Public |
| GET | `/products/:id/reviews` | Approved reviews | Public |
| GET | `/categories` | Active categories | Public |
| POST | `/categories` | Create category | Admin |
| PATCH | `/categories/:id` | Update category | Admin |
| DELETE | `/categories/:id` | Archive category | Admin |

Product list query:

```text
GET /products?q=yarn&category=yarn&sort=price_asc&limit=12&cursor=...
```

Admin product request:

```json
{
  "name": "Premium Yarn Basket",
  "description": "A carefully selected yarn basket for creative projects.",
  "categoryId": "category_uuid",
  "costAmount": 2700,
  "sellingAmount": 4900,
  "discountPercent": 10,
  "stock": 20,
  "isFeatured": true,
  "isNewArrival": false,
  "images": [
    {
      "mediaId": "media_uuid",
      "altText": "Premium yarn basket",
      "sortOrder": 0,
      "isPrimary": true
    }
  ],
  "variants": [
    { "type": "color", "label": "Purple", "value": "#c084fc", "stock": 10 },
    { "type": "size", "label": "Large", "value": "large", "stock": 10 },
    { "type": "weight", "label": "500g", "value": "500g", "stock": 10 }
  ]
}
```

## 8. Cart APIs

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/cart` | Read current cart and totals | Auth/guest |
| POST | `/cart/items` | Add product or variant | Auth/guest |
| PATCH | `/cart/items/:id` | Update quantity/variant | Auth/guest |
| DELETE | `/cart/items/:id` | Remove item | Auth/guest |
| DELETE | `/cart` | Clear cart | Auth/guest |
| POST | `/cart/merge` | Merge guest cart after login | Auth |

Add item request:

```json
{
  "productId": "product_uuid",
  "variantId": "variant_uuid",
  "quantity": 1
}
```

Cart response:

```json
{
  "id": "cart_uuid",
  "items": [
    {
      "id": "cart_item_uuid",
      "productId": "product_uuid",
      "variantId": "variant_uuid",
      "name": "Premium Yarn Basket",
      "image": "https://cdn.example.com/yarn.webp",
      "details": "Large · 500g",
      "unitAmount": 4900,
      "quantity": 1,
      "lineTotalAmount": 4900,
      "stockAvailable": 20
    }
  ],
  "subtotalAmount": 4900,
  "currency": "USD"
}
```

## 9. Wishlist APIs

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/wishlist` | List wishlist products | Auth |
| POST | `/wishlist/items` | Add product | Auth |
| DELETE | `/wishlist/items/:productId` | Remove product | Auth |
| DELETE | `/wishlist` | Clear wishlist | Auth |

## 10. Account APIs

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/me/addresses` | List addresses | Auth |
| POST | `/me/addresses` | Create address | Auth |
| PATCH | `/me/addresses/:id` | Edit address | Auth |
| DELETE | `/me/addresses/:id` | Delete address | Auth |
| POST | `/me/addresses/:id/default` | Set default address | Auth |
| GET | `/me/payment-methods` | List safe payment metadata | Auth |
| POST | `/me/payment-methods/setup-intent` | Create provider setup intent | Auth |
| POST | `/me/payment-methods/:id/default` | Set default method | Auth |
| DELETE | `/me/payment-methods/:id` | Detach method | Auth |

## 11. Checkout, shipping, and payment APIs

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/shipping/methods` | List shipping methods | Public |
| POST | `/checkout/quote` | Calculate secure checkout totals | Auth |
| POST | `/checkout/validate` | Validate quote and inventory | Auth |
| POST | `/payments/intent` | Create provider payment intent | Auth |
| GET | `/payments/:id` | Read payment status | Auth |
| POST | `/payments/:id/cancel` | Cancel unpaid intent | Auth |
| POST | `/orders` | Create paid order | Auth |
| POST | `/webhooks/payments/:provider` | Receive provider events | Signature |

Quote request:

```json
{
  "addressId": "address_uuid",
  "shippingMethodId": "shipping_method_uuid",
  "couponCode": "WELCOME10"
}
```

Quote response:

```json
{
  "quoteId": "quote_uuid",
  "expiresAt": "2026-10-10T12:15:00Z",
  "currency": "USD",
  "subtotalAmount": 9800,
  "discountAmount": 1000,
  "shippingAmount": 800,
  "taxAmount": 480,
  "totalAmount": 10080
}
```

Order request:

```json
{
  "quoteId": "quote_uuid",
  "paymentIntentId": "provider_payment_intent_id",
  "addressId": "address_uuid",
  "shippingMethodId": "shipping_method_uuid"
}
```

Order creation must run in one database transaction:

1. Lock inventory rows.
2. Re-check product status, variant, price, discount, and stock.
3. Recalculate totals on the server.
4. Confirm payment amount and currency.
5. Decrement or reserve stock.
6. Create immutable order and item snapshots.
7. Create payment and shipment records.
8. Clear the cart.
9. Queue invoice and email jobs.

Never trust totals, prices, discount values, stock, or payment status from the browser.

## 12. Orders and admin APIs

### Customer orders

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/orders` | Current user's orders | Auth |
| GET | `/orders/:id` | Order details | Owner/admin |
| POST | `/orders/:id/cancel` | Cancel eligible order | Owner/admin |
| GET | `/orders/:id/invoice` | Invoice PDF/download | Owner/admin |
| POST | `/orders/:id/return-request` | Request return | Owner |

### Admin

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/admin/dashboard` | Metrics and recent orders | Admin |
| GET | `/admin/orders` | Filter all orders | Admin |
| PATCH | `/admin/orders/:id/status` | Update order status | Admin |
| POST | `/admin/orders/:id/shipment` | Add tracking | Admin/warehouse |
| POST | `/admin/orders/:id/refund` | Refund order | Admin |
| GET | `/admin/users` | List/search users | Admin |
| PATCH | `/admin/users/:id/status` | Suspend/restore user | Admin |
| PATCH | `/admin/users/:id/role` | Change role | Super admin |
| GET | `/admin/audit-logs` | View admin actions | Admin |

Invoice data must use immutable order snapshots and include order number, customer, address, items, tax, shipping, discount, total, payment status, and company information.

## 13. Reviews and contact APIs

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/products/:id/reviews` | List approved product reviews | Public |
| POST | `/products/:id/reviews` | Submit review | Auth |
| PATCH | `/reviews/:id` | Edit own review | Owner |
| DELETE | `/reviews/:id` | Delete review | Owner/admin |
| PATCH | `/admin/reviews/:id/moderate` | Approve/reject/hide | Admin |
| POST | `/contact-messages` | Submit contact form | Public |
| GET | `/admin/contact-messages` | View messages | Admin |
| PATCH | `/admin/contact-messages/:id` | Resolve message | Admin |

Contact submission:

```json
{
  "name": "Customer Name",
  "email": "customer@example.com",
  "phone": "+92 300 0000000",
  "message": "I have a question about shipping."
}
```

Apply rate limiting and spam protection to public contact and review endpoints.

## 14. Upload APIs

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| POST | `/uploads/signature` | Create a signed Cloudinary upload signature | Auth |
| POST | `/uploads/complete` | Validate upload and save media record | Auth |
| DELETE | `/media/:id` | Delete Cloudinary asset and media record | Admin |

Validate MIME type, file signature, file size, image dimensions, and ownership. Store the Cloudinary `publicId`, `secureUrl`, resource type, dimensions, and transformation metadata in the `Media` document. Use Cloudinary transformations for thumbnails and responsive product images.

## 15. Homepage and content APIs

| Method | Endpoint | Purpose | Access |
|---|---|---|---|
| GET | `/home` | Homepage data in one response | Public |
| GET | `/home/slides` | Active ordered slides | Public |
| POST | `/admin/home/slides` | Create slide | Admin |
| PATCH | `/admin/home/slides/:id` | Edit/reorder slide | Admin |
| DELETE | `/admin/home/slides/:id` | Archive slide | Admin |
| GET | `/settings/public` | Public store settings | Public |
| PATCH | `/admin/settings` | Update store settings | Admin |

The frontend performs slider/review animation. The backend supplies active, ordered content.

## 16. Seed data to insert

Use a repeatable seed script. It must be safe to run in development and should use upserts where possible.

### Seed users

```json
[
  {
    "name": "Admin User",
    "email": "admin@embro.example",
    "password": "ChangeMe_Admin_123!",
    "role": "admin",
    "emailVerified": true
  },
  {
    "name": "Madison Ruiz",
    "email": "madison@example.com",
    "password": "ChangeMe_User_123!",
    "role": "customer",
    "emailVerified": true
  },
  {
    "name": "Sarah Mitchell",
    "email": "sarah@example.com",
    "password": "ChangeMe_User_456!",
    "role": "customer",
    "emailVerified": true
  }
]
```

Hash these passwords before insertion. Do not use these credentials in production.

### Seed categories

```json
[
  { "name": "Yarn", "slug": "yarn", "sortOrder": 1 },
  { "name": "Beads", "slug": "beads", "sortOrder": 2 },
  { "name": "Threads", "slug": "threads", "sortOrder": 3 }
]
```

Category images:

```text
Yarn    -> banner1.png
Beads   -> banner.png
Threads -> banner2.png
```

In production, upload these images to Cloudinary and store the resulting `publicId` and `secureUrl` in media documents.

### Seed products

These products match the current frontend catalog. Prices below are decimal examples; convert to integer minor units in the database.

| Name | Category | Selling | Original | Stock |
|---|---|---:|---:|---:|
| Premium Yarn Basket | Yarn | 49 | 69 | 20 |
| Colourful Bead Strands | Beads | 29 | 39 | 23 |
| Pastel Thread Set | Threads | 35 | 45 | 26 |
| Rainbow Crochet Kit | Yarn | 58 | 75 | 29 |
| Premium Crystal Beads | Beads | 32 | 44 | 32 |
| Classic Sewing Bundle | Threads | 40 | 52 | 35 |
| Soft Wool Craft Basket | Yarn | 54 | 70 | 38 |
| Gemstone Accent Pack | Beads | 27 | 36 | 41 |
| Rainbow Thread Bundle | Threads | 42 | 55 | 44 |
| Luxury Knit Collection | Yarn | 63 | 82 | 47 |
| Ocean Pearl Mix | Beads | 38 | 49 | 50 |
| Minimal Thread Starter | Threads | 24 | 33 | 53 |
| Craft Loom Basket | Yarn | 60 | 78 | 56 |
| Rose Gold Bead Set | Beads | 46 | 59 | 59 |
| Cotton Blend Pack | Threads | 31 | 42 | 62 |
| Studio Cotton Bundle | Yarn | 52 | 68 | 65 |

For every seed product insert:

- Unique slug
- Description
- Cost amount, initially approximately 55% of selling amount
- Selling amount
- Discount percent initially 0
- Category ID
- Stock
- One primary image
- `isFeatured` and `isNewArrival` flags
- At least one inventory movement with reason `initial_stock`

### Seed shipping methods

```json
[
  {
    "name": "Standard shipping",
    "code": "standard",
    "amount": 800,
    "estimatedDaysMin": 3,
    "estimatedDaysMax": 7,
    "isActive": true
  },
  {
    "name": "Express shipping",
    "code": "express",
    "amount": 1500,
    "estimatedDaysMin": 1,
    "estimatedDaysMax": 3,
    "isActive": true
  },
  {
    "name": "Store pickup",
    "code": "pickup",
    "amount": 0,
    "estimatedDaysMin": 0,
    "estimatedDaysMax": 1,
    "isActive": true
  }
]
```

The current demo checkout uses a 5% tax example. Production tax must be configurable by country/region and calculated server-side.

### Seed reviews

Create approved reviews linked to delivered seed orders so the homepage can show verified customer cards:

```json
[
  {
    "productSlug": "premium-yarn-basket",
    "userEmail": "madison@example.com",
    "rating": 5,
    "title": "Beautiful quality",
    "body": "The colors and texture were exactly what I needed.",
    "status": "approved",
    "verifiedPurchase": true
  },
  {
    "productSlug": "colourful-bead-strands",
    "userEmail": "sarah@example.com",
    "rating": 4,
    "title": "Lovely selection",
    "body": "Great variety and carefully packed.",
    "status": "approved",
    "verifiedPurchase": true
  }
]
```

## 17. Database constraints and indexes

Required unique constraints:

```text
users.email
products.slug
categories.slug
oauth_accounts(provider, providerAccountId)
wishlists.userId
wishlist_items(wishlistId, productId)
cart_items(cartId, productId, variantId)
webhook_events(provider, providerEventId)
```

Required indexes:

```text
products(status, categoryId, createdAt)
products(isFeatured, status)
products(isNewArrival, status)
orders(userId, createdAt)
orders(status, createdAt)
reviews(productId, status)
inventory_movements(productId, createdAt)
contact_messages(status, createdAt)
audit_logs(actorId, createdAt)
```

Add MongoDB text indexes (or Atlas Search in production) for product name, slug, description, and category.

## 18. Inventory rules

- Inventory cannot become negative.
- Every stock change creates an `InventoryMovement`.
- Admin manual adjustments require a reason.
- Checkout uses an atomic MongoDB transaction or conditional update to reserve relevant inventory.
- Payment failure releases reservations.
- Cancellation/restock creates a positive movement.
- Shipment does not automatically mean delivery.
- Product aggregate stock should be derived from variant stock where variants exist.
- Hide or mark products unavailable when stock reaches zero.

## 19. Security checklist

- HTTPS outside local development
- Argon2id/bcrypt password hashing
- Short-lived JWT access-token expiry and rotating refresh tokens
- Secure httpOnly same-site cookies
- OAuth 2.0 Authorization Code with PKCE
- Redirect URI and CORS allowlists
- Request schema validation
- Resource ownership checks
- Server-side role checks
- Rate limiting on auth, contact, reviews, and checkout
- CSRF protection for cookie-authenticated state changes
- Signed payment webhook verification
- Idempotency for payments, orders, refunds, and webhooks
- No client-provided price, total, role, stock, or payment status is trusted
- No raw card data stored
- Image MIME/signature/size validation
- Admin audit logging
- Secrets stored outside source control
- Database backups and restore testing

## 20. Background jobs

Use a MongoDB-backed job collection and worker process (or add a queue service later) for:

- Verification emails
- Password reset emails
- Order confirmation emails
- Payment-failure emails
- Shipment and delivery emails
- Invoice PDF generation
- Image resizing and optimization
- Abandoned-cart reminders
- Low-stock alerts
- Review moderation notifications

Do not block checkout requests while sending emails or generating PDFs.

## 21. Health and operations

Required endpoints:

```text
GET /health/live
GET /health/ready
```

Add:

- Structured JSON logs
- Request IDs
- Error monitoring
- Latency and 5xx metrics
- Checkout/payment/webhook failure metrics
- Stock-conflict metrics
- MongoDB backup monitoring
- MongoDB connection and replica-set monitoring
- Development, staging, and production environments
- Explicit migration and seed commands

## 22. Environment variables

```env
NODE_ENV=development
PORT=4000
WEB_APP_URL=http://localhost:5173
API_URL=http://localhost:4000

MONGODB_URI=mongodb://localhost:27017/embro

JWT_ACCESS_SECRET=replace-in-production
JWT_REFRESH_SECRET=replace-in-production
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d
JWT_COOKIE_NAME=embro_refresh

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
OAUTH_ALLOWED_REDIRECT_URIS=http://localhost:5173/auth/callback

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

MAIL_HOST=smtp.example.com
MAIL_PORT=587
MAIL_USER=
MAIL_PASSWORD=
MAIL_FROM=orders@example.com
```

## 23. Recommended implementation order

1. Create the backend project and environment configuration.
2. Add Mongoose schemas, MongoDB indexes, and seed scripts.
3. Add error handling, validation, logging, and health endpoints.
4. Implement users, email auth, refresh sessions, and protected middleware.
5. Implement Google OAuth 2.0 with PKCE.
6. Implement categories, products, variants, search, and pagination.
7. Implement media upload and CDN URLs.
8. Implement server cart and guest-cart merge.
9. Implement wishlist, addresses, and payment-method references.
10. Implement shipping methods, tax, discount rules, and checkout quotes.
11. Implement payment intents and signed webhooks.
12. Implement transactional order creation and inventory reservation.
13. Implement invoices, shipments, refunds, returns, and notifications.
14. Implement reviews, contact messages, home content, and discounts.
15. Implement admin APIs, audit logs, metrics, and deployment.

## 24. Frontend migration checklist

- [ ] Replace `getProducts()` with `GET /products`.
- [ ] Replace product admin local storage with product CRUD APIs.
- [ ] Replace category image local storage with category/media APIs.
- [ ] Replace account local storage with `/me`, address, and payment APIs.
- [ ] Replace wishlist local storage with wishlist APIs.
- [ ] Replace `AddCart.jsx` hardcoded items with `/cart`.
- [ ] Replace checkout hardcoded items with cart and quote responses.
- [ ] Replace demo auth users with auth APIs.
- [ ] Configure OAuth provider credentials and callback URL.
- [ ] Add access-token refresh and expired-session handling.
- [ ] Add real payment provider UI/tokenization.
- [ ] Add order history, invoice download, and shipment tracking.
- [ ] Add API loading, empty, validation, unauthorized, and stock-conflict states.
- [ ] Add integration tests for auth, OAuth, cart, checkout, payments, inventory races, and admin authorization.

## 25. Current implementation status

The initial backend foundation is now available in this directory:

- `src/app.js` - Express application, security middleware, CORS, rate limiting, and route mounting
- `src/server.js` - MongoDB connection and HTTP server startup
- `src/config/env.js` - Environment configuration
- `src/config/db.js` - Mongoose connection lifecycle
- `src/models/User.js` - User and role model
- `src/models/Category.js` - Category and Cloudinary image metadata model
- `src/models/Product.js` - Product, image, pricing, stock, and variant model
- `src/routes/health.js` - Liveness and readiness endpoints
- `src/routes/auth.js` - Register, login, refresh, logout, and current-user endpoints
- `src/routes/products.js` - Public product search/list/detail endpoints
- `src/routes/categories.js` - Public category list endpoint
- `src/middleware/auth.js` - JWT authentication and role middleware
- `src/middleware/errorHandler.js` - Consistent API error responses
- `src/seed.js` - Development admin, category, and product seed data

Implemented now:

- Express server
- MongoDB/Mongoose connection
- JWT access and refresh tokens
- httpOnly refresh cookie
- Password hashing with bcrypt
- Customer registration and login
- Product and category public APIs
- MongoDB text index for product search
- Health checks
- Helmet, CORS, JSON limits, and rate limiting
- Development seed script
- Email verification token model with MongoDB TTL expiration
- Password reset token model with MongoDB TTL expiration
- Nodemailer SMTP delivery helper
- Verification, resend-verification, forgot-password, and reset-password endpoints

Still to implement:

- Google OAuth provider exchange and frontend callback testing (implementation is in `backend/src/routes/auth.js` and `backend/src/routes/oauthCallback.js`)
- Cloudinary upload completion/media persistence and frontend upload integration (signed upload endpoint is implemented)
- Stripe webhook event persistence and order/payment status reconciliation (intent creation and signature validation are implemented)
- Transactional inventory reservations, invoice generation, and return workers
- Homepage slide/settings APIs and notification workers
- Automated API tests and frontend API integration

The backend is feature-complete at the route-contract level, but payment webhooks, inventory transactions, email delivery, OAuth provider callbacks, and Cloudinary uploads still require real provider credentials and integration tests before production release.
