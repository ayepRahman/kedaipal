import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { internalMutation, mutation, query, type QueryCtx } from "./_generated/server";
import { assertValidSlug, assertValidStoreName } from "./lib/slug";

const SLUG_HISTORY_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days

type RetailerPublic = {
	_id: Id<"retailers">;
	slug: string;
	storeName: string;
};

async function loadRetailerForUser(
	ctx: QueryCtx,
	userId: string,
): Promise<RetailerPublic | null> {
	const row = await ctx.db
		.query("retailers")
		.withIndex("by_user", (q) => q.eq("userId", userId))
		.first();
	if (!row) return null;
	return { _id: row._id, slug: row.slug, storeName: row.storeName };
}

async function requireUserId(ctx: QueryCtx): Promise<string> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error("Not authenticated");
	return identity.subject;
}

/**
 * Returns the signed-in user's retailer, or null if they have not completed
 * onboarding yet. Used by `/app` and `/onboarding` route guards.
 */
export const getMyRetailer = query({
	args: {},
	handler: async (ctx): Promise<RetailerPublic | null> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) return null;
		return loadRetailerForUser(ctx, identity.subject);
	},
});

/**
 * Public lookup of a retailer by slug. Also checks `slugHistory` to produce
 * a 301 redirect target if the slug was recently renamed.
 */
export const getRetailerBySlug = query({
	args: { slug: v.string() },
	handler: async (
		ctx,
		{ slug },
	): Promise<
		| { status: "ok"; retailer: RetailerPublic }
		| { status: "redirect"; to: string }
		| { status: "notFound" }
	> => {
		const normalized = slug.trim().toLowerCase();
		if (normalized.length === 0) return { status: "notFound" };

		const active = await ctx.db
			.query("retailers")
			.withIndex("by_slug", (q) => q.eq("slug", normalized))
			.first();
		if (active) {
			return {
				status: "ok",
				retailer: { _id: active._id, slug: active.slug, storeName: active.storeName },
			};
		}

		const historyRow = await ctx.db
			.query("slugHistory")
			.withIndex("by_old_slug", (q) => q.eq("oldSlug", normalized))
			.first();
		if (historyRow && historyRow.expiresAt > Date.now()) {
			const target = await ctx.db.get(historyRow.retailerId);
			if (target) return { status: "redirect", to: target.slug };
		}

		return { status: "notFound" };
	},
});

/**
 * Check slug availability for live form feedback. Returns the same shape as
 * `getRetailerBySlug` but from the perspective of "can the current user claim
 * this slug?" — so owner-reclaim paths return `available`.
 */
export const checkSlugAvailability = query({
	args: { slug: v.string() },
	handler: async (
		ctx,
		{ slug },
	): Promise<
		{ status: "available" } | { status: "taken" } | { status: "invalid"; reason: string }
	> => {
		let normalized: string;
		try {
			normalized = assertValidSlug(slug);
		} catch (err) {
			return { status: "invalid", reason: (err as Error).message };
		}

		const identity = await ctx.auth.getUserIdentity();
		const currentUserId = identity?.subject ?? null;

		const active = await ctx.db
			.query("retailers")
			.withIndex("by_slug", (q) => q.eq("slug", normalized))
			.first();
		if (active) {
			if (currentUserId && active.userId === currentUserId) {
				return { status: "available" };
			}
			return { status: "taken" };
		}

		const historyRow = await ctx.db
			.query("slugHistory")
			.withIndex("by_old_slug", (q) => q.eq("oldSlug", normalized))
			.first();
		if (historyRow && historyRow.expiresAt > Date.now()) {
			if (currentUserId) {
				const historyOwner = await ctx.db.get(historyRow.retailerId);
				if (historyOwner && historyOwner.userId === currentUserId) {
					return { status: "available" };
				}
			}
			return { status: "taken" };
		}

		return { status: "available" };
	},
});

/**
 * Create the signed-in user's retailer. Enforces strict 1:1 user↔retailer.
 *
 * Race-safe: Convex mutations are serializable, so the read-then-insert pattern
 * cannot lose to a concurrent writer.
 */
export const createRetailer = mutation({
	args: {
		storeName: v.string(),
		slug: v.string(),
	},
	handler: async (ctx, args): Promise<{ slug: string }> => {
		const userId = await requireUserId(ctx);
		const storeName = assertValidStoreName(args.storeName);
		const slug = assertValidSlug(args.slug);

		const existing = await ctx.db
			.query("retailers")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		if (existing) {
			throw new Error("You already have a store. Each account can own one retailer.");
		}

		const collision = await ctx.db
			.query("retailers")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.first();
		if (collision) throw new Error("That slug is taken");

		// Slug history collision (someone else's rename, still within TTL)
		const historyRow = await ctx.db
			.query("slugHistory")
			.withIndex("by_old_slug", (q) => q.eq("oldSlug", slug))
			.first();
		if (historyRow && historyRow.expiresAt > Date.now()) {
			throw new Error("That slug is temporarily reserved");
		}
		if (historyRow) {
			// Expired but not yet purged — remove inline.
			await ctx.db.delete(historyRow._id);
		}

		const now = Date.now();
		await ctx.db.insert("retailers", {
			userId,
			slug,
			storeName,
			channel: "whatsapp",
			createdAt: now,
			updatedAt: now,
		});

		return { slug };
	},
});

/**
 * Rename the signed-in user's slug. Old slug is parked in `slugHistory` for
 * 90 days so previously shared WhatsApp links 301-redirect to the new slug.
 * Owner-reclaim: if the new slug is one of this retailer's own historical
 * slugs, the history row is deleted so the link chain terminates cleanly.
 */
export const renameSlug = mutation({
	args: { newSlug: v.string() },
	handler: async (ctx, { newSlug }): Promise<{ slug: string }> => {
		const userId = await requireUserId(ctx);
		const slug = assertValidSlug(newSlug);

		const retailer = await ctx.db
			.query("retailers")
			.withIndex("by_user", (q) => q.eq("userId", userId))
			.first();
		if (!retailer) throw new Error("No store to rename");

		if (retailer.slug === slug) return { slug }; // no-op

		const collision = await ctx.db
			.query("retailers")
			.withIndex("by_slug", (q) => q.eq("slug", slug))
			.first();
		if (collision && collision._id !== retailer._id) {
			throw new Error("That slug is taken");
		}

		const historyRow = await ctx.db
			.query("slugHistory")
			.withIndex("by_old_slug", (q) => q.eq("oldSlug", slug))
			.first();
		if (historyRow) {
			const historyOwner = await ctx.db.get(historyRow.retailerId);
			if (!historyOwner || historyOwner._id !== retailer._id) {
				if (historyRow.expiresAt > Date.now()) {
					throw new Error("That slug is temporarily reserved");
				}
				await ctx.db.delete(historyRow._id);
			} else {
				// Owner reclaim — remove stale history row.
				await ctx.db.delete(historyRow._id);
			}
		}

		const now = Date.now();
		await ctx.db.insert("slugHistory", {
			oldSlug: retailer.slug,
			retailerId: retailer._id,
			expiresAt: now + SLUG_HISTORY_TTL_MS,
		});
		await ctx.db.patch(retailer._id, { slug, updatedAt: now });

		return { slug };
	},
});

/**
 * Daily cron entry point. Deletes `slugHistory` rows whose TTL has elapsed.
 */
export const internalPurgeExpiredSlugHistory = internalMutation({
	args: {},
	handler: async (ctx) => {
		const now = Date.now();
		const rows = await ctx.db.query("slugHistory").collect();
		let purged = 0;
		for (const row of rows) {
			if (row.expiresAt <= now) {
				await ctx.db.delete(row._id);
				purged += 1;
			}
		}
		return { purged };
	},
});
