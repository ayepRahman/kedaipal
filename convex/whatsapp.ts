import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc, Id } from "./_generated/dataModel";
import {
	internalAction,
	internalMutation,
	internalQuery,
} from "./_generated/server";
import { sendImage, sendText } from "./lib/whatsapp";
import {
	paymentQrCaption,
	pickLocale,
	renderMessage,
	renderPaymentInstructions,
	renderRetailerAlert,
	SHORT_ID_REGEX,
	type DeliveryMethod,
	type Locale,
	type MessageTemplates,
	type PaymentInstructions,
	type RetailerAlertKey,
} from "./lib/whatsappCopy";

type ResolvedPayment = {
	instructions: PaymentInstructions | undefined;
	qrImageUrl: string | undefined;
};

const statusValidator = v.union(
	v.literal("pending"),
	v.literal("confirmed"),
	v.literal("packed"),
	v.literal("shipped"),
	v.literal("delivered"),
	v.literal("cancelled"),
);

/**
 * Internal mutation invoked by handleInbound when an ORD-XXXX is matched.
 * Idempotent: re-confirming an already-confirmed order is a no-op for status,
 * but still stamps customer.waPhone if missing.
 */
export const confirmOrderFromWhatsApp = internalMutation({
	args: {
		shortId: v.string(),
		fromPhone: v.string(),
	},
	handler: async (
		ctx,
		{ shortId, fromPhone },
	): Promise<{
		matched: boolean;
		alreadyConfirmed: boolean;
		orderId?: Id<"orders">;
		retailerId?: Id<"retailers">;
	}> => {
		const order = await ctx.db
			.query("orders")
			.withIndex("by_shortId", (q) => q.eq("shortId", shortId))
			.first();
		if (!order) return { matched: false, alreadyConfirmed: false };

		const now = Date.now();
		const patch: Partial<Doc<"orders">> = { updatedAt: now };
		if (!order.customer.waPhone) {
			patch.customer = { ...order.customer, waPhone: fromPhone };
		}

		if (order.status === "pending") {
			patch.status = "confirmed";
			await ctx.db.patch(order._id, patch);
			await ctx.db.insert("orderEvents", {
				orderId: order._id,
				status: "confirmed",
				note: "Confirmed via WhatsApp",
				createdAt: now,
			});
			return {
				matched: true,
				alreadyConfirmed: false,
				orderId: order._id,
				retailerId: order.retailerId,
			};
		}

		// Already past pending — idempotent. Still patch waPhone if needed.
		if (Object.keys(patch).length > 1) {
			await ctx.db.patch(order._id, patch);
		}
		return {
			matched: true,
			alreadyConfirmed: true,
			orderId: order._id,
			retailerId: order.retailerId,
		};
	},
});

/**
 * Internal query for actions to load order + retailer for outbound messaging.
 */
export const getOrderWithRetailer = internalQuery({
	args: { orderId: v.id("orders") },
	handler: async (
		ctx,
		{ orderId },
	): Promise<{
		shortId: string;
		status: Doc<"orders">["status"];
		customerWaPhone: string | undefined;
		storeName: string;
		retailerWaPhone: string | undefined;
		retailerSlug: string;
		carrierTrackingUrl: string | undefined;
		deliveryMethod: DeliveryMethod;
		locale: Locale;
		messageTemplates: MessageTemplates | undefined;
	} | null> => {
		const order = await ctx.db.get(orderId);
		if (!order) return null;
		const retailer = await ctx.db.get(order.retailerId);
		if (!retailer) return null;
		return {
			shortId: order.shortId,
			status: order.status,
			customerWaPhone: order.customer.waPhone,
			storeName: retailer.storeName,
			retailerWaPhone: retailer.waPhone,
			retailerSlug: retailer.slug,
			carrierTrackingUrl: order.carrierTrackingUrl,
			deliveryMethod: (order.deliveryMethod as DeliveryMethod | undefined) ?? "delivery",
			locale: (retailer.locale as Locale | undefined) ?? "en",
			messageTemplates: retailer.messageTemplates as
				| MessageTemplates
				| undefined,
		};
	},
});

export const getRetailerLocaleForOrder = internalQuery({
	args: { shortId: v.string() },
	handler: async (
		ctx,
		{ shortId },
	): Promise<{
		locale: Locale;
		storeName: string;
		retailerWaPhone: string | undefined;
		messageTemplates: MessageTemplates | undefined;
		deliveryMethod: DeliveryMethod;
		payment: ResolvedPayment;
	} | null> => {
		const order = await ctx.db
			.query("orders")
			.withIndex("by_shortId", (q) => q.eq("shortId", shortId))
			.first();
		if (!order) return null;
		const retailer = await ctx.db.get(order.retailerId);
		if (!retailer) return null;
		const instructions = retailer.paymentInstructions as
			| PaymentInstructions
			| undefined;
		let qrImageUrl: string | undefined;
		if (instructions?.qrImageStorageId) {
			const url = await ctx.storage.getUrl(instructions.qrImageStorageId);
			qrImageUrl = url ?? undefined;
		}
		return {
			locale: (retailer.locale as Locale | undefined) ?? "en",
			storeName: retailer.storeName,
			retailerWaPhone: retailer.waPhone,
			messageTemplates: retailer.messageTemplates as
				| MessageTemplates
				| undefined,
			deliveryMethod: (order.deliveryMethod as DeliveryMethod | undefined) ?? "delivery",
			payment: { instructions, qrImageUrl },
		};
	},
});

/**
 * Process an inbound WhatsApp text message. Searches for an ORD-XXXX token,
 * confirms the order, and replies in the retailer's locale. Unknown messages
 * receive a friendly fallback in English (we don't yet know the retailer).
 */
export const handleInbound = internalAction({
	args: {
		fromPhone: v.string(),
		text: v.string(),
	},
	handler: async (ctx, { fromPhone, text }): Promise<void> => {
		const fallback = (): string =>
			renderMessage(undefined, "en", "unknownFallback", {
				shortId: "",
				storeName: "",
			});

		const match = text.match(SHORT_ID_REGEX);
		if (!match) {
			try {
				await sendText(fromPhone, fallback());
			} catch (err) {
				console.error("WA fallback send failed", err);
			}
			return;
		}

		const shortId = match[0];
		const result = await ctx.runMutation(
			internal.whatsapp.confirmOrderFromWhatsApp,
			{ shortId, fromPhone },
		);

		if (!result.matched) {
			try {
				await sendText(fromPhone, fallback());
			} catch (err) {
				console.error("WA fallback send failed", err);
			}
			return;
		}

		const meta = await ctx.runQuery(
			internal.whatsapp.getRetailerLocaleForOrder,
			{ shortId },
		);
		const locale = pickLocale(meta?.locale);
		const storeName = meta?.storeName ?? "Kedaipal";
		const contactPhone = meta?.retailerWaPhone;
		const appUrl = process.env.APP_URL ?? "https://kedaipal.com";
		const trackingUrl = `${appUrl}/track/${shortId}`;
		const confirmBody = renderMessage(
			meta?.messageTemplates,
			locale,
			"confirm",
			{ shortId, storeName, contactPhone, trackingUrl, deliveryMethod: meta?.deliveryMethod ?? "delivery" },
		);
		const paymentBlock = renderPaymentInstructions(
			locale,
			meta?.payment.instructions,
		);
		const body = paymentBlock ? `${confirmBody}\n${paymentBlock}` : confirmBody;
		const brandImageUrl = `${process.env.APP_URL ?? "https://kedaipal.com"}/logo-2.png`;
		try {
			await sendImage(fromPhone, brandImageUrl, body);
		} catch (err) {
			// Fall back to plain text if image send fails
			console.error("WA confirm image send failed, falling back to text", err);
			try {
				await sendText(fromPhone, body);
			} catch (textErr) {
				console.error("WA confirm send failed", textErr);
			}
		}

		// QR image, if configured, is sent as a follow-up image message so the
		// shopper can long-press to save it. Failures are isolated from the text
		// reply above.
		const qrUrl = meta?.payment.qrImageUrl;
		if (qrUrl) {
			try {
				await sendImage(fromPhone, qrUrl, paymentQrCaption(locale));
			} catch (err) {
				console.error("WA payment QR send failed", err);
			}
		}

		// Alert the retailer about the newly confirmed order (only on first
		// confirmation, not idempotent re-sends). Sent directly from this action
		// rather than via scheduler to avoid convex-test limitations with
		// scheduled functions from mutations-within-actions.
		if (!result.alreadyConfirmed && result.orderId) {
			const alertMeta = await ctx.runQuery(
				internal.whatsapp.getOrderForRetailerAlert,
				{ orderId: result.orderId },
			);
			if (alertMeta?.retailerWaPhone) {
				const totalFormatted = `${alertMeta.currency} ${(alertMeta.total / 100).toFixed(2)}`;
				const alertBody = renderRetailerAlert(alertMeta.locale, "orderConfirmed", {
					shortId: alertMeta.shortId,
					itemCount: alertMeta.itemCount,
					totalFormatted,
					customerName: alertMeta.customerName,
					deliveryMethod: alertMeta.deliveryMethod,
				});
				try {
					await sendText(alertMeta.retailerWaPhone, alertBody);
				} catch (err) {
					console.error("WA retailer confirmation alert failed", err);
				}
			}
		}
	},
});

/**
 * Scheduled by orders.updateStatus. Sends a localized status update to the
 * shopper. Errors are swallowed (logged) so the originating mutation never
 * fails because of an outbound network issue.
 */
export const notifyStatusChange = internalAction({
	args: { orderId: v.id("orders") },
	handler: async (ctx, { orderId }): Promise<void> => {
		type Meta = {
			shortId: string;
			status: Doc<"orders">["status"];
			customerWaPhone: string | undefined;
			storeName: string;
			retailerWaPhone: string | undefined;
			retailerSlug: string;
			carrierTrackingUrl: string | undefined;
			deliveryMethod: DeliveryMethod;
			locale: Locale;
			messageTemplates: MessageTemplates | undefined;
		};
		let meta: Meta | null = null;
		try {
			meta = await ctx.runQuery(internal.whatsapp.getOrderWithRetailer, {
				orderId,
			});
		} catch (err) {
			console.error("WA notify lookup failed", err);
			return;
		}
		if (!meta) return;
		if (!meta.customerWaPhone) return;
		if (meta.status === "pending" || meta.status === "confirmed") return;

		const appUrl = process.env.APP_URL ?? "https://kedaipal.com";
		const trackingUrl = `${appUrl}/track/${meta.shortId}`;
		const locale = pickLocale(meta.locale);
		const body = renderMessage(meta.messageTemplates, locale, meta.status, {
			shortId: meta.shortId,
			storeName: meta.storeName,
			contactPhone: meta.retailerWaPhone,
			trackingUrl,
			carrierTrackingUrl: meta.carrierTrackingUrl,
			deliveryMethod: meta.deliveryMethod,
		});
		try {
			await sendText(meta.customerWaPhone, body);
		} catch (err) {
			console.error("WA status notify failed", err);
		}
	},
});

// ---------------------------------------------------------------------------
// Retailer order alerts (WhatsApp notification TO the retailer)
// ---------------------------------------------------------------------------

export const getOrderForRetailerAlert = internalQuery({
	args: { orderId: v.id("orders") },
	handler: async (
		ctx,
		{ orderId },
	): Promise<{
		shortId: string;
		status: Doc<"orders">["status"];
		itemCount: number;
		total: number;
		currency: string;
		customerName: string;
		deliveryMethod: DeliveryMethod;
		retailerWaPhone: string | undefined;
		locale: Locale;
	} | null> => {
		const order = await ctx.db.get(orderId);
		if (!order) return null;
		const retailer = await ctx.db.get(order.retailerId);
		if (!retailer) return null;
		return {
			shortId: order.shortId,
			status: order.status,
			itemCount: order.items.reduce((sum, i) => sum + i.quantity, 0),
			total: order.total,
			currency: order.currency,
			customerName: order.customer.name ?? "Anonymous",
			deliveryMethod: (order.deliveryMethod as DeliveryMethod | undefined) ?? "delivery",
			retailerWaPhone: retailer.waPhone,
			locale: (retailer.locale as Locale | undefined) ?? "en",
		};
	},
});

export const notifyRetailerOrderAlert = internalAction({
	args: { orderId: v.id("orders") },
	handler: async (ctx, { orderId }): Promise<void> => {
		const meta = await ctx.runQuery(
			internal.whatsapp.getOrderForRetailerAlert,
			{ orderId },
		);
		if (!meta) return;
		if (!meta.retailerWaPhone) return;

		const alertKey: RetailerAlertKey =
			meta.status === "pending" ? "newOrder" : "orderConfirmed";
		const totalFormatted = `${meta.currency} ${(meta.total / 100).toFixed(2)}`;

		const body = renderRetailerAlert(meta.locale, alertKey, {
			shortId: meta.shortId,
			itemCount: meta.itemCount,
			totalFormatted,
			customerName: meta.customerName,
			deliveryMethod: meta.deliveryMethod,
		});

		try {
			await sendText(meta.retailerWaPhone, body);
		} catch (err) {
			console.error("WA retailer alert failed", err);
		}
	},
});

// Re-export validator for tests / other modules.
export { statusValidator };
