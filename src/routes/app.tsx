import {
	RedirectToSignIn,
	Show,
	UserButton,
} from "@clerk/tanstack-react-start";
import {
	createFileRoute,
	Link,
	Outlet,
	useNavigate,
} from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { useEffect } from "react";
import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/app")({
	component: AppLayout,
});

function AppLayout() {
	return (
		<Show
			when="signed-in"
			fallback={<RedirectToSignIn signInForceRedirectUrl="/app" />}
		>
			<AppShell />
		</Show>
	);
}

function AppShell() {
	const navigate = useNavigate();
	const retailer = useQuery(api.retailers.getMyRetailer);

	useEffect(() => {
		if (retailer === null) navigate({ to: "/onboarding" });
	}, [retailer, navigate]);

	if (retailer === undefined || retailer === null) {
		return (
			<main className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-5">
				<p className="text-sm text-muted-foreground">Loading…</p>
			</main>
		);
	}

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
			<header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
				<div className="flex flex-col">
					<Link to="/app" className="font-semibold leading-tight">
						{retailer.storeName}
					</Link>
					<span className="font-mono text-xs text-muted-foreground">
						kedaipal.com/{retailer.slug}
					</span>
				</div>
				<UserButton />
			</header>
			<div className="flex-1 px-5 py-6">
				<Outlet />
			</div>
			<nav className="sticky bottom-0 border-t border-border bg-background px-5 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
				<div className="flex items-center justify-around text-xs">
					<Link
						to="/app"
						activeProps={{ className: "text-foreground font-semibold" }}
						inactiveProps={{ className: "text-muted-foreground" }}
						className="flex min-h-11 items-center px-4"
					>
						Home
					</Link>
					<Link
						to="/app/settings"
						activeProps={{ className: "text-foreground font-semibold" }}
						inactiveProps={{ className: "text-muted-foreground" }}
						className="flex min-h-11 items-center px-4"
					>
						Settings
					</Link>
				</div>
			</nav>
		</div>
	);
}
