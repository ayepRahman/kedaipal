import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
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
import { z } from "zod";
import { Button } from "../components/ui/button";
import { cn } from "../lib/utils";
import { m } from "../paraglide/messages";
import { getLocale, setLocale } from "../paraglide/runtime";

const SEO_TITLE = "Kedaipal — WhatsApp Order Hub for Small Retailers in Malaysia";
const SEO_DESC =
	"Turn WhatsApp into your order hub. Kedaipal lets small retailers launch a storefront, manage orders, and track inventory — free during beta, no code needed.";
const SITE_URL = "https://kedaipal.com";
const OG_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;

const jsonLd = [
	{
		"@context": "https://schema.org",
		"@type": "Organization",
		name: "Kedaipal",
		url: SITE_URL,
		logo: OG_IMAGE,
		description:
			"B2B SaaS order hub for small retailers. Start on WhatsApp, grow to Shopee, Lazada, and TikTok Shop — all from one dashboard.",
	},
	{
		"@context": "https://schema.org",
		"@type": "SoftwareApplication",
		name: "Kedaipal",
		applicationCategory: "BusinessApplication",
		operatingSystem: "Web",
		description: SEO_DESC,
		offers: {
			"@type": "Offer",
			price: "0",
			priceCurrency: "MYR",
			description: "Free during beta",
		},
	},
	{
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: [
			{
				"@type": "Question",
				name: "Do I need my own WhatsApp Business number?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "During the beta, you can share a test number we provide. When you're ready for production, you'll connect your own WhatsApp Business number through the Meta Cloud API.",
				},
			},
			{
				"@type": "Question",
				name: "Do I need a registered company?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "Not for the beta. For production WhatsApp Business API access, Meta eventually requires business verification, but we'll walk you through that when the time comes.",
				},
			},
			{
				"@type": "Question",
				name: "How are payments handled?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "For MVP, Kedaipal supports offline payment methods: cash on delivery, bank transfer, and e-wallet screenshots. Online payment integration is on the roadmap.",
				},
			},
			{
				"@type": "Question",
				name: "Is Kedaipal WhatsApp-only?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "No. WhatsApp is where most beta users start because it's the channel their customers already use every day. Shopee, Lazada, and TikTok Shop connectors are actively rolling out during beta.",
				},
			},
			{
				"@type": "Question",
				name: "Will pricing stay free forever?",
				acceptedAnswer: {
					"@type": "Answer",
					text: "No — Kedaipal will move to paid tiers after beta. Beta users get locked-in founder pricing as a thank-you.",
				},
			},
		],
	},
];

const searchSchema = z.object({
	step: z.coerce.number().int().min(1).max(4).optional(),
});

export const Route = createFileRoute("/")({
	validateSearch: searchSchema,
	head: () => ({
		meta: [
			{ title: SEO_TITLE },
			{ name: "description", content: SEO_DESC },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: SITE_URL },
			{ property: "og:title", content: SEO_TITLE },
			{ property: "og:description", content: SEO_DESC },
			{ property: "og:image", content: OG_IMAGE },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: SEO_TITLE },
			{ name: "twitter:description", content: SEO_DESC },
			{ name: "twitter:image", content: OG_IMAGE },
		],
		links: [{ rel: "canonical", href: SITE_URL }],
		scripts: [
			{
				type: "application/ld+json",
				children: JSON.stringify(jsonLd),
			},
		],
	}),
	component: Landing,
});

function Landing() {
	return (
		<main className="min-h-dvh bg-background text-foreground">
			<Nav />
			<Hero />
			<ProblemStrip />
			<HowItWorks />
			<SetupStrip />
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
				<a href="#top" className="flex items-center">
					<img src="/logo-3.svg" alt="Kedaipal" className="h-9 w-auto" />
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

const HOW_STEP_DETAILS = [
	{
		heading: "Customer sends a WhatsApp message",
		description:
			"Your customer messages your WhatsApp Business number. No app download, no account creation — just a regular chat they already know how to use.",
		preview: (
			<div className="space-y-2 rounded-xl bg-[#ECE5DD] p-4">
				<div className="max-w-[85%] self-start rounded-xl rounded-tl-sm bg-white px-3 py-2 text-xs text-slate-800 shadow-sm">
					Hi! Do you have the 40L hiking pack in stock?
				</div>
				<div className="flex justify-end">
					<div className="max-w-[85%] rounded-xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2 text-xs text-slate-800 shadow-sm">
						Yes! Browse our full catalog here 👇
					</div>
				</div>
			</div>
		),
	},
	{
		heading: "They browse your storefront",
		description:
			"Kedaipal sends a CTA button linking to your branded storefront at kedaipal.com/your-shop. Customers browse products, view photos, and check inventory — all on mobile.",
		preview: (
			<div className="space-y-3 rounded-xl border border-border bg-card p-4">
				<div className="flex items-center gap-3 border-b border-border pb-3">
					<div className="flex size-9 items-center justify-center rounded-lg bg-accent/10">
						<Store className="size-4 text-accent" />
					</div>
					<div>
						<p className="text-sm font-semibold">Kedai Outdoor</p>
						<p className="text-xs text-muted-foreground">kedaipal.com/kedai-outdoor</p>
					</div>
				</div>
				<div className="grid grid-cols-2 gap-2">
					{["40L Hiking Pack — RM 189", "Trekking Poles — RM 95"].map((item) => (
						<div key={item} className="rounded-lg border border-border bg-muted/40 p-2">
							<div className="mb-1.5 h-12 rounded bg-accent/10" />
							<p className="text-[11px] font-medium leading-tight">{item}</p>
						</div>
					))}
				</div>
			</div>
		),
	},
	{
		heading: "Customer adds to cart & sends order",
		description:
			"Customers add items to cart directly in the browser. When they checkout, Kedaipal crafts a WhatsApp deep-link message that sends the full order back to your chat — no payment gateway needed for MVP.",
		preview: (
			<div className="space-y-2 rounded-xl bg-[#ECE5DD] p-4">
				<div className="flex justify-end">
					<div className="max-w-[90%] rounded-xl rounded-tr-sm bg-[#DCF8C6] px-3 py-2 shadow-sm">
						<p className="text-[11px] font-bold text-slate-800">ORDER #KP-0147</p>
						<div className="mt-1 space-y-0.5 text-[10px] text-slate-700">
							<p>• 40L Hiking Pack × 1 — RM 189</p>
							<p>• Total: RM 189</p>
							<p>• Payment: Bank Transfer</p>
						</div>
					</div>
				</div>
				<div className="max-w-[85%] rounded-xl rounded-tl-sm bg-white px-3 py-2 text-xs text-slate-800 shadow-sm">
					✅ Got it! Order confirmed. We'll pack it today.
				</div>
			</div>
		),
	},
	{
		heading: "Automated status updates keep them informed",
		description:
			"As you update the order status in your dashboard (Confirmed → Packed → Shipped → Delivered), Kedaipal automatically messages the customer on WhatsApp. Zero manual follow-up.",
		preview: (
			<div className="space-y-2 rounded-xl bg-[#ECE5DD] p-4">
				{[
					{ label: "Order Confirmed", emoji: "✅", time: "2:14 PM" },
					{ label: "Packed & Ready", emoji: "📦", time: "4:30 PM" },
					{ label: "Out for Delivery", emoji: "🚚", time: "9:05 AM" },
				].map((msg) => (
					<div key={msg.label} className="flex items-start gap-2">
						<div className="max-w-[85%] rounded-xl rounded-tl-sm bg-white px-3 py-2 shadow-sm">
							<p className="text-[11px] font-semibold text-slate-800">
								{msg.emoji} {msg.label}
							</p>
							<p className="mt-0.5 text-[10px] text-slate-500">{msg.time}</p>
						</div>
					</div>
				))}
			</div>
		),
	},
];

function HowItWorks() {
	const { step } = useSearch({ from: "/" });
	const navigate = useNavigate({ from: "/" });
	const activeStep = step ?? null;

	const steps = [
		{ icon: MessageCircle, title: m.how_1_title(), body: m.how_1_body() },
		{ icon: Store, title: m.how_2_title(), body: m.how_2_body() },
		{ icon: ShoppingCart, title: m.how_3_title(), body: m.how_3_body() },
		{ icon: Bell, title: m.how_4_title(), body: m.how_4_body() },
	];

	function handleStepClick(stepNum: number) {
		navigate({
			search: (prev) => ({
				...prev,
				step: activeStep === stepNum ? undefined : stepNum,
			}),
			replace: true,
		});
	}

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
				<div className="mt-16 grid gap-4 md:grid-cols-4">
					{steps.map((s, i) => {
						const stepNum = i + 1;
						const isActive = activeStep === stepNum;
						return (
							<button
								key={s.title}
								type="button"
								onClick={() => handleStepClick(stepNum)}
								aria-pressed={isActive}
								aria-label={`Step ${stepNum}: ${s.title}`}
								className={cn(
									"relative rounded-2xl border p-5 text-left transition-all",
									"hover:border-accent/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
									isActive
										? "border-accent bg-accent/5 shadow-md"
										: "border-border bg-card shadow-sm",
								)}
							>
								<div
									className={cn(
										"flex size-12 items-center justify-center rounded-xl transition-colors",
										isActive
											? "bg-accent text-accent-foreground"
											: "bg-accent/10 text-accent",
									)}
								>
									<s.icon className="size-6" />
								</div>
								<div className="mt-4 flex items-center gap-2">
									<span
										className={cn(
											"text-xs font-bold",
											isActive ? "text-accent" : "text-muted-foreground",
										)}
									>
										0{stepNum}
									</span>
									<div
										className={cn(
											"h-px flex-1",
											isActive ? "bg-accent/40" : "bg-border",
										)}
									/>
								</div>
								<h3 className="mt-3 text-lg font-semibold">{s.title}</h3>
								<p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
								{isActive && (
									<div className="absolute bottom-3 right-3 size-2 rounded-full bg-accent" />
								)}
							</button>
						);
					})}
				</div>

				{activeStep !== null && HOW_STEP_DETAILS[activeStep - 1] && (
					<div className="mt-6 overflow-hidden rounded-2xl border border-accent/30 bg-card shadow-md">
						<div className="grid gap-0 md:grid-cols-2">
							<div className="flex flex-col justify-center gap-4 p-8">
								<span className="text-xs font-bold uppercase tracking-widest text-accent">
									Step {activeStep} of 4
								</span>
								<h3 className="text-2xl font-bold tracking-tight">
									{HOW_STEP_DETAILS[activeStep - 1].heading}
								</h3>
								<p className="text-base text-muted-foreground">
									{HOW_STEP_DETAILS[activeStep - 1].description}
								</p>
							</div>
							<div className="flex items-center justify-center border-t border-border/60 bg-muted/20 p-8 md:border-l md:border-t-0">
								{HOW_STEP_DETAILS[activeStep - 1].preview}
							</div>
						</div>
					</div>
				)}
			</div>
		</section>
	);
}

/* --------------------------- Setup Strip --------------------------- */

function SetupStrip() {
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
						<Link to="/sign-up/$" params={{ _splat: "" }}>
							{m.setup_cta()}
							<ArrowRight />
						</Link>
					</Button>
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
					<div className="flex items-center">
						<img src="/logo-3.svg" alt="Kedaipal" className="h-9 w-auto" />
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
