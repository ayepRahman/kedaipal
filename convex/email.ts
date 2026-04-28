import { v } from "convex/values";
import { internal } from "./_generated/api";
import type { Doc } from "./_generated/dataModel";
import { internalAction, internalQuery } from "./_generated/server";
import { sendEmail } from "./lib/email";
import {
	type DeliveryMethod,
	type Locale,
	renderRetailerEmail,
	type RetailerEmailKey,
} from "./lib/emailCopy";

/**
 * Internal query for the email action to load order + retailer email + locale.
 * Mirrors whatsapp.getOrderForRetailerAlert but returns notifyEmail instead of
 * the retailer's WhatsApp number.
 */
export const getOrderForRetailerEmail = internalQuery({
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
		notifyEmail: string | undefined;
		storeName: string;
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
			notifyEmail: retailer.notifyEmail,
			storeName: retailer.storeName,
			locale: (retailer.locale as Locale | undefined) ?? "en",
		};
	},
});

/**
 * Scheduled by orders.create (newOrder) and whatsapp.handleInbound after a
 * successful ORD-XXXX match (orderConfirmed). Sends the retailer an email
 * alert. Errors are swallowed (logged) so the originating mutation never fails
 * because of an outbound issue.
 */
export const notifyRetailerOrderAlert = internalAction({
	args: { orderId: v.id("orders") },
	handler: async (ctx, { orderId }): Promise<void> => {
		let meta: {
			shortId: string;
			status: Doc<"orders">["status"];
			itemCount: number;
			total: number;
			currency: string;
			customerName: string;
			deliveryMethod: DeliveryMethod;
			notifyEmail: string | undefined;
			storeName: string;
			locale: Locale;
		} | null = null;
		try {
			meta = await ctx.runQuery(internal.email.getOrderForRetailerEmail, {
				orderId,
			});
		} catch (err) {
			console.error("Email retailer notify lookup failed", err);
			return;
		}
		if (!meta) {
			console.error(
				`Email retailer alert skipped: no order meta (orderId=${orderId})`,
			);
			return;
		}
		if (!meta.notifyEmail) {
			console.warn(
				`Email retailer alert skipped: notifyEmail is empty (orderId=${orderId}, shortId=${meta.shortId})`,
			);
			return;
		}

		const alertKey: RetailerEmailKey =
			meta.status === "pending" ? "newOrder" : "orderConfirmed";
		const totalFormatted = `${meta.currency} ${(meta.total / 100).toFixed(2)}`;
		const dashboardUrl = `${process.env.APP_URL ?? "https://kedaipal.com"}/app/orders/${meta.shortId}`;

		const { subject, html, text } = renderRetailerEmail(meta.locale, alertKey, {
			shortId: meta.shortId,
			itemCount: meta.itemCount,
			totalFormatted,
			customerName: meta.customerName,
			deliveryMethod: meta.deliveryMethod,
			storeName: meta.storeName,
			dashboardUrl,
		});

		try {
			await sendEmail(meta.notifyEmail, subject, html, text);
		} catch (err) {
			console.error(
				`Email retailer alert failed (shortId=${meta.shortId}, to=${meta.notifyEmail}): ${
					err instanceof Error ? err.message : String(err)
				}`,
			);
		}
	},
});
