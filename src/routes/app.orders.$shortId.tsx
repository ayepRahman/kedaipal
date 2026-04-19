import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import {
	ChevronLeft,
	ExternalLink,
	MessageCircle,
	Package,
	Truck,
	User,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api } from "../../convex/_generated/api";
import { Button } from "../components/ui/button";
import { Skeleton } from "../components/ui/skeleton";
import { convexErrorMessage, formatPrice } from "../lib/format";
import { StatusBadge } from "./app.orders.index";

export const Route = createFileRoute("/app/orders/$shortId")({
	component: OrderDetailRoute,
});

function OrderDetailSkeleton() {
	return (
		<div className="flex flex-col gap-5">
			<Skeleton className="h-4 w-16 rounded" />
			<div className="flex items-center justify-between">
				<Skeleton className="h-7 w-28 rounded" />
				<Skeleton className="h-5 w-20 rounded-full" />
			</div>
			<div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-4">
				<Skeleton className="h-3 w-16 rounded" />
				<Skeleton className="h-5 w-32 rounded" />
				<Skeleton className="h-4 w-24 rounded" />
			</div>
			<div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
				<Skeleton className="h-3 w-10 rounded" />
				{Array.from({ length: 3 }).map((_, i) => (
					// biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are stable
					<div key={i} className="flex items-start justify-between gap-3">
						<div className="flex flex-1 flex-col gap-1">
							<Skeleton className="h-4 w-40 rounded" />
							<Skeleton className="h-3 w-24 rounded" />
						</div>
						<Skeleton className="h-4 w-14 rounded" />
					</div>
				))}
				<div className="mt-2 flex items-center justify-between border-t border-border pt-3">
					<Skeleton className="h-5 w-10 rounded" />
					<Skeleton className="h-5 w-20 rounded" />
				</div>
			</div>
		</div>
	);
}

type Transition =
	| "confirmed"
	| "packed"
	| "shipped"
	| "delivered"
	| "cancelled";
type DeliveryMethod = "delivery" | "self_collect";

const NEXT_STATUS: Record<string, Transition[]> = {
	pending: ["confirmed", "cancelled"],
	confirmed: ["packed", "cancelled"],
	packed: ["shipped", "cancelled"],
	shipped: ["delivered"],
	delivered: [],
	cancelled: [],
};

const DELIVERY_TRANSITION_LABELS: Record<Transition, string> = {
	confirmed: "Confirm Order",
	packed: "Mark as Packed",
	shipped: "Mark as Shipped",
	delivered: "Mark as Delivered",
	cancelled: "Cancel Order",
};

const SELF_COLLECT_TRANSITION_LABELS: Record<Transition, string> = {
	confirmed: "Confirm Order",
	packed: "Mark as Packed",
	shipped: "Ready for Pickup",
	delivered: "Mark as Collected",
	cancelled: "Cancel Order",
};

function getTransitionLabels(
	method: DeliveryMethod,
): Record<Transition, string> {
	return method === "self_collect"
		? SELF_COLLECT_TRANSITION_LABELS
		: DELIVERY_TRANSITION_LABELS;
}

function OrderDetailRoute() {
	const { shortId } = Route.useParams();
	const order = useQuery(api.orders.get, { shortId });
	const updateStatus = useMutation(api.orders.updateStatus);
	const setCarrierUrl = useMutation(api.orders.setCarrierTrackingUrl);
	const [pending, setPending] = useState<Transition | null>(null);
	const [carrierInput, setCarrierInput] = useState<string | null>(null);
	const [savingCarrier, setSavingCarrier] = useState(false);

	if (order === undefined) {
		return <OrderDetailSkeleton />;
	}
	if (order === null) {
		return <p className="text-sm text-destructive">Order not found.</p>;
	}

	const deliveryMethod = (order.deliveryMethod ?? "delivery") as DeliveryMethod;
	const isSelfCollect = deliveryMethod === "self_collect";
	const transitionLabels = getTransitionLabels(deliveryMethod);
	const transitions = NEXT_STATUS[order.status] ?? [];
	const showCarrierSection =
		!isSelfCollect && !["pending", "cancelled"].includes(order.status);
	const editingCarrier = carrierInput !== null;

	async function handleTransition(next: Transition) {
		if (!order) return;
		setPending(next);
		try {
			await updateStatus({ orderId: order._id, status: next });
		} catch (err) {
			toast.error(convexErrorMessage(err));
		} finally {
			setPending(null);
		}
	}

	async function handleSaveCarrier() {
		if (!order || carrierInput === null) return;
		setSavingCarrier(true);
		try {
			await setCarrierUrl({
				orderId: order._id,
				carrierTrackingUrl: carrierInput || undefined,
			});
			setCarrierInput(null);
		} catch (err) {
			toast.error(convexErrorMessage(err));
		} finally {
			setSavingCarrier(false);
		}
	}

	return (
		<div className="flex flex-col gap-5">
			{/* Back nav */}
			<Link
				to="/app/orders"
				className="flex w-fit items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
			>
				<ChevronLeft className="size-4" />
				Orders
			</Link>

			{/* Order header */}
			<div className="flex items-start justify-between gap-3">
				<div>
					<h2 className="font-mono text-2xl font-bold tracking-tight">
						#{order.shortId}
					</h2>
					<p className="mt-0.5 text-xs text-muted-foreground">
						{new Date(order._creationTime).toLocaleString(undefined, {
							dateStyle: "medium",
							timeStyle: "short",
						})}
					</p>
				</div>
				<StatusBadge status={order.status} />
			</div>

			{/* Customer */}
			<section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
				<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
					Customer
				</p>
				<div className="flex items-center gap-3">
					<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
						<User className="size-4 text-muted-foreground" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="font-medium">{order.customer.name ?? "Anonymous"}</p>
						{order.customer.waPhone ? (
							<p className="font-mono text-xs text-muted-foreground">
								{order.customer.waPhone}
							</p>
						) : null}
					</div>
					{order.customer.waPhone ? (
						<a
							href={`https://wa.me/${order.customer.waPhone}`}
							target="_blank"
							rel="noreferrer"
							className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-green-500/10 text-green-600 transition-colors hover:bg-green-500/20"
							aria-label="Message on WhatsApp"
						>
							<MessageCircle className="size-4" />
						</a>
					) : null}
				</div>
			</section>

			{/* Delivery method */}
			<section className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
				<div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted">
					{isSelfCollect ? (
						<Package className="size-4 text-muted-foreground" />
					) : (
						<Truck className="size-4 text-muted-foreground" />
					)}
				</div>
				<div>
					<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
						Fulfillment
					</p>
					<p className="text-sm font-medium">
						{isSelfCollect ? "Self Collect" : "Delivery"}
					</p>
				</div>
			</section>

			{/* Items */}
			<section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
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
									{item.quantity} × {formatPrice(item.price, order.currency)}
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

			{/* Carrier tracking */}
			{showCarrierSection ? (
				<section className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-4">
					<div className="flex items-center justify-between">
						<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
							Carrier Tracking
						</p>
						{!editingCarrier ? (
							<button
								type="button"
								onClick={() => setCarrierInput(order.carrierTrackingUrl ?? "")}
								className="text-xs text-accent hover:underline"
							>
								{order.carrierTrackingUrl ? "Edit" : "Add link"}
							</button>
						) : null}
					</div>

					{editingCarrier ? (
						<div className="flex flex-col gap-2">
							<input
								// biome-ignore lint/a11y/noAutofocus: intentional UX — input appears on user action
								autoFocus
								type="url"
								value={carrierInput}
								onChange={(e) => setCarrierInput(e.target.value)}
								placeholder="https://www.spx.my/track?..."
								className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
							/>
							<p className="text-xs text-muted-foreground">
								SPX, Lalamove, NinjaVan, J&amp;T, etc. Sent to the customer via
								WhatsApp.
							</p>
							<div className="flex gap-2">
								<Button
									onClick={handleSaveCarrier}
									disabled={savingCarrier}
									className="h-9 flex-1 text-sm"
								>
									{savingCarrier ? "Saving…" : "Save"}
								</Button>
								<Button
									variant="secondary"
									onClick={() => setCarrierInput(null)}
									disabled={savingCarrier}
									className="h-9 text-sm"
								>
									Cancel
								</Button>
							</div>
						</div>
					) : order.carrierTrackingUrl ? (
						<a
							href={order.carrierTrackingUrl}
							target="_blank"
							rel="noreferrer"
							className="flex items-center gap-2 text-sm text-accent underline underline-offset-2"
						>
							<Truck className="size-4 shrink-0" />
							<span className="truncate">{order.carrierTrackingUrl}</span>
							<ExternalLink className="size-3 shrink-0" />
						</a>
					) : (
						<p className="text-sm text-muted-foreground">
							No tracking link added yet.
						</p>
					)}
				</section>
			) : null}

			{/* Status actions */}
			{transitions.length > 0 ? (
				<section className="flex flex-col gap-3">
					<p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
						Update Status
					</p>
					<div className="flex flex-col gap-2">
						{transitions.map((t) => (
							<Button
								key={t}
								onClick={() => handleTransition(t)}
								disabled={pending !== null}
								variant={t === "cancelled" ? "secondary" : "default"}
								className="h-11 w-full"
							>
								{pending === t ? "Updating…" : transitionLabels[t]}
							</Button>
						))}
					</div>
				</section>
			) : null}
		</div>
	);
}
