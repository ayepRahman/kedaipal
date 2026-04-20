import { describe, expect, test } from "vitest";
import {
	buildProductCsvTemplate,
	parseProductsCsv,
	parseProductsFromPaste,
} from "./csv";

describe("parseProductsCsv", () => {
	test("parses valid rows and converts price to minor units", () => {
		const csv = [
			"name,description,price,stock",
			"Tent,4-season,499.00,12",
			"Headlamp,,89.5,30",
		].join("\n");

		const result = parseProductsCsv(csv);
		expect(result.errorRows).toEqual([]);
		expect(result.validRows).toHaveLength(2);
		expect(result.validRows[0]).toMatchObject({
			rowNumber: 2,
			name: "Tent",
			description: "4-season",
			price: 49900,
			stock: 12,
		});
		expect(result.validRows[1]).toMatchObject({
			rowNumber: 3,
			name: "Headlamp",
			description: undefined,
			price: 8950,
			stock: 30,
		});
	});

	test("flags missing required columns at the header level", () => {
		const csv = ["name,price", "Tent,499"].join("\n");
		const result = parseProductsCsv(csv);
		expect(result.validRows).toEqual([]);
		expect(result.errorRows[0].rowNumber).toBe(0);
		expect(result.errorRows[0].errors[0]).toMatch(/stock/);
	});

	test("collects per-row errors with row numbers matching the spreadsheet", () => {
		const csv = [
			"name,description,price,stock",
			",,499,12",
			"Tent,,abc,12",
			"Tent,,499,-1",
		].join("\n");

		const result = parseProductsCsv(csv);
		expect(result.validRows).toEqual([]);
		expect(result.errorRows).toHaveLength(3);
		expect(result.errorRows[0]).toMatchObject({ rowNumber: 2 });
		expect(result.errorRows[0].errors[0]).toMatch(/name/);
		expect(result.errorRows[1].errors[0]).toMatch(/price/);
		expect(result.errorRows[2].errors[0]).toMatch(/stock/);
	});

	test("ignores empty trailing lines", () => {
		const csv = "name,description,price,stock\nTent,,499,12\n\n\n";
		const result = parseProductsCsv(csv);
		expect(result.validRows).toHaveLength(1);
		expect(result.errorRows).toEqual([]);
	});

	test("template parses cleanly through the same pipeline", () => {
		const result = parseProductsCsv(buildProductCsvTemplate());
		expect(result.errorRows).toEqual([]);
		expect(result.validRows.length).toBeGreaterThan(0);
	});

	test("captures optional sku column when present", () => {
		const csv = [
			"sku,name,description,price,stock",
			"TENT-4P,Tent,4-season,499.00,12",
			",Headlamp,,89.5,30",
		].join("\n");

		const result = parseProductsCsv(csv);
		expect(result.errorRows).toEqual([]);
		expect(result.validRows[0]?.sku).toBe("TENT-4P");
		expect(result.validRows[1]?.sku).toBeUndefined();
	});

	test("rejects oversized sku", () => {
		const longSku = "X".repeat(61);
		const csv = [
			"sku,name,description,price,stock",
			`${longSku},Tent,,499,12`,
		].join("\n");

		const result = parseProductsCsv(csv);
		expect(result.validRows).toEqual([]);
		expect(result.errorRows[0].errors[0]).toMatch(/sku/);
	});

	test("works without an sku column at all (back-compat)", () => {
		const csv = ["name,description,price,stock", "Tent,,499,12"].join("\n");
		const result = parseProductsCsv(csv);
		expect(result.errorRows).toEqual([]);
		expect(result.validRows).toHaveLength(1);
		expect(result.validRows[0].sku).toBeUndefined();
	});
});

describe("parseProductsFromPaste", () => {
	test("parses tab-delimited clipboard content from Excel/Sheets", () => {
		const pasted = [
			"sku\tname\tdescription\tprice\tstock",
			"TENT-4P\tTent\t4-season\t499.00\t12",
			"\tHeadlamp\t\t89.50\t30",
		].join("\n");
		const result = parseProductsFromPaste(pasted);
		expect(result.errorRows).toEqual([]);
		expect(result.validRows).toHaveLength(2);
		expect(result.validRows[0]?.sku).toBe("TENT-4P");
		expect(result.validRows[1]?.sku).toBeUndefined();
	});

	test("falls back to comma delimiter when no tabs", () => {
		const pasted = "name,price,stock\nTent,499,12";
		const result = parseProductsFromPaste(pasted);
		expect(result.errorRows).toEqual([]);
		expect(result.validRows).toHaveLength(1);
	});

	test("returns empty result for empty input without throwing", () => {
		const result = parseProductsFromPaste("   \n  ");
		expect(result.validRows).toEqual([]);
		expect(result.errorRows).toEqual([]);
		expect(result.totalRows).toBe(0);
	});
});
