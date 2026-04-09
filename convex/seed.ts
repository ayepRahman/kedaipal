/**
 * Dev seed script. Inserts 1 retailer + 6 outdoor-gear products.
 *
 * Usage:
 *   npx convex run seed:run
 *   pnpm seed
 *
 * Idempotent — skips if the seed retailer slug already exists.
 * Never run against a production deployment.
 */
import { mutation } from "./_generated/server";

const SEED_SLUG = "trailgear";

const PRODUCTS = [
	{ name: "Basecamp 2-Person Tent", description: "Lightweight 3-season tent, easy setup, 1.8 kg.", price: 39900, stock: 10 },
	{ name: "Trailblazer Backpack 45L", description: "Ergonomic hiking pack with hip-belt pockets.", price: 24900, stock: 15 },
	{ name: "Merino Wool Base Layer", description: "Temperature-regulating, odour-resistant top.", price: 8900, stock: 30 },
	{ name: "Trekking Pole Set (pair)", description: "Aluminium, collapsible, cork grip handles.", price: 14900, stock: 20 },
	{ name: "Headlamp 350lm", description: "USB rechargeable, red-light mode, IPX4 rated.", price: 4900, stock: 50 },
	{ name: "Sleeping Bag -5°C", description: "Mummy-cut, 800g fill, stuff-sack included.", price: 18900, stock: 8 },
] as const;

export const run = mutation({
	args: {},
	handler: async (ctx) => {
		// Idempotency check
		const existing = await ctx.db
			.query("retailers")
			.withIndex("by_slug", (q) => q.eq("slug", SEED_SLUG))
			.first();

		if (existing) {
			console.log(`Seed already applied — retailer "${SEED_SLUG}" exists. Skipping.`);
			return { skipped: true };
		}

		const now = Date.now();

		const retailerId = await ctx.db.insert("retailers", {
			userId: "seed:dev",
			slug: SEED_SLUG,
			storeName: "TrailGear Malaysia",
			waPhone: "601234567890",
			currency: "MYR",
			channel: "whatsapp",
			createdAt: now,
			updatedAt: now,
		});

		for (let i = 0; i < PRODUCTS.length; i++) {
			const p = PRODUCTS[i];
			await ctx.db.insert("products", {
				retailerId,
				name: p.name,
				description: p.description,
				price: p.price,
				currency: "MYR",
				stock: p.stock,
				imageStorageIds: [],
				active: true,
				channel: "whatsapp",
				sortOrder: i,
				createdAt: now,
				updatedAt: now,
			});
		}

		console.log(`Seed complete — retailer "${SEED_SLUG}" with ${PRODUCTS.length} products inserted.`);
		return { skipped: false, retailerId };
	},
});
