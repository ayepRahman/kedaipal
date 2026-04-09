import { createFileRoute, notFound } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { CheckCircle, Clock, ExternalLink, Package, Truck, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { api } from "../../convex/_generated/api";
import { getConvexHttpClient, SITE_URL } from "../lib/convex-server";
import { formatPrice } from "../lib/format";

export const Route = createFileRoute("/track/$shortId")({
	loader: async ({ params }) => {
		const client = getConvexHttpClient();
		const order = await client.query(api.orders.get, {
			shortId: params.shortId,
		});
		if (!order) throw notFound();
		return { shortId: params.shortId };
	},
	head: ({ params }) => ({
		meta: [
			{ title: `Order ${params.shortId} — Kedaipal` },
			{ name: "robots", content: "noindex" },
		],
		links: [{ rel: "canonical", href: `${SITE_URL}/track/${params.shortId}` }],
	}),
	notFoundComponent: OrderNotFound,
	component: TrackingRoute,
});

const STATUS_CONFIG: Record<
	string,
	{ label: string; icon: ReactNode; color: string }
> = {
	pending: {
		label: "Order Received",
		icon: <Clock className="size-5" />,
		color: "text-amber-500",
	},
	confirmed: {
		label: "Confirmed",
		icon: <CheckCircle className="size-5" />,
		color: "text-blue-500",
	},
	packed: {
		label: "Packed",
		icon: <Package className="size-5" />,
		color: "text-violet-500",
	},
	shipped: {
		label: "On the Way",
		icon: <Truck className="size-5" />,
		color: "text-orange-500",
	},
	delivered: {
		label: "Delivered",
		icon: <CheckCircle className="size-5" />,
		color: "text-green-500",
	},
	cancelled: {
		label: "Cancelled",
		icon: <XCircle className="size-5" />,
		color: "text-destructive",
	},
};

const STATUS_ORDER = [
	"pending",
	"confirmed",
	"packed",
	"shipped",
	"delivered",
] as const;

function OrderNotFound() {
	const { shortId } = Route.useParams();
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center gap-3 px-5 text-center">
			<h1 className="text-2xl font-bold">Order not found</h1>
			<p className="text-sm text-muted-foreground">
				No order with ID{" "}
				<span className="font-mono font-semibold">{shortId}</span>.
			</p>
		</main>
	);
}

function TrackingRoute() {
	const { shortId } = Route.useParams();
	const order = useQuery(api.orders.get, { shortId });

	if (order === undefined) {
		return (
			<main className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-5">
				<p className="text-sm text-muted-foreground">Loading…</p>
			</main>
		);
	}
	if (order === null) {
		return <OrderNotFound />;
	}

	const config = STATUS_CONFIG[order.status];
	const isCancelled = order.status === "cancelled";

	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 pb-12 pt-10">
			{/* Header */}
			<p className="text-xs font-semibold uppercase tracking-widest text-accent">
				Kedaipal
			</p>
			<h1 className="mt-3 font-mono text-2xl font-bold tracking-tight">
				#{order.shortId}
			</h1>
			<p className="mt-0.5 text-sm text-muted-foreground">
				{new Date(order._creationTime).toLocaleString(undefined, {
					dateStyle: "medium",
					timeStyle: "short",
				})}
			</p>

			{/* Current status card */}
			<div className="mt-6 flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
				<span className={config?.color}>{config?.icon}</span>
				<div>
					<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
						Status
					</p>
					<p className="font-semibold">{config?.label ?? order.status}</p>
				</div>
			</div>

			{/* Progress timeline — not shown for cancelled orders */}
			{!isCancelled ? (
				<div className="mt-6 flex flex-col gap-0">
					{STATUS_ORDER.map((s, i) => {
						const reached = STATUS_ORDER.indexOf(
							order.status as (typeof STATUS_ORDER)[number],
						);
						const isDone = i <= reached;
						const isCurrent = s === order.status;
						const sc = STATUS_CONFIG[s];
						return (
							<div key={s} className="flex gap-3">
								{/* spine */}
								<div className="flex flex-col items-center">
									<div
										className={`flex size-8 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
											isDone
												? "border-accent bg-accent text-accent-foreground"
												: "border-border bg-card text-muted-foreground"
										}`}
									>
										{sc?.icon}
									</div>
									{i < STATUS_ORDER.length - 1 ? (
										<div
											className={`w-0.5 flex-1 transition-colors ${isDone && !isCurrent ? "bg-accent" : "bg-border"}`}
											style={{ minHeight: 28 }}
										/>
									) : null}
								</div>
								{/* label */}
								<div className="pb-6 pt-1">
									<p
										className={`text-sm font-medium ${isCurrent ? "text-foreground" : isDone ? "text-foreground/70" : "text-muted-foreground"}`}
									>
										{sc?.label}
									</p>
								</div>
							</div>
						);
					})}
				</div>
			) : null}

			{/* Carrier tracking CTA */}
			{order.carrierTrackingUrl ? (
				<a
					href={order.carrierTrackingUrl}
					target="_blank"
					rel="noreferrer"
					className="mt-6 flex items-center justify-center gap-2 rounded-2xl border border-accent/40 bg-accent/5 px-4 py-3 text-sm font-semibold text-accent transition-colors hover:bg-accent/10"
				>
					<Truck className="size-4" />
					Track with carrier
					<ExternalLink className="size-3" />
				</a>
			) : null}

			{/* Items */}
			<section className="mt-6 flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					Items
				</p>
				<ul className="flex flex-col divide-y divide-border">
					{order.items.map((item) => (
						<li
							key={item.productId}
							className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
						>
							<div className="min-w-0 flex-1">
								<p className="truncate text-sm font-medium">{item.name}</p>
								<p className="text-xs text-muted-foreground">
									{item.quantity} ×{" "}
									{formatPrice(item.price, order.currency)}
								</p>
							</div>
							<p className="shrink-0 text-sm font-semibold tabular-nums">
								{formatPrice(item.price * item.quantity, order.currency)}
							</p>
						</li>
					))}
				</ul>
				<div className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5 text-sm font-bold">
					<span>Total</span>
					<span className="tabular-nums">
						{formatPrice(order.total, order.currency)}
					</span>
				</div>
			</section>
		</main>
	);
}
