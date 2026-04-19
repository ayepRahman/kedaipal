import { Quote } from "lucide-react";
import { m } from "../../paraglide/messages";
import { FadeIn } from "./fade-in";

export function SocialProof() {
	const testimonials = [
		{
			quote: m.testimonial_1_quote(),
			role: m.testimonial_1_role(),
			initial: "A",
		},
		{
			quote: m.testimonial_2_quote(),
			role: m.testimonial_2_role(),
			initial: "R",
		},
		{
			quote: m.testimonial_3_quote(),
			role: m.testimonial_3_role(),
			initial: "S",
		},
	];
	return (
		<section
			aria-labelledby="proof-heading"
			className="border-b border-border/60"
		>
			<div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
				<div className="mx-auto max-w-2xl text-center">
					<p className="text-xs font-semibold uppercase tracking-widest text-accent">
						{m.proof_label()}
					</p>
					<h2
						id="proof-heading"
						className="mt-3 text-3xl font-bold tracking-tight md:text-5xl"
					>
						{m.proof_heading()}
					</h2>
				</div>
				<div className="mt-14 grid gap-6 md:grid-cols-3">
					{testimonials.map((t, i) => (
						<FadeIn key={t.initial} delay={i * 0.1}>
							<div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
								<Quote className="size-6 text-accent/40" />
								<p className="mt-3 text-sm leading-relaxed text-foreground">
									{t.quote}
								</p>
								<div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
									<div className="flex size-9 items-center justify-center rounded-full bg-accent/10 text-sm font-bold text-accent">
										{t.initial}
									</div>
									<p className="text-xs text-muted-foreground">{t.role}</p>
								</div>
							</div>
						</FadeIn>
					))}
				</div>
				<p className="mt-6 text-center text-xs text-muted-foreground">
					{m.proof_disclaimer()}
				</p>
			</div>
		</section>
	);
}
