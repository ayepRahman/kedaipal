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
import { useMutation, useQuery } from "convex/react";
import { Home, Package, Settings, ShoppingBag } from "lucide-react";
import { useEffect, useRef } from "react";
import { api } from "../../convex/_generated/api";
import { useOrderToastNotifications } from "../hooks/useOrderToastNotifications";
import { cn } from "../lib/utils";

export const Route = createFileRoute("/app")({
	head: () => ({
		meta: [{ name: "robots", content: "noindex, nofollow" }],
	}),
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
	const counts = useQuery(
		api.orders.countActionable,
		retailer ? { retailerId: retailer._id } : "skip",
	);
	const actionableCount = (counts?.pending ?? 0) + (counts?.confirmed ?? 0);
	useOrderToastNotifications(counts);

	useEffect(() => {
		if (retailer === null) navigate({ to: "/onboarding" });
	}, [retailer, navigate]);

	// One-shot backfill: if the retailer has no notifyEmail yet, copy it from
	// their Clerk identity email so existing accounts get auto-populated
	// without a manual visit to Settings. Idempotent on the server side; the
	// ref guard just stops us re-firing within the same session.
	const ensureNotifyEmail = useMutation(
		api.retailers.ensureNotifyEmailFromIdentity,
	);
	const triedNotifyEmailBackfill = useRef(false);
	useEffect(() => {
		if (triedNotifyEmailBackfill.current) return;
		if (!retailer) return;
		if (retailer.notifyEmail && retailer.notifyEmail.trim().length > 0) return;
		triedNotifyEmailBackfill.current = true;
		ensureNotifyEmail({}).catch(() => {
			// Non-fatal — retailer can still set the email manually in settings.
		});
	}, [retailer, ensureNotifyEmail]);

	if (retailer === undefined || retailer === null) {
		return (
			<main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 py-6">
				<div className="flex items-center justify-between border-b border-border pb-4">
					<div className="flex flex-col gap-1.5">
						<div className="h-5 w-32 animate-pulse rounded bg-muted" />
						<div className="h-3 w-44 animate-pulse rounded bg-muted" />
					</div>
					<div className="size-8 animate-pulse rounded-full bg-muted" />
				</div>
				<div className="flex flex-1 flex-col gap-4 pt-6">
					<div className="h-7 w-28 animate-pulse rounded bg-muted" />
					{[0, 1, 2, 3].map((n) => (
						<div
							key={n}
							className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
						>
							<div className="size-16 animate-pulse rounded-xl bg-muted" />
							<div className="flex flex-1 flex-col gap-2">
								<div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
								<div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
							</div>
						</div>
					))}
				</div>
			</main>
		);
	}

	return (
		<div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
			<header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 px-5 py-3 backdrop-blur">
				<div className="flex items-center gap-2.5">
					<img src="/logo.svg" alt="Kedaipal" className="h-8 w-auto" />
					<div className="flex flex-col">
						<Link to="/app" className="font-semibold leading-tight text-sm">
							{retailer.storeName}
						</Link>
						<span className="font-mono text-xs text-muted-foreground">
							kedaipal.com/{retailer.slug}
						</span>
					</div>
				</div>
				<UserButton />
			</header>
			<div className="flex-1 px-5 py-6">
				<Outlet />
			</div>
			<nav className="sticky bottom-0 border-t border-border bg-background pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
				<div className="flex items-center justify-around">
					<Link
						to="/app"
						activeOptions={{ exact: true }}
						activeProps={{ className: "text-foreground" }}
						inactiveProps={{ className: "text-muted-foreground" }}
						className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[10px]"
					>
						{({ isActive }) => (
							<>
								<Home
									className={cn(
										"size-5",
										isActive
											? "fill-foreground stroke-foreground"
											: "stroke-muted-foreground",
									)}
								/>
								<span
									className={cn(
										"font-medium",
										isActive ? "text-foreground" : "text-muted-foreground",
									)}
								>
									Home
								</span>
							</>
						)}
					</Link>
					<Link
						to="/app/products"
						activeProps={{ className: "text-foreground" }}
						inactiveProps={{ className: "text-muted-foreground" }}
						className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[10px]"
					>
						{({ isActive }) => (
							<>
								<Package
									className={cn(
										"size-5",
										isActive
											? "fill-foreground stroke-background"
											: "stroke-muted-foreground",
									)}
								/>
								<span
									className={cn(
										"font-medium",
										isActive ? "text-foreground" : "text-muted-foreground",
									)}
								>
									Products
								</span>
							</>
						)}
					</Link>
					<Link
						to="/app/orders"
						activeProps={{ className: "text-foreground" }}
						inactiveProps={{ className: "text-muted-foreground" }}
						className="relative flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[10px]"
					>
						{({ isActive }) => (
							<>
								<span className="relative">
									<ShoppingBag
										className={cn(
											"size-5",
											isActive
												? "fill-foreground stroke-background"
												: "stroke-muted-foreground",
										)}
									/>
									{actionableCount > 0 ? (
										<span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-orange-500 px-1 text-[9px] font-bold leading-none text-white">
											{actionableCount > 99 ? "99+" : actionableCount}
										</span>
									) : null}
								</span>
								<span
									className={cn(
										"font-medium",
										isActive ? "text-foreground" : "text-muted-foreground",
									)}
								>
									Orders
								</span>
							</>
						)}
					</Link>
					<Link
						to="/app/settings"
						search={{ tab: "store" }}
						activeProps={{ className: "text-foreground" }}
						inactiveProps={{ className: "text-muted-foreground" }}
						className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[10px]"
					>
						{({ isActive }) => (
							<>
								<Settings
									className={cn(
										"size-5",
										isActive
											? "fill-foreground stroke-background"
											: "stroke-muted-foreground",
									)}
								/>
								<span
									className={cn(
										"font-medium",
										isActive ? "text-foreground" : "text-muted-foreground",
									)}
								>
									Settings
								</span>
							</>
						)}
					</Link>
				</div>
			</nav>
		</div>
	);
}
