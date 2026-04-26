import { Bell, Bookmark, History } from "lucide-react";
import { m } from "../../paraglide/messages";
import { FadeIn } from "./fade-in";

export function SlowYesStrip() {
	const items = [
		{
			icon: Bookmark,
			title: m.slow_yes_1_title(),
			body: m.slow_yes_1_body(),
			status: m.slow_yes_1_status(),
		},
		{
			icon: History,
			title: m.slow_yes_2_title(),
			body: m.slow_yes_2_body(),
			status: m.slow_yes_2_status(),
		},
		{
			icon: Bell,
			title: m.slow_yes_3_title(),
			body: m.slow_yes_3_body(),
			status: m.slow_yes_3_status(),
		},
	];
	return (
		<section
			aria-labelledby="slow-yes-heading"
			className="border-b border-border/60"
		>
			<div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
				<div className="mx-auto max-w-2xl text-center">
					<p className="text-xs font-semibold uppercase tracking-widest text-accent">
						{m.slow_yes_eyebrow()}
					</p>
					<h2
						id="slow-yes-heading"
						className="mt-3 text-3xl font-bold tracking-tight md:text-5xl"
					>
						{m.slow_yes_heading()}
					</h2>
					<p className="mt-4 text-lg text-muted-foreground">
						{m.slow_yes_sub()}
					</p>
				</div>
				<div className="mt-14 grid gap-6 md:grid-cols-3">
					{items.map((item, i) => (
						<FadeIn key={item.title} delay={i * 0.08} className="h-full">
							<div className="group flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0">
								<div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
									<item.icon className="size-5" />
								</div>
								<h3 className="mt-4 text-lg font-semibold">{item.title}</h3>
								<p className="mt-2 text-sm text-muted-foreground">
									{item.body}
								</p>
								<span className="mt-4 inline-flex w-fit items-center rounded-full border border-accent/30 bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
									{item.status}
								</span>
							</div>
						</FadeIn>
					))}
				</div>
			</div>
		</section>
	);
}
