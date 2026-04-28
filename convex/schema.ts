import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

/**
 * Multi-tenant core. Every order/inventory entity that lands later MUST carry
 * a `channel` field so future marketplace connectors (Shopee, Lazada, TikTok
 * Shop, StoreHub) slot in without schema rewrites.
 */
export default defineSchema({
	retailers: defineTable({
		userId: v.string(), // Clerk subject (sub claim)
		slug: v.string(),
		storeName: v.string(),
		waPhone: v.optional(v.string()),
		// Email address for retailer-facing operational notifications
		// (new orders, payment claims, etc.). Independent of the Clerk auth
		// email so retailers can route alerts to a shared ops inbox.
		// When unset, the retailer simply receives no email notifications —
		// behaviour mirrors the WhatsApp waPhone field above.
		notifyEmail: v.optional(v.string()),
		// Convex storage ID for the store's logo. Public — surfaced on the
		// storefront header, dashboard hero, and as the OG image fallback.
		logoStorageId: v.optional(v.string()),
		currency: v.optional(v.string()),
		locale: v.optional(v.union(v.literal("en"), v.literal("ms"))),
		// Per-retailer overrides for WhatsApp message copy. Any key omitted falls
		// back to the default catalog in convex/lib/whatsappCopy.ts.
		// Variables supported in templates: {shortId}, {storeName}.
		messageTemplates: v.optional(
			v.object({
				en: v.optional(
					v.object({
						confirm: v.optional(v.string()),
						packed: v.optional(v.string()),
						shipped: v.optional(v.string()),
						delivered: v.optional(v.string()),
						cancelled: v.optional(v.string()),
						unknownFallback: v.optional(v.string()),
					}),
				),
				ms: v.optional(
					v.object({
						confirm: v.optional(v.string()),
						packed: v.optional(v.string()),
						shipped: v.optional(v.string()),
						delivered: v.optional(v.string()),
						cancelled: v.optional(v.string()),
						unknownFallback: v.optional(v.string()),
					}),
				),
			}),
		),
		// Optional payment payout details surfaced to the shopper in the WA
		// confirmation reply. Each field is independent — retailer can configure
		// bank only, QR only, or both.
		paymentInstructions: v.optional(
			v.object({
				bankName: v.optional(v.string()),
				bankAccountName: v.optional(v.string()),
				bankAccountNumber: v.optional(v.string()),
				qrImageStorageId: v.optional(v.string()),
				note: v.optional(v.string()),
			}),
		),
		channel: v.literal("whatsapp"),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_user", ["userId"])
		.index("by_slug", ["slug"]),

	slugHistory: defineTable({
		oldSlug: v.string(),
		retailerId: v.id("retailers"),
		expiresAt: v.number(),
	}).index("by_old_slug", ["oldSlug"]),

	products: defineTable({
		retailerId: v.id("retailers"),
		// Stable retailer-provided identifier. Optional because products created
		// before Sprint 1 (or via the single-product form without a SKU) won't
		// have one. When present + matched, drives bulk upsert behavior.
		sku: v.optional(v.string()),
		name: v.string(),
		description: v.optional(v.string()),
		price: v.number(),
		currency: v.string(),
		stock: v.number(),
		imageStorageIds: v.array(v.string()),
		active: v.boolean(),
		channel: v.union(v.literal("whatsapp")),
		sortOrder: v.number(),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_retailer", ["retailerId"])
		.index("by_retailer_active", ["retailerId", "active"])
		.index("by_retailer_sku", ["retailerId", "sku"]),

	orders: defineTable({
		retailerId: v.id("retailers"),
		shortId: v.string(),
		items: v.array(
			v.object({
				productId: v.id("products"),
				name: v.string(),
				price: v.number(),
				quantity: v.number(),
			}),
		),
		subtotal: v.number(),
		total: v.number(),
		currency: v.string(),
		status: v.union(
			v.literal("pending"),
			v.literal("confirmed"),
			v.literal("packed"),
			v.literal("shipped"),
			v.literal("delivered"),
			v.literal("cancelled"),
		),
		channel: v.union(v.literal("whatsapp")),
		customer: v.object({
			name: v.optional(v.string()),
			waPhone: v.optional(v.string()),
		}),
		// How the customer receives the order. "delivery" = shipped via carrier;
		// "self_collect" = customer picks up from the store. Defaults to "delivery"
		// for orders created before this field existed.
		deliveryMethod: v.optional(
			v.union(v.literal("delivery"), v.literal("self_collect")),
		),
		// Structured shipping address. Required when deliveryMethod === "delivery"
		// and forbidden when "self_collect" — invariant enforced in orders.create.
		// Validated/sanitized server-side via convex/lib/address.ts.
		deliveryAddress: v.optional(
			v.object({
				line1: v.string(),
				line2: v.optional(v.string()),
				city: v.string(),
				state: v.string(),
				postcode: v.string(),
				notes: v.optional(v.string()),
				mapsUrl: v.optional(v.string()),
			}),
		),
		// Optional external carrier tracking URL set by the retailer when marking
		// shipped. Surfaced on the customer tracking page and included in the
		// WhatsApp shipped notification. Only relevant for delivery orders.
		carrierTrackingUrl: v.optional(v.string()),
		createdAt: v.number(),
		updatedAt: v.number(),
	})
		.index("by_retailer", ["retailerId"])
		.index("by_retailer_status", ["retailerId", "status"])
		.index("by_shortId", ["shortId"]),

	orderEvents: defineTable({
		orderId: v.id("orders"),
		status: v.union(
			v.literal("pending"),
			v.literal("confirmed"),
			v.literal("packed"),
			v.literal("shipped"),
			v.literal("delivered"),
			v.literal("cancelled"),
		),
		note: v.optional(v.string()),
		createdAt: v.number(),
	}).index("by_order", ["orderId"]),
});
