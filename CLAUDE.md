# Kedaipal — WhatsApp-First Order Hub

See full project context: `/Users/arifrahman/Documents/Claude/Projects/WhatsApp-First Order Hub for Outdoor Gear Retailers/PROJECT_CONTEXT.md`

## Quick Summary
**Kedaipal** ("kedai" + "pal") — B2B SaaS order hub for small retailers. WhatsApp is the wedge; long-term vision is omnichannel (Shopee, Lazada, TikTok Shop, StoreHub). First vertical: outdoor gear.

- Storefront: `kedaipal.com/<retailer-slug>` (no shopper auth)
- Dashboard: Clerk-protected
- Catalog: hosted in Convex (NOT Meta Commerce Catalog)
- Flow: WhatsApp → CTA URL button → web storefront → cart → `wa.me` deep link with `ORDER#id` → Convex confirms

## Tech Stack
- **Messaging:** WhatsApp Cloud API direct (Meta test number for MVP)
- **Backend/DB:** Convex (functions, HTTP actions for webhooks, scheduled jobs)
- **Frontend:** TanStack Start (React + Router/Query) + Tailwind, **mobile-first hard requirement**
- **Auth:** Clerk (retailer dashboard only)
- **Hosting:** Cloudflare Workers/Pages + Convex Cloud
- **Payments:** undecided for MVP (offline/COD/bank transfer)

## MVP Scope
1. Hosted storefront at `/<slug>` — browse, cart
2. WhatsApp bot CTA URL button entry
3. Cart → `wa.me` handoff with order ID
4. Convex parses order, confirms in chat
5. Automated status updates (confirmed/packed/shipped/delivered)
6. Retailer dashboard (products, inventory, orders, live via Convex)

## Architectural Constraints
- Schema must treat WhatsApp as one `channel` — leave room for marketplace connectors post-MVP
- Mobile-first: ≥44px tap targets, single-column, sticky CTAs, bottom-anchored actions
- Multi-tenant via slugs from day one (single retailer for MVP)

## Out of Scope (MVP)
Online payments, Meta Commerce Catalog, business verification, marketplace connectors, native apps, advanced analytics.
