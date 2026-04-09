import { MINUTE, RateLimiter } from "@convex-dev/rate-limiter";
import { components } from "../_generated/api";

/**
 * Rate limit definitions.
 *
 * - `orderCreate`: public order creation endpoint. Keyed by retailerId so each
 *   storefront is throttled independently. Token bucket allows a burst of 5
 *   then refills at 30/min steady state.
 * - `productWrite`: authenticated retailer mutations. Keyed by Clerk subject so
 *   a single user cannot bulk-trash inventory.
 */
export const rateLimiter = new RateLimiter(components.rateLimiter, {
	orderCreate: {
		kind: "token bucket",
		rate: 30,
		period: MINUTE,
		capacity: 5,
	},
	productWrite: {
		kind: "fixed window",
		rate: 20, // beta: tightened from 60
		period: MINUTE,
	},
	// Bulk import is heavier per call (writes many products in one transaction)
	// but called in small bursts during a single import session.
	productBulkImport: {
		kind: "token bucket",
		rate: 5, // beta: tightened from 20
		period: MINUTE,
		capacity: 2,
	},
});
