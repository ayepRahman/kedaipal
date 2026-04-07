import { ConvexReactClient } from "convex/react";
import { clientEnv } from "./env";

/**
 * Convex client singleton. Instantiated at module load so the provider tree
 * can inject it once. If `VITE_CONVEX_URL` is missing we throw at first use
 * rather than at import time — that keeps `pnpm build` working before a
 * deployment has been provisioned.
 */
let _client: ConvexReactClient | null = null;

export function getConvexClient(): ConvexReactClient {
	if (_client) return _client;
	const url = clientEnv.VITE_CONVEX_URL;
	if (!url) {
		throw new Error(
			"VITE_CONVEX_URL is not set. Run `pnpm dlx convex dev` to provision a deployment, then fill in .env.local.",
		);
	}
	_client = new ConvexReactClient(url);
	return _client;
}
