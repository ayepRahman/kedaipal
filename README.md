# Kedaipal

**Kedaipal** ("kedai" = shop + "pal") is a WhatsApp-first B2B SaaS order hub for small retailers. WhatsApp is the primary wedge — shoppers receive a CTA link, browse a hosted storefront, build a cart, and complete the order via a `wa.me` deep link. The retailer dashboard handles products, inventory, and order management in real time.

First vertical: **outdoor gear retailers** in Malaysia.

---

## Business Overview

| Concern | Detail |
|---|---|
| Storefront | `kedaipal.com/<retailer-slug>` — no shopper auth required |
| Dashboard | Clerk-protected retailer admin |
| Order flow | WhatsApp CTA → storefront → cart → `wa.me` deep link with `ORDER#id` → Convex confirms |
| Catalog | Hosted in Convex (not Meta Commerce Catalog) |
| Payments | Offline / COD / bank transfer for MVP |
| Roadmap | Shopee, Lazada, TikTok Shop, StoreHub connectors post-MVP |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | [TanStack Start](https://tanstack.com/start) (React + TanStack Router/Query) |
| Styling | Tailwind CSS — mobile-first, ≥44px tap targets |
| Backend / DB | [Convex](https://convex.dev) — functions, HTTP actions, scheduled jobs |
| Auth | [Clerk](https://clerk.com) — retailer dashboard only |
| Hosting | Cloudflare Workers / Pages + Convex Cloud |
| Messaging | WhatsApp Cloud API (Meta test number for MVP) |
| Linting / Formatting | [Biome](https://biomejs.dev/) |
| Testing | [Vitest](https://vitest.dev/) |
| Package manager | pnpm |

---

## Getting Started

```bash
pnpm install
pnpm dev
```

### Build for production

```bash
pnpm build
```

### Tests

```bash
pnpm test
```

### Lint & format

```bash
pnpm lint
pnpm format
pnpm check
```

---

## Project Structure

Routes are file-based under `src/routes/`. The root layout lives in `src/routes/__root.tsx`.

- `src/routes/index.tsx` — public landing page
- `src/routes/app.tsx` — retailer dashboard (Clerk-protected)
- `convex/` — backend schema, queries, mutations, HTTP actions

---

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing.

```tsx
import { Link } from "@tanstack/react-router";

<Link to="/about">About</Link>
```

---

## Server Functions

```tsx
import { createServerFn } from '@tanstack/react-start'

const getServerTime = createServerFn({ method: 'GET' }).handler(async () => {
  return new Date().toISOString()
})
```

---

## Learn More

- [TanStack documentation](https://tanstack.com)
- [TanStack Start](https://tanstack.com/start)
- [Convex documentation](https://docs.convex.dev)
