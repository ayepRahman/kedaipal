/**
 * Shared row validation for product bulk-import flows (CSV, XLSX,
 * paste-from-spreadsheet). The parsers normalize their input into
 * `RawImportRow` (string-keyed, string-valued) and hand it to
 * `validateProductRows` so every entry-point enforces the same rules.
 *
 * Prices are entered in MAJOR units (e.g. "120.50") and converted to integer
 * MINOR units (sen) before being sent to Convex — same convention as the
 * single-product form. See `src/lib/format.ts` for the inverse.
 */

export const PRODUCT_IMPORT_REQUIRED_COLUMNS = [
	"name",
	"price",
	"stock",
] as const;

export const PRODUCT_IMPORT_OPTIONAL_COLUMNS = ["sku", "description"] as const;

export const PRODUCT_IMPORT_COLUMNS = [
	"sku",
	"name",
	"description",
	"price",
	"stock",
] as const;

export type ProductImportColumn = (typeof PRODUCT_IMPORT_COLUMNS)[number];

export const PRODUCT_IMPORT_HEADER = PRODUCT_IMPORT_COLUMNS.join(",");

export const PRODUCT_SKU_MAX_LENGTH = 60;
export const PRODUCT_NAME_MAX_LENGTH = 120;
export const PRODUCT_DESCRIPTION_MAX_LENGTH = 1000;

export interface RawImportRow {
	[header: string]: string | undefined;
}

export interface ProductImportRow {
	rowNumber: number; // 1-indexed, matches what the user sees in Excel
	sku: string | undefined;
	name: string;
	description: string | undefined;
	price: number; // minor units
	stock: number;
}

export interface ProductImportRowError {
	rowNumber: number;
	raw: RawImportRow;
	errors: string[];
}

export interface ParsedProductImport {
	validRows: ProductImportRow[];
	errorRows: ProductImportRowError[];
	totalRows: number;
}

// Back-compat re-exports for consumers still using the CSV-flavored names.
export type { ProductImportRow as ProductCsvRow };
export type { ProductImportRowError as ProductCsvRowError };
export type { ParsedProductImport as ParsedProductsCsv };

/**
 * Validate a single row of already-normalized key/value data. Returns either a
 * typed row or an error description with the issues found. Row numbering is
 * caller-provided so CSV can use "header is row 1" and XLSX can reuse its own
 * sheet-relative numbers.
 */
export function validateProductRow(
	raw: RawImportRow,
	rowNumber: number,
): ProductImportRow | ProductImportRowError {
	const errors: string[] = [];

	const skuRaw = (raw.sku ?? "").trim();
	const sku = skuRaw.length > 0 ? skuRaw : undefined;
	if (sku !== undefined && sku.length > PRODUCT_SKU_MAX_LENGTH) {
		errors.push(`sku must be at most ${PRODUCT_SKU_MAX_LENGTH} characters`);
	}

	const name = (raw.name ?? "").trim();
	if (name.length === 0) errors.push("name is required");
	if (name.length > PRODUCT_NAME_MAX_LENGTH)
		errors.push(`name must be at most ${PRODUCT_NAME_MAX_LENGTH} characters`);

	const descriptionRaw = (raw.description ?? "").trim();
	const description = descriptionRaw.length > 0 ? descriptionRaw : undefined;
	if (description && description.length > PRODUCT_DESCRIPTION_MAX_LENGTH) {
		errors.push(
			`description must be at most ${PRODUCT_DESCRIPTION_MAX_LENGTH} characters`,
		);
	}

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

	if (errors.length > 0) return { rowNumber, raw, errors };

	return { rowNumber, sku, name, description, price: priceMinor, stock };
}

/**
 * Validate an array of raw rows and return the full parsed result. `headers`
 * lets the parser hand over the detected column list so we can emit a single
 * "missing required column" error instead of N per-row errors.
 *
 * `rowNumberOffset` is the file-row of the first data row. CSV uses 2 (header
 * is row 1). XLSX / paste-from-sheet can pick their own.
 */
export function validateProductRows(
	rows: RawImportRow[],
	headers: string[],
	rowNumberOffset = 2,
): ParsedProductImport {
	const missing = PRODUCT_IMPORT_REQUIRED_COLUMNS.filter(
		(c) => !headers.includes(c),
	);
	if (missing.length > 0) {
		return {
			validRows: [],
			errorRows: [
				{
					rowNumber: 0,
					raw: {},
					errors: [
						`Missing required column${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}`,
					],
				},
			],
			totalRows: 0,
		};
	}

	const validRows: ProductImportRow[] = [];
	const errorRows: ProductImportRowError[] = [];

	rows.forEach((raw, i) => {
		const rowNumber = rowNumberOffset + i;
		const result = validateProductRow(raw, rowNumber);
		if ("errors" in result) errorRows.push(result);
		else validRows.push(result);
	});

	return {
		validRows,
		errorRows,
		totalRows: validRows.length + errorRows.length,
	};
}

/**
 * Detect intra-batch duplicate SKUs. Blank SKUs are ignored (they always
 * insert). Returns a list of error messages — empty when no collisions.
 */
export function findDuplicateSkus(
	rows: ProductImportRow[],
): { sku: string; rowNumbers: number[] }[] {
	const byKey = new Map<string, number[]>();
	for (const row of rows) {
		if (!row.sku) continue;
		const existing = byKey.get(row.sku);
		if (existing) existing.push(row.rowNumber);
		else byKey.set(row.sku, [row.rowNumber]);
	}
	return Array.from(byKey.entries())
		.filter(([, nums]) => nums.length > 1)
		.map(([sku, rowNumbers]) => ({ sku, rowNumbers }));
}
