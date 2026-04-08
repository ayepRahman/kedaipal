/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

function setup() {
	const t = convexTest(schema, modules);
	registerRateLimiter(t);
	return t;
}

const USER_A = "user_test_a";
const USER_B = "user_test_b";

async function seedRetailer(t: ReturnType<typeof convexTest>, userId: string) {
	const asUser = t.withIdentity({ subject: userId });
	const safeSuffix = userId.replace(/[^a-z0-9]/g, "");
	await asUser.mutation(api.retailers.createRetailer, {
		storeName: "Test Store",
		slug: `test-store-${safeSuffix}`,
	});
	const retailer = await asUser.query(api.retailers.getMyRetailer);
	if (!retailer) throw new Error("seed failed");
	return retailer;
}

async function seedProduct(
	t: ReturnType<typeof convexTest>,
	userId: string,
	retailerId: Id<"retailers">,
	overrides: Partial<{
		name: string;
		price: number;
		currency: string;
		stock: number;
	}> = {},
) {
	const asUser = t.withIdentity({ subject: userId });
	return asUser.mutation(api.products.create, {
		retailerId,
		name: overrides.name ?? "Tent 2P",
		price: overrides.price ?? 12000,
		currency: overrides.currency ?? "MYR",
		stock: overrides.stock ?? 100,
		imageStorageIds: [],
		sortOrder: 0,
	});
}

async function getProductStock(
	t: ReturnType<typeof convexTest>,
	productId: Id<"products">,
): Promise<number> {
	const p = await t.run(async (ctx) => ctx.db.get(productId));
	if (!p) throw new Error("product missing");
	return p.stock;
}

const customer = { name: "Ali", waPhone: "60123456789" };

describe("orders", () => {
	test("create returns shortId in ORD-XXXX format", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id);
		const { shortId } = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 1 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		expect(shortId).toMatch(/^ORD-[A-Z2-9]{4}$/);
	});

	test("computes correct subtotal and total", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const p1 = await seedProduct(t, USER_A, retailer._id, { price: 10000 });
		const p2 = await seedProduct(t, USER_A, retailer._id, {
			name: "Stove",
			price: 5000,
		});
		const { shortId } = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [
				{ productId: p1, quantity: 2 },
				{ productId: p2, quantity: 3 },
			],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		const order = await t.query(api.orders.get, { shortId });
		expect(order?.subtotal).toBe(35000);
		expect(order?.total).toBe(35000);
	});

	test("snapshots product name and price at order time", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id, {
			price: 10000,
		});
		const { shortId } = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 1 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		// Mutate product price after order creation.
		const asA = t.withIdentity({ subject: USER_A });
		await asA.mutation(api.products.update, { productId, price: 99999 });
		const order = await t.query(api.orders.get, { shortId });
		expect(order?.items[0].price).toBe(10000);
	});

	test("rejects product from a different retailer", async () => {
		const t = setup();
		const retailerA = await seedRetailer(t, USER_A);
		const retailerB = await seedRetailer(t, USER_B);
		const productB = await seedProduct(t, USER_B, retailerB._id);

		await expect(
			t.mutation(api.orders.create, {
				retailerId: retailerA._id,
				items: [{ productId: productB, quantity: 1 }],
				currency: "MYR",
				channel: "whatsapp",
				customer,
			}),
		).rejects.toThrow(/does not belong/);
	});

	test("rejects archived product", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id);
		const asA = t.withIdentity({ subject: USER_A });
		await asA.mutation(api.products.archive, { productId });

		await expect(
			t.mutation(api.orders.create, {
				retailerId: retailer._id,
				items: [{ productId, quantity: 1 }],
				currency: "MYR",
				channel: "whatsapp",
				customer,
			}),
		).rejects.toThrow(/not available/);
	});

	test("creates initial pending orderEvent", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id);
		const { shortId } = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 1 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		const order = await t.query(api.orders.get, { shortId });
		const events = await t.run(async (ctx) =>
			ctx.db
				.query("orderEvents")
				.withIndex("by_order", (q) => q.eq("orderId", order!._id))
				.collect(),
		);
		expect(events).toHaveLength(1);
		expect(events[0].status).toBe("pending");
	});

	test("updateStatus patches status and appends event", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id);
		const { shortId } = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 1 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		const order = await t.query(api.orders.get, { shortId });
		const asA = t.withIdentity({ subject: USER_A });
		await asA.mutation(api.orders.updateStatus, {
			orderId: order!._id,
			status: "confirmed",
		});

		const updated = await t.query(api.orders.get, { shortId });
		expect(updated?.status).toBe("confirmed");

		const events = await t.run(async (ctx) =>
			ctx.db
				.query("orderEvents")
				.withIndex("by_order", (q) => q.eq("orderId", order!._id))
				.collect(),
		);
		expect(events).toHaveLength(2);
	});

	test("updateStatus by non-owner throws Forbidden", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id);
		const { shortId } = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 1 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		const order = await t.query(api.orders.get, { shortId });
		const asB = t.withIdentity({ subject: USER_B });
		await expect(
			asB.mutation(api.orders.updateStatus, {
				orderId: order!._id,
				status: "confirmed",
			}),
		).rejects.toThrow(/Forbidden/);
	});

	test("listByRetailer filters by status", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id);
		const asA = t.withIdentity({ subject: USER_A });

		const r1 = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 1 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		const r2 = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 1 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 1 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});

		const o1 = await t.query(api.orders.get, { shortId: r1.shortId });
		const o2 = await t.query(api.orders.get, { shortId: r2.shortId });
		await asA.mutation(api.orders.updateStatus, {
			orderId: o1!._id,
			status: "confirmed",
		});
		await asA.mutation(api.orders.updateStatus, {
			orderId: o2!._id,
			status: "confirmed",
		});

		const page = await asA.query(api.orders.listByRetailer, {
			retailerId: retailer._id,
			status: "confirmed",
			paginationOpts: { numItems: 10, cursor: null },
		});
		expect(page.page).toHaveLength(2);
	});

	test("rejects currency mismatch", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id, {
			currency: "MYR",
		});
		await expect(
			t.mutation(api.orders.create, {
				retailerId: retailer._id,
				items: [{ productId, quantity: 1 }],
				currency: "SGD",
				channel: "whatsapp",
				customer,
			}),
		).rejects.toThrow(/Currency mismatch/);
	});

	test("rejects when customer waPhone is missing or invalid", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id);
		await expect(
			t.mutation(api.orders.create, {
				retailerId: retailer._id,
				items: [{ productId, quantity: 1 }],
				currency: "MYR",
				channel: "whatsapp",
				customer: { name: "Ali" },
			}),
		).rejects.toThrow(/WhatsApp number/);
		await expect(
			t.mutation(api.orders.create, {
				retailerId: retailer._id,
				items: [{ productId, quantity: 1 }],
				currency: "MYR",
				channel: "whatsapp",
				customer: { name: "Ali", waPhone: "abc" },
			}),
		).rejects.toThrow(/WhatsApp number/);
	});

	test("create decrements product stock by ordered quantity", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id, {
			stock: 10,
		});
		await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 3 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		expect(await getProductStock(t, productId)).toBe(7);
	});

	test("create rejects when quantity exceeds stock", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id, {
			stock: 3,
		});
		await expect(
			t.mutation(api.orders.create, {
				retailerId: retailer._id,
				items: [{ productId, quantity: 5 }],
				currency: "MYR",
				channel: "whatsapp",
				customer,
			}),
		).rejects.toThrow(/in stock/);
		// Stock unchanged
		expect(await getProductStock(t, productId)).toBe(3);
	});

	test("create with two line items on same product sums and decrements once", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id, {
			stock: 10,
		});
		await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [
				{ productId, quantity: 2 },
				{ productId, quantity: 3 },
			],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		expect(await getProductStock(t, productId)).toBe(5);
	});

	test("create rolls back stock on later validation failure", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productA = await seedProduct(t, USER_A, retailer._id, {
			name: "A",
			stock: 10,
		});
		const productB = await seedProduct(t, USER_A, retailer._id, {
			name: "B",
			currency: "SGD",
			stock: 10,
		});
		await expect(
			t.mutation(api.orders.create, {
				retailerId: retailer._id,
				items: [
					{ productId: productA, quantity: 2 },
					{ productId: productB, quantity: 1 },
				],
				currency: "MYR",
				channel: "whatsapp",
				customer,
			}),
		).rejects.toThrow(/Currency mismatch/);
		// First product's stock must NOT have been decremented
		expect(await getProductStock(t, productA)).toBe(10);
		expect(await getProductStock(t, productB)).toBe(10);
	});

	test("cancelling an order restores stock", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id, {
			stock: 10,
		});
		const { shortId } = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 4 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		expect(await getProductStock(t, productId)).toBe(6);
		const order = await t.query(api.orders.get, { shortId });
		const asA = t.withIdentity({ subject: USER_A });
		await asA.mutation(api.orders.updateStatus, {
			orderId: order!._id,
			status: "cancelled",
		});
		expect(await getProductStock(t, productId)).toBe(10);
	});

	test("cancelling an already-cancelled order is a no-op for stock", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id, {
			stock: 10,
		});
		const { shortId } = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 4 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		const order = await t.query(api.orders.get, { shortId });
		const asA = t.withIdentity({ subject: USER_A });
		await asA.mutation(api.orders.updateStatus, {
			orderId: order!._id,
			status: "cancelled",
		});
		await asA.mutation(api.orders.updateStatus, {
			orderId: order!._id,
			status: "cancelled",
		});
		// Restored once, not twice
		expect(await getProductStock(t, productId)).toBe(10);
	});

	test("non-cancel transitions do not change stock", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const productId = await seedProduct(t, USER_A, retailer._id, {
			stock: 10,
		});
		const { shortId } = await t.mutation(api.orders.create, {
			retailerId: retailer._id,
			items: [{ productId, quantity: 3 }],
			currency: "MYR",
			channel: "whatsapp",
			customer,
		});
		const order = await t.query(api.orders.get, { shortId });
		const asA = t.withIdentity({ subject: USER_A });
		for (const status of [
			"confirmed",
			"packed",
			"shipped",
			"delivered",
		] as const) {
			await asA.mutation(api.orders.updateStatus, {
				orderId: order!._id,
				status,
			});
			expect(await getProductStock(t, productId)).toBe(7);
		}
	});
});
