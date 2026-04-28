import { type CheckoutAddressValues, MY_STATES } from "../../lib/schemas";
import { withFieldGroup } from "../forms/form";

const stateOptions = [
	{ value: "", label: "Select state…" },
	...MY_STATES.map((s) => ({ value: s, label: s })),
];

/**
 * Reusable address sub-form. Mounts at any `address` field on a parent form
 * whose value matches `CheckoutAddressValues`. Used by the storefront checkout
 * sheet today; the tracking-page edit dialog (Phase 3) reuses it as-is.
 *
 * Layout is mobile-first: single column on small screens, postcode + city
 * side-by-side from `sm` upward where there's room.
 */
export const AddressFieldset = withFieldGroup({
	defaultValues: {
		line1: "",
		line2: "",
		city: "",
		state: "",
		postcode: "",
		notes: "",
		mapsUrl: "",
	} satisfies CheckoutAddressValues,
	render: ({ group }) => (
		<fieldset className="flex flex-col gap-3 rounded-xl border border-border bg-card/40 p-4">
			<legend className="px-1 text-sm font-medium">Delivery address</legend>

			<group.AppField name="line1">
				{(field) => (
					<field.TextField
						label="Address line 1"
						placeholder="12 Jln Mawar 3, Taman Mawar"
						autoComplete="address-line1"
						required
					/>
				)}
			</group.AppField>

			<group.AppField name="line2">
				{(field) => (
					<field.TextField
						label="Address line 2 (optional)"
						placeholder="Unit, building, floor"
						autoComplete="address-line2"
					/>
				)}
			</group.AppField>

			<div className="grid grid-cols-2 gap-3">
				<group.AppField name="postcode">
					{(field) => (
						<field.TextField
							label="Postcode"
							placeholder="47301"
							inputMode="numeric"
							autoComplete="postal-code"
							required
						/>
					)}
				</group.AppField>

				<group.AppField name="city">
					{(field) => (
						<field.TextField
							label="City"
							placeholder="Petaling Jaya"
							autoComplete="address-level2"
							required
						/>
					)}
				</group.AppField>
			</div>

			<group.AppField name="state">
				{(field) => (
					<field.SelectField label="State" options={stateOptions} required />
				)}
			</group.AppField>

			<group.AppField name="notes">
				{(field) => (
					<field.TextareaField
						label="Delivery notes (optional)"
						placeholder="Landmark, gate code, courier instructions"
						rows={2}
					/>
				)}
			</group.AppField>

			<group.AppField name="mapsUrl">
				{(field) => (
					<field.TextField
						label="Google Maps / Waze link (optional)"
						placeholder="https://maps.app.goo.gl/…"
						type="url"
						inputMode="url"
						description="Paste a pin link to remove ambiguity for the courier."
					/>
				)}
			</group.AppField>
		</fieldset>
	),
});
