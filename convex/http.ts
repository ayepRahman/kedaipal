import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";

const http = httpRouter();

/**
 * WhatsApp Cloud API webhook verification (GET) + receive (POST).
 *
 * Meta sends a GET with hub.mode=subscribe, hub.verify_token, hub.challenge.
 * If our token matches, echo the challenge with 200; else 403.
 */
http.route({
	path: "/webhook/whatsapp",
	method: "GET",
	handler: httpAction(async (_ctx, req) => {
		const url = new URL(req.url);
		const mode = url.searchParams.get("hub.mode");
		const token = url.searchParams.get("hub.verify_token");
		const challenge = url.searchParams.get("hub.challenge");
		const expected = process.env.WHATSAPP_VERIFY_TOKEN;

		if (mode === "subscribe" && expected && token === expected && challenge) {
			return new Response(challenge, {
				status: 200,
				headers: { "Content-Type": "text/plain" },
			});
		}
		return new Response("forbidden", { status: 403 });
	}),
});

http.route({
	path: "/webhook/whatsapp",
	method: "POST",
	handler: httpAction(async (ctx, req) => {
		// Always respond 200 quickly so Meta doesn't retry; do work async.
		let payload: unknown;
		try {
			payload = await req.json();
		} catch {
			return new Response("bad json", { status: 400 });
		}

		const messages = extractTextMessages(payload);
		for (const msg of messages) {
			await ctx.runAction(internal.whatsapp.handleInbound, {
				fromPhone: msg.from,
				text: msg.text,
			});
		}

		return new Response("ok", { status: 200 });
	}),
});

type InboundText = { from: string; text: string };

function extractTextMessages(payload: unknown): InboundText[] {
	const out: InboundText[] = [];
	if (!payload || typeof payload !== "object") return out;
	const entries = (payload as { entry?: unknown[] }).entry;
	if (!Array.isArray(entries)) return out;
	for (const entry of entries) {
		if (!entry || typeof entry !== "object") continue;
		const changes = (entry as { changes?: unknown[] }).changes;
		if (!Array.isArray(changes)) continue;
		for (const change of changes) {
			if (!change || typeof change !== "object") continue;
			const value = (change as { value?: unknown }).value;
			if (!value || typeof value !== "object") continue;
			const messages = (value as { messages?: unknown[] }).messages;
			if (!Array.isArray(messages)) continue;
			for (const m of messages) {
				if (!m || typeof m !== "object") continue;
				const from = (m as { from?: unknown }).from;
				const type = (m as { type?: unknown }).type;
				if (typeof from !== "string") continue;
				if (type !== "text") continue;
				const textObj = (m as { text?: unknown }).text;
				if (!textObj || typeof textObj !== "object") continue;
				const body = (textObj as { body?: unknown }).body;
				if (typeof body !== "string") continue;
				out.push({ from, text: body });
			}
		}
	}
	return out;
}

export default http;
