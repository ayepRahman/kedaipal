import { MessageCircle, Package, Store } from "lucide-react";
import { m } from "../../paraglide/messages";
import { FadeIn } from "./fade-in";

export function ProblemStrip() {
	const problems = [
		{
			icon: MessageCircle,
			title: m.problem_1_title(),
			body: m.problem_1_body(),
		},
		{
			icon: Package,
			title: m.problem_2_title(),
			body: m.problem_2_body(),
		},
		{
			icon: Store,
			title: m.problem_3_title(),
			body: m.problem_3_body(),
		},
	];
	return (
		<section
			aria-labelledby="problem-heading"
			className="border-b border-border/60 bg-muted/30"
		>
			<div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
				<h2
					id="problem-heading"
					className="mx-auto max-w-2xl text-center text-3xl font-bold tracking-tight md:text-5xl"
				>
					{m.problem_heading()}
				</h2>
				<div className="mt-14 grid gap-6 md:grid-cols-3">
					{problems.map((p, i) => (
						<FadeIn key={p.title} delay={i * 0.1} className="h-full">
							<div className="h-full rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md">
								<div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
									<p.icon className="size-5" />
								</div>
								<h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
								<p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
							</div>
						</FadeIn>
					))}
				</div>
			</div>
		</section>
	);
}
