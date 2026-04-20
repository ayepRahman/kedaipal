import ExcelJS from "exceljs";
import Papa from "papaparse";

/**
 * Product bulk export. Produces CSV and XLSX files whose shape is the same as
 * the bulk-import parser expects (see `src/lib/product-import.ts`) so an
 * export → edit → re-import round-trip works without column mapping.
 *
 * - Prices are written as major-unit strings (e.g. "120.50") to survive
 *   spreadsheet locale formatting (`120,50`) and Excel's "General" number
 *   auto-casting. The importer in PR 3 will also tolerate numeric cells.
 * - `active` is written as `"true"` / `"false"` — forward-looking; the Sprint
 *   1 importer ignores this column, but a later "richer schema" sprint will
 *   parse it for publish/unpublish via sheet.
 */

export const PRODUCT_EXPORT_COLUMNS = [
	"sku",
	"name",
	"description",
	"price",
	"stock",
	"active",
] as const;

export type ProductExportColumn = (typeof PRODUCT_EXPORT_COLUMNS)[number];

export interface ExportableProduct {
	sku?: string;
	name: string;
	description?: string;
	price: number; // minor units
	stock: number;
	active: boolean;
}

interface ExportRow {
	sku: string;
	name: string;
	description: string;
	price: string;
	stock: string;
	active: string;
}

function productToExportRow(p: ExportableProduct): ExportRow {
	return {
		sku: p.sku ?? "",
		name: p.name,
		description: p.description ?? "",
		price: (p.price / 100).toFixed(2),
		stock: String(p.stock),
		active: p.active ? "true" : "false",
	};
}

/**
 * Render products as a CSV string. Header row is always included. Quoting is
 * handled by Papaparse — descriptions with commas, newlines, or quotes survive
 * the round-trip.
 */
export function productsToCsvString(products: ExportableProduct[]): string {
	return Papa.unparse(
		{
			fields: Array.from(PRODUCT_EXPORT_COLUMNS),
			data: products.map(productToExportRow),
		},
		{ newline: "\n" },
	);
}

/**
 * Render products as an XLSX Blob. First sheet "Products". Header row
 * bolded, columns auto-sized to sensible widths.
 */
export async function productsToXlsxBlob(
	products: ExportableProduct[],
): Promise<Blob> {
	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet("Products");
	ws.columns = PRODUCT_EXPORT_COLUMNS.map((col) => ({
		header: col,
		key: col,
		width: col === "description" ? 40 : col === "name" ? 28 : 14,
	}));
	ws.getRow(1).font = { bold: true };
	for (const p of products) ws.addRow(productToExportRow(p));
	const buffer = await wb.xlsx.writeBuffer();
	return new Blob([buffer], {
		type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	});
}

function triggerDownload(blob: Blob, filename: string): void {
	if (typeof window === "undefined") return;
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename;
	document.body.appendChild(a);
	a.click();
	document.body.removeChild(a);
	URL.revokeObjectURL(url);
}

function exportDateStamp(now = new Date()): string {
	return [
		now.getFullYear(),
		String(now.getMonth() + 1).padStart(2, "0"),
		String(now.getDate()).padStart(2, "0"),
	].join("-");
}

export function buildExportFilename(
	kind: "csv" | "xlsx",
	fileBase = "kedaipal-products",
	now = new Date(),
): string {
	return `${fileBase}-${exportDateStamp(now)}.${kind}`;
}

export function downloadProductsCsv(
	products: ExportableProduct[],
	fileBase?: string,
): void {
	const csv = productsToCsvString(products);
	triggerDownload(
		new Blob([csv], { type: "text/csv;charset=utf-8" }),
		buildExportFilename("csv", fileBase),
	);
}

export async function downloadProductsXlsx(
	products: ExportableProduct[],
	fileBase?: string,
): Promise<void> {
	const blob = await productsToXlsxBlob(products);
	triggerDownload(blob, buildExportFilename("xlsx", fileBase));
}
