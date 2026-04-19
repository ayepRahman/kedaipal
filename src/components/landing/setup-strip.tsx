import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@clerk/tanstack-react-start";
import { Button } from "../ui/button";
import { m } from "../../paraglide/messages";

export function SetupStrip() {
	const { isSignedIn } = useAuth();
	const steps = [
		{ title: m.setup_step_1_title(), body: m.setup_step_1_body() },
		{ title: m.setup_step_2_title(), body: m.setup_step_2_body() },
		{ title: m.setup_step_3_title(), body: m.setup_step_3_body() },
	];
	return (
		<section
			aria-labelledby="setup-heading"
			className="border-b border-border/60"
		>
			<div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
				<div className="mx-auto max-w-2xl text-center">
					<p className="text-xs font-semibold uppercase tracking-widest text-accent">
						{m.setup_label()}
					</p>
					<h2
						id="setup-heading"
						className="mt-3 text-3xl font-bold tracking-tight md:text-5xl"
					>
						{m.setup_heading()}
					</h2>
					<p className="mt-4 text-base text-muted-foreground md:text-lg">
						{m.setup_sub()}
					</p>
				</div>
				<div className="relative mt-14 grid gap-8 md:grid-cols-3">
					{steps.map((s, i) => (
						<div key={s.title} className="flex flex-col gap-4">
							<div className="flex items-center gap-3">
								<div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-sm font-bold text-accent-foreground">
									{i + 1}
								</div>
								{i < steps.length - 1 && (
									<div className="hidden h-px flex-1 bg-accent/20 md:block" />
								)}
							</div>
							<h3 className="text-lg font-semibold">{s.title}</h3>
							<p className="text-sm text-muted-foreground">{s.body}</p>
						</div>
					))}
				</div>
				<div className="mt-12 flex justify-center">
					<Button asChild size="lg" className="h-12 px-8 text-base">
						{isSignedIn ? (
							<Link to="/app">
								{m.nav_go_to_dashboard()}
								<ArrowRight />
							</Link>
						) : (
							<Link to="/sign-up/$" params={{ _splat: "" }}>
								{m.setup_cta()}
								<ArrowRight />
							</Link>
						)}
					</Button>
				</div>
			</div>
		</section>
	);
}
