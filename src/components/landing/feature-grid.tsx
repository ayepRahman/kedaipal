import {
	BarChart3,
	BellRing,
	MessageCircle,
	Package,
	Sparkles,
	Store,
	Truck,
} from "lucide-react";
import { m } from "../../paraglide/messages";
import { FadeIn } from "./fade-in";

export function FeatureGrid() {
	const features = [
		{
			icon: MessageCircle,
			title: m.feature_2_title(),
			body: m.feature_2_body(),
		},
		{
			icon: BellRing,
			title: m.feature_7_title(),
			body: m.feature_7_body(),
		},
		{
			icon: BarChart3,
			title: m.feature_3_title(),
			body: m.feature_3_body(),
		},
		{ icon: Store, title: m.feature_1_title(), body: m.feature_1_body() },
		{ icon: Package, title: m.feature_4_title(), body: m.feature_4_body() },
		{ icon: Truck, title: m.feature_5_title(), body: m.feature_5_body() },
		{
			icon: Sparkles,
			title: m.feature_6_title(),
			body: m.feature_6_body(),
		},
	];
	return (
		<section
			id="features"
			aria-labelledby="features-heading"
			className="border-b border-border/60 bg-muted/30"
		>
			<div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
				<div className="mx-auto max-w-2xl text-center">
					<p className="text-xs font-semibold uppercase tracking-widest text-accent">
						{m.features_label()}
					</p>
					<h2
						id="features-heading"
						className="mt-3 text-3xl font-bold tracking-tight md:text-5xl"
					>
						{m.features_heading()}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						{m.features_sub()}
					</p>
				</div>
				<div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
					{features.map((f, i) => (
						<FadeIn key={f.title} delay={i * 0.08}>
							<div className="group h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0">
								<div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
									<f.icon className="size-5" />
								</div>
								<h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
								<p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
							</div>
						</FadeIn>
					))}
				</div>
			</div>
		</section>
	);
}
