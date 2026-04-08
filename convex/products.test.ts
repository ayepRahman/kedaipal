/// <reference types="vite/client" />
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
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

const baseProduct = (retailerId: string) => ({
	retailerId: retailerId as never,
	name: "Tent 2P",
	price: 12000,
	currency: "MYR",
	stock: 5,
	imageStorageIds: [],
	sortOrder: 0,
});

describe("products", () => {
	test("owner can create a product and read it back", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asA = t.withIdentity({ subject: USER_A });
		const id = await asA.mutation(api.products.create, baseProduct(retailer._id));
		const product = await asA.query(api.products.get, { productId: id });
		expect(product?.name).toBe("Tent 2P");
		expect(product?.active).toBe(true);
		expect(product?.channel).toBe("whatsapp");
	});

	test("non-owner create throws Forbidden", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asB = t.withIdentity({ subject: USER_B });
		await expect(
			asB.mutation(api.products.create, baseProduct(retailer._id)),
		).rejects.toThrow(/Forbidden/);
	});

	test("imageStorageIds > 5 throws", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asA = t.withIdentity({ subject: USER_A });
		await expect(
			asA.mutation(api.products.create, {
				...baseProduct(retailer._id),
				imageStorageIds: ["a", "b", "c", "d", "e", "f"],
			}),
		).rejects.toThrow(/Maximum 5 images/);
	});

	test("list hides archived products from storefront", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asA = t.withIdentity({ subject: USER_A });
		const archivedId = await asA.mutation(api.products.create, baseProduct(retailer._id));
		const activeId = await asA.mutation(api.products.create, baseProduct(retailer._id));
		await asA.mutation(api.products.archive, { productId: archivedId });

		const list = await t.query(api.products.list, { retailerId: retailer._id });
		expect(list).toHaveLength(1);
		expect(list[0]?._id).toBe(activeId);
		expect(list.some((p) => p._id === archivedId)).toBe(false);
	});

	test("listAll returns active and inactive for owner", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asA = t.withIdentity({ subject: USER_A });
		const id1 = await asA.mutation(api.products.create, baseProduct(retailer._id));
		await asA.mutation(api.products.create, baseProduct(retailer._id));
		await asA.mutation(api.products.archive, { productId: id1 });

		const all = await asA.query(api.products.listAll, {
			retailerId: retailer._id,
		});
		expect(all).toHaveLength(2);
	});

	test("archive sets active to false", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asA = t.withIdentity({ subject: USER_A });
		const id = await asA.mutation(api.products.create, baseProduct(retailer._id));
		await asA.mutation(api.products.archive, { productId: id });
		const product = await asA.query(api.products.get, { productId: id });
		expect(product?.active).toBe(false);
	});

	test("update patches only specified fields", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asA = t.withIdentity({ subject: USER_A });
		const id = await asA.mutation(api.products.create, baseProduct(retailer._id));
		await asA.mutation(api.products.update, { productId: id, name: "Tent 3P" });
		const product = await asA.query(api.products.get, { productId: id });
		expect(product?.name).toBe("Tent 3P");
		expect(product?.price).toBe(12000); // unchanged
		expect(product?.stock).toBe(5); // unchanged
	});

	test("bulkCreate inserts all valid items in one call", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asA = t.withIdentity({ subject: USER_A });
		const result = await asA.mutation(api.products.bulkCreate, {
			retailerId: retailer._id,
			currency: "MYR",
			items: [
				{ name: "Tent", price: 49900, stock: 12 },
				{ name: "Headlamp", description: "USB-C", price: 8950, stock: 30 },
			],
		});
		expect(result.created).toBe(2);
		const all = await asA.query(api.products.listAll, {
			retailerId: retailer._id,
		});
		expect(all).toHaveLength(2);
		expect(all.map((p) => p.name).sort()).toEqual(["Headlamp", "Tent"]);
	});

	test("bulkCreate aborts the entire batch if any row is invalid", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asA = t.withIdentity({ subject: USER_A });
		await expect(
			asA.mutation(api.products.bulkCreate, {
				retailerId: retailer._id,
				currency: "MYR",
				items: [
					{ name: "Tent", price: 49900, stock: 12 },
					{ name: "Bad", price: -1, stock: 5 },
				],
			}),
		).rejects.toThrow(/Row 2.*price/);
		const all = await asA.query(api.products.listAll, {
			retailerId: retailer._id,
		});
		expect(all).toHaveLength(0);
	});

	test("bulkCreate enforces non-owner Forbidden", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asB = t.withIdentity({ subject: USER_B });
		await expect(
			asB.mutation(api.products.bulkCreate, {
				retailerId: retailer._id,
				currency: "MYR",
				items: [{ name: "Tent", price: 49900, stock: 12 }],
			}),
		).rejects.toThrow(/Forbidden/);
	});

	test("reorder updates sortOrder", async () => {
		const t = setup();
		const retailer = await seedRetailer(t, USER_A);
		const asA = t.withIdentity({ subject: USER_A });
		const id = await asA.mutation(api.products.create, baseProduct(retailer._id));
		await asA.mutation(api.products.reorder, { productId: id, sortOrder: 99 });
		const product = await asA.query(api.products.get, { productId: id });
		expect(product?.sortOrder).toBe(99);
	});
});
