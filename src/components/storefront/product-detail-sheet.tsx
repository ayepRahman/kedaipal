import { Minus, Plus, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { useEffect, useState } from "react";
import { formatPrice } from "../../lib/format";
import { Button } from "../ui/button";
import type { StorefrontProduct } from "./product-card";

interface ProductDetailSheetProps {
	product: StorefrontProduct | null;
	onClose: () => void;
	onAdd: (product: StorefrontProduct, quantity: number) => void;
}

export function ProductDetailSheet({
	product,
	onClose,
	onAdd,
}: ProductDetailSheetProps) {
	const [quantity, setQuantity] = useState(1);

	// Reset quantity whenever a new product opens.
	useEffect(() => {
		if (product) setQuantity(1);
	}, [product]);

	const open = product !== null;
	const outOfStock = product ? product.stock <= 0 : false;
	const maxQty = product ? Math.max(1, product.stock) : 1;

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
							Product details
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

					{product ? (
						<div className="flex-1 overflow-y-auto px-5 py-4">
							{product.imageUrls.length > 0 ? (
								<div className="-mx-5 mb-4 flex snap-x snap-mandatory gap-2 overflow-x-auto px-5">
									{product.imageUrls.map((url) => (
										<img
											key={url}
											src={url}
											alt={product.name}
											className="aspect-square w-64 shrink-0 snap-start rounded-2xl object-cover"
										/>
									))}
								</div>
							) : (
								<div className="mb-4 flex aspect-square w-full items-center justify-center rounded-2xl bg-muted text-sm text-muted-foreground">
									No image
								</div>
							)}

							<h2 className="text-xl font-bold leading-tight">
								{product.name}
							</h2>
							<p className="mt-1 text-2xl font-bold">
								{formatPrice(product.price, product.currency)}
							</p>
							<p className="mt-1 text-xs text-muted-foreground">
								{outOfStock
									? "Out of stock"
									: product.stock <= 5
										? `Only ${product.stock} left`
										: `${product.stock} in stock`}
							</p>

							{product.description ? (
								<p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
									{product.description}
								</p>
							) : null}
						</div>
					) : null}

					<div className="border-t border-border bg-background px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
						<div className="mb-3 flex items-center justify-center gap-3">
							<button
								type="button"
								onClick={() => setQuantity((q) => Math.max(1, q - 1))}
								disabled={quantity <= 1 || outOfStock}
								className="flex size-11 items-center justify-center rounded-full border border-border disabled:opacity-40"
								aria-label="Decrease quantity"
							>
								<Minus className="size-4" />
							</button>
							<span className="min-w-10 text-center text-lg font-semibold">
								{quantity}
							</span>
							<button
								type="button"
								onClick={() => setQuantity((q) => Math.min(maxQty, q + 1))}
								disabled={quantity >= maxQty || outOfStock}
								className="flex size-11 items-center justify-center rounded-full border border-border disabled:opacity-40"
								aria-label="Increase quantity"
							>
								<Plus className="size-4" />
							</button>
						</div>
						<Button
							type="button"
							disabled={!product || outOfStock}
							onClick={() => product && onAdd(product, quantity)}
							className="h-12 w-full text-base"
						>
							{outOfStock ? "Out of stock" : "Add to cart"}
						</Button>
					</div>
				</Dialog.Content>
			</Dialog.Portal>
		</Dialog.Root>
	);
}
