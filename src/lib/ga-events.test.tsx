// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

// Hoisted so the vi.mock factories below can reference them safely.
const { initializeMock, eventMock, envState } = vi.hoisted(() => ({
	initializeMock: vi.fn(),
	eventMock: vi.fn(),
	envState: { measurementId: undefined as string | undefined },
}));

vi.mock("react-ga4", () => ({
	default: { initialize: initializeMock, event: eventMock, send: vi.fn() },
}));

vi.mock("./env", () => ({
	clientEnv: {
		get VITE_GA_MEASUREMENT_ID() {
			return envState.measurementId;
		},
	},
}));

/**
 * Imports fresh so the module-level "initialized" flag starts clean per test.
 */
async function loadGaEvents() {
	return await import("./ga-events");
}

function setPath(path: string) {
	window.history.replaceState(null, "", path);
}

beforeEach(() => {
	vi.resetModules();
	initializeMock.mockClear();
	eventMock.mockClear();
	envState.measurementId = undefined;
	sessionStorage.clear();
	setPath("/");
});

describe("trackEvent", () => {
	it("does nothing when the measurement ID is unset", async () => {
		const { trackEvent } = await loadGaEvents();

		trackEvent("view_pricing");

		expect(initializeMock).not.toHaveBeenCalled();
		expect(eventMock).not.toHaveBeenCalled();
	});

	it("initializes once and sends the named event with params", async () => {
		envState.measurementId = "G-TEST123";
		const { trackEvent } = await loadGaEvents();

		trackEvent("cta_signup_click", { placement: "hero" });
		trackEvent("view_pricing");

		expect(initializeMock).toHaveBeenCalledTimes(1);
		expect(initializeMock).toHaveBeenCalledWith("G-TEST123");
		expect(eventMock).toHaveBeenCalledWith("cta_signup_click", {
			placement: "hero",
		});
		expect(eventMock).toHaveBeenCalledWith("view_pricing", {});
	});

	it("never sends on a capability-token path — the URL is the buyer's secret", async () => {
		envState.measurementId = "G-TEST123";
		setPath("/track/8f3c09b1a7e24d5c9b0e");
		const { trackEvent } = await loadGaEvents();

		trackEvent("view_pricing");

		expect(initializeMock).not.toHaveBeenCalled();
		expect(eventMock).not.toHaveBeenCalled();
	});

	it("auto-attaches the captured marketing src to every event", async () => {
		envState.measurementId = "G-TEST123";
		sessionStorage.setItem("kedaipal:marketing-src", "spotlight-thg");
		const { trackEvent } = await loadGaEvents();

		trackEvent("store_created");

		expect(eventMock).toHaveBeenCalledWith("store_created", {
			src: "spotlight-thg",
		});
	});

	it("an explicit src param out-ranks the stored one", async () => {
		envState.measurementId = "G-TEST123";
		sessionStorage.setItem("kedaipal:marketing-src", "stored");
		const { trackEvent } = await loadGaEvents();

		trackEvent("land_marketing", { src: "explicit" });

		expect(eventMock).toHaveBeenCalledWith("land_marketing", {
			src: "explicit",
		});
	});

	it("never throws when the GA library does — analytics must not break the page", async () => {
		envState.measurementId = "G-TEST123";
		eventMock.mockImplementation(() => {
			throw new Error("ga exploded");
		});
		const { trackEvent } = await loadGaEvents();

		expect(() => trackEvent("view_pricing")).not.toThrow();
	});
});

describe("trackSignupCta", () => {
	it("sends cta_signup_click with the placement", async () => {
		envState.measurementId = "G-TEST123";
		const { trackSignupCta } = await loadGaEvents();

		trackSignupCta("final-cta");

		expect(eventMock).toHaveBeenCalledWith("cta_signup_click", {
			placement: "final-cta",
		});
	});
});

describe("readGaClientId", () => {
	it("reads the client id from the _ga cookie", async () => {
		const { readGaClientId } = await loadGaEvents();
		// biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API; the code under test reads document.cookie.
		document.cookie = "_ga=GA1.1.123456789.987654321";
		expect(readGaClientId()).toBe("123456789.987654321");
	});

	it("returns undefined when no _ga cookie exists", async () => {
		const { readGaClientId } = await loadGaEvents();
		// biome-ignore lint/suspicious/noDocumentCookie: jsdom has no Cookie Store API; expiring the cookie set by the previous test.
		document.cookie = "_ga=; expires=Thu, 01 Jan 1970 00:00:00 GMT";
		expect(readGaClientId()).toBeUndefined();
	});
});
