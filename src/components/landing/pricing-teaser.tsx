import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useAuth } from "@clerk/tanstack-react-start";
import { Button } from "../ui/button";
import { m } from "../../paraglide/messages";

export function PricingTeaser() {
	const { isSignedIn } = useAuth();
	const includes = [
		m.pricing_include_1(),
		m.pricing_include_2(),
		m.pricing_include_3(),
		m.pricing_include_4(),
	];
	return (
		<section
			id="pricing"
			aria-labelledby="pricing-heading"
			className="border-b border-border/60 bg-muted/30"
		>
			<div className="mx-auto max-w-4xl px-5 py-20 md:px-8 md:py-28">
				<div className="rounded-3xl border border-accent/30 bg-gradient-to-br from-accent/5 to-background p-10 text-center shadow-sm md:p-16">
					<span className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
						<Sparkles className="size-3" />
						{m.pricing_badge()}
					</span>
					<h2
						id="pricing-heading"
						className="mt-4 text-3xl font-bold tracking-tight md:text-5xl"
					>
						{m.pricing_heading()}
					</h2>
					<p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
						{m.pricing_sub()}
					</p>
					<div className="mx-auto mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2">
						{includes.map((item) => (
							<div key={item} className="flex items-center gap-1.5 text-sm text-foreground">
								<Check className="size-4 text-accent" />
								{item}
							</div>
						))}
					</div>
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Button asChild size="lg" className="h-12 px-6 text-base">
							{isSignedIn ? (
								<Link to="/app">
									{m.nav_go_to_dashboard()}
									<ArrowRight />
								</Link>
							) : (
								<Link to="/sign-up/$" params={{ _splat: "" }}>
									{m.pricing_cta()}
									<ArrowRight />
								</Link>
							)}
						</Button>
					</div>
					<p className="mx-auto mt-4 max-w-md text-xs text-muted-foreground">
						{m.pricing_future()}
					</p>
				</div>
			</div>
		</section>
	);
}
