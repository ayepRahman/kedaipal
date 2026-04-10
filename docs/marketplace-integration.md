# Marketplace Integration Research: Shopee & TikTok Shop

> **Status:** Research / Design Document
> **Date:** 2026-04-09
> **Scope:** Integrating Shopee Open Platform and TikTok Shop into Kedaipal
> **Principle:** Kedaipal is the single source of truth for product management

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Shopee vs TikTok Shop Comparison](#2-shopee-vs-tiktok-shop-comparison)
3. [Schema Evolution Required](#3-schema-evolution-required)
4. [Shopee Integration Spec](#4-shopee-integration-spec)
5. [TikTok Shop Integration Spec](#5-tiktok-shop-integration-spec)
6. [Shared Infrastructure](#6-shared-infrastructure)
7. [Implementation Phases](#7-implementation-phases)
8. [Open Questions / Risks](#8-open-questions--risks)

---

## 1. Architecture Overview

### Core Principle

Products are created and edited in Kedaipal dashboard, then synced **outbound** to marketplaces. Orders flow **inbound** from marketplaces into the unified Kedaipal order list. Inventory is **bidirectional**: stock changes in Kedaipal push out, marketplace sales pull stock down.

### Data Flow

```
                         ┌──────────────────────────┐
                         │     KEDAIPAL DASHBOARD    │
                         │  (product mgmt, orders,   │
                         │   inventory, settings)    │
                         └────────────┬─────────────┘
                                      │
                              ┌───────┴───────┐
                              │   CONVEX DB   │
                              │  (source of   │
                              │    truth)     │
                              └───────┬───────┘
                                      │
                    ┌─────────────────┼─────────────────┐
                    │                 │                   │
              ┌─────▼─────┐    ┌─────▼─────┐     ┌──────▼──────┐
              │  WhatsApp  │    │  Shopee    │     │  TikTok     │
              │  Channel   │    │  Connector │     │  Shop       │
              │  (current) │    │            │     │  Connector  │
              └─────┬─────┘    └─────┬─────┘     └──────┬──────┘
                    │                │                    │
              ┌─────▼─────┐  ┌──────▼─────┐     ┌──────▼──────┐
              │  WhatsApp  │  │  Shopee    │     │  TikTok     │
              │  Cloud API │  │  Open API  │     │  Shop API   │
              └───────────┘  └────────────┘     └─────────────┘

Sync directions:
  Products:   Kedaipal ─────────────► Marketplaces  (OUT)
  Orders:     Marketplaces ─────────► Kedaipal      (IN)
  Inventory:  Kedaipal ◄───────────► Marketplaces   (BIDIRECTIONAL)
  Status:     Kedaipal ─────────────► Marketplaces  (OUT, fulfillment)
```

### Sync Cadence

| Data Type | Direction | Mechanism | Frequency |
|-----------|-----------|-----------|-----------|
| Product create/update | OUT | Mutation triggers scheduled action | On save (debounced 2s) |
| Product delete/archive | OUT | Mutation triggers scheduled action | On save |
| Inventory (Kedaipal change) | OUT | Batch stock update | On save (debounced 5s, batched) |
| Inventory (marketplace sale) | IN | Webhook + polling fallback | Real-time + poll every 5 min |
| Order ingestion | IN | Webhook + polling fallback | Real-time + poll every 5 min |
| Order status/fulfillment | OUT | On status transition | On save |
| Token refresh | N/A | Convex cron | Every 3.5h (Shopee), daily (TikTok) |

---

## 2. Shopee vs TikTok Shop Comparison

### Head-to-Head

| Dimension | Shopee | TikTok Shop | Winner for Kedaipal |
|-----------|--------|-------------|---------------------|
| **MY Market Share** | Dominant (#1 e-commerce in MY) | Growing fast, strong in social commerce | **Shopee** — larger existing seller base |
| **API Maturity** | v2.0, stable since 2022, well-documented | v2, rapidly evolving, docs sometimes behind | **Shopee** — more stable |
| **Auth Complexity** | OAuth 2.0 + HMAC signing | OAuth 2.0 + request signing (more complex) | **Shopee** — simpler |
| **Product Listing** | Immediate after API call | Requires audit/review (DRAFT→PENDING→LISTED) | **Shopee** — faster to list |
| **Rate Limits** | 100 req/min | 20 QPS (~1200 req/min) for products | **TikTok** — more generous |
| **Webhooks** | Supported, HMAC verification | At-least-once, 72h retry, HMAC verification | **TikTok** — stronger delivery guarantee |
| **Sandbox** | Dedicated sandbox URL | PPE headers on production URL | **Shopee** — cleaner separation |
| **NPM/SDK** | Multiple npm packages available | No mature npm package; Go SDK only | **Shopee** — better JS ecosystem |
| **Category Mapping** | Mandatory, 3-level hierarchy | Mandatory, with per-category attributes | Tie — both require mapping work |
| **Fulfillment** | Standard shipping integration | Stricter (labels, FBT warehouse support) | **Shopee** — simpler for small sellers |
| **Image Requirements** | JPEG/PNG, 100-2000px, 2MB max | JPEG/PNG, min 800x800, max 5000x5000 | **Shopee** — more flexible |
| **Partner Approval** | 1-4 weeks, business registration | 2-10 days, developer account | Tie |
| **Seller Adoption** | Nearly every MY retailer is on Shopee | Growing but optional for most retailers | **Shopee** — higher ROI |

### Recommendation: Build Shopee First

1. **Market coverage** — Shopee is the dominant marketplace in Malaysia. Most outdoor gear retailers already have a Shopee presence.
2. **API maturity** — More stable, better documented, existing npm packages reduce development time.
3. **Simpler listing flow** — No product audit step means faster time-to-value for retailers.
4. **Shared infrastructure** — Building the connector abstraction, category mapping UI, and inventory sync engine for Shopee creates reusable infrastructure that TikTok Shop slots into.
5. **Social commerce upside** — TikTok Shop is the growth play, but building it second lets us learn from Shopee integration mistakes.

### When to Build TikTok Shop

Build TikTok Shop when:
- At least 3 retailers are actively using the Shopee connector
- The connector abstraction is proven stable
- Retailers request TikTok Shop support (demand-driven)
- TikTok Shop MY market share justifies the audit-flow complexity

---

## 3. Schema Evolution Required

Current schema (`convex/schema.ts`) is WhatsApp-only with flat products. Marketplace integration requires additions.

### 3.1 Products Table — New Fields

Current: `retailerId, name, description, price, currency, stock, imageStorageIds[], active, channel, sortOrder, timestamps`

```
New optional fields:
  sku: v.optional(v.string())              // Retailer-assigned SKU code
  weight: v.optional(v.number())           // Weight in grams (marketplace mandatory)
  dimensions: v.optional(v.object({        // Package dimensions in cm
    length: v.number(),
    width: v.number(),
    height: v.number(),
  }))
  categoryId: v.optional(v.id("categories"))
  brand: v.optional(v.string())
```

### 3.2 Product Variants (New Table)

Both Shopee and TikTok require a tier-variant model (Size: S/M/L, Color: Red/Blue).

```
productVariants:
  productId: v.id("products")
  sku: v.string()                           // Unique SKU per variant
  name: v.string()                          // e.g. "Red - L"
  options: v.array(v.object({               // [{name: "Color", value: "Red"}, ...]
    name: v.string(),
    value: v.string(),
  }))
  price: v.number()                         // Variant-level price override
  stock: v.number()                         // Variant-level stock
  imageStorageId: v.optional(v.string())
  active: v.boolean()
  createdAt: v.number()
  updatedAt: v.number()

  Index: by_product [productId]
```

**Backward compat:** Products with zero variants use product-level price/stock (current WhatsApp flow unchanged). Products with variants use variant-level values; product-level becomes aggregate (min price, sum stock).

### 3.3 Categories (New Table)

```
categories:
  retailerId: v.id("retailers")
  name: v.string()                         // "Camping Tents", "Backpacks"
  parentId: v.optional(v.id("categories")) // Hierarchy support
  shopeeCategoryId: v.optional(v.number())
  tiktokCategoryId: v.optional(v.string())
  createdAt: v.number()
  updatedAt: v.number()

  Index: by_retailer [retailerId]
```

### 3.4 Marketplace Connections (New Table)

Each retailer connects their own marketplace accounts. OAuth tokens stored per connection.

```
marketplaceConnections:
  retailerId: v.id("retailers")
  platform: v.union(v.literal("shopee"), v.literal("tiktok"))
  shopId: v.string()
  shopName: v.optional(v.string())
  accessToken: v.string()                   // Encrypted at rest
  refreshToken: v.string()                  // Encrypted at rest
  accessTokenExpiresAt: v.number()
  refreshTokenExpiresAt: v.number()
  status: v.union(v.literal("active"), v.literal("expired"), v.literal("disconnected"))
  lastSyncAt: v.optional(v.number())
  createdAt: v.number()
  updatedAt: v.number()

  Index: by_retailer [retailerId]
  Index: by_retailer_platform [retailerId, platform]
  Index: by_status [status]
```

### 3.5 Marketplace Listings (New Table)

Maps Kedaipal products to marketplace listings. One product can be listed on multiple marketplaces.

```
marketplaceListings:
  productId: v.id("products")
  connectionId: v.id("marketplaceConnections")
  platform: v.union(v.literal("shopee"), v.literal("tiktok"))
  externalProductId: v.string()             // Shopee item_id or TikTok product_id
  externalStatus: v.optional(v.string())    // "NORMAL", "LISTED", "AUDITING"
  attributes: v.optional(v.array(v.object({ // Marketplace-specific attributes
    attributeId: v.number(),
    attributeValue: v.string(),
  })))
  lastSyncedAt: v.optional(v.number())
  lastError: v.optional(v.string())
  createdAt: v.number()
  updatedAt: v.number()

  Index: by_product [productId]
  Index: by_connection [connectionId]
  Index: by_external [platform, externalProductId]
```

### 3.6 Sync Logs (New Table)

Audit trail for debugging sync issues.

```
syncLogs:
  connectionId: v.id("marketplaceConnections")
  direction: v.union(v.literal("outbound"), v.literal("inbound"))
  entityType: v.union(v.literal("product"), v.literal("order"), v.literal("inventory"))
  entityId: v.optional(v.string())
  externalId: v.optional(v.string())
  action: v.string()                         // "create", "update", "status_change"
  status: v.union(v.literal("success"), v.literal("error"))
  errorMessage: v.optional(v.string())
  createdAt: v.number()

  Index: by_connection [connectionId]
  Index: by_entity [entityType, entityId]
```

### 3.7 Channel Field Evolution

```
Current:  v.union(v.literal("whatsapp"))
Evolved:  v.union(v.literal("whatsapp"), v.literal("shopee"), v.literal("tiktok"))
```

Applied to `products` and `orders`. The `retailers` table keeps `channel` as primary storefront channel (always WhatsApp). Connected marketplaces tracked via `marketplaceConnections`.

### 3.8 Orders Table — New Fields

```
New optional fields:
  marketplaceOrderId: v.optional(v.string())
  marketplaceData: v.optional(v.object({
    platform: v.union(v.literal("shopee"), v.literal("tiktok")),
    buyerUsername: v.optional(v.string()),
    shippingCarrier: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    shippingFee: v.optional(v.number()),
    platformFee: v.optional(v.number()),
    paymentMethod: v.optional(v.string()),
    rawStatus: v.optional(v.string()),
  }))

Expanded customer object:
  customer: v.object({
    name: v.optional(v.string()),
    waPhone: v.optional(v.string()),
    marketplaceUsername: v.optional(v.string()),
    shippingAddress: v.optional(v.object({
      fullAddress: v.string(),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      postalCode: v.optional(v.string()),
      country: v.optional(v.string()),
    })),
  })
```

---

## 4. Shopee Integration Spec

### 4.1 Auth Flow (OAuth 2.0)

1. Retailer clicks "Connect Shopee" in settings
2. Redirect to `https://partner.shopeemobile.com/api/v2/shop/auth_partner` with `partner_id`, `redirect_url`, `sign` (HMAC-SHA256)
3. Retailer authorizes on Shopee
4. Shopee redirects back with `code` + `shop_id`
5. Exchange `code` for tokens via `auth/token/get`
6. Store in `marketplaceConnections`

**Token lifecycle:**
- Access token: 4 hours
- Refresh token: 30 days
- Cron refreshes every 3.5h, sets `status: "expired"` if refresh token dies

**Sandbox:** `https://partner.test-stable.shopeemobile.com` (toggle via env var `SHOPEE_ENV`)

### 4.2 Product Sync (Kedaipal → Shopee)

**Create:**
1. Validate required fields (category, weight) — block sync if missing
2. Upload images to Shopee CDN via `media_space/upload_image`
3. Call `product/add_item` with category_id, name, description, SKU, price, stock, weight, dimensions, image_id_list, attribute_list, tier_variation + model (for variants)
4. Store returned `item_id` in `marketplaceListings`

**Update:**
- Metadata → `product/update_item`
- Price → `product/update_price` (or `update_price_batch` for variants)
- Stock → `product/update_stock` (or `update_stock_batch` for variants)
- Images → re-upload + `product/update_item`

**Delete/archive:**
- Archive in Kedaipal → `product/unlist_item` on Shopee (reversible)
- Hard delete → `product/delete_item` (permanent)

### 4.3 Category & Attribute Mapping

- Fetch category tree via `product/get_category` (3-level hierarchy)
- Cache locally, refresh weekly via cron
- Mandatory attributes per category via `product/get_attributes`
- Example for tents: "Brand", "Material", "Capacity"
- Store marketplace-specific attributes on `marketplaceListings`, not core product

### 4.4 Order Ingestion (Shopee → Kedaipal)

**Webhook (primary):**
1. Register webhook for `ORDER_STATUS_UPDATE` via `push/set_app_push_config`
2. Endpoint: `POST /webhook/shopee` in `convex/http.ts`
3. Verify HMAC-SHA256 signature
4. Fetch full order via `order/get_order_detail` (webhook only sends order_sn + status)
5. Upsert into Kedaipal `orders` with `channel: "shopee"`
6. Decrement Kedaipal stock per line item
7. Create `orderEvents` entry

**Polling fallback:** Cron every 5 min calls `order/get_order_list` for each active Shopee connection

### 4.5 Status Mapping

| Shopee Status | Kedaipal Status | Notes |
|---------------|-----------------|-------|
| UNPAID | pending | Buyer hasn't paid |
| READY_TO_SHIP | confirmed | Payment received |
| PROCESSED | confirmed | Synonym in some flows |
| SHIPPED | shipped | Carrier picked up |
| COMPLETED | delivered | Buyer confirmed receipt |
| CANCELLED | cancelled | Buyer or seller cancelled |
| IN_CANCEL | pending | Cancellation requested, not final |

### 4.6 Fulfillment

When retailer marks "shipped" in Kedaipal for a Shopee order:
1. Call `logistics/ship_order` with shipping details
2. May need `logistics/get_shipping_parameter` first for pickup/dropoff selection
3. Write tracking number back to `order.carrierTrackingUrl`

### 4.7 Rate Limits

- **100 requests/minute**
- Queue outbound calls with 600ms spacing
- Batch stock updates via `update_stock_batch` (up to 50 items/call)
- Exponential backoff on 429: start 2s, double each retry

---

## 5. TikTok Shop Integration Spec

### 5.1 Auth Flow (OAuth 2.0 + Request Signing)

1. Retailer clicks "Connect TikTok Shop" in settings
2. Redirect to TikTok authorization URL with `app_key` + `state`
3. Retailer authorizes, TikTok redirects with `auth_code`
4. Exchange for tokens via `/api/v2/token/get`
5. Store in `marketplaceConnections`

**Request signing (all API calls):**
Sort params alphabetically → concatenate `app_secret + path + params + body + app_secret` → SHA256

**Sandbox:** PPE headers (`x-tt-env`, `x-use-ppe: 1`) on production URL

### 5.2 Product Sync (Kedaipal → TikTok)

**Create:**
1. Validate required fields (category, images min 800x800, weight)
2. Upload images to TikTok CDN
3. Call `/product/save/` with category_id, name, description, skus (with sales_attributes, stock, price), weight, dimensions, attr_key_value_map, `third_product_id` = Kedaipal product _id
4. Store returned product_id in `marketplaceListings`

**Product audit flow (unique to TikTok):**
```
  DRAFT ──► PENDING (submitted for audit)
               │
        ┌──────┴──────┐
        ▼             ▼
     LISTED       REJECTED
   (approved)    (must fix & resubmit)
```

- Default to `save_mode: "AS_DRAFT"` for initial creation
- Explicitly submit for audit
- If REJECTED, surface rejection reason in Kedaipal dashboard
- Track via `marketplaceListings.externalStatus`

**Update:**
- Call `/product/save/` with existing product_id (upsert)
- Some edits may re-trigger audit
- Price/stock updates without audit via `/product/update_free_audit/`

**Delete:** `/product/offline` (reversible, no permanent delete API)

### 5.3 Category & Attribute Mapping

- Fetch via `/product/categories/` (region-specific)
- Mandatory attributes via `/product/attributes/`
- Same approach as Shopee: store on `marketplaceListings`

### 5.4 Order Ingestion (TikTok → Kedaipal)

**Webhook (primary):**
1. Register for `ORDER_STATUS_CHANGE` in developer console
2. Endpoint: `POST /webhook/tiktok` in `convex/http.ts`
3. Verify HMAC signature
4. Fetch full order via `/order/detail/`
5. Upsert into `orders` with `channel: "tiktok"`
6. Handle duplicate webhooks idempotently (at-least-once delivery, retries up to 72h)

**Polling fallback:** Cron every 5 min calls `/order/search/` per active TikTok connection

### 5.5 Status Mapping

| TikTok Status | Kedaipal Status | Notes |
|---------------|-----------------|-------|
| UNPAID | pending | Buyer hasn't paid |
| AWAITING_SHIPMENT | confirmed | Paid, ready to ship |
| AWAITING_COLLECTION | confirmed | Awaiting carrier pickup |
| IN_TRANSIT | shipped | With carrier |
| PARTIALLY_SHIPPING | shipped | Split shipment |
| DELIVERED | delivered | Buyer received |
| COMPLETED | delivered | Transaction finalized |
| CANCELLED | cancelled | Order cancelled |

### 5.6 Fulfillment

- **Shipping labels:** Must be generated via `/fulfillment/shipping_info/` — retailers need label printing from dashboard (or link out to TikTok Seller Center initially)
- **Tracking:** Call `/fulfillment/update_shipping_info/` when marking shipped
- **Split shipments:** TikTok supports splitting orders into multiple packages. Kedaipal handles by noting split status in `marketplaceData`
- **FBT (Fulfilled by TikTok):** Recognize FBT orders and skip retailer fulfillment — TikTok handles it

### 5.7 Rate Limits

- **20 QPS** for product endpoints
- **50 req/s** per store per app (general)
- Queue with 50ms spacing
- Monitor `X-RateLimit-Remaining` header
- Exponential backoff with jitter on 429

---

## 6. Shared Infrastructure

### 6.1 Connector Abstraction

Both connectors implement a shared interface:

```typescript
interface MarketplaceConnector {
  // Auth
  getAuthUrl(retailerId: Id<"retailers">): string;
  exchangeCode(code: string, shopId: string): Promise<TokenPair>;
  refreshToken(connection: Doc<"marketplaceConnections">): Promise<TokenPair>;

  // Products
  createProduct(connection, product, variants, attributes, imageUrls): Promise<{ externalProductId: string }>;
  updateProduct(connection, listing, product, variants): Promise<void>;
  deleteProduct(connection, listing): Promise<void>;
  updateStock(connection, listing, stock): Promise<void>;

  // Orders
  fetchRecentOrders(connection, since: number): Promise<MarketplaceOrder[]>;
  getOrderDetail(connection, externalOrderId: string): Promise<MarketplaceOrder>;

  // Fulfillment
  shipOrder(connection, externalOrderId, trackingNumber?): Promise<void>;

  // Categories
  getCategories(connection): Promise<MarketplaceCategory[]>;
  getCategoryAttributes(connection, categoryId): Promise<MarketplaceAttribute[]>;
}
```

Implemented in `convex/lib/connectors/shopee.ts` and `convex/lib/connectors/tiktok.ts`. Called from Convex actions (actions have network access, mutations don't).

### 6.2 Token Refresh Scheduler

Convex cron (every 1h):
- Query `marketplaceConnections` where `accessTokenExpiresAt < now + 30min` and `status === "active"`
- Call connector's `refreshToken`
- If refresh fails → retry once → if still fails, set `status: "expired"` + log to `syncLogs`
- Dashboard shows banner for expired connections

### 6.3 Webhook Receivers

Two new routes in `convex/http.ts`:

- `POST /webhook/shopee` — verify HMAC-SHA256, parse push type, schedule order ingestion, respond 200 immediately
- `POST /webhook/tiktok` — verify signature, parse event type, schedule order ingestion, respond 200 immediately, handle duplicate webhooks via `marketplaceOrderId` check

Same pattern as existing WhatsApp webhook: always respond 200 first, process async.

### 6.4 Rate Limit Handling

- Queue outbound API calls, process sequentially with spacing (600ms Shopee, 50ms TikTok)
- Batch operations where available (`update_stock_batch`)
- If 429 → exponential backoff starting 2s
- Use `ctx.scheduler.runAfter()` with incremental delays for bulk operations

### 6.5 Error Recovery

| Error | Retry? | Strategy |
|-------|--------|----------|
| Network timeout | Yes (3x) | Backoff: 2s, 8s, 32s |
| 429 rate limit | Yes | Wait `Retry-After` or 60s |
| 400 bad request | No | Log, surface in dashboard |
| 401 unauthorized | Refresh token first | Then retry once |
| 500 server error | Yes (3x) | Exponential backoff |
| Invalid webhook signature | No | Log and discard |

Failed operations logged to `syncLogs`. Dashboard shows "Sync Issues" banner when recent errors exist.

### 6.6 Sync Conflict Resolution

**Scenario:** Stock is 10 in Kedaipal. Shopee sale (-1) and retailer manual edit (-2) happen simultaneously.

**Strategy: Inbound decrements, outbound absolutes.**

1. Inbound marketplace sales always **decrement** from current Kedaipal stock (never set absolute)
2. Outbound stock pushes send **current Kedaipal stock as absolute** to all marketplaces
3. Two inbound events arriving out of order still produce correct result (both decrement independently)

**Overselling edge case:**
- If stock reaches 0 but a marketplace sale arrives before the "stock=0" push:
  - Accept the order (marketplace already committed to buyer)
  - Set Kedaipal stock to 0 with oversold flag
  - Push stock=0 to all other marketplaces immediately
  - Surface "oversold" alert in dashboard

---

## 7. Implementation Phases

### Phase 1: Schema Evolution (2-3 weeks)

- Add optional fields to `products` (sku, weight, dimensions, categoryId, brand)
- Create `productVariants`, `categories` tables
- Create `marketplaceConnections`, `marketplaceListings`, `syncLogs` tables
- Widen `channel` union on `products` and `orders`
- Add marketplace fields to `orders` (marketplaceOrderId, marketplaceData, expanded customer)
- Update dashboard product form (weight, dimensions, SKU, variant management, category picker)
- Migration: all new fields optional, existing data unchanged (Convex widen-then-backfill)

### Phase 2: Connector Abstraction + Credential Management (1-2 weeks)

- Define `MarketplaceConnector` interface
- Build OAuth callback HTTP actions
- Build "Connect Marketplace" UI in retailer settings
- Implement token storage + refresh cron
- Build sync log writing + dashboard "Sync Status" view

### Phase 3: Shopee Integration (3-4 weeks)

- Implement `ShopeeConnector` (auth, product CRUD, order ingestion, fulfillment)
- Build Shopee webhook receiver
- Build order polling fallback
- Category/attribute fetching + caching + mapping UI
- Image upload to Shopee CDN
- Outbound stock sync on product update
- Inbound stock decrement on Shopee order
- Status mapping
- E2E testing with Shopee sandbox

### Phase 4: TikTok Shop Integration (3-4 weeks)

- Implement `TikTokConnector` (auth, product CRUD, order ingestion, fulfillment)
- Build TikTok webhook receiver
- Handle product audit flow (DRAFT→PENDING→LISTED/REJECTED) + rejection reason UI
- Request signing implementation
- Category mapping UI (reuse Shopee pattern)
- Image validation (800x800 minimum)
- FBT order recognition
- E2E testing with TikTok PPE sandbox

### Phase 5: Unified Inventory Reconciliation (2 weeks)

- Reconciliation cron: every 15 min, compare Kedaipal stock vs marketplace stock, flag discrepancies
- "Inventory Health" dashboard (per-product stock across all channels)
- Oversold detection + alerts
- Manual "Force Sync" per product per marketplace
- Notification system for sync failures (in-app + optional WhatsApp to retailer)

---

## 8. Open Questions / Risks

### Category Mapping Maintenance
Shopee and TikTok update category trees periodically. **Recommendation:** Cache categories, refresh weekly via cron. If a category is removed, flag affected products in dashboard.

### Marketplace Partner Approval
- **Shopee:** Requires registered business. Approval 1-4 weeks.
- **TikTok:** Developer account required. Approval 2-10 days.
- **Risk:** Delays push Phase 3/4 timelines. **Mitigation:** Start application during Phase 1.

### Rate Limits for High-Volume Retailers
500 SKUs with frequent stock updates could hit Shopee's 100 req/min. **Mitigation:** Batch updates (50 items/call), debounce rapid changes (5s window), space full sync over ~5 minutes.

### Image Requirements vs Current Storage
Current products have no image dimension validation. **Actions needed:**
- Add client-side image validation (dimensions, size) to upload form
- Fetch from Convex storage + re-upload to marketplace CDNs (both require their own hosted images)
- Consider server-side resize if images are too small/large

### Convex Action Timeouts
Convex actions have a 5-minute timeout. Full product sync for large catalogs may exceed this. **Mitigation:** Process in batches of 10-20 per action, chain via `ctx.scheduler.runAfter()`, track progress in a table for resumable syncs.

### Token Encryption at Rest
Convex has no field-level encryption. **Recommendation:** Encrypt tokens with AES-256-GCM using a key in `process.env.TOKEN_ENCRYPTION_KEY` before storing. Decrypt in actions before API calls.

### Retailer `channel` Field
The `channel` field on `retailers` stays as-is (`"whatsapp"`) — it represents the primary storefront channel. Connected marketplaces are discovered via the `marketplaceConnections` table. No breaking migration needed.

### Unmatched Order Line Items
Marketplace orders should reference Kedaipal products via `marketplaceListings.externalProductId`. If unmatched (rare, since Kedaipal is source of truth), create a placeholder product record to maintain referential integrity.

---

## API Reference Links

- **Shopee Open Platform:** https://open.shopee.com/developer-guide/
- **Shopee Sandbox:** https://partner.test-stable.shopeemobile.com
- **TikTok Shop Partner Center:** https://partner.tiktokshop.com/docv2/
- **TikTok Product Management:** https://developers.tiktok.com/doc/product-management
