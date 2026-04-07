import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "../components/ui/button";
import { useSlugAvailability } from "../hooks/useSlugAvailability";

export const Route = createFileRoute("/app/settings")({
	component: SettingsRoute,
});

function SettingsRoute() {
	const retailer = useQuery(api.retailers.getMyRetailer);
	const renameSlug = useMutation(api.retailers.renameSlug);

	const [newSlug, setNewSlug] = useState("");
	const [status, setStatus] = useState<
		| { kind: "idle" }
		| { kind: "saving" }
		| { kind: "ok"; previous: string }
		| { kind: "err"; message: string }
	>({ kind: "idle" });

	const availability = useSlugAvailability(newSlug);

	if (!retailer) return null;

	async function onSubmit(e: FormEvent) {
		e.preventDefault();
		if (availability.status !== "available") return;
		if (!retailer) return;
		const previous = retailer.slug;
		setStatus({ kind: "saving" });
		try {
			await renameSlug({ newSlug });
			setStatus({ kind: "ok", previous });
			setNewSlug("");
		} catch (err) {
			setStatus({ kind: "err", message: (err as Error).message });
		}
	}

	return (
		<div className="flex flex-col gap-6">
			<section className="flex flex-col gap-2">
				<h2 className="text-xl font-bold">Settings</h2>
				<p className="text-sm text-muted-foreground">
					Current slug: <span className="font-mono">{retailer.slug}</span>
				</p>
			</section>

			<form onSubmit={onSubmit} className="flex flex-col gap-4">
				<label className="flex flex-col gap-2">
					<span className="text-sm font-medium">Rename slug</span>
					<div className="flex items-center rounded-xl border border-input bg-background pl-4 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
						<span className="select-none text-muted-foreground">
							kedaipal.com/
						</span>
						<input
							type="text"
							value={newSlug}
							onChange={(e) => setNewSlug(e.target.value.toLowerCase())}
							placeholder="new-slug"
							className="min-h-11 flex-1 bg-transparent pl-0 pr-4 font-mono text-base outline-none"
						/>
					</div>
					<Hint state={availability} />
				</label>

				<Button
					type="submit"
					disabled={
						availability.status !== "available" || status.kind === "saving"
					}
					className="h-12"
				>
					{status.kind === "saving" ? "Saving…" : "Rename"}
				</Button>

				{status.kind === "ok" ? (
					<p className="rounded-lg bg-accent/10 px-3 py-2 text-sm text-accent-foreground">
						Renamed. Links to{" "}
						<span className="font-mono">/{status.previous}</span> will redirect
						for 90 days.
					</p>
				) : null}
				{status.kind === "err" ? (
					<p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{status.message}
					</p>
				) : null}
			</form>
		</div>
	);
}

function Hint({ state }: { state: ReturnType<typeof useSlugAvailability> }) {
	if (state.status === "idle") return null;
	if (state.status === "checking")
		return <p className="text-sm text-muted-foreground">Checking…</p>;
	if (state.status === "available")
		return <p className="text-sm text-accent">✓ Available</p>;
	if (state.status === "taken")
		return <p className="text-sm text-destructive">✗ Taken</p>;
	return <p className="text-sm text-destructive">✗ {state.message}</p>;
}
