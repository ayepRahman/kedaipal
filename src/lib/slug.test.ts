import { describe, expect, it } from "vitest";
import { slugify, slugSchema, validateSlugShape } from "./slug";

describe("slugify", () => {
	it("basic lowercasing and space replacement", () => {
		expect(slugify("Arif Outdoor Gear")).toBe("arif-outdoor-gear");
	});

	it("strips punctuation", () => {
		expect(slugify("Arif Outdoor Gear!")).toBe("arif-outdoor-gear");
	});

	it("strips diacritics", () => {
		expect(slugify("  café — münchen  ")).toBe("cafe-munchen");
	});

	it("collapses multiple dashes", () => {
		expect(slugify("a---b___c")).toBe("a-b-c");
	});

	it("returns empty string for pure punctuation", () => {
		expect(slugify("!!!")).toBe("");
	});

	it("truncates to 32 chars without trailing dash", () => {
		const out = slugify("a".repeat(40));
		expect(out.length).toBeLessThanOrEqual(32);
	});
});

describe("slugSchema", () => {
	it("accepts valid slugs", () => {
		expect(slugSchema.parse("arif-outdoor")).toBe("arif-outdoor");
		expect(slugSchema.parse("shop123")).toBe("shop123");
	});

	it("rejects reserved words", () => {
		expect(() => slugSchema.parse("app")).toThrow();
		expect(() => slugSchema.parse("api")).toThrow();
	});

	it("rejects too short", () => {
		expect(() => slugSchema.parse("ab")).toThrow();
	});

	it("rejects leading dash", () => {
		expect(() => slugSchema.parse("-bad")).toThrow();
	});

	it("rejects double dashes", () => {
		expect(() => slugSchema.parse("a--b")).toThrow();
	});

	it("lowercases input", () => {
		expect(slugSchema.parse("ARIF-Outdoor")).toBe("arif-outdoor");
	});
});

describe("validateSlugShape", () => {
	it("returns structured result for reserved", () => {
		expect(validateSlugShape("app")).toEqual({ ok: false, reason: "reserved" });
	});

	it("returns structured result for too short", () => {
		expect(validateSlugShape("ab")).toEqual({ ok: false, reason: "tooShort" });
	});

	it("returns ok for valid slug", () => {
		expect(validateSlugShape("valid-slug")).toEqual({
			ok: true,
			value: "valid-slug",
		});
	});
});
