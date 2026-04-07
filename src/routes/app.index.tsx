import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/app/")({
	component: DashboardHome,
});

function DashboardHome() {
	const retailer = useQuery(api.retailers.getMyRetailer);
	const [copied, setCopied] = useState(false);

	if (!retailer) return null;

	const storefrontUrl = `${typeof window !== "undefined" ? window.location.origin : "https://kedaipal.com"}/${retailer.slug}`;

	async function copy() {
		try {
			await navigator.clipboard.writeText(storefrontUrl);
			setCopied(true);
			setTimeout(() => setCopied(false), 1800);
		} catch {
			// ignore
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-5">
				<p className="text-xs font-semibold uppercase tracking-widest text-accent">
					Your storefront
				</p>
				<h2 className="text-2xl font-bold leading-tight">
					{retailer.storeName}
				</h2>
				<p className="break-all font-mono text-sm text-muted-foreground">
					{storefrontUrl}
				</p>
				<div className="mt-2 flex gap-2">
					<Button onClick={copy} variant="secondary" className="h-11 flex-1">
						{copied ? "Copied!" : "Copy link"}
					</Button>
					<Button asChild className="h-11 flex-1">
						<a href={`/${retailer.slug}`} target="_blank" rel="noreferrer">
							Open
						</a>
					</Button>
				</div>
			</section>

			<section className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
				<p className="font-medium text-foreground">Products coming soon</p>
				<p className="mt-1">
					Catalog, cart and WhatsApp handoff land in the next slice.
				</p>
			</section>
		</div>
	);
}
