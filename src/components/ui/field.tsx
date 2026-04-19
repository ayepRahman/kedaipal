import { useMemo } from "react";
import { cn } from "../../lib/utils";

/**
 * Field primitives for form composition. Mirrors the Tessera/Casamarra
 * pattern: a wrapper, label, content, and error block — all driven by a
 * `data-invalid` attribute so styling stays declarative.
 */

interface FieldProps extends React.ComponentProps<"div"> {
	orientation?: "vertical" | "horizontal";
}

export function Field({
	className,
	orientation = "vertical",
	...props
}: FieldProps) {
	return (
		<div
			data-slot="field"
			data-orientation={orientation}
			className={cn(
				"flex flex-col gap-2",
				orientation === "horizontal" && "flex-row items-start gap-3",
				className,
			)}
			{...props}
		/>
	);
}

export function FieldLabel({
	className,
	...props
}: React.ComponentProps<"label">) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: generic label component — control is provided by callers
		<label
			data-slot="field-label"
			className={cn("text-sm font-medium", className)}
			{...props}
		/>
	);
}

export function FieldContent({
	className,
	...props
}: React.ComponentProps<"div">) {
	return (
		<div
			data-slot="field-content"
			className={cn("flex flex-1 flex-col gap-1", className)}
			{...props}
		/>
	);
}

export function FieldDescription({
	className,
	...props
}: React.ComponentProps<"p">) {
	return (
		<p
			data-slot="field-description"
			className={cn("text-xs text-muted-foreground", className)}
			{...props}
		/>
	);
}

interface FieldErrorProps extends React.ComponentProps<"div"> {
	errors?: ReadonlyArray<{ message?: string } | undefined>;
}

export function FieldError({
	className,
	children,
	errors,
	...props
}: FieldErrorProps) {
	const content = useMemo(() => {
		if (children) return children;
		if (!errors || errors.length === 0) return null;
		const messages = errors
			.map((e) => e?.message)
			.filter((m): m is string => Boolean(m));
		if (messages.length === 0) return null;
		if (messages.length === 1) return messages[0];
		return (
			<ul className="ml-4 flex list-disc flex-col gap-1">
				{messages.map((m) => (
					<li key={m}>{m}</li>
				))}
			</ul>
		);
	}, [children, errors]);

	if (!content) return null;

	return (
		<div
			role="alert"
			data-slot="field-error"
			className={cn("text-sm text-destructive", className)}
			{...props}
		>
			{content}
		</div>
	);
}
