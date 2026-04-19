import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Download, FileSpreadsheet, Upload } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button } from "../components/ui/button";
import {
	downloadProductCsvTemplate,
	type ParsedProductsCsv,
	PRODUCT_CSV_COLUMNS,
	parseProductsCsv,
} from "../lib/csv";
import { convexErrorMessage, formatPrice } from "../lib/format";

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

	const [parsed, setParsed] = useState<ParsedProductsCsv | null>(null);
	const [fileName, setFileName] = useState<string | null>(null);
	const [importing, setImporting] = useState(false);
	const [progress, setProgress] = useState<{
		done: number;
		total: number;
	} | null>(null);

	if (!retailer) return null;

	async function handleFile(e: ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;
		setProgress(null);
		setFileName(file.name);
		const text = await file.text();
		setParsed(parseProductsCsv(text));
	}

	function reset() {
		setParsed(null);
		setFileName(null);
		setProgress(null);
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

			<h2 className="text-xl font-bold">Import products from CSV</h2>

			<section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
				<div className="flex items-start gap-3">
					<FileSpreadsheet
						className="size-5 shrink-0 text-accent"
						aria-hidden
					/>
					<div className="flex flex-col gap-1">
						<p className="font-medium">CSV format</p>
						<p className="text-sm text-muted-foreground">
							The first row must be a header with these exact column names:
							<br />
							<span className="font-mono text-xs">
								{PRODUCT_CSV_COLUMNS.join(", ")}
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
					. Images are not supported in CSV — add them per product after
					importing.
				</p>

				<Button
					type="button"
					variant="secondary"
					onClick={downloadProductCsvTemplate}
					className="h-11 self-start"
				>
					<Download className="mr-2 size-4" aria-hidden /> Download template
				</Button>
			</section>

			<section className="flex flex-col gap-3">
				<label className="flex min-h-24 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-card p-6 text-center hover:border-ring">
					<Upload className="size-5 text-muted-foreground" aria-hidden />
					<span className="font-medium">{fileName ?? "Choose a CSV file"}</span>
					<span className="text-xs text-muted-foreground">
						Or drag &amp; drop — max 100 rows per import
					</span>
					<input
						type="file"
						accept=".csv,text/csv"
						onChange={handleFile}
						className="hidden"
					/>
				</label>
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
	parsed: ParsedProductsCsv;
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
