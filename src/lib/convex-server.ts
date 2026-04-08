import { ConvexHttpClient } from "convex/browser";
import { serverEnv } from "./env";

/**
 * Server-only Convex HTTP client for use inside TanStack Router loaders so
 * route data is fetched during SSR. Crawlers and link unfurlers see the real
 * meta tags before any JS executes.
 *
 * Do NOT import this from a component — it would pull `process.env` access
 * into the client bundle. Loaders only.
 */

let _client: ConvexHttpClient | null = null;

export function getConvexHttpClient(): ConvexHttpClient {
	if (_client) return _client;
	const url = serverEnv.CONVEX_URL ?? process.env.VITE_CONVEX_URL;
	if (!url) {
		throw new Error(
			"CONVEX_URL is not set. Required for server-side Convex queries in route loaders.",
		);
	}
	_client = new ConvexHttpClient(url);
	return _client;
}

export const SITE_URL = serverEnv.SITE_URL ?? "https://kedaipal.com";
