import { z } from "zod";

/**
 * Client-side Zod schemas for forms. These mirror server-side validators in
 * `convex/lib/slug.ts` so we fail fast in the UI before round-tripping to
 * Convex. Server still re-validates — never trust the client.
 */

// Match `convex/lib/slug.ts` assertValidWaPhone — strip formatting then
// require 8–15 digits.
export const waPhoneSchema = z
	.string()
	.transform((s) => s.replace(/[\s\-()+]/g, ""))
	.pipe(
		z
			.string()
			.regex(
				/^\d{8,15}$/,
				"WhatsApp number must be 8–15 digits, with country code (e.g. 60123456789)",
			),
	);

// Optional variant — empty string is allowed and becomes undefined.
export const waPhoneOptionalSchema = z
	.string()
	.optional()
	.transform((s) => (s && s.trim().length > 0 ? s : undefined))
	.pipe(waPhoneSchema.optional());

export const settingsWaPhoneFormSchema = z.object({
	waPhone: waPhoneSchema,
});

export type SettingsWaPhoneFormValues = z.input<
	typeof settingsWaPhoneFormSchema
>;

// Customer name on checkout — always a string (empty allowed); only the
// length is constrained. We treat empty/whitespace as "no name supplied"
// at submit time.
export const deliveryMethodSchema = z.enum(["delivery", "self_collect"]);

export const checkoutFormSchema = z.object({
	name: z.string().max(60, "Name must be at most 60 characters"),
	deliveryMethod: deliveryMethodSchema,
});

export type CheckoutFormValues = z.input<typeof checkoutFormSchema>;

// Product form. Price is entered as a major-unit decimal string (e.g. "120" or
// "120.50") and transformed to integer minor units (sen) for storage. Stock is
// a non-negative integer. See `src/lib/format.ts` for the inverse.
export const productFormSchema = z.object({
	sku: z
		.string()
		.max(60, "SKU must be at most 60 characters")
		.transform((s) => (s.trim().length > 0 ? s.trim() : undefined)),
	name: z
		.string()
		.trim()
		.min(1, "Name is required")
		.max(120, "Name must be at most 120 characters"),
	description: z
		.string()
		.max(1000, "Description must be at most 1000 characters")
		.transform((s) => (s.trim().length > 0 ? s.trim() : undefined)),
	price: z
		.string()
		.regex(/^\d+(\.\d{1,2})?$/, "Price must be a number, e.g. 120 or 120.50")
		.transform((s) => Math.round(Number.parseFloat(s) * 100)),
	stock: z
		.string()
		.regex(/^\d+$/, "Stock must be a whole number")
		.transform((s) => Number.parseInt(s, 10)),
});

export type ProductFormInput = z.input<typeof productFormSchema>;
export type ProductFormOutput = z.output<typeof productFormSchema>;
