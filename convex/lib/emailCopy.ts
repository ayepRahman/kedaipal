// Retailer-facing email copy catalog. Pure — no Convex imports — to keep testable.
// Bilingual (en / ms) parity with the prior WhatsApp retailer alerts.

export type Locale = "en" | "ms";

export type DeliveryMethod = "delivery" | "self_collect";

export type RetailerEmailKey = "newOrder" | "orderConfirmed";

export type RetailerEmailVars = {
	shortId: string;
	itemCount: number;
	totalFormatted: string;
	customerName: string;
	deliveryMethod: DeliveryMethod;
	storeName: string;
	dashboardUrl: string;
};

const deliveryLabel: Record<Locale, Record<DeliveryMethod, string>> = {
	en: { delivery: "Delivery", self_collect: "Self-collect" },
	ms: { delivery: "Penghantaran", self_collect: "Ambil sendiri" },
};

type RenderedEmail = {
	subject: string;
	html: string;
	text: string;
};

function escapeHtml(s: string): string {
	return s
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");
}

function wrapHtml(headlineEmoji: string, headline: string, lines: string[], dashboardUrl: string, ctaLabel: string): string {
	const body = lines.map((l) => `<p style="margin:0 0 8px 0;font-size:14px;color:#1f2937;">${l}</p>`).join("");
	return `<!doctype html><html><body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 16px;">
<tr><td align="center">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
<tr><td style="padding:24px;">
<p style="margin:0 0 4px 0;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af;">Kedaipal</p>
<h1 style="margin:0 0 16px 0;font-size:18px;color:#111827;">${headlineEmoji} ${escapeHtml(headline)}</h1>
${body}
<p style="margin:24px 0 0 0;"><a href="${escapeHtml(dashboardUrl)}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:10px 16px;border-radius:8px;">${escapeHtml(ctaLabel)}</a></p>
</td></tr></table>
<p style="margin:16px 0 0 0;font-size:12px;color:#9ca3af;">Sent by Kedaipal — your WhatsApp-first order hub.</p>
</td></tr></table></body></html>`;
}

const en = {
	newOrder: (v: RetailerEmailVars): RenderedEmail => {
		const subject = `🔔 New order ${v.shortId} · ${v.totalFormatted}`;
		const lines = [
			`<strong>${escapeHtml(v.shortId)}</strong> · ${v.itemCount} item(s) · ${escapeHtml(v.totalFormatted)}`,
			`Customer: ${escapeHtml(v.customerName)}`,
			`Method: ${deliveryLabel.en[v.deliveryMethod]}`,
			`Open your dashboard to manage this order.`,
		];
		const html = wrapHtml("🔔", `New order ${v.shortId}`, lines, v.dashboardUrl, "Open dashboard");
		const text = `🔔 New order ${v.shortId}\n${v.itemCount} item(s) · ${v.totalFormatted}\nCustomer: ${v.customerName}\nMethod: ${deliveryLabel.en[v.deliveryMethod]}\n\nOpen your dashboard to manage this order.\n${v.dashboardUrl}`;
		return { subject, html, text };
	},
	orderConfirmed: (v: RetailerEmailVars): RenderedEmail => {
		const subject = `✅ Order ${v.shortId} confirmed · ${v.totalFormatted}`;
		const lines = [
			`<strong>${escapeHtml(v.shortId)}</strong> · ${v.itemCount} item(s) · ${escapeHtml(v.totalFormatted)}`,
			`Customer: ${escapeHtml(v.customerName)}`,
			`Method: ${deliveryLabel.en[v.deliveryMethod]}`,
			`Ready for next steps — pack and ship when payment lands.`,
		];
		const html = wrapHtml("✅", `Order ${v.shortId} confirmed`, lines, v.dashboardUrl, "Open dashboard");
		const text = `✅ Order ${v.shortId} confirmed\n${v.itemCount} item(s) · ${v.totalFormatted}\nCustomer: ${v.customerName}\nMethod: ${deliveryLabel.en[v.deliveryMethod]}\n\nReady for next steps.\n${v.dashboardUrl}`;
		return { subject, html, text };
	},
};

const ms = {
	newOrder: (v: RetailerEmailVars): RenderedEmail => {
		const subject = `🔔 Pesanan baru ${v.shortId} · ${v.totalFormatted}`;
		const lines = [
			`<strong>${escapeHtml(v.shortId)}</strong> · ${v.itemCount} item · ${escapeHtml(v.totalFormatted)}`,
			`Pelanggan: ${escapeHtml(v.customerName)}`,
			`Kaedah: ${deliveryLabel.ms[v.deliveryMethod]}`,
			`Buka dashboard anda untuk menguruskan pesanan ini.`,
		];
		const html = wrapHtml("🔔", `Pesanan baru ${v.shortId}`, lines, v.dashboardUrl, "Buka dashboard");
		const text = `🔔 Pesanan baru ${v.shortId}\n${v.itemCount} item · ${v.totalFormatted}\nPelanggan: ${v.customerName}\nKaedah: ${deliveryLabel.ms[v.deliveryMethod]}\n\nBuka dashboard anda untuk menguruskan pesanan ini.\n${v.dashboardUrl}`;
		return { subject, html, text };
	},
	orderConfirmed: (v: RetailerEmailVars): RenderedEmail => {
		const subject = `✅ Pesanan ${v.shortId} disahkan · ${v.totalFormatted}`;
		const lines = [
			`<strong>${escapeHtml(v.shortId)}</strong> · ${v.itemCount} item · ${escapeHtml(v.totalFormatted)}`,
			`Pelanggan: ${escapeHtml(v.customerName)}`,
			`Kaedah: ${deliveryLabel.ms[v.deliveryMethod]}`,
			`Sedia untuk langkah seterusnya.`,
		];
		const html = wrapHtml("✅", `Pesanan ${v.shortId} disahkan`, lines, v.dashboardUrl, "Buka dashboard");
		const text = `✅ Pesanan ${v.shortId} telah disahkan\n${v.itemCount} item · ${v.totalFormatted}\nPelanggan: ${v.customerName}\nKaedah: ${deliveryLabel.ms[v.deliveryMethod]}\n\nSedia untuk langkah seterusnya.\n${v.dashboardUrl}`;
		return { subject, html, text };
	},
};

const catalog: Record<Locale, Record<RetailerEmailKey, (v: RetailerEmailVars) => RenderedEmail>> = {
	en,
	ms,
};

export function renderRetailerEmail(
	locale: Locale,
	key: RetailerEmailKey,
	vars: RetailerEmailVars,
): RenderedEmail {
	return catalog[locale][key](vars);
}
