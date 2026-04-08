import { createFileRoute, Link } from "@tanstack/react-router";
import {
	ArrowRight,
	BarChart3,
	Bell,
	ChevronDown,
	Globe,
	MessageCircle,
	Package,
	ShoppingCart,
	Sparkles,
	Store,
	Truck,
} from "lucide-react";
import { useState } from "react";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { m } from "../paraglide/messages";
import { getLocale, setLocale } from "../paraglide/runtime";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
	return (
		<main className="min-h-dvh bg-background text-foreground">
			<Nav />
			<Hero />
			<ProblemStrip />
			<HowItWorks />
			<FeatureGrid />
	
			<PricingTeaser />
			<Faq />
			<FinalCta />
			<Footer />
		</main>
	);
}

/* ------------------------------ Nav ------------------------------ */

function Nav() {
	return (
		<nav className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
			<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 md:px-8">
				<a href="#top" className="flex items-center gap-2">
					<span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
						<Store className="size-4" />
					</span>
					<span className="text-lg font-bold tracking-tight">Kedaipal</span>
				</a>
				<div className="hidden items-center gap-8 md:flex">
					<a
						href="#features"
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						{m.nav_features()}
					</a>
					<a
						href="#how"
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						{m.nav_how()}
					</a>
					<a
						href="#pricing"
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						{m.nav_pricing()}
					</a>
					<a
						href="#faq"
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						{m.nav_faq()}
					</a>
				</div>
				<div className="flex items-center gap-2">
					<LanguageSwitcher />
					<Button asChild variant="ghost" size="lg" className="hidden md:inline-flex">
						<Link to="/sign-in/$" params={{ _splat: "" }}>
							{m.nav_sign_in()}
						</Link>
					</Button>
					<Button asChild size="lg">
						<Link to="/sign-up/$" params={{ _splat: "" }}>
							{m.nav_start_free()}
						</Link>
					</Button>
				</div>
			</div>
		</nav>
	);
}

/* -------------------------- Language Switcher -------------------------- */

function LanguageSwitcher() {
	const current = getLocale();
	const next = current === "ms" ? "en" : "ms";
	return (
		<Button
			type="button"
			variant="ghost"
			size="lg"
			onClick={() => setLocale(next)}
			aria-label={m.lang_switcher_label()}
		>
			<Globe />
			<span className="hidden sm:inline">
				{current === "ms" ? "EN" : "BM"}
			</span>
		</Button>
	);
}

/* ------------------------------ Hero ------------------------------ */

function Hero() {
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
						<Button asChild size="lg" className="h-12 px-6 text-base">
							<Link to="/sign-up/$" params={{ _splat: "" }}>
								{m.hero_cta_primary()}
								<ArrowRight />
							</Link>
						</Button>
						<Button asChild variant="outline" size="lg" className="h-12 px-6 text-base">
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

/* -------------------------- Phone Mockup -------------------------- */

function PhoneMockup() {
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
							<p className="text-sm font-semibold">Kedai Outdoor</p>
							<p className="text-[10px] text-white/80">online</p>
						</div>
					</div>

					{/* Chat body — hardcoded as a visual product example */}
					<div className="flex flex-1 flex-col gap-2 p-3">
						<div className="max-w-[85%] self-start rounded-xl rounded-tl-sm bg-white px-3 py-2 text-xs text-slate-800 shadow-sm">
							Hi! Do you have the 40L hiking pack in stock?
						</div>
						<div className="max-w-[85%] self-end rounded-xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2 text-xs text-slate-800 shadow-sm">
							Yes! Browse our full catalog here 👇
						</div>
						<div className="max-w-[85%] self-end rounded-xl rounded-tr-sm bg-white px-3 py-2 shadow-sm">
							<div className="flex items-center gap-2 border-b border-slate-200 pb-2">
								<div className="flex size-8 items-center justify-center rounded bg-accent/20">
									<Store className="size-4 text-accent" />
								</div>
								<div className="flex-1">
									<p className="text-[11px] font-semibold text-slate-800">
										Kedai Outdoor
									</p>
									<p className="text-[9px] text-slate-500">
										kedaipal.com/kedai-outdoor
									</p>
								</div>
							</div>
							<p className="pt-2 text-[10px] font-semibold text-accent">
								Open storefront →
							</p>
						</div>
						<div className="max-w-[85%] self-start rounded-xl rounded-tl-sm bg-white px-3 py-2 text-xs text-slate-800 shadow-sm">
							Got it, added the 40L pack to cart 🎒
						</div>
						<div className="max-w-[90%] self-end rounded-xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2 shadow-sm">
							<p className="text-[11px] font-bold text-slate-800">
								Order #KP-0147 confirmed
							</p>
							<div className="mt-1 space-y-0.5 text-[10px] text-slate-700">
								<p>• 40L Hiking Pack × 1</p>
								<p>• Total: RM 189</p>
							</div>
							<p className="mt-1 text-[9px] font-semibold text-[#128C7E]">
								Status: Packing 📦
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

/* --------------------------- Problem Strip --------------------------- */

function ProblemStrip() {
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
					{problems.map((p) => (
						<div
							key={p.title}
							className="rounded-2xl border border-border bg-card p-6 shadow-sm transition-shadow hover:shadow-md"
						>
							<div className="flex size-11 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
								<p.icon className="size-5" />
							</div>
							<h3 className="mt-4 text-lg font-semibold">{p.title}</h3>
							<p className="mt-2 text-sm text-muted-foreground">{p.body}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

/* --------------------------- How It Works --------------------------- */

function HowItWorks() {
	const steps = [
		{
			icon: MessageCircle,
			title: m.how_1_title(),
			body: m.how_1_body(),
		},
		{
			icon: Store,
			title: m.how_2_title(),
			body: m.how_2_body(),
		},
		{
			icon: ShoppingCart,
			title: m.how_3_title(),
			body: m.how_3_body(),
		},
		{
			icon: Bell,
			title: m.how_4_title(),
			body: m.how_4_body(),
		},
	];
	return (
		<section
			id="how"
			aria-labelledby="how-heading"
			className="border-b border-border/60"
		>
			<div className="mx-auto max-w-6xl px-5 py-20 md:px-8 md:py-28">
				<div className="mx-auto max-w-2xl text-center">
					<p className="text-xs font-semibold uppercase tracking-widest text-accent">
						{m.how_label()}
					</p>
					<h2
						id="how-heading"
						className="mt-3 text-3xl font-bold tracking-tight md:text-5xl"
					>
						{m.how_heading()}
					</h2>
					<p className="mt-4 text-base text-muted-foreground md:text-lg">
						{m.how_sub()}
					</p>
				</div>
				<div className="mt-16 grid gap-8 md:grid-cols-4">
					{steps.map((s, i) => (
						<div key={s.title} className="relative">
							<div className="flex size-12 items-center justify-center rounded-xl bg-accent/10 text-accent">
								<s.icon className="size-6" />
							</div>
							<div className="mt-4 flex items-center gap-2">
								<span className="text-xs font-bold text-muted-foreground">
									0{i + 1}
								</span>
								<div className="h-px flex-1 bg-border" />
							</div>
							<h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
							<p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

/* --------------------------- Feature Grid --------------------------- */

function FeatureGrid() {
	const features = [
		{ icon: Store, title: m.feature_1_title(), body: m.feature_1_body() },
		{
			icon: MessageCircle,
			title: m.feature_2_title(),
			body: m.feature_2_body(),
		},
		{
			icon: BarChart3,
			title: m.feature_3_title(),
			body: m.feature_3_body(),
		},
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
					{features.map((f) => (
						<div
							key={f.title}
							className="group rounded-2xl border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md motion-reduce:hover:translate-y-0"
						>
							<div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
								<f.icon className="size-5" />
							</div>
							<h3 className="mt-4 text-lg font-semibold">{f.title}</h3>
							<p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
						</div>
					))}
				</div>
			</div>
		</section>
	);
}

/* --------------------------- Social Proof --------------------------- */

function SocialProof() {
	const testimonials = [
		{
			quote: m.testimonial_1_quote(),
			name: "Hafiz",
			role: m.testimonial_1_role(),
		},
		{
			quote: m.testimonial_2_quote(),
			name: "Mei Ling",
			role: m.testimonial_2_role(),
		},
		{
			quote: m.testimonial_3_quote(),
			name: "Ravi",
			role: m.testimonial_3_role(),
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
					<p className="mt-3 text-xs text-muted-foreground">
						{m.proof_disclaimer()}
					</p>
				</div>
				<div className="mt-14 grid gap-6 md:grid-cols-3">
					{testimonials.map((t) => (
						<figure
							key={t.name}
							className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-6 shadow-sm"
						>
							<blockquote className="text-base leading-relaxed text-foreground">
								"{t.quote}"
							</blockquote>
							<figcaption className="mt-auto flex items-center gap-3 border-t border-border pt-4">
								<div className="flex size-10 items-center justify-center rounded-full bg-accent/20 text-sm font-bold text-accent">
									{t.name[0]}
								</div>
								<div>
									<p className="text-sm font-semibold">{t.name}</p>
									<p className="text-xs text-muted-foreground">{t.role}</p>
								</div>
							</figcaption>
						</figure>
					))}
				</div>
			</div>
		</section>
	);
}

/* --------------------------- Pricing Teaser --------------------------- */

function PricingTeaser() {
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
					<div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
						<Button asChild size="lg" className="h-12 px-6 text-base">
							<Link to="/sign-up/$" params={{ _splat: "" }}>
								{m.pricing_cta()}
								<ArrowRight />
							</Link>
						</Button>
					</div>
				</div>
			</div>
		</section>
	);
}

/* --------------------------------- FAQ --------------------------------- */

function Faq() {
	const [openIndex, setOpenIndex] = useState<number | null>(0);
	const faqItems = [
		{ q: m.faq_q_1(), a: m.faq_a_1() },
		{ q: m.faq_q_2(), a: m.faq_a_2() },
		{ q: m.faq_q_3(), a: m.faq_a_3() },
		{ q: m.faq_q_4(), a: m.faq_a_4() },
		{ q: m.faq_q_5(), a: m.faq_a_5() },
		{ q: m.faq_q_6(), a: m.faq_a_6() },
		{ q: m.faq_q_7(), a: m.faq_a_7() },
		{ q: m.faq_q_8(), a: m.faq_a_8() },
	];
	return (
		<section
			id="faq"
			aria-labelledby="faq-heading"
			className="border-b border-border/60"
		>
			<div className="mx-auto max-w-3xl px-5 py-20 md:px-8 md:py-28">
				<div className="text-center">
					<p className="text-xs font-semibold uppercase tracking-widest text-accent">
						{m.faq_label()}
					</p>
					<h2
						id="faq-heading"
						className="mt-3 text-3xl font-bold tracking-tight md:text-5xl"
					>
						{m.faq_heading()}
					</h2>
				</div>
				<div className="mt-12 space-y-3">
					{faqItems.map((item, i) => {
						const isOpen = openIndex === i;
						const panelId = `faq-panel-${i}`;
						const buttonId = `faq-button-${i}`;
						return (
							<div
								key={item.q}
								className="overflow-hidden rounded-xl border border-border bg-card shadow-sm"
							>
								<Button
									type="button"
									variant="ghost"
									id={buttonId}
									aria-expanded={isOpen}
									aria-controls={panelId}
									onClick={() => setOpenIndex(isOpen ? null : i)}
									className="h-auto w-full justify-between gap-4 rounded-none px-5 py-4 text-left text-base font-semibold"
								>
									<span>{item.q}</span>
									<ChevronDown
										className={cn(
											"size-5 shrink-0 text-muted-foreground transition-transform duration-200 motion-reduce:transition-none",
											isOpen && "rotate-180",
										)}
									/>
								</Button>
								<div
									id={panelId}
									role="region"
									aria-labelledby={buttonId}
									hidden={!isOpen}
									className="border-t border-border px-5 py-4 text-sm text-muted-foreground"
								>
									{item.a}
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}

/* ------------------------------ Final CTA ------------------------------ */

function FinalCta() {
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
						<Link to="/sign-up/$" params={{ _splat: "" }}>
							{m.final_cta()}
							<ArrowRight />
						</Link>
					</Button>
				</div>
			</div>
		</section>
	);
}

/* ------------------------------ Footer ------------------------------ */

function Footer() {
	return (
		<footer className="border-border/60 bg-background pb-[max(2rem,env(safe-area-inset-bottom))]">
			<div className="mx-auto max-w-6xl px-5 py-12 md:px-8">
				<div className="flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
					<div className="flex items-center gap-2">
						<span className="flex size-8 items-center justify-center rounded-lg bg-accent text-accent-foreground">
							<Store className="size-4" />
						</span>
						<span className="text-lg font-bold tracking-tight">Kedaipal</span>
					</div>
				</div>
				<div className="mt-8 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
					<p>{m.footer_copyright({ year: new Date().getFullYear() })}</p>
					<p>{m.footer_tagline()}</p>
				</div>
			</div>
		</footer>
	);
}
