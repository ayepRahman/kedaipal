import Papa from "papaparse";

/**
 * CSV bulk-import for products. The pipeline is:
 *   1. `parseProductsCsv` — parse text → typed rows + per-row validation errors
 *   2. UI shows preview, blocks submit if any row is invalid
 *   3. Caller chunks `validRows` and calls `api.products.bulkCreate`
 *
 * Prices are entered in MAJOR units (e.g. "120.50") and converted to integer
 * MINOR units (sen) before being sent to Convex — same convention as the
 * single-product form. See `src/lib/format.ts` for the inverse.
 */

export const PRODUCT_CSV_COLUMNS = [
	"name",
	"description",
	"price",
	"stock",
] as const;

export const PRODUCT_CSV_HEADER = PRODUCT_CSV_COLUMNS.join(",");

export interface ProductCsvRow {
	rowNumber: number; // 1-indexed, matches what the user sees in Excel
	name: string;
	description: string | undefined;
	price: number; // minor units
	stock: number;
}

export interface ProductCsvRowError {
	rowNumber: number;
	raw: Record<string, string>;
	errors: string[];
}

export interface ParsedProductsCsv {
	validRows: ProductCsvRow[];
	errorRows: ProductCsvRowError[];
	totalRows: number;
}

/**
 * Build a downloadable template with the header row + two example rows so
 * users can see exactly how to fill it in.
 */
export function buildProductCsvTemplate(): string {
	return [
		PRODUCT_CSV_HEADER,
		"Tent — 4 person,Lightweight 4-season tent,499.00,12",
		"Headlamp 200lm,Rechargeable USB-C,89.50,30",
	].join("\n");
}

/**
 * Trigger a browser download of the template CSV. No-op on the server.
 */
export function downloadProductCsvTemplate(): void {
	if (typeof window === "undefined") return;
	const blob = new Blob([buildProductCsvTemplate()], {
		type: "text/csv;charset=utf-8",
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = "kedaipal-products-template.csv";
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

/**
 * Parse a CSV string into typed rows. Validates each row independently and
 * collects errors so the UI can render a row-by-row status table.
 */
export function parseProductsCsv(text: string): ParsedProductsCsv {
	const result = Papa.parse<Record<string, string>>(text.trim(), {
		header: true,
		skipEmptyLines: "greedy",
		transformHeader: (h) => h.trim().toLowerCase(),
	});

	const validRows: ProductCsvRow[] = [];
	const errorRows: ProductCsvRowError[] = [];

	const headers = result.meta.fields ?? [];
	const missingColumns = PRODUCT_CSV_COLUMNS.filter(
		(c) => !headers.includes(c),
	);
	if (missingColumns.length > 0) {
		errorRows.push({
			rowNumber: 0,
			raw: {},
			errors: [
				`Missing required column${missingColumns.length === 1 ? "" : "s"}: ${missingColumns.join(", ")}`,
			],
		});
		return { validRows, errorRows, totalRows: 0 };
	}

	result.data.forEach((raw, i) => {
		const rowNumber = i + 2; // header is row 1
		const errors: string[] = [];

		const name = (raw.name ?? "").trim();
		if (name.length === 0) errors.push("name is required");
		if (name.length > 120) errors.push("name must be at most 120 characters");

		const descriptionRaw = (raw.description ?? "").trim();
		const description = descriptionRaw.length > 0 ? descriptionRaw : undefined;
		if (description && description.length > 1000)
			errors.push("description must be at most 1000 characters");

		const priceStr = (raw.price ?? "").trim();
		let priceMinor = 0;
		if (priceStr.length === 0) {
			errors.push("price is required");
		} else if (!/^\d+(\.\d{1,2})?$/.test(priceStr)) {
			errors.push("price must be a number, e.g. 120 or 120.50");
		} else {
			priceMinor = Math.round(Number.parseFloat(priceStr) * 100);
		}

		const stockStr = (raw.stock ?? "").trim();
		let stock = 0;
		if (stockStr.length === 0) {
			errors.push("stock is required");
		} else if (!/^\d+$/.test(stockStr)) {
			errors.push("stock must be a whole number");
		} else {
			stock = Number.parseInt(stockStr, 10);
		}

		if (errors.length > 0) {
			errorRows.push({ rowNumber, raw, errors });
			return;
		}

		validRows.push({
			rowNumber,
			name,
			description,
			price: priceMinor,
			stock,
		});
	});

	return {
		validRows,
		errorRows,
		totalRows: validRows.length + errorRows.length,
	};
}
