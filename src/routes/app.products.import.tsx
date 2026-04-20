import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	ClipboardPaste,
	Download,
	FileSpreadsheet,
	Upload,
} from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button } from "../components/ui/button";
import {
	downloadProductCsvTemplate,
	parseProductsCsv,
	parseProductsFromPaste,
} from "../lib/csv";
import { convexErrorMessage, formatPrice } from "../lib/format";
import {
	type ParsedProductImport,
	PRODUCT_IMPORT_COLUMNS,
} from "../lib/product-import";
import { parseProductsXlsx } from "../lib/xlsx";

export const Route = createFileRoute("/app/products/import")({
	component: ImportProductsRoute,
});

const CHUNK_SIZE = 50;

const SCHEMA_DOCS: Array<{
	column: string;
	type: string;
	required: boolean;
	notes: string;
}> = [
	{
		column: "sku",
		type: "text",
		required: false,
		notes:
			"Max 60 characters. Stable identifier used for updates (bulk upsert).",
	},
	{ column: "name", type: "text", required: true, notes: "Max 120 characters" },
	{
		column: "description",
		type: "text",
		required: false,
		notes: "Max 1000 characters",
	},
	{
		column: "price",
		type: "decimal",
		required: true,
		notes: "Major units in store currency, e.g. 120 or 120.50",
	},
	{ column: "stock", type: "integer", required: true, notes: "≥ 0" },
];

function ImportProductsRoute() {
	const navigate = useNavigate();
	const retailer = useQuery(api.retailers.getMyRetailer);
	const bulkCreate = useMutation(api.products.bulkCreate);

	const [parsed, setParsed] = useState<ParsedProductImport | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [importing, setImporting] = useState(false);
	const [progress, setProgress] = useState<{
		done: number;
		total: number;
	} | null>(null);
	const [pasting, setPasting] = useState(false);
	const [pasteText, setPasteText] = useState("");
	const [pasteError, setPasteError] = useState<string | null>(null);

	if (!retailer) return null;

	async function handleFile(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setProgress(null);
		setPasteError(null);
		setFileName(file.name);
		try {
			const lower = file.name.toLowerCase();
			if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
				const buffer = await file.arrayBuffer();
				setParsed(await parseProductsXlsx(buffer));
			} else {
				const text = await file.text();
				setParsed(parseProductsCsv(text));
			}
		} catch (err) {
			setParsed(null);
			toast.error(convexErrorMessage(err));
		}
	}

	function handleParsePaste() {
		setProgress(null);
		setPasteError(null);
		try {
			const result = parseProductsFromPaste(pasteText);
			if (result.totalRows === 0 && result.errorRows.length === 0) {
				setPasteError(
					"Paste the header row (sku, name, description, price, stock) plus data rows.",
				);
				return;
			}
			setParsed(result);
			setFileName("Pasted from spreadsheet");
			setPasting(false);
		} catch (err) {
			setPasteError(convexErrorMessage(err));
		}
	}

	function reset() {
		setParsed(null);
		setFileName(null);
		setProgress(null);
		setPasteText("");
		setPasteError(null);
	}

	async function handleImport() {
		if (!parsed || parsed.validRows.length === 0 || !retailer) return;
		setImporting(true);

		const rows = parsed.validRows;
		const totalChunks = Math.ceil(rows.length / CHUNK_SIZE);
		setProgress({ done: 0, total: rows.length });

		try {
			for (let i = 0; i < totalChunks; i++) {
				const slice = rows.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
				await bulkCreate({
					retailerId: retailer._id,
					currency: retailer.currency,
					items: slice.map((r) => ({
						sku: r.sku,
						name: r.name,
						description: r.description,
						price: r.price,
						stock: r.stock,
					})),
				});
				setProgress({ done: (i + 1) * CHUNK_SIZE, total: rows.length });
			}
			navigate({ to: "/app/products" });
		} catch (err) {
			toast.error(convexErrorMessage(err));
		} finally {
			setImporting(false);
		}
	}

	const canImport =
		parsed !== null &&
		parsed.validRows.length > 0 &&
		parsed.errorRows.length === 0 &&
		!importing;

	return (
		<div className="flex flex-col gap-5">
			<div className="flex items-center gap-2">
				<Link
					to="/app/products"
					className="text-sm text-muted-foreground hover:text-foreground"
				>
					← Products
				</Link>
			</div>

			<h2 className="text-xl font-bold">Import products</h2>

			<section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
				<div className="flex items-start gap-3">
					<FileSpreadsheet
						className="size-5 shrink-0 text-accent"
						aria-hidden
					/>
					<div className="flex flex-col gap-1">
						<p className="font-medium">CSV or Excel format</p>
						<p className="text-sm text-muted-foreground">
							The first row must be a header with these exact column names:
							<br />
							<span className="font-mono text-xs">
								{PRODUCT_IMPORT_COLUMNS.join(", ")}
							</span>
						</p>
					</div>
				</div>

				<div className="overflow-hidden rounded-xl border border-border">
					<table className="w-full text-left text-sm">
						<thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2">Column</th>
								<th className="px-3 py-2">Type</th>
								<th className="px-3 py-2">Required</th>
								<th className="px-3 py-2">Notes</th>
							</tr>
						</thead>
						<tbody>
							{SCHEMA_DOCS.map((col) => (
								<tr
									key={col.column}
									className="border-t border-border align-top"
								>
									<td className="px-3 py-2 font-mono">{col.column}</td>
									<td className="px-3 py-2 text-muted-foreground">
										{col.type}
									</td>
									<td className="px-3 py-2">{col.required ? "✓" : ""}</td>
									<td className="px-3 py-2 text-muted-foreground">
										{col.notes}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>

				<p className="text-xs text-muted-foreground">
					Prices use your store currency ({retailer.currency}). Change it in{" "}
					<Link
						to="/app/settings"
						search={{ tab: "store" }}
						className="underline"
					>
						Settings
					</Link>
					. Images are not supported in bulk — add them per product after
					importing.
				</p>

				<Button
					type="button"
					variant="secondary"
					onClick={downloadProductCsvTemplate}
					className="h-11 self-start"
				>
					<Download className="mr-2 size-4" aria-hidden /> Download CSV template
				</Button>
			</section>

			<section className="flex flex-col gap-3">
				<label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-6 text-center hover:border-ring">
					<Upload className="size-5 text-muted-foreground" aria-hidden />
					<span className="font-medium">
						{fileName ?? "Choose a CSV or Excel file"}
					</span>
					<span className="text-xs text-muted-foreground">
						Or drag &amp; drop — imported in batches of 50 rows.
					</span>
					<input
						type="file"
						accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.xls,application/vnd.ms-excel"
						onChange={handleFile}
						className="hidden"
					/>
				</label>

				{pasting ? (
					<div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
						<p className="text-sm font-medium">Paste from a spreadsheet</p>
						<p className="text-xs text-muted-foreground">
							Copy the rows (including the header) from Excel, Google Sheets, or
							Numbers and paste below.
						</p>
						<textarea
							value={pasteText}
							onChange={(e) => setPasteText(e.target.value)}
							placeholder={
								"sku\tname\tdescription\tprice\tstock\nTENT-4P\tTent\t4-season\t499\t12"
							}
							className="min-h-28 w-full rounded-xl border border-border bg-background p-3 font-mono text-xs"
							aria-label="Paste spreadsheet content"
						/>
						{pasteError ? (
							<p className="text-xs text-destructive">{pasteError}</p>
						) : null}
						<div className="flex gap-2">
							<Button
								type="button"
								onClick={handleParsePaste}
								className="h-10 text-sm"
								disabled={pasteText.trim().length === 0}
							>
								Parse pasted rows
							</Button>
							<Button
								type="button"
								variant="secondary"
								onClick={() => {
									setPasting(false);
									setPasteText("");
									setPasteError(null);
								}}
								className="h-10 text-sm"
							>
								Cancel
							</Button>
						</div>
					</div>
				) : parsed ? null : (
					<Button
						type="button"
						variant="secondary"
						onClick={() => setPasting(true)}
						className="h-10 self-start text-sm"
					>
						<ClipboardPaste className="mr-2 size-4" aria-hidden /> Paste from
						spreadsheet
					</Button>
				)}

				{parsed ? (
					<Button
						type="button"
						variant="secondary"
						onClick={reset}
						className="h-10 self-start text-sm"
					>
						Clear
					</Button>
				) : null}
			</section>

			{parsed ? (
				<PreviewSection parsed={parsed} currency={retailer.currency} />
			) : null}

			{progress ? (
				<p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
					Importing… {Math.min(progress.done, progress.total)} /{" "}
					{progress.total}
				</p>
			) : null}

			{parsed && parsed.validRows.length > 0 ? (
				<Button
					type="button"
					onClick={handleImport}
					disabled={!canImport}
					className="h-12"
				>
					{importing
						? "Importing…"
						: `Import ${parsed.validRows.length} product${parsed.validRows.length === 1 ? "" : "s"}`}
				</Button>
			) : null}
		</div>
	);
}

function PreviewSection({
	parsed,
	currency,
}: {
	parsed: ParsedProductImport;
	currency: string;
}) {
	return (
		<section className="flex flex-col gap-3">
			<div className="flex items-center justify-between">
				<h3 className="font-semibold">Preview</h3>
				<div className="flex gap-3 text-xs">
					<span className="text-accent">{parsed.validRows.length} valid</span>
					{parsed.errorRows.length > 0 ? (
						<span className="text-destructive">
							{parsed.errorRows.length} error
							{parsed.errorRows.length === 1 ? "" : "s"}
						</span>
					) : null}
				</div>
			</div>

			{parsed.errorRows.length > 0 ? (
				<ul className="flex flex-col gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3">
					{parsed.errorRows.map((row) => (
						<li key={row.rowNumber} className="text-sm">
							<span className="font-mono font-medium">
								{row.rowNumber === 0 ? "Header" : `Row ${row.rowNumber}`}:
							</span>{" "}
							<span className="text-destructive">{row.errors.join("; ")}</span>
						</li>
					))}
				</ul>
			) : null}

			{parsed.validRows.length > 0 ? (
				<div className="overflow-x-auto rounded-xl border border-border">
					<table className="w-full text-left text-sm">
						<thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
							<tr>
								<th className="px-3 py-2">#</th>
								<th className="px-3 py-2">SKU</th>
								<th className="px-3 py-2">Name</th>
								<th className="px-3 py-2">Price</th>
								<th className="px-3 py-2">Stock</th>
							</tr>
						</thead>
						<tbody>
							{parsed.validRows.slice(0, 20).map((row) => (
								<tr key={row.rowNumber} className="border-t border-border">
									<td className="px-3 py-2 font-mono text-muted-foreground">
										{row.rowNumber}
									</td>
									<td className="px-3 py-2 font-mono text-xs">
										{row.sku ?? (
											<span className="text-muted-foreground">—</span>
										)}
									</td>
									<td className="px-3 py-2">{row.name}</td>
									<td className="px-3 py-2">
										{formatPrice(row.price, currency)}
									</td>
									<td className="px-3 py-2">{row.stock}</td>
								</tr>
							))}
						</tbody>
					</table>
					{parsed.validRows.length > 20 ? (
						<p className="border-t border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
							… and {parsed.validRows.length - 20} more
						</p>
					) : null}
				</div>
			) : null}
		</section>
	);
}
