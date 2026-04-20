import Papa from "papaparse";
import {
	type ParsedProductImport,
	PRODUCT_IMPORT_HEADER,
	type RawImportRow,
	validateProductRows,
} from "./product-import";

/**
 * CSV bulk-import for products. The pipeline is:
 *   1. `parseProductsCsv` — parse text → typed rows + per-row validation errors
 *      (shared row validator lives in `src/lib/product-import.ts`)
 *   2. UI shows preview, blocks submit if any row is invalid
 *   3. Caller chunks `validRows` and calls `api.products.bulkUpsert` /
 *      `bulkCreate`
 */

export type {
	ParsedProductImport as ParsedProductsCsv,
	ProductImportRow as ProductCsvRow,
	ProductImportRowError as ProductCsvRowError,
} from "./product-import";
// Re-exports so existing imports keep working.
export {
	PRODUCT_IMPORT_COLUMNS as PRODUCT_CSV_COLUMNS,
	PRODUCT_IMPORT_HEADER as PRODUCT_CSV_HEADER,
} from "./product-import";

/**
 * Build a downloadable template with the header row + two example rows so
 * users can see exactly how to fill it in.
 */
export function buildProductCsvTemplate(): string {
	return [
		PRODUCT_IMPORT_HEADER,
		"TENT-4P,Tent — 4 person,Lightweight 4-season tent,499.00,12",
		"HL-200,Headlamp 200lm,Rechargeable USB-C,89.50,30",
	].join("\n");
}

/**
 * Trigger a browser download of the template CSV. No-op on the server.
 */
export function downloadProductCsvTemplate(): void {
	triggerCsvDownload(
		buildProductCsvTemplate(),
		"kedaipal-products-template.csv",
	);
}

/**
 * Vertical-specific sample template for outdoor gear retailers. The rows
 * reflect the pilot vertical's realistic product mix (tent, sleeping bag,
 * backpack, headlamp, stove). A retailer can download this, tweak names and
 * prices in their spreadsheet, and re-upload to bootstrap their catalog.
 */
export function buildOutdoorGearSampleCsv(): string {
	return [
		PRODUCT_IMPORT_HEADER,
		'TENT-4P,4-person 4-season tent,"Lightweight aluminium poles, weatherproof fly",799.00,8',
		'SB-COMF-15,Comfort sleeping bag (15°C),"Synthetic fill, compact pack size",189.00,15',
		'BP-45L,45L trekking backpack,"Adjustable torso, hydration-ready",259.00,12',
		'HL-300,Headlamp 300lm,"Rechargeable USB-C, dimmer + red-light mode",129.50,40',
		'ST-MULTI-1,Multi-fuel camp stove,"Petrol / kerosene / alcohol, with carry case",349.00,10',
	].join("\n");
}

export function downloadOutdoorGearSampleCsv(): void {
	triggerCsvDownload(
		buildOutdoorGearSampleCsv(),
		"kedaipal-products-outdoor-gear-sample.csv",
	);
}

function triggerCsvDownload(content: string, filename: string): void {
	if (typeof window === "undefined") return;
	const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Parse a CSV string into typed rows. Validates each row independently and
 * collects errors so the UI can render a row-by-row status table.
 */
export function parseProductsCsv(text: string): ParsedProductImport {
	return parseDelimitedProducts(text, ",");
}

/**
 * Parse text pasted from a spreadsheet. Excel / Google Sheets / Numbers all
 * put TAB between cells on copy; falls back to comma if no tabs are present
 * (so a retailer pasting a CSV dump still works).
 */
export function parseProductsFromPaste(text: string): ParsedProductImport {
	const trimmed = text.trim();
	if (trimmed.length === 0) {
		return { validRows: [], errorRows: [], totalRows: 0 };
	}
	const delimiter = trimmed.includes("\t") ? "\t" : ",";
	return parseDelimitedProducts(trimmed, delimiter);
}

function parseDelimitedProducts(
	text: string,
	delimiter: "," | "\t",
): ParsedProductImport {
	const result = Papa.parse<RawImportRow>(text.trim(), {
		header: true,
		skipEmptyLines: "greedy",
		delimiter,
		transformHeader: (h) => h.trim().toLowerCase(),
	});
	const headers = result.meta.fields ?? [];
	return validateProductRows(result.data, Array.from(headers), 2);
}
