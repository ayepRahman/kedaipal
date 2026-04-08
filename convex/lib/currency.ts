/**
 * Supported storefront currencies. Kept as a closed set so the dashboard
 * dropdown, server validator, and downstream price formatting all agree.
 *
 * Adding a new code: append here, no other code change needed — both the
 * client `<SelectField>` and the server validator read from this list.
 */
export const SUPPORTED_CURRENCIES = [
	"MYR",
	"SGD",
	"IDR",
	"THB",
	"PHP",
	"VND",
	"USD",
] as const;

export type SupportedCurrency = (typeof SUPPORTED_CURRENCIES)[number];

export const DEFAULT_CURRENCY: SupportedCurrency = "MYR";

export function isSupportedCurrency(value: string): value is SupportedCurrency {
	return (SUPPORTED_CURRENCIES as readonly string[]).includes(value);
}

export function assertSupportedCurrency(value: string): SupportedCurrency {
	if (!isSupportedCurrency(value)) {
		throw new Error(
			`Unsupported currency "${value}". Supported: ${SUPPORTED_CURRENCIES.join(", ")}`,
		);
	}
	return value;
}
