/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { api, internal } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function setup() {
	const t = convexTest(schema, modules);
	registerRateLimiter(t);
	return t;
}

const USER = "user_wa_test";

type FetchCall = { url: string; body: unknown };

function installFetchMock(): { calls: FetchCall[]; restore: () => void } {
	const calls: FetchCall[] = [];
	const original = globalThis.fetch;
	globalThis.fetch = vi.fn(async (url: unknown, init?: RequestInit) => {
		const body = init?.body ? JSON.parse(init.body as string) : null;
		calls.push({ url: String(url), body });
		return new Response("{}", { status: 200 });
	}) as unknown as typeof fetch;
	return {
		calls,
		restore: () => {
			globalThis.fetch = original;
		},
	};
}

async function seedRetailerWithLocale(
	t: ReturnType<typeof convexTest>,
	locale: "en" | "ms",
): Promise<{ retailerId: Id<"retailers">; productId: Id<"products"> }> {
	const asUser = t.withIdentity({ subject: USER });
	await asUser.mutation(api.retailers.createRetailer, {
		storeName: "Test Outdoor",
		slug: `outdoor-${locale}`,
	});
	if (locale !== "en") {
		await asUser.mutation(api.retailers.updateSettings, { locale });
	}
	const retailer = await asUser.query(api.retailers.getMyRetailer);
	if (!retailer) throw new Error("seed failed");
	const productId = await asUser.mutation(api.products.create, {
		retailerId: retailer._id,
		name: "Tent 2P",
		price: 12000,
		currency: "MYR",
		stock: 100,
		imageStorageIds: [],
		sortOrder: 0,
	});
	return { retailerId: retailer._id, productId };
}

async function createPendingOrder(
	t: ReturnType<typeof convexTest>,
	retailerId: Id<"retailers">,
	productId: Id<"products">,
): Promise<string> {
	const { shortId } = await t.mutation(api.orders.create, {
		retailerId,
		items: [{ productId, quantity: 1 }],
		currency: "MYR",
		channel: "whatsapp",
		customer: { name: "Ali", waPhone: "60123456789" },
	});
	return shortId;
}

beforeEach(() => {
	// Fake timers prevent scheduled functions (runAfter) from auto-firing
	// during the test. This avoids a convex-test limitation where scheduled
	// internalActions that call ctx.runQuery crash with "Transaction not started".
	vi.useFakeTimers();
	process.env.WHATSAPP_ACCESS_TOKEN = "test-token";
	process.env.WHATSAPP_PHONE_NUMBER_ID = "test-phone-id";
	process.env.WHATSAPP_VERIFY_TOKEN = "test-verify";
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("whatsapp inbound", () => {
	test("matches ORD-XXXX, confirms order, sends EN reply, stamps waPhone", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		const { retailerId, productId } = await seedRetailerWithLocale(t, "en");
		const shortId = await createPendingOrder(t, retailerId, productId);

		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: `Hi, my order ${shortId}`,
		});

		const order = await t.query(api.orders.get, { shortId });
		expect(order?.status).toBe("confirmed");
		expect(order?.customer.waPhone).toBe("60123456789");
		expect(fetchMock.calls).toHaveLength(1);
		expect(fetchMock.calls[0].url).toContain("test-phone-id/messages");
		const body = fetchMock.calls[0].body as {
			type: string;
			image: { caption: string };
			to: string;
		};
		expect(body.to).toBe("60123456789");
		expect(body.type).toBe("image");
		expect(body.image.caption).toContain(shortId);
		expect(body.image.caption).toContain("confirmed");
		fetchMock.restore();
	});

	test("uses Bahasa Malaysia copy when retailer locale is ms", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		const { retailerId, productId } = await seedRetailerWithLocale(t, "ms");
		const shortId = await createPendingOrder(t, retailerId, productId);

		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: `Pesanan saya ${shortId}`,
		});

		const body = fetchMock.calls[0].body as { type: string; image: { caption: string } };
		expect(body.type).toBe("image");
		expect(body.image.caption).toContain("Pesanan");
		expect(body.image.caption).toContain("disahkan");
		fetchMock.restore();
	});

	test("idempotent: re-confirming an already-confirmed order does not duplicate event", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		const { retailerId, productId } = await seedRetailerWithLocale(t, "en");
		const shortId = await createPendingOrder(t, retailerId, productId);

		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: shortId,
		});
		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: shortId,
		});

		const order = await t.query(api.orders.get, { shortId });
		const events = await t.run(async (ctx) =>
			ctx.db
				.query("orderEvents")
				.withIndex("by_order", (q) => q.eq("orderId", order!._id))
				.collect(),
		);
		// pending (initial) + confirmed (first inbound) — no duplicate
		expect(events).toHaveLength(2);
		fetchMock.restore();
	});

	test("unknown text sends fallback reply", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		await seedRetailerWithLocale(t, "en");

		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: "hello there",
		});

		const body = fetchMock.calls[0].body as { text: { body: string } };
		expect(body.text.body).toMatch(/browse our catalog/);
		fetchMock.restore();
	});

	test("appends payment instructions to confirm reply when configured", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		const { retailerId, productId } = await seedRetailerWithLocale(t, "en");
		const asUser = t.withIdentity({ subject: USER });
		await asUser.mutation(api.retailers.updateSettings, {
			paymentInstructions: {
				bankName: "Maybank",
				bankAccountName: "Acme Outdoor",
				bankAccountNumber: "5123-4567",
				note: "Send receipt after transfer.",
			},
		});
		const shortId = await createPendingOrder(t, retailerId, productId);

		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: shortId,
		});

		// Only one send (image) — no QR configured.
		expect(fetchMock.calls).toHaveLength(1);
		const body = (fetchMock.calls[0].body as { type: string; image: { caption: string } });
		expect(body.type).toBe("image");
		const caption = body.image.caption;
		expect(caption).toContain(shortId);
		expect(caption).toContain("confirmed");
		expect(caption).toContain("💳 Payment details");
		expect(caption).toContain("Bank: Maybank");
		expect(caption).toContain("Name: Acme Outdoor");
		expect(caption).toContain("Account: 5123-4567");
		expect(caption).toContain("Send receipt after transfer.");
		fetchMock.restore();
	});

	test("payment block is locale-aware (ms retailer)", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		const { retailerId, productId } = await seedRetailerWithLocale(t, "ms");
		const asUser = t.withIdentity({ subject: USER });
		await asUser.mutation(api.retailers.updateSettings, {
			paymentInstructions: { bankName: "CIMB", bankAccountNumber: "9988" },
		});
		const shortId = await createPendingOrder(t, retailerId, productId);

		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: shortId,
		});

		const body = (fetchMock.calls[0].body as { type: string; image: { caption: string } });
		expect(body.type).toBe("image");
		const caption = body.image.caption;
		expect(caption).toContain("disahkan");
		expect(caption).toContain("💳 Maklumat pembayaran");
		expect(caption).toContain("Bank: CIMB");
		expect(caption).toContain("Akaun: 9988");
		fetchMock.restore();
	});

	test("sends QR image as a follow-up when qrImageStorageId set", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		const { retailerId, productId } = await seedRetailerWithLocale(t, "en");
		const asUser = t.withIdentity({ subject: USER });

		// Upload a tiny fake image to Convex storage so getUrl resolves.
		const storageId = await t.run(async (ctx) => {
			const blob = new Blob([new Uint8Array([1, 2, 3, 4])], {
				type: "image/png",
			});
			return ctx.storage.store(blob);
		});

		await asUser.mutation(api.retailers.updateSettings, {
			paymentInstructions: {
				qrImageStorageId: storageId,
				note: "Scan to pay via DuitNow.",
			},
		});
		const shortId = await createPendingOrder(t, retailerId, productId);

		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: shortId,
		});

		// Two sends: image confirm (logo + caption) + image QR
		expect(fetchMock.calls).toHaveLength(2);
		const confirmBody = fetchMock.calls[0].body as {
			type: string;
			image: { link: string; caption: string };
		};
		expect(confirmBody.type).toBe("image");
		expect(confirmBody.image.caption).toContain("Scan to pay via DuitNow.");

		const qrBody = fetchMock.calls[1].body as {
			type: string;
			image: { link: string; caption?: string };
		};
		expect(qrBody.type).toBe("image");
		expect(qrBody.image.link).toMatch(/^https?:\/\//);
		expect(qrBody.image.caption).toBe("Scan to pay");
		fetchMock.restore();
	});

	test("no payment instructions → confirm reply unchanged, no extra send", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		const { retailerId, productId } = await seedRetailerWithLocale(t, "en");
		const shortId = await createPendingOrder(t, retailerId, productId);

		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: shortId,
		});

		expect(fetchMock.calls).toHaveLength(1);
		const body = (fetchMock.calls[0].body as { type: string; image: { caption: string } });
		expect(body.type).toBe("image");
		expect(body.image.caption).not.toContain("💳");
		expect(body.image.caption).not.toContain("Payment details");
		fetchMock.restore();
	});

	test("unmatched ORD shortId sends fallback", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		await seedRetailerWithLocale(t, "en");

		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: "ORD-ZZZZ please",
		});

		expect(fetchMock.calls).toHaveLength(1);
		fetchMock.restore();
	});
});

describe("whatsapp outbound on status change", () => {
	test("notifyStatusChange sends localized message for each status", async () => {
		const cases: Array<{
			locale: "en" | "ms";
			status: "packed" | "shipped" | "delivered" | "cancelled";
			expect: RegExp;
		}> = [
			{ locale: "en", status: "packed", expect: /packed/ },
			{ locale: "en", status: "shipped", expect: /on the way/ },
			{ locale: "en", status: "delivered", expect: /delivered/ },
			{ locale: "en", status: "cancelled", expect: /cancelled/ },
			{ locale: "ms", status: "packed", expect: /dibungkus/ },
			{ locale: "ms", status: "shipped", expect: /perjalanan/ },
			{ locale: "ms", status: "delivered", expect: /sampai/ },
			{ locale: "ms", status: "cancelled", expect: /dibatalkan/ },
		];

		for (const c of cases) {
			const t = setup();
			const fetchMock = installFetchMock();
			const { retailerId, productId } = await seedRetailerWithLocale(
				t,
				c.locale,
			);
			const shortId = await createPendingOrder(t, retailerId, productId);
			// Confirm via inbound to populate waPhone
			await t.action(internal.whatsapp.handleInbound, {
				fromPhone: "60123456789",
				text: shortId,
			});
			fetchMock.calls.length = 0;

			// Patch the order's status directly, then invoke the action.
			// This avoids the scheduler so the test stays deterministic.
			const order = await t.query(api.orders.get, { shortId });
			await t.run(async (ctx) => {
				await ctx.db.patch(order!._id, { status: c.status });
			});
			await t.action(internal.whatsapp.notifyStatusChange, {
				orderId: order!._id,
			});

			const sent = fetchMock.calls.find((call) => {
				const body = call.body as { text?: { body?: string } };
				return body?.text?.body && c.expect.test(body.text.body);
			});
			expect(sent, `${c.locale}/${c.status}`).toBeDefined();
			fetchMock.restore();
		}
	});

	test("uses retailer custom template override with variable interpolation", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		const { retailerId, productId } = await seedRetailerWithLocale(t, "en");
		const asUser = t.withIdentity({ subject: USER });
		await asUser.mutation(api.retailers.updateSettings, {
			messageTemplates: {
				en: {
					confirm: "Yo {shortId}! Thanks from {storeName} 🙌",
					packed: "Custom packed {shortId}",
				},
			},
		});
		const shortId = await createPendingOrder(t, retailerId, productId);
		

		// Confirm via inbound — should use custom confirm template
		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: shortId,
		});
		const confirmBody = (fetchMock.calls[0].body as { type: string; image: { caption: string } });
		expect(confirmBody.type).toBe("image");
		expect(confirmBody.image.caption).toBe(`Yo ${shortId}! Thanks from Test Outdoor 🙌`);
		fetchMock.calls.length = 0;

		// Packed via direct status patch — should use custom packed template
		const order = await t.query(api.orders.get, { shortId });
		await t.run(async (ctx) => {
			await ctx.db.patch(order!._id, { status: "packed" });
		});
		await t.action(internal.whatsapp.notifyStatusChange, {
			orderId: order!._id,
		});
		const packedBody = (fetchMock.calls[0].body as { text: { body: string } })
			.text.body;
		expect(packedBody).toBe(`Custom packed ${shortId}`);
		fetchMock.restore();
	});

	test("missing override key falls back to default catalog", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		const { retailerId, productId } = await seedRetailerWithLocale(t, "en");
		const asUser = t.withIdentity({ subject: USER });
		await asUser.mutation(api.retailers.updateSettings, {
			messageTemplates: { en: { confirm: "Custom confirm {shortId}" } },
		});
		const shortId = await createPendingOrder(t, retailerId, productId);
		await t.action(internal.whatsapp.handleInbound, {
			fromPhone: "60123456789",
			text: shortId,
		});
		fetchMock.calls.length = 0;

		const order = await t.query(api.orders.get, { shortId });
		await t.run(async (ctx) => {
			await ctx.db.patch(order!._id, { status: "shipped" });
		});
		await t.action(internal.whatsapp.notifyStatusChange, {
			orderId: order!._id,
		});
		const body = (fetchMock.calls[0].body as { text: { body: string } }).text
			.body;
		// shipped not overridden → default
		expect(body).toMatch(/on the way/);
		fetchMock.restore();
	});

	test("empty string override is treated as reset", async () => {
		const t = setup();
		const asUser = t.withIdentity({ subject: USER });
		await seedRetailerWithLocale(t, "en");
		await asUser.mutation(api.retailers.updateSettings, {
			messageTemplates: { en: { confirm: "" } },
		});
		const r = await asUser.query(api.retailers.getMyRetailer);
		expect(r?.messageTemplates?.en?.confirm).toBeUndefined();
	});

	test("rejects template longer than 1000 chars", async () => {
		const t = setup();
		const asUser = t.withIdentity({ subject: USER });
		await seedRetailerWithLocale(t, "en");
		await expect(
			asUser.mutation(api.retailers.updateSettings, {
				messageTemplates: { en: { confirm: "x".repeat(1001) } },
			}),
		).rejects.toThrow(/exceeds 1000/);
	});

	test("status change with no customer waPhone is a no-op (no send)", async () => {
		const t = setup();
		const fetchMock = installFetchMock();
		const { retailerId, productId } = await seedRetailerWithLocale(t, "en");
		// Insert directly to bypass the mutation's required-waPhone validation —
		// simulates a legacy/imported order missing a phone.
		const orderId = await t.run(async (ctx) => {
			const now = Date.now();
			return ctx.db.insert("orders", {
				retailerId,
				shortId: "ORD-TEST",
				items: [
					{ productId, name: "Tent 2P", price: 12000, quantity: 1 },
				],
				subtotal: 12000,
				total: 12000,
				currency: "MYR",
				status: "packed",
				channel: "whatsapp",
				customer: {},
				createdAt: now,
				updatedAt: now,
			});
		});
		await t.action(internal.whatsapp.notifyStatusChange, { orderId });
		expect(fetchMock.calls).toHaveLength(0);
		fetchMock.restore();
	});
});
