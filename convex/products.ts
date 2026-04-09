import { ConvexError, v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { mutation, type MutationCtx, query, type QueryCtx } from "./_generated/server";
import { rateLimiter } from "./lib/rateLimiter";

const MAX_IMAGES_PER_PRODUCT = 5;
const MAX_BULK_IMPORT_BATCH = 50;
const MAX_PRODUCTS_PER_RETAILER = 50; // beta cap

async function requireUserId(
	ctx: QueryCtx | MutationCtx,
): Promise<string> {
	const identity = await ctx.auth.getUserIdentity();
	if (!identity) throw new Error("Not authenticated");
	return identity.subject;
}

async function requireRetailerOwnership(
	ctx: QueryCtx | MutationCtx,
	retailerId: Id<"retailers">,
): Promise<Doc<"retailers">> {
	const userId = await requireUserId(ctx);
	const retailer = await ctx.db.get(retailerId);
	if (!retailer) throw new Error("Retailer not found");
	if (retailer.userId !== userId) throw new Error("Forbidden");
	return retailer;
}

async function requireProductOwnership(
	ctx: MutationCtx,
	productId: Id<"products">,
): Promise<Doc<"products">> {
	const product = await ctx.db.get(productId);
	if (!product) throw new Error("Product not found");
	await requireRetailerOwnership(ctx, product.retailerId);
	return product;
}

async function withImageUrls<T extends { imageStorageIds: string[] }>(
	ctx: QueryCtx,
	row: T,
): Promise<T & { imageUrls: string[] }> {
	const urls = await Promise.all(
		row.imageStorageIds.map((id) => ctx.storage.getUrl(id)),
	);
	return {
		...row,
		imageUrls: urls.filter((u): u is string => u !== null),
	};
}

export const list = query({
	args: { retailerId: v.id("retailers") },
	handler: async (ctx, { retailerId }) => {
		const rows = await ctx.db
			.query("products")
			.withIndex("by_retailer_active", (q) =>
				q.eq("retailerId", retailerId).eq("active", true),
			)
			.collect();
		return Promise.all(rows.map((row) => withImageUrls(ctx, row)));
	},
});

export const listAll = query({
	args: { retailerId: v.id("retailers") },
	handler: async (ctx, { retailerId }) => {
		await requireRetailerOwnership(ctx, retailerId);
		const rows = await ctx.db
			.query("products")
			.withIndex("by_retailer", (q) => q.eq("retailerId", retailerId))
			.collect();
		return Promise.all(rows.map((row) => withImageUrls(ctx, row)));
	},
});

export const get = query({
	args: { productId: v.id("products") },
	handler: async (ctx, { productId }) => {
		const row = await ctx.db.get(productId);
		if (!row) return null;
		return withImageUrls(ctx, row);
	},
});

export const create = mutation({
	args: {
		retailerId: v.id("retailers"),
		name: v.string(),
		description: v.optional(v.string()),
		price: v.number(),
		currency: v.string(),
		stock: v.number(),
		imageStorageIds: v.array(v.string()),
		sortOrder: v.number(),
	},
	handler: async (ctx, args): Promise<Id<"products">> => {
		const userId = await requireUserId(ctx);
		await rateLimiter.limit(ctx, "productWrite", { key: userId, throws: true });
		await requireRetailerOwnership(ctx, args.retailerId);

		const existingCount = await ctx.db
			.query("products")
			.withIndex("by_retailer", (q) => q.eq("retailerId", args.retailerId))
			.collect()
			.then((r) => r.length);
		if (existingCount >= MAX_PRODUCTS_PER_RETAILER)
			throw new ConvexError(
				`Beta limit: maximum ${MAX_PRODUCTS_PER_RETAILER} products per retailer`,
			);

		if (args.price < 0) throw new ConvexError("Price must be non-negative");
		if (!Number.isInteger(args.stock) || args.stock < 0)
			throw new ConvexError("Stock must be a non-negative integer");
		if (args.imageStorageIds.length > MAX_IMAGES_PER_PRODUCT)
			throw new ConvexError(`Maximum ${MAX_IMAGES_PER_PRODUCT} images per product`);
		if (args.name.trim().length === 0) throw new ConvexError("Name is required");

		const now = Date.now();
		return ctx.db.insert("products", {
			retailerId: args.retailerId,
			name: args.name.trim(),
			description: args.description,
			price: args.price,
			currency: args.currency,
			stock: args.stock,
			imageStorageIds: args.imageStorageIds,
			sortOrder: args.sortOrder,
			active: true,
			channel: "whatsapp",
			createdAt: now,
			updatedAt: now,
		});
	},
});

export const update = mutation({
	args: {
		productId: v.id("products"),
		name: v.optional(v.string()),
		description: v.optional(v.string()),
		price: v.optional(v.number()),
		currency: v.optional(v.string()),
		stock: v.optional(v.number()),
		imageStorageIds: v.optional(v.array(v.string())),
		sortOrder: v.optional(v.number()),
		active: v.optional(v.boolean()),
	},
	handler: async (ctx, { productId, ...fields }): Promise<void> => {
		const userId = await requireUserId(ctx);
		await rateLimiter.limit(ctx, "productWrite", { key: userId, throws: true });
		await requireProductOwnership(ctx, productId);

		if (fields.price !== undefined && fields.price < 0)
			throw new ConvexError("Price must be non-negative");
		if (
			fields.stock !== undefined &&
			(!Number.isInteger(fields.stock) || fields.stock < 0)
		)
			throw new ConvexError("Stock must be a non-negative integer");
		if (
			fields.imageStorageIds !== undefined &&
			fields.imageStorageIds.length > MAX_IMAGES_PER_PRODUCT
		)
			throw new ConvexError(`Maximum ${MAX_IMAGES_PER_PRODUCT} images per product`);

		const updates: Record<string, unknown> = { updatedAt: Date.now() };
		for (const [key, value] of Object.entries(fields)) {
			if (value !== undefined) updates[key] = value;
		}
		await ctx.db.patch(productId, updates);
	},
});

export const archive = mutation({
	args: { productId: v.id("products") },
	handler: async (ctx, { productId }): Promise<void> => {
		const userId = await requireUserId(ctx);
		await rateLimiter.limit(ctx, "productWrite", { key: userId, throws: true });
		await requireProductOwnership(ctx, productId);
		await ctx.db.patch(productId, {
			active: false,
			updatedAt: Date.now(),
		});
	},
});

export const bulkCreate = mutation({
	args: {
		retailerId: v.id("retailers"),
		currency: v.string(),
		items: v.array(
			v.object({
				name: v.string(),
				description: v.optional(v.string()),
				price: v.number(),
				stock: v.number(),
			}),
		),
	},
	handler: async (ctx, args): Promise<{ created: number }> => {
		const userId = await requireUserId(ctx);
		await rateLimiter.limit(ctx, "productBulkImport", {
			key: userId,
			throws: true,
		});
		await requireRetailerOwnership(ctx, args.retailerId);

		if (args.items.length === 0)
			throw new ConvexError("No products to import");
		if (args.items.length > MAX_BULK_IMPORT_BATCH)
			throw new ConvexError(
				`Maximum ${MAX_BULK_IMPORT_BATCH} products per batch (received ${args.items.length})`,
			);

		const existingCount = await ctx.db
			.query("products")
			.withIndex("by_retailer", (q) => q.eq("retailerId", args.retailerId))
			.collect()
			.then((r) => r.length);
		if (existingCount + args.items.length > MAX_PRODUCTS_PER_RETAILER)
			throw new ConvexError(
				`Beta limit: would exceed ${MAX_PRODUCTS_PER_RETAILER} products per retailer (currently ${existingCount})`,
			);

		// Pre-validate the entire batch BEFORE any insert so a bad row aborts
		// the whole transaction cleanly — partial imports are confusing.
		args.items.forEach((item, i) => {
			const rowNum = i + 1;
			if (item.name.trim().length === 0)
				throw new ConvexError(`Row ${rowNum}: name is required`);
			if (item.name.length > 120)
				throw new ConvexError(`Row ${rowNum}: name must be at most 120 characters`);
			if (item.price < 0)
				throw new ConvexError(`Row ${rowNum}: price must be non-negative`);
			if (!Number.isInteger(item.stock) || item.stock < 0)
				throw new ConvexError(`Row ${rowNum}: stock must be a non-negative integer`);
		});

		const now = Date.now();
		for (const [i, item] of args.items.entries()) {
			await ctx.db.insert("products", {
				retailerId: args.retailerId,
				name: item.name.trim(),
				description: item.description,
				price: item.price,
				currency: args.currency,
				stock: item.stock,
				imageStorageIds: [],
				sortOrder: now + i,
				active: true,
				channel: "whatsapp",
				createdAt: now,
				updatedAt: now,
			});
		}

		return { created: args.items.length };
	},
});

export const generateUploadUrl = mutation({
	args: {},
	handler: async (ctx): Promise<string> => {
		const userId = await requireUserId(ctx);
		await rateLimiter.limit(ctx, "productWrite", { key: userId, throws: true });
		return ctx.storage.generateUploadUrl();
	},
});

export const reorder = mutation({
	args: {
		productId: v.id("products"),
		sortOrder: v.number(),
	},
	handler: async (ctx, { productId, sortOrder }): Promise<void> => {
		const userId = await requireUserId(ctx);
		await rateLimiter.limit(ctx, "productWrite", { key: userId, throws: true });
		await requireProductOwnership(ctx, productId);
		await ctx.db.patch(productId, {
			sortOrder,
			updatedAt: Date.now(),
		});
	},
});
