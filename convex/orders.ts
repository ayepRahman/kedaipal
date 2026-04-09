import { paginationOptsValidator } from "convex/server";
import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import { computeOrderTotals, generateShortId } from "./lib/order";
import { rateLimiter } from "./lib/rateLimiter";
import { assertValidWaPhone } from "./lib/slug";

const MAX_ITEMS_PER_ORDER = 100;
const SHORT_ID_RETRIES = 3;

const statusValidator = v.union(
	v.literal("pending"),
	v.literal("confirmed"),
	v.literal("packed"),
	v.literal("shipped"),
	v.literal("delivered"),
	v.literal("cancelled"),
);

const transitionStatusValidator = v.union(
	v.literal("confirmed"),
	v.literal("packed"),
	v.literal("shipped"),
	v.literal("delivered"),
	v.literal("cancelled"),
);

type OrderItemSnapshot = {
	productId: Id<"products">;
	name: string;
	price: number;
	quantity: number;
};

export const create = mutation({
	args: {
		retailerId: v.id("retailers"),
		items: v.array(
			v.object({
				productId: v.id("products"),
				quantity: v.number(),
			}),
		),
		currency: v.string(),
		channel: v.union(v.literal("whatsapp")),
		customer: v.object({
			name: v.optional(v.string()),
			waPhone: v.optional(v.string()),
		}),
	},
	handler: async (ctx, args): Promise<{ shortId: string }> => {
		// Rate limit FIRST — public endpoint, throttle per storefront before any DB reads.
		await rateLimiter.limit(ctx, "orderCreate", {
			key: args.retailerId,
			throws: true,
		});

		// Validate shopper's WhatsApp number — required for confirmation flow.
		// Reuses the same E.164-ish validator as retailer onboarding.
		let customerWaPhone: string;
		try {
			customerWaPhone = assertValidWaPhone(args.customer.waPhone ?? "");
		} catch (err) {
			throw new ConvexError((err as Error).message);
		}
		const sanitizedCustomer = {
			name: args.customer.name?.trim() || undefined,
			waPhone: customerWaPhone,
		};

		const retailer = await ctx.db.get(args.retailerId);
		if (!retailer) throw new ConvexError("Retailer not found");

		if (args.items.length === 0)
			throw new ConvexError("Order must have at least one item");
		if (args.items.length > MAX_ITEMS_PER_ORDER)
			throw new ConvexError(`Maximum ${MAX_ITEMS_PER_ORDER} items per order`);

		const snapshotItems: OrderItemSnapshot[] = [];
		// Sum requested quantities per product so a single order with two line
		// items pointing at the same product is validated and decremented once.
		const requestedByProduct = new Map<Id<"products">, number>();
		for (const item of args.items) {
			if (!Number.isInteger(item.quantity) || item.quantity < 1)
				throw new ConvexError("Quantity must be a positive integer");
			const product = await ctx.db.get(item.productId);
			if (!product) throw new ConvexError(`Product ${item.productId} not found`);
			if (product.retailerId !== args.retailerId)
				throw new ConvexError("Product does not belong to this retailer");
			if (!product.active)
				throw new ConvexError(`Product "${product.name}" is not available`);
			if (product.currency !== args.currency)
				throw new ConvexError(
					`Currency mismatch: order is ${args.currency} but "${product.name}" is ${product.currency}`,
				);
			const requestedSoFar = requestedByProduct.get(item.productId) ?? 0;
			const newRequested = requestedSoFar + item.quantity;
			if (product.stock < newRequested)
				throw new ConvexError(
					`Only ${product.stock} of "${product.name}" in stock`,
				);
			requestedByProduct.set(item.productId, newRequested);
			snapshotItems.push({
				productId: item.productId,
				name: product.name,
				price: product.price,
				quantity: item.quantity,
			});
		}

		const { subtotal, total } = computeOrderTotals(snapshotItems);
		const now = Date.now();

		// Reserve stock — patch each product. Same transaction, so any failure
		// rolls back automatically. Re-fetch fresh to avoid stale closure values.
		for (const [productId, qty] of requestedByProduct) {
			const fresh = await ctx.db.get(productId);
			if (!fresh) throw new Error("Product disappeared mid-transaction");
			await ctx.db.patch(productId, {
				stock: fresh.stock - qty,
				updatedAt: now,
			});
		}

		// Collision-safe shortId generation.
		let shortId: string | null = null;
		for (let attempt = 0; attempt < SHORT_ID_RETRIES; attempt++) {
			const candidate = generateShortId();
			const existing = await ctx.db
				.query("orders")
				.withIndex("by_shortId", (q) => q.eq("shortId", candidate))
				.first();
			if (!existing) {
				shortId = candidate;
				break;
			}
		}
		if (!shortId)
			throw new ConvexError("Failed to generate unique order ID, please retry");

		const orderId = await ctx.db.insert("orders", {
			retailerId: args.retailerId,
			shortId,
			items: snapshotItems,
			subtotal,
			total,
			currency: args.currency,
			status: "pending",
			channel: args.channel,
			customer: sanitizedCustomer,
			createdAt: now,
			updatedAt: now,
		});

		await ctx.db.insert("orderEvents", {
			orderId,
			status: "pending",
			createdAt: now,
		});

		return { shortId };
	},
});

/**
 * Returns the count of pending and confirmed orders for the retailer's dashboard tab indicators.
 */
export const countActionable = query({
	args: { retailerId: v.id("retailers") },
	handler: async (ctx, { retailerId }): Promise<{ pending: number; confirmed: number }> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Not authenticated");
		const retailer = await ctx.db.get(retailerId);
		if (!retailer) throw new Error("Retailer not found");
		if (retailer.userId !== identity.subject) throw new Error("Forbidden");

		const [pendingRows, confirmedRows] = await Promise.all([
			ctx.db
				.query("orders")
				.withIndex("by_retailer_status", (q) =>
					q.eq("retailerId", retailerId).eq("status", "pending"),
				)
				.collect(),
			ctx.db
				.query("orders")
				.withIndex("by_retailer_status", (q) =>
					q.eq("retailerId", retailerId).eq("status", "confirmed"),
				)
				.collect(),
		]);

		return { pending: pendingRows.length, confirmed: confirmedRows.length };
	},
});

export const get = query({
	args: { shortId: v.string() },
	handler: async (ctx, { shortId }): Promise<Doc<"orders"> | null> => {
		return ctx.db
			.query("orders")
			.withIndex("by_shortId", (q) => q.eq("shortId", shortId))
			.first();
	},
});

export const listByRetailer = query({
	args: {
		retailerId: v.id("retailers"),
		status: v.optional(statusValidator),
		paginationOpts: paginationOptsValidator,
	},
	handler: async (ctx, { retailerId, status, paginationOpts }) => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Not authenticated");
		const retailer = await ctx.db.get(retailerId);
		if (!retailer) throw new Error("Retailer not found");
		if (retailer.userId !== identity.subject) throw new Error("Forbidden");

		if (status) {
			return ctx.db
				.query("orders")
				.withIndex("by_retailer_status", (q) =>
					q.eq("retailerId", retailerId).eq("status", status),
				)
				.order("desc")
				.paginate(paginationOpts);
		}
		return ctx.db
			.query("orders")
			.withIndex("by_retailer", (q) => q.eq("retailerId", retailerId))
			.order("desc")
			.paginate(paginationOpts);
	},
});

export const updateStatus = mutation({
	args: {
		orderId: v.id("orders"),
		status: transitionStatusValidator,
		note: v.optional(v.string()),
		// Carrier tracking URL — only accepted when transitioning to "shipped".
		// Ignored for other status transitions.
		carrierTrackingUrl: v.optional(v.string()),
	},
	handler: async (ctx, { orderId, status, note, carrierTrackingUrl }): Promise<void> => {
		const identity = await ctx.auth.getUserIdentity();
		if (!identity) throw new Error("Not authenticated");

		const order = await ctx.db.get(orderId);
		if (!order) throw new Error("Order not found");

		const retailer = await ctx.db.get(order.retailerId);
		if (!retailer) throw new Error("Retailer not found");
		if (retailer.userId !== identity.subject) throw new Error("Forbidden");

		const now = Date.now();

		// Restore stock on the FIRST transition into cancelled. Idempotent —
		// re-cancelling a cancelled order is a no-op for stock.
		if (status === "cancelled" && order.status !== "cancelled") {
			const restoreByProduct = new Map<Id<"products">, number>();
			for (const item of order.items) {
				restoreByProduct.set(
					item.productId,
					(restoreByProduct.get(item.productId) ?? 0) + item.quantity,
				);
			}
			for (const [productId, qty] of restoreByProduct) {
				const fresh = await ctx.db.get(productId);
				if (!fresh) continue; // product was deleted; nothing to restore
				await ctx.db.patch(productId, {
					stock: fresh.stock + qty,
					updatedAt: now,
				});
			}
		}

		const patch: Partial<{ status: typeof status; updatedAt: number; carrierTrackingUrl: string }> = {
			status,
			updatedAt: now,
		};
		if (status === "shipped" && carrierTrackingUrl) {
			const trimmed = carrierTrackingUrl.trim();
			if (trimmed.length > 0) {
				patch.carrierTrackingUrl = trimmed;
			}
		}
		await ctx.db.patch(orderId, patch);
		await ctx.db.insert("orderEvents", {
			orderId,
			status,
			note,
			createdAt: now,
		});

		// Fire-and-forget WhatsApp notification. Scheduled (not awaited) so the
		// mutation stays a pure transaction and the action runs with network access.
		await ctx.scheduler.runAfter(
			0,
			internal.whatsapp.notifyStatusChange,
			{ orderId },
		);
	},
});
