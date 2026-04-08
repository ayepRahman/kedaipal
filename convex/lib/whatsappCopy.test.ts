/// <reference types="vite/client" />
import { describe, expect, test } from "vitest";
import {
	paymentQrCaption,
	renderPaymentInstructions,
} from "./whatsappCopy";

describe("renderPaymentInstructions", () => {
	test("returns empty string when instructions undefined", () => {
		expect(renderPaymentInstructions("en", undefined)).toBe("");
	});

	test("returns empty string when all fields blank or whitespace", () => {
		expect(
			renderPaymentInstructions("en", {
				bankName: "  ",
				bankAccountName: "",
				bankAccountNumber: undefined,
				note: "   ",
			}),
		).toBe("");
	});

	test("renders English bank block with all fields", () => {
		const out = renderPaymentInstructions("en", {
			bankName: "Maybank",
			bankAccountName: "Acme Outdoor Sdn Bhd",
			bankAccountNumber: "5123 4567 8901",
		});
		expect(out).toContain("💳 Payment details");
		expect(out).toContain("Bank: Maybank");
		expect(out).toContain("Name: Acme Outdoor Sdn Bhd");
		expect(out).toContain("Account: 5123 4567 8901");
	});

	test("renders Bahasa Malaysia labels", () => {
		const out = renderPaymentInstructions("ms", {
			bankName: "Maybank",
			bankAccountNumber: "5123",
		});
		expect(out).toContain("💳 Maklumat pembayaran");
		expect(out).toContain("Bank: Maybank");
		expect(out).toContain("Akaun: 5123");
	});

	test("renders note even without bank fields (QR-only retailer)", () => {
		const out = renderPaymentInstructions("en", {
			qrImageStorageId: "kg:abc",
			note: "Scan the QR above to pay via DuitNow.",
		});
		expect(out).toContain("💳 Payment details");
		expect(out).toContain("Scan the QR above to pay via DuitNow.");
	});

	test("omits missing fields cleanly", () => {
		const out = renderPaymentInstructions("en", {
			bankName: "Maybank",
		});
		expect(out).toContain("Bank: Maybank");
		expect(out).not.toContain("Name:");
		expect(out).not.toContain("Account:");
	});

	test("trims whitespace inside fields", () => {
		const out = renderPaymentInstructions("en", {
			bankName: "  Maybank  ",
			bankAccountNumber: "\t5123\n",
		});
		expect(out).toContain("Bank: Maybank");
		expect(out).toContain("Account: 5123");
	});

	test("paymentQrCaption is locale-aware", () => {
		expect(paymentQrCaption("en")).toBe("Scan to pay");
		expect(paymentQrCaption("ms")).toBe("Imbas untuk bayar");
	});
});
