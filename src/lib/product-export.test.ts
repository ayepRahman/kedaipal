import ExcelJS from "exceljs";
import { describe, expect, test } from "vitest";
import { parseProductsCsv } from "./csv";
import {
	buildExportFilename,
	type ExportableProduct,
	productsToCsvString,
	productsToXlsxBlob,
} from "./product-export";

const sampleProducts: ExportableProduct[] = [
	{
		sku: "TENT-4P",
		name: "Tent — 4 person",
		description: "Lightweight 4-season tent, sleeps four",
		price: 49900,
		stock: 12,
		active: true,
	},
	{
		sku: undefined,
		name: "Headlamp 200lm",
		description: undefined,
		price: 8950,
		stock: 30,
		active: false,
	},
	{
		sku: "STOVE-1",
		name: 'Stove "Pro" / 3000W',
		description: "Multi-fuel, with carry case,\nweatherproof",
		price: 12000,
		stock: 0,
		active: true,
	},
];

describe("productsToCsvString", () => {
	test("round-trips through parseProductsCsv without row loss", () => {
		const csv = productsToCsvString(sampleProducts);
		const parsed = parseProductsCsv(csv);
		expect(parsed.errorRows).toEqual([]);
		expect(parsed.validRows).toHaveLength(sampleProducts.length);
	});

	test("preserves SKU and price precision", () => {
		const csv = productsToCsvString(sampleProducts);
		const parsed = parseProductsCsv(csv);
		expect(parsed.validRows[0]?.sku).toBe("TENT-4P");
		expect(parsed.validRows[0]?.price).toBe(49900);
		expect(parsed.validRows[1]?.sku).toBeUndefined();
	});

	test("quotes descriptions with commas, quotes, and newlines", () => {
		const csv = productsToCsvString(sampleProducts);
		const parsed = parseProductsCsv(csv);
		expect(parsed.validRows[2]?.name).toBe('Stove "Pro" / 3000W');
		expect(parsed.validRows[2]?.description).toContain("weatherproof");
	});

	test("zero stock exports as '0' not blank", () => {
		const csv = productsToCsvString(sampleProducts);
		const parsed = parseProductsCsv(csv);
		expect(parsed.validRows[2]?.stock).toBe(0);
	});
});

describe("productsToXlsxBlob", () => {
	test("round-trips through ExcelJS read", async () => {
		const blob = await productsToXlsxBlob(sampleProducts);
		const buffer = await blob.arrayBuffer();
		const wb = new ExcelJS.Workbook();
		await wb.xlsx.load(buffer);
		const ws = wb.getWorksheet("Products");
		expect(ws).toBeDefined();
		// Header row + data rows.
		expect(ws?.rowCount).toBe(sampleProducts.length + 1);
		const firstDataRow = ws?.getRow(2);
		expect(firstDataRow?.getCell(1).value).toBe("TENT-4P");
		expect(firstDataRow?.getCell(4).value).toBe("499.00");
	});
});

describe("buildExportFilename", () => {
	test("stamps with YYYY-MM-DD and extension", () => {
		const frozen = new Date("2026-04-20T10:30:00Z");
		expect(buildExportFilename("csv", "kedaipal-products", frozen)).toMatch(
			/kedaipal-products-2026-04-\d{2}\.csv/,
		);
		expect(buildExportFilename("xlsx", "kedaipal-products", frozen)).toMatch(
			/kedaipal-products-2026-04-\d{2}\.xlsx/,
		);
	});
});
