import { cn } from "../../lib/utils";
import { Field, FieldDescription, FieldError, FieldLabel } from "../ui/field";
import { useFieldContext } from "./form";

interface TextareaFieldProps {
	label: string;
	placeholder?: string;
	required?: boolean;
	description?: string;
	rows?: number;
	disabled?: boolean;
}

export function TextareaField({
	label,
	placeholder,
	required = false,
	description,
	rows = 4,
	disabled = false,
}: TextareaFieldProps) {
	const field = useFieldContext<string>();
	const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;

	return (
		<Field data-invalid={isInvalid}>
			<FieldLabel htmlFor={field.name}>
				{label}
				{required ? <span className="ml-0.5 text-destructive">*</span> : null}
			</FieldLabel>
			<textarea
				id={field.name}
				name={field.name}
				rows={rows}
				disabled={disabled}
				placeholder={placeholder}
				value={field.state.value ?? ""}
				onChange={(e) => field.handleChange(e.target.value)}
				onBlur={() => field.handleBlur()}
				aria-invalid={isInvalid}
				className={cn(
					"min-h-24 resize-y rounded-xl border border-input bg-background px-4 py-3 text-base outline-none transition-colors",
					"focus:border-ring focus:ring-2 focus:ring-ring/50",
					"disabled:cursor-not-allowed disabled:opacity-60",
					isInvalid &&
						"border-destructive focus:border-destructive focus:ring-destructive/30",
				)}
			/>
			{description ? <FieldDescription>{description}</FieldDescription> : null}
			{isInvalid ? <FieldError errors={field.state.meta.errors} /> : null}
		</Field>
	);
}
