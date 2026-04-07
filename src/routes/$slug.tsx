import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "../components/ui/button";

export const Route = createFileRoute("/$slug")({
	component: StorefrontRoute,
});

function StorefrontRoute() {
	const { slug } = Route.useParams();
	const result = useQuery(api.retailers.getRetailerBySlug, { slug });

	if (result === undefined) {
		return (
			<main className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-5">
				<p className="text-sm text-muted-foreground">Loading…</p>
			</main>
		);
	}

	if (result.status === "redirect") {
		return <Navigate to="/$slug" params={{ slug: result.to }} replace />;
	}

	if (result.status === "notFound") {
		return (
			<main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
				<h1 className="text-3xl font-bold">Store not found</h1>
				<p className="text-sm text-muted-foreground">
					No retailer uses <span className="font-mono">/{slug}</span>.
				</p>
			</main>
		);
	}

	const retailer = result.retailer;

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col pb-32">
			<header className="flex flex-col gap-2 px-5 pt-10">
				<p className="text-xs font-semibold uppercase tracking-widest text-accent">
					Kedaipal
				</p>
				<h1 className="text-3xl font-bold leading-tight">
					{retailer.storeName}
				</h1>
				<p className="text-sm text-muted-foreground">
					Mobile-first storefront — products land in the next slice.
				</p>
			</header>

			<section className="mt-6 flex flex-col gap-3 px-5">
				<div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
					Product catalog coming soon.
				</div>
			</section>

			<div className="fixed inset-x-0 bottom-0 border-t border-border bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
				<div className="mx-auto max-w-md">
					<Button disabled className="h-12 w-full text-base">
						Order on WhatsApp
					</Button>
				</div>
			</div>
		</div>
	);
}
