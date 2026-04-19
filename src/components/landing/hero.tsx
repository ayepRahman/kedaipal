import { useAuth } from "@clerk/tanstack-react-start";
import { Link } from "@tanstack/react-router";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowRight, Bell, Sparkles, Store } from "lucide-react";
import { m } from "../../paraglide/messages";
import { Button } from "../ui/button";

function PhoneMockup() {
	const shouldReduceMotion = useReducedMotion();

	if (shouldReduceMotion) {
		return <PhoneMockupContent />;
	}

	return (
		<motion.div
			animate={{ y: [0, -8, 0] }}
			transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" as const }}
		>
			<PhoneMockupContent />
		</motion.div>
	);
}

function PhoneMockupContent() {
	return (
		<div className="relative" role="img" aria-label={m.hero_phone_alt()}>
			<div className="relative h-[560px] w-[280px] rounded-[2.5rem] border-8 border-foreground/90 bg-foreground shadow-2xl motion-reduce:shadow-xl">
				<div className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-foreground" />
				<div className="relative flex h-full w-full flex-col overflow-hidden rounded-[2rem] bg-[#ECE5DD]">
					{/* WhatsApp header */}
					<div className="flex items-center gap-3 bg-[#128C7E] px-4 py-3 pt-8 text-white">
						<div className="flex size-9 items-center justify-center rounded-full bg-white/20 text-sm font-bold">
							K
						</div>
						<div className="flex-1">
							<p className="text-sm font-semibold">{m.phone_store_name()}</p>
							<p className="text-[10px] text-white/80">
								{m.phone_store_status()}
							</p>
						</div>
					</div>

					{/* Chat body */}
					<div className="flex flex-1 flex-col gap-2 p-3">
						<div className="max-w-[85%] self-start rounded-xl rounded-tl-sm bg-white px-3 py-2 text-xs text-slate-800 shadow-sm">
							{m.phone_chat_1()}
						</div>
						<div className="max-w-[85%] self-end rounded-xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2 text-xs text-slate-800 shadow-sm">
							{m.phone_chat_2()}
						</div>
						<div className="max-w-[85%] self-end rounded-xl rounded-tr-sm bg-white px-3 py-2 shadow-sm">
							<div className="flex items-center gap-2 border-b border-slate-200 pb-2">
								<div className="flex size-8 items-center justify-center rounded bg-accent/20">
									<Store className="size-4 text-accent" />
								</div>
								<div className="flex-1">
									<p className="text-[11px] font-semibold text-slate-800">
										{m.phone_store_name()}
									</p>
									<p className="text-[9px] text-slate-500">
										{m.phone_store_url()}
									</p>
								</div>
							</div>
							<p className="pt-2 text-[10px] font-semibold text-accent">
								{m.phone_store_cta()}
							</p>
						</div>
						<div className="max-w-[85%] self-start rounded-xl rounded-tl-sm bg-white px-3 py-2 text-xs text-slate-800 shadow-sm">
							{m.phone_chat_3()}
						</div>
						<div className="max-w-[90%] self-end rounded-xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2 shadow-sm">
							<p className="text-[11px] font-bold text-slate-800">
								{m.phone_order_id()}
							</p>
							<div className="mt-1 space-y-0.5 text-[10px] text-slate-700">
								<p>• {m.phone_order_item()}</p>
								<p>• {m.phone_order_total()}</p>
							</div>
							<p className="mt-1 text-[9px] font-semibold text-[#128C7E]">
								{m.phone_order_status()}
							</p>
						</div>
					</div>
				</div>
			</div>
			{/* Floating accent badge */}
			<div className="absolute -right-4 top-24 hidden rounded-xl border border-border bg-card px-3 py-2 shadow-lg md:block motion-reduce:transform-none">
				<div className="flex items-center gap-2">
					<Bell className="size-4 text-accent" />
					<span className="text-xs font-semibold">{m.hero_phone_badge()}</span>
				</div>
			</div>
		</div>
	);
}

export function Hero() {
	const { isSignedIn } = useAuth();
	return (
		<section
			id="top"
			className="relative overflow-hidden border-b border-border/60"
		>
			<div className="absolute inset-0 -z-10 bg-gradient-to-b from-accent/5 via-background to-background" />
			<div className="mx-auto grid max-w-6xl gap-12 px-5 py-20 md:grid-cols-2 md:gap-16 md:px-8 md:py-32 md:pb-28">
				<div className="flex flex-col justify-center gap-6">
					<span className="inline-flex w-fit items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-accent">
						<Sparkles className="size-3" />
						{m.hero_badge()}
					</span>
					<h1 className="text-5xl font-bold leading-[1.05] tracking-tight md:text-7xl">
						{m.hero_headline_part1()}{" "}
						<span className="text-accent">{m.hero_headline_part2()}</span>
					</h1>
					<p className="max-w-xl text-lg text-muted-foreground md:text-xl">
						{m.hero_subhead()}
					</p>
					<div className="flex flex-col gap-3 pt-2 sm:flex-row">
						{isSignedIn ? (
							<Button asChild size="lg" className="h-12 px-6 text-base">
								<Link to="/app">
									{m.nav_go_to_dashboard()}
									<ArrowRight />
								</Link>
							</Button>
						) : (
							<Button asChild size="lg" className="h-12 px-6 text-base">
								<Link to="/sign-up/$" params={{ _splat: "" }}>
									{m.hero_cta_primary()}
									<ArrowRight />
								</Link>
							</Button>
						)}
						<Button
							asChild
							variant="outline"
							size="lg"
							className="h-12 px-6 text-base"
						>
							<a href="#how">{m.hero_cta_secondary()}</a>
						</Button>
					</div>
					<p className="text-sm text-muted-foreground">{m.hero_trust()}</p>
				</div>
				<div className="flex items-center justify-center">
					<PhoneMockup />
				</div>
			</div>
		</section>
	);
}
