import { useCallback, useEffect, useMemo, useReducer } from "react";
import type { Id } from "../../convex/_generated/dataModel";

/**
 * Cart state for the public storefront. Persisted to localStorage and keyed
 * per `retailerId` so a shopper browsing two stores in the same browser
 * doesn't see items bleed across them.
 *
 * Prices are stored in minor units (see `src/lib/format.ts`).
 */

export type CartItem = {
	productId: Id<"products">;
	name: string;
	price: number; // minor units
	currency: string;
	quantity: number;
	imageUrl?: string;
};

type CartState = {
	items: CartItem[];
};

type CartAction =
	| { type: "ADD"; item: Omit<CartItem, "quantity">; quantity: number }
	| { type: "SET_QTY"; productId: Id<"products">; quantity: number }
	| { type: "REMOVE"; productId: Id<"products"> }
	| { type: "CLEAR" }
	| { type: "HYDRATE"; items: CartItem[] };

const EMPTY_STATE: CartState = { items: [] };

function reducer(state: CartState, action: CartAction): CartState {
	switch (action.type) {
		case "HYDRATE":
			return { items: action.items };
		case "ADD": {
			const existing = state.items.find(
				(i) => i.productId === action.item.productId,
			);
			if (existing) {
				return {
					items: state.items.map((i) =>
						i.productId === action.item.productId
							? { ...i, quantity: i.quantity + action.quantity }
							: i,
					),
				};
			}
			return {
				items: [...state.items, { ...action.item, quantity: action.quantity }],
			};
		}
		case "SET_QTY": {
			if (action.quantity <= 0) {
				return {
					items: state.items.filter((i) => i.productId !== action.productId),
				};
			}
			return {
				items: state.items.map((i) =>
					i.productId === action.productId
						? { ...i, quantity: action.quantity }
						: i,
				),
			};
		}
		case "REMOVE":
			return {
				items: state.items.filter((i) => i.productId !== action.productId),
			};
		case "CLEAR":
			return EMPTY_STATE;
	}
}

function storageKey(retailerId: string): string {
	return `kedaipal:cart:${retailerId}`;
}

function readPersisted(retailerId: string): CartItem[] {
	if (typeof window === "undefined") return [];
	try {
		const raw = window.localStorage.getItem(storageKey(retailerId));
		if (!raw) return [];
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(i): i is CartItem =>
				typeof i === "object" &&
				i !== null &&
				typeof i.productId === "string" &&
				typeof i.name === "string" &&
				typeof i.price === "number" &&
				typeof i.currency === "string" &&
				typeof i.quantity === "number" &&
				i.quantity > 0,
		);
	} catch {
		return [];
	}
}

export function useCart(retailerId: Id<"retailers"> | undefined) {
	const [state, dispatch] = useReducer(reducer, EMPTY_STATE);

	// Hydrate from localStorage when retailerId becomes available or changes.
	// biome-ignore lint/correctness/useExhaustiveDependencies: dispatch is stable
	useEffect(() => {
		if (!retailerId) return;
		dispatch({ type: "HYDRATE", items: readPersisted(retailerId) });
	}, [retailerId]);

	// Persist on change.
	useEffect(() => {
		if (!retailerId) return;
		if (typeof window === "undefined") return;
		try {
			window.localStorage.setItem(
				storageKey(retailerId),
				JSON.stringify(state.items),
			);
		} catch {
			// Quota exceeded or storage disabled — ignore silently for MVP.
		}
	}, [retailerId, state.items]);

	const addItem = useCallback(
		(item: Omit<CartItem, "quantity">, quantity = 1) =>
			dispatch({ type: "ADD", item, quantity }),
		[],
	);
	const updateQuantity = useCallback(
		(productId: Id<"products">, quantity: number) =>
			dispatch({ type: "SET_QTY", productId, quantity }),
		[],
	);
	const removeItem = useCallback(
		(productId: Id<"products">) => dispatch({ type: "REMOVE", productId }),
		[],
	);
	const clearCart = useCallback(() => dispatch({ type: "CLEAR" }), []);

	const { itemCount, total, currency } = useMemo(() => {
		let count = 0;
		let sum = 0;
		for (const i of state.items) {
			count += i.quantity;
			sum += i.price * i.quantity;
		}
		return {
			itemCount: count,
			total: sum,
			currency: state.items[0]?.currency ?? "MYR",
		};
	}, [state.items]);

	return {
		items: state.items,
		itemCount,
		total,
		currency,
		addItem,
		updateQuantity,
		removeItem,
		clearCart,
	};
}

export type UseCart = ReturnType<typeof useCart>;
