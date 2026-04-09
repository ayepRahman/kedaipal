// WhatsApp message copy catalog. Pure — no Convex imports — to keep testable.

export type Locale = "en" | "ms";

export type CopyVars = {
	shortId: string;
	storeName: string;
	contactPhone?: string;
	trackingUrl?: string;
	carrierTrackingUrl?: string;
};

export type StatusKey = "packed" | "shipped" | "delivered" | "cancelled";

type LocaleCopy = {
	confirm: (v: CopyVars) => string;
	status: Record<StatusKey, (v: CopyVars) => string>;
	unknownFallback: () => string;
};

function contactLine(contactPhone: string | undefined, locale: Locale): string {
	if (!contactPhone) return "";
	return locale === "ms"
		? `\nHubungi kami: wa.me/${contactPhone}`
		: `\nContact us: wa.me/${contactPhone}`;
}

export const waCopy: Record<Locale, LocaleCopy> = {
	en: {
		confirm: ({ shortId, storeName, contactPhone, trackingUrl }) =>
			`✅ Order ${shortId} confirmed. We'll update you when it ships. — ${storeName}${trackingUrl ? `\n\nTrack your order: ${trackingUrl}` : ""}${contactLine(contactPhone, "en")}`,
		status: {
			packed: ({ shortId, trackingUrl }) =>
				`📦 Order ${shortId} is packed and ready to ship.${trackingUrl ? `\n\nTrack your order: ${trackingUrl}` : ""}`,
			shipped: ({ shortId, carrierTrackingUrl, trackingUrl }) =>
				`🚚 Order ${shortId} is on the way!${carrierTrackingUrl ? `\n\nTrack shipment: ${carrierTrackingUrl}` : ""}${trackingUrl ? `\n\nOrder status: ${trackingUrl}` : ""}`,
			delivered: ({ shortId }) => `🎉 Order ${shortId} delivered. Thank you!`,
			cancelled: ({ shortId, contactPhone }) =>
				`❌ Order ${shortId} was cancelled. Contact us if this is unexpected.${contactLine(contactPhone, "en")}`,
		},
		unknownFallback: () =>
			"Hi! To place an order, browse our catalog and tap Checkout — you'll be sent back here with an order ID.",
	},
	ms: {
		confirm: ({ shortId, storeName, contactPhone, trackingUrl }) =>
			`✅ Pesanan ${shortId} telah disahkan. Kami akan maklumkan apabila dihantar. — ${storeName}${trackingUrl ? `\n\nJejak pesanan anda: ${trackingUrl}` : ""}${contactLine(contactPhone, "ms")}`,
		status: {
			packed: ({ shortId, trackingUrl }) =>
				`📦 Pesanan ${shortId} sudah dibungkus dan sedia untuk dihantar.${trackingUrl ? `\n\nJejak pesanan anda: ${trackingUrl}` : ""}`,
			shipped: ({ shortId, carrierTrackingUrl, trackingUrl }) =>
				`🚚 Pesanan ${shortId} dalam perjalanan!${carrierTrackingUrl ? `\n\nJejak penghantaran: ${carrierTrackingUrl}` : ""}${trackingUrl ? `\n\nStatus pesanan: ${trackingUrl}` : ""}`,
			delivered: ({ shortId }) =>
				`🎉 Pesanan ${shortId} telah sampai. Terima kasih!`,
			cancelled: ({ shortId, contactPhone }) =>
				`❌ Pesanan ${shortId} telah dibatalkan. Hubungi kami jika ini tidak dijangka.${contactLine(contactPhone, "ms")}`,
		},
		unknownFallback: () =>
			"Hai! Untuk membuat pesanan, layari katalog kami dan tekan Checkout — anda akan dikembalikan ke sini dengan ID pesanan.",
	},
};

export function pickLocale(input: string | undefined | null): Locale {
	if (input === "ms") return "ms";
	return "en";
}

// Matches ORD-XXXX where X is from the alphabet in lib/order.ts
// (excludes O, 0, I, 1). Reused by inbound parser to keep alphabet in sync.
export const SHORT_ID_REGEX = /ORD-[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{4}/;

// Per-retailer overrides. Any key omitted (or empty string after trim) falls
// back to the built-in catalog above.
export type TemplateKey = "confirm" | StatusKey | "unknownFallback";

export type LocaleOverrides = Partial<Record<TemplateKey, string | undefined>>;

export type MessageTemplates = Partial<Record<Locale, LocaleOverrides>>;

export const TEMPLATE_KEYS: ReadonlyArray<TemplateKey> = [
	"confirm",
	"packed",
	"shipped",
	"delivered",
	"cancelled",
	"unknownFallback",
];

export const TEMPLATE_MAX_LENGTH = 1000;

function interpolate(template: string, vars: CopyVars): string {
	return template
		.replaceAll("{shortId}", vars.shortId)
		.replaceAll("{storeName}", vars.storeName)
		.replaceAll("{contactPhone}", vars.contactPhone ?? "")
		.replaceAll("{trackingUrl}", vars.trackingUrl ?? "")
		.replaceAll("{carrierTrackingUrl}", vars.carrierTrackingUrl ?? "");
}

function getDefault(locale: Locale, key: TemplateKey, vars: CopyVars): string {
	const c = waCopy[locale];
	if (key === "confirm") return c.confirm(vars);
	if (key === "unknownFallback") return c.unknownFallback();
	return c.status[key](vars);
}

/**
 * Render a message for a given locale + key. Uses retailer override if present
 * and non-empty, otherwise the default catalog. Variables `{shortId}` and
 * `{storeName}` are interpolated in both branches.
 */
export function renderMessage(
	overrides: MessageTemplates | undefined,
	locale: Locale,
	key: TemplateKey,
	vars: CopyVars,
): string {
	const override = overrides?.[locale]?.[key];
	if (override && override.trim().length > 0) {
		return interpolate(override, vars);
	}
	return getDefault(locale, key, vars);
}

/**
 * Default text for a locale+key with placeholder variables left in. Used by
 * the Settings UI as the textarea placeholder.
 */
export function defaultTemplate(locale: Locale, key: TemplateKey): string {
	return getDefault(locale, key, { shortId: "{shortId}", storeName: "{storeName}" });
}

// ---------------------------------------------------------------------------
// Payment instructions
// ---------------------------------------------------------------------------

export type PaymentInstructions = {
	bankName?: string;
	bankAccountName?: string;
	bankAccountNumber?: string;
	qrImageStorageId?: string;
	note?: string;
};

const paymentLabels: Record<
	Locale,
	{
		header: string;
		bank: string;
		accountName: string;
		accountNumber: string;
		qrCaption: string;
	}
> = {
	en: {
		header: "💳 Payment details",
		bank: "Bank",
		accountName: "Name",
		accountNumber: "Account",
		qrCaption: "Scan to pay",
	},
	ms: {
		header: "💳 Maklumat pembayaran",
		bank: "Bank",
		accountName: "Nama",
		accountNumber: "Akaun",
		qrCaption: "Imbas untuk bayar",
	},
};

/**
 * Render the payment instructions block as plain text. Returns empty string if
 * no bank fields and no note are present (QR-only retailers get a header line
 * only when bank/note are absent — the QR image carries its own caption).
 *
 * Pure: no Convex / no storage. Caller resolves the QR storage URL separately.
 */
export function renderPaymentInstructions(
	locale: Locale,
	instructions: PaymentInstructions | undefined,
): string {
	if (!instructions) return "";
	const labels = paymentLabels[locale];
	const lines: string[] = [];

	const bank = instructions.bankName?.trim();
	const accName = instructions.bankAccountName?.trim();
	const accNum = instructions.bankAccountNumber?.trim();
	const note = instructions.note?.trim();

	const hasBankBlock = Boolean(bank || accName || accNum);
	const hasAny = hasBankBlock || Boolean(note);
	if (!hasAny) return "";

	lines.push("");
	lines.push(labels.header);
	if (bank) lines.push(`${labels.bank}: ${bank}`);
	if (accName) lines.push(`${labels.accountName}: ${accName}`);
	if (accNum) lines.push(`${labels.accountNumber}: ${accNum}`);
	if (note) {
		if (hasBankBlock) lines.push("");
		lines.push(note);
	}
	return lines.join("\n");
}

export function paymentQrCaption(locale: Locale): string {
	return paymentLabels[locale].qrCaption;
}
