/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as http from "../http.js";
import type * as lib_address from "../lib/address.js";
import type * as lib_currency from "../lib/currency.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_emailCopy from "../lib/emailCopy.js";
import type * as lib_order from "../lib/order.js";
import type * as lib_rateLimiter from "../lib/rateLimiter.js";
import type * as lib_slug from "../lib/slug.js";
import type * as lib_whatsapp from "../lib/whatsapp.js";
import type * as lib_whatsappCopy from "../lib/whatsappCopy.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as retailers from "../retailers.js";
import type * as seed from "../seed.js";
import type * as whatsapp from "../whatsapp.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  email: typeof email;
  http: typeof http;
  "lib/address": typeof lib_address;
  "lib/currency": typeof lib_currency;
  "lib/email": typeof lib_email;
  "lib/emailCopy": typeof lib_emailCopy;
  "lib/order": typeof lib_order;
  "lib/rateLimiter": typeof lib_rateLimiter;
  "lib/slug": typeof lib_slug;
  "lib/whatsapp": typeof lib_whatsapp;
  "lib/whatsappCopy": typeof lib_whatsappCopy;
  orders: typeof orders;
  products: typeof products;
  retailers: typeof retailers;
  seed: typeof seed;
  whatsapp: typeof whatsapp;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  rateLimiter: import("@convex-dev/rate-limiter/_generated/component.js").ComponentApi<"rateLimiter">;
};
