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

async function seed(t: ReturnType<typeof convexTest>, userId: string, slug: string) {
	const asUser = t.withIdentity({ subject: userId });
	await asUser.mutation(api.retailers.createRetailer, {
		storeName: "Test Store",
		slug,
	});
	return asUser;
}

describe("retailers logo", () => {
	test("getRetailerBySlug returns resolved logoUrl when set", async () => {
		const t = setup();
		const asA = await seed(t, USER_A, "logo-store");
		const storageId = await t.run(async (ctx) => {
			const blob = new Blob([new Uint8Array([1, 2, 3, 4])], {
				type: "image/png",
			});
			return ctx.storage.store(blob);
		});
		await asA.mutation(api.retailers.updateSettings, {
			logoStorageId: storageId,
		});

		const result = await t.query(api.retailers.getRetailerBySlug, {
			slug: "logo-store",
		});
		expect(result.status).toBe("ok");
		if (result.status !== "ok") return;
		expect(result.retailer.logoStorageId).toBe(storageId);
		expect(result.retailer.logoUrl).toMatch(/^https?:\/\//);
	});

	test("getMyRetailer returns resolved logoUrl", async () => {
		const t = setup();
		const asA = await seed(t, USER_A, "my-logo");
		const storageId = await t.run(async (ctx) => {
			const blob = new Blob([new Uint8Array([1, 2, 3, 4])], {
				type: "image/png",
			});
			return ctx.storage.store(blob);
		});
		await asA.mutation(api.retailers.updateSettings, {
			logoStorageId: storageId,
		});

		const me = await asA.query(api.retailers.getMyRetailer);
		expect(me?.logoStorageId).toBe(storageId);
		expect(me?.logoUrl).toMatch(/^https?:\/\//);
	});

	test("empty string clears the logo", async () => {
		const t = setup();
		const asA = await seed(t, USER_A, "clear-logo");
		const storageId = await t.run(async (ctx) => {
			const blob = new Blob([new Uint8Array([1, 2, 3, 4])], {
				type: "image/png",
			});
			return ctx.storage.store(blob);
		});
		await asA.mutation(api.retailers.updateSettings, {
			logoStorageId: storageId,
		});
		await asA.mutation(api.retailers.updateSettings, { logoStorageId: "" });

		const me = await asA.query(api.retailers.getMyRetailer);
		expect(me?.logoStorageId).toBeUndefined();
		expect(me?.logoUrl).toBeUndefined();
	});

	test("getRetailerBySlug returns no logoUrl when none configured", async () => {
		const t = setup();
		await seed(t, USER_A, "no-logo");
		const result = await t.query(api.retailers.getRetailerBySlug, {
			slug: "no-logo",
		});
		expect(result.status).toBe("ok");
		if (result.status !== "ok") return;
		expect(result.retailer.logoUrl).toBeUndefined();
	});
});

describe("retailers slug rename", () => {
	test("rename parks old slug in history and activates new slug", async () => {
		const t = setup();
		const asA = await seed(t, USER_A, "old-slug");
		await asA.mutation(api.retailers.renameSlug, { newSlug: "new-slug" });

		const byNew = await t.query(api.retailers.getRetailerBySlug, { slug: "new-slug" });
		expect(byNew.status).toBe("ok");

		const byOld = await t.query(api.retailers.getRetailerBySlug, { slug: "old-slug" });
		expect(byOld).toEqual({ status: "redirect", to: "new-slug" });
	});

	test("rename fails when slug is taken by another retailer", async () => {
		const t = setup();
		await seed(t, USER_A, "taken");
		const asB = await seed(t, USER_B, "mine");
		await expect(
			asB.mutation(api.retailers.renameSlug, { newSlug: "taken" }),
		).rejects.toThrow(/taken/);
	});

	test("rename fails when target slug is parked in another retailer's history", async () => {
		const t = setup();
		const asA = await seed(t, USER_A, "original-a");
		await asA.mutation(api.retailers.renameSlug, { newSlug: "new-a" });
		// original-a is now in slugHistory for retailer A

		const asB = await seed(t, USER_B, "original-b");
		await expect(
			asB.mutation(api.retailers.renameSlug, { newSlug: "original-a" }),
		).rejects.toThrow(/reserved/);
	});

	test("owner can reclaim their own historical slug", async () => {
		const t = setup();
		const asA = await seed(t, USER_A, "ver-one");
		await asA.mutation(api.retailers.renameSlug, { newSlug: "ver-two" });
		await asA.mutation(api.retailers.renameSlug, { newSlug: "ver-one" });

		const byV1 = await t.query(api.retailers.getRetailerBySlug, { slug: "ver-one" });
		expect(byV1.status).toBe("ok");
		// ver-two should now be in history redirecting back to ver-one
		const byV2 = await t.query(api.retailers.getRetailerBySlug, { slug: "ver-two" });
		expect(byV2).toEqual({ status: "redirect", to: "ver-one" });
	});

	test("createRetailer cannot claim another retailer's parked slug", async () => {
		const t = setup();
		const asA = await seed(t, USER_A, "claimed");
		await asA.mutation(api.retailers.renameSlug, { newSlug: "renamed" });

		const asB = t.withIdentity({ subject: USER_B });
		await expect(
			asB.mutation(api.retailers.createRetailer, {
				storeName: "B Store",
				slug: "claimed",
			}),
		).rejects.toThrow(/reserved/);
	});

	test("checkSlugAvailability reports owner-reclaim as available", async () => {
		const t = setup();
		const asA = await seed(t, USER_A, "orig");
		await asA.mutation(api.retailers.renameSlug, { newSlug: "renamed" });

		const forOwner = await asA.query(api.retailers.checkSlugAvailability, {
			slug: "orig",
		});
		expect(forOwner).toEqual({ status: "available" });

		const asB = t.withIdentity({ subject: USER_B });
		const forOther = await asB.query(api.retailers.checkSlugAvailability, {
			slug: "orig",
		});
		expect(forOther).toEqual({ status: "taken" });
	});
});
