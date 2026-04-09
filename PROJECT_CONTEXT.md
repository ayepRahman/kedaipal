# Kedaipal — Project Context

> Business, customer, and product context for Kedaipal. Code-level conventions and architectural constraints live in [`CLAUDE.md`](./CLAUDE.md). This document is the narrative — the "why" behind the code.

---

## Product

**Kedaipal** = "kedai" (Malay: shop) + "pal" (friend). A WhatsApp-first B2B SaaS **order hub for small retailers**. Friendly, SMB-facing tone. Positioned as the shopkeeper's buddy.

Name is finalized. Earlier working names (KedaiSync, GearChat) are retired.

**One-liner:** *"An order hub for small retailers that starts with WhatsApp and connects to Shopee, Lazada, TikTok Shop, and more, so they can manage every sale in one place."*

---

## Target Customer

- **Who:** 1–5 employee shops, 50–500 SKUs.
- **Where:** Malaysia first (locale support shipped for `en` and `ms`). Singapore is an adjacent market. Product is not locked to the region long-term.
- **First vertical:** outdoor / camping & hiking gear retailers. Vertical-agnostic by design — outdoor gear is the beachhead, not the ceiling.
- **How they sell today:** physical store + WhatsApp + Shopee / Lazada / TikTok Shop.
- **Core pains:**
  - Orders getting lost in WhatsApp chat history.
  - Inventory mismatches across channels.
  - No unified order view across physical + online channels.

The founder has an existing personal network of MY camping/hiking shop owners — first customer base and early moat driver.

---

## Vision

Omnichannel order hub. WhatsApp is the wedge; the roadmap is to unify orders from the marketplaces retailers already sell on — **Shopee, Lazada, TikTok Shop, StoreHub** — into one dashboard.

The database schema already treats WhatsApp as one `channel` on retailers/products/orders so marketplace connectors can slot in without rewrites.

---

## Core Flow

1. Customer messages the retailer on WhatsApp.
2. Bot replies with a CTA URL button.
3. Button opens the hosted storefront at `kedaipal.com/<retailer-slug>` (no shopper auth).
4. Customer browses the catalog and builds a cart on mobile web.
5. Tapping **Order** bounces them back to WhatsApp via a `wa.me` deep link with an `ORDER#<shortId>` payload.
6. A Convex HTTP action parses the payload, confirms the order in chat, and runs the status pipeline:
   `pending → confirmed → packed → shipped → delivered` (with a `cancelled` branch).

**Catalog is hosted by Kedaipal in Convex — NOT Meta Commerce Catalog.** Full design control, works on Meta's free test number, no Commerce approval needed.

---

## Tech Stack (as built)

| Layer | Choice |
|---|---|
| Messaging | Meta WhatsApp Cloud API direct (no BSP). Free test number for MVP. |
| Backend / DB | Convex — queries, mutations, HTTP actions, scheduled jobs, rate limiter |
| Frontend | TanStack Start (React + Router/Query), file-based routing |
| Styling | Tailwind, **mobile-first** |
| i18n | Paraglide (`en`, `ms`) |
| Auth | Clerk (retailer dashboard only; storefront has no shopper auth) |
| Hosting | Cloudflare Workers/Pages + Convex Cloud |
| Tooling | pnpm, Biome, Vitest |

**Hard requirement:** mobile-first across the entire product. Storefront traffic comes from WhatsApp's in-app browser on phones, and retailers run their shop from a phone, not a laptop. Single-column layouts, ≥44px tap targets, sticky/bottom-anchored CTAs.

---

## What's Built (as of 2026-04-09)

**Convex schema** (`convex/schema.ts`):
- `retailers` — Clerk-linked, slug-addressed, with logo, currency, locale, per-retailer WA message template overrides (en/ms), and optional payment instructions (bank, QR image, note).
- `slugHistory` — preserves old slugs for redirects after renames.
- `products` — price, stock, multiple images, sort order, active flag.
- `orders` — shortId, line items, customer, full status pipeline.
- `orderEvents` — per-order status history.

**Convex modules:** `whatsapp.ts`, `lib/whatsapp.ts`, `lib/whatsappCopy.ts` (templated bilingual copy), `lib/order.ts`, `lib/slug.ts`, `lib/rateLimiter.ts`, `lib/currency.ts`, `http.ts` (webhooks), `crons.ts`, `seed.ts`. Test coverage on orders, products, retailers, whatsapp, and whatsappCopy.

**Frontend routes** (`src/routes/`):
- Public storefront: `/$slug`
- Onboarding, sign-in, sign-up
- Dashboard: `/app` (index, products list/new/detail/import, orders list/detail, settings)

**Current phase:** MVP is substantially implemented. Focus is piloting with the first real shop(s) from the founder's network and iterating based on validation signal.

---

## MVP Scope

1. Hosted storefront at `/<slug>` — browse, cart.
2. WhatsApp CTA URL button as the entry point.
3. Cart → `wa.me` handoff with order ID.
4. Convex parses the order and confirms in chat.
5. Automated status updates (confirmed / packed / shipped / delivered).
6. Retailer dashboard (products, inventory, orders, settings — live via Convex).

## Out of Scope (MVP)

Online payments, Meta Commerce Catalog, Meta business verification, marketplace connectors, marketing / abandoned-cart automations, native mobile apps, advanced analytics.

Payments for MVP: offline / COD / bank transfer. Retailer surfaces payment instructions in the WA confirmation reply.

---

## Business Model

- Solo dev-founder. Sub-$5K budget.
- Target pricing: **RM79–149/month**.
- Meta setup requires no company registration for MVP: personal Facebook account → free Meta Business Account → WhatsApp Business Account → Developer App → test number. Business verification deferred until real volume.

---

## Competitive Landscape

- **Horizontal competitors** (Orderla.my, Take App, Boutir): leave the outdoor/camping niche underserved. No vertical-specific catalog templates, sync workflows, or community tooling.
- **Enterprise tools** (SleekFlow, Respond.io): too complex and expensive for 1–5 employee shops. Not the competition.
- **Kedaipal's opening:** the underserved small-retailer segment in MY, starting with a specific vertical the founder already has trust in.

### Moat drivers

**Real moats (invest here):**
- Existing MY retailer relationships and community trust in the camping retail niche.
- Switching costs via accumulated order and catalog data.
- WhatsApp Business API verification lead time.
- MY/SG localization depth — Ringgit pricing, Shopee/Lazada/TikTok Shop integrations, bilingual copy.

**Weak moats (don't over-index on):**
- Tech stack choices.
- Pricing.
- First-mover status.

---

## Guiding Principles

- **Vertical specificity is the primary wedge.** Outdoor gear is not a limitation — it's the beachhead.
- **Validate before building.** MVP sequencing prioritizes conversations with shop owners before engineering effort.
- **Invest in real moats** (data, community, localization) — not weak ones.
- **Phone-first for everyone.** Both shoppers and retailers live on mobile.
- **Keep the `channel` abstraction intact.** Every future marketplace connector depends on it.

---

## Open Questions

- Final payment gateway for the first paid tier.
- Inventory source of truth once retailers also sell on Shopee/Lazada (Kedaipal vs sync vs webhook-driven reconciliation).
- Marketplace connector ordering post-MVP (Shopee likely first in MY).
- Domain status for `kedaipal.com`.
