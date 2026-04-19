import { useAuth } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { m } from "../../paraglide/messages";
import { Button } from "../ui/button";

export function FinalCta() {
	const { isSignedIn } = useAuth();
	return (
		<section
			aria-labelledby="final-cta-heading"
			className="border-b border-border/60 bg-primary text-primary-foreground"
		>
			<div className="mx-auto max-w-4xl px-5 py-20 text-center md:px-8 md:py-28">
				<h2
					id="final-cta-heading"
					className="text-3xl font-bold tracking-tight md:text-5xl"
				>
					{m.final_heading()}
				</h2>
				<p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/70">
					{m.final_sub()}
				</p>
				<div className="mt-8 flex justify-center">
					<Button asChild size="lg" className="h-12 px-8 text-base">
						{isSignedIn ? (
							<Link to="/app">
								{m.nav_go_to_dashboard()}
								<ArrowRight />
							</Link>
						) : (
							<Link to="/sign-up/$" params={{ _splat: "" }}>
								{m.final_cta()}
								<ArrowRight />
							</Link>
						)}
					</Button>
				</div>
			</div>
		</section>
	);
}
