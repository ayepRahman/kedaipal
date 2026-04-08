import { useMutation } from "convex/react";
import { Trash2, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { type FormEvent, useState } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type { UseCart } from "../../hooks/useCart";
import { convexErrorMessage, formatPrice } from "../../lib/format";
import { checkoutFormSchema } from "../../lib/schemas";
import { useAppForm } from "../forms/form";
import { Button } from "../ui/button";

interface CheckoutSheetProps {
	open: boolean;
	onClose: () => void;
	cart: UseCart;
	retailerId: Id<"retailers">;
	storeName: string;
	waPhone: string | undefined;
}

function buildWaMessage(
	storeName: string,
	shortId: string,
	cart: UseCart,
): string {
	const lines: string[] = [];
	lines.push(`Hi ${storeName}, I'd like to place this order:`);
	lines.push("");
	lines.push(`Order: ${shortId}`);
	for (const item of cart.items) {
		lines.push(`• ${item.quantity}x ${item.name}`);
	}
	lines.push("");
	lines.push(`Total: ${formatPrice(cart.total, cart.currency)}`);
	return lines.join("\n");
}

export function CheckoutSheet({
	open,
	onClose,
	cart,
	retailerId,
	storeName,
	waPhone,
}: CheckoutSheetProps) {
	const createOrder = useMutation(api.orders.create);
	const [serverError, setServerError] = useState<string | null>(null);

	const noWaPhone = !waPhone;

	const form = useAppForm({
		defaultValues: { name: "", waPhone: "" },
		validators: { onChange: checkoutFormSchema },
		onSubmit: async ({ value }) => {
			setServerError(null);
			if (cart.items.length === 0) return;
			if (noWaPhone) {
				setServerError(
					"This store hasn't configured a WhatsApp number yet — ask the owner to add one in settings.",
				);
				return;
			}
			const normalizedShopperPhone = value.waPhone.replace(/[\s\-()+]/g, "");
			try {
				const { shortId } = await createOrder({
					retailerId,
					items: cart.items.map((i) => ({
						productId: i.productId,
						quantity: i.quantity,
					})),
					currency: cart.currency,
					channel: "whatsapp",
					customer: {
						name: value.name?.trim() || undefined,
						waPhone: normalizedShopperPhone,
					},
				});
				const message = buildWaMessage(storeName, shortId, cart);
				const url = `https://wa.me/${waPhone}?text=${encodeURIComponent(message)}`;
				cart.clearCart();
				form.reset();
				onClose();
				window.open(url, "_blank", "noopener,noreferrer");
			} catch (err) {
				setServerError(convexErrorMessage(err));
			}
		},
	});

	function handleSubmit(e: FormEvent) {
		e.preventDefault();
		e.stopPropagation();
		form.handleSubmit();
	}

	return (
		<Dialog.Root open={open} onOpenChange={(o) => !o && onClose()}>
			<Dialog.Portal>
				<Dialog.Overlay className="fixed inset-0 z-40 bg-black/50 data-[state=open]:animate-in data-[state=open]:fade-in" />
				<Dialog.Content
					className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90dvh] flex-col rounded-t-3xl border-t border-border bg-background shadow-xl data-[state=open]:animate-in data-[state=open]:slide-in-from-bottom"
					aria-describedby={undefined}
				>
					<div className="flex items-center justify-between border-b border-border px-5 py-3">
						<Dialog.Title className="text-base font-semibold">
							Review your order
						</Dialog.Title>
						<Dialog.Close asChild>
							<button
								type="button"
								className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
								aria-label="Close"
							>
								<X className="size-5" />
							</button>
						</Dialog.Close>
					</div>

					<form
						onSubmit={handleSubmit}
						className="flex min-h-0 flex-1 flex-col"
					>
						<div className="flex-1 overflow-y-auto px-5 py-4">
							{cart.items.length === 0 ? (
								<p className="text-sm text-muted-foreground">
									Your cart is empty.
								</p>
							) : (
								<ul className="flex flex-col gap-3">
									{cart.items.map((item) => (
										<li
											key={item.productId}
											className="flex items-center gap-3 rounded-xl border border-border p-3"
										>
											{item.imageUrl ? (
												<img
													src={item.imageUrl}
													alt={item.name}
													className="size-14 shrink-0 rounded-lg object-cover"
												/>
											) : (
												<div className="size-14 shrink-0 rounded-lg bg-muted" />
											)}
											<div className="flex flex-1 flex-col">
												<span className="text-sm font-medium leading-tight">
													{item.name}
												</span>
												<span className="text-xs text-muted-foreground">
													{item.quantity} ×{" "}
													{formatPrice(item.price, item.currency)}
												</span>
											</div>
											<div className="flex items-center gap-2">
												<span className="text-sm font-semibold">
													{formatPrice(
														item.price * item.quantity,
														item.currency,
													)}
												</span>
												<button
													type="button"
													onClick={() => cart.removeItem(item.productId)}
													className="flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
													aria-label={`Remove ${item.name}`}
												>
													<Trash2 className="size-4" />
												</button>
											</div>
										</li>
									))}
								</ul>
							)}

							<div className="mt-5 flex flex-col gap-4">
								<form.AppField
									name="name"
									children={(field) => (
										<field.TextField
											label="Your name (optional)"
											placeholder="Ali"
											autoComplete="name"
										/>
									)}
								/>
								<form.AppField
									name="waPhone"
									children={(field) => (
										<field.TextField
											label="Your WhatsApp number"
											placeholder="60123456789"
											type="tel"
											inputMode="tel"
											autoComplete="tel"
											mono
											required
											description="Country code + number, digits only. We use this to confirm your order."
										/>
									)}
								/>
							</div>

							{noWaPhone ? (
								<p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
									This store hasn't set up WhatsApp yet. Ask the owner to add a
									number in their dashboard settings.
								</p>
							) : null}

							{serverError ? (
								<p className="mt-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
									{serverError}
								</p>
							) : null}
						</div>

						<div className="border-t border-border bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
							<div className="mb-3 flex items-center justify-between">
								<span className="text-sm text-muted-foreground">Total</span>
								<span className="text-xl font-bold">
									{formatPrice(cart.total, cart.currency)}
								</span>
							</div>
							<form.Subscribe
								selector={(s) => ({
									canSubmit: s.canSubmit,
									isSubmitting: s.isSubmitting,
								})}
								children={({ canSubmit, isSubmitting }) => (
									<Button
										type="submit"
										disabled={
											!canSubmit ||
											isSubmitting ||
											cart.items.length === 0 ||
											noWaPhone
										}
										className="h-12 w-full text-base"
									>
										{isSubmitting ? "Sending…" : "Send order on WhatsApp"}
									</Button>
								)}
							/>
						</div>
					</form>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
