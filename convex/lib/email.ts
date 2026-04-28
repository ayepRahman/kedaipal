// Resend email client. fetch-based — works inside the default Convex runtime.
// Reads credentials from process.env at call time so tests can stub via
// globalThis.fetch (mirrors the convex/lib/whatsapp.ts pattern).

const RESEND_URL = "https://api.resend.com/emails";

type EmailCredentials = {
	apiKey: string;
	from: string;
};

function readCredentials(): EmailCredentials {
	const apiKey = process.env.RESEND_API_KEY;
	const from = process.env.EMAIL_FROM;
	if (!apiKey || !from) {
		throw new Error(
			"Email credentials missing: set RESEND_API_KEY and EMAIL_FROM",
		);
	}
	return { apiKey, from };
}

export async function sendEmail(
	to: string,
	subject: string,
	html: string,
	text: string,
): Promise<void> {
	const { apiKey, from } = readCredentials();
	const res = await fetch(RESEND_URL, {
		method: "POST",
		headers: {
			Authorization: `Bearer ${apiKey}`,
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			from,
			to: [to],
			subject,
			html,
			text,
		}),
	});
	if (!res.ok) {
		const body = await res.text();
		throw new Error(`Email send failed (${res.status}): ${body}`);
	}
}
