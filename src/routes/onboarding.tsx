import { RedirectToSignIn, Show } from "@clerk/tanstack-react-start";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { type FormEvent, useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import { Button } from "../components/ui/button";
import { useSlugAvailability } from "../hooks/useSlugAvailability";
import { slugify } from "../lib/slug";

export const Route = createFileRoute("/onboarding")({
	component: OnboardingRoute,
});

function OnboardingRoute() {
	return (
		<Show
			when="signed-in"
			fallback={<RedirectToSignIn signInForceRedirectUrl="/onboarding" />}
		>
			<OnboardingForm />
		</Show>
	);
}

function OnboardingForm() {
	const navigate = useNavigate();
	const retailer = useQuery(api.retailers.getMyRetailer);
	const createRetailer = useMutation(api.retailers.createRetailer);

	const [storeName, setStoreName] = useState("");
	const [slug, setSlug] = useState("");
	const [slugEdited, setSlugEdited] = useState(false);
	const [submitError, setSubmitError] = useState<string | null>(null);
	const [submitting, setSubmitting] = useState(false);

	const availability = useSlugAvailability(slug);

	// Already onboarded → straight to dashboard.
	useEffect(() => {
		if (retailer) navigate({ to: "/app" });
	}, [retailer, navigate]);

	// Auto-derive slug from store name until the user hand-edits it.
	useEffect(() => {
		if (!slugEdited) setSlug(slugify(storeName));
	}, [storeName, slugEdited]);

	if (retailer === undefined) {
		return <LoadingScreen />;
	}

	async function handleSubmit(e: FormEvent) {
		e.preventDefault();
		setSubmitError(null);
		if (storeName.trim().length < 2) {
			setSubmitError("Store name must be at least 2 characters");
			return;
		}
		if (availability.status !== "available") return;
		setSubmitting(true);
		try {
			await createRetailer({ storeName: storeName.trim(), slug });
			navigate({ to: "/app" });
		} catch (err) {
			setSubmitError((err as Error).message);
			setSubmitting(false);
		}
	}

	const canSubmit =
		storeName.trim().length >= 2 &&
		availability.status === "available" &&
		!submitting;

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-md flex-col gap-6 px-5 pb-32 pt-12">
			<header className="flex flex-col gap-2">
				<p className="text-xs font-semibold uppercase tracking-widest text-accent">
					Step 1 of 1
				</p>
				<h1 className="text-3xl font-bold leading-tight">Name your store</h1>
				<p className="text-sm text-muted-foreground">
					This becomes your public link:{" "}
					<span className="font-mono text-foreground">
						kedaipal.com/{slug || "your-slug"}
					</span>
				</p>
			</header>

			<form onSubmit={handleSubmit} className="flex flex-col gap-5">
				<Field label="Store name">
					<input
						type="text"
						value={storeName}
						onChange={(e) => setStoreName(e.target.value)}
						placeholder="Arif Outdoor"
						className="min-h-11 rounded-xl border border-input bg-background px-4 text-base outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
					/>
				</Field>

				<Field label="URL slug">
					<div className="flex items-center rounded-xl border border-input bg-background pl-4 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/50">
						<span className="select-none text-muted-foreground">
							kedaipal.com/
						</span>
						<input
							type="text"
							value={slug}
							onChange={(e) => {
								setSlug(e.target.value);
								setSlugEdited(true);
							}}
							placeholder="your-slug"
							className="min-h-11 flex-1 bg-transparent pl-0 pr-4 font-mono text-base outline-none"
						/>
					</div>
					<AvailabilityHint state={availability} />
				</Field>

				{submitError ? (
					<p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
						{submitError}
					</p>
				) : null}
			</form>

			<div className="fixed inset-x-0 bottom-0 border-t border-border bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
				<div className="mx-auto max-w-md">
					<Button
						type="submit"
						onClick={handleSubmit}
						disabled={!canSubmit}
						className="h-12 w-full text-base"
					>
						{submitting ? "Creating…" : "Create store"}
					</Button>
				</div>
			</div>
		</main>
	);
}

function Field({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: input is nested via children prop
		<label className="flex flex-col gap-2">
			<span className="text-sm font-medium">{label}</span>
			{children}
		</label>
	);
}

function AvailabilityHint({
	state,
}: {
	state: ReturnType<typeof useSlugAvailability>;
}) {
	if (state.status === "idle") return null;
	const map = {
		checking: { text: "Checking…", className: "text-muted-foreground" },
		available: { text: "✓ Available", className: "text-accent" },
		taken: { text: "✗ Taken", className: "text-destructive" },
		invalid: {
			text: `✗ ${state.status === "invalid" ? state.message : ""}`,
			className: "text-destructive",
		},
	} as const;
	const info = map[state.status];
	return <p className={`text-sm ${info.className}`}>{info.text}</p>;
}

function LoadingScreen() {
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-5">
			<p className="text-sm text-muted-foreground">Loading…</p>
		</main>
	);
}
