import { createFileRoute, Link } from "@tanstack/react-router";

const SEO_TITLE = "Privacy Policy — Kedaipal";
const SEO_DESC =
	"How Kedaipal collects, uses, and protects information from retailers and shoppers using our WhatsApp order hub.";
const SITE_URL = "https://kedaipal.com";
const PAGE_URL = `${SITE_URL}/privacy`;
const OG_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;
const LAST_UPDATED = "2026-04-09";

export const Route = createFileRoute("/privacy")({
	head: () => ({
		meta: [
			{ title: SEO_TITLE },
			{ name: "description", content: SEO_DESC },
			{ property: "og:type", content: "website" },
			{ property: "og:url", content: PAGE_URL },
			{ property: "og:title", content: SEO_TITLE },
			{ property: "og:description", content: SEO_DESC },
			{ property: "og:image", content: OG_IMAGE },
			{ name: "twitter:card", content: "summary_large_image" },
			{ name: "twitter:title", content: SEO_TITLE },
			{ name: "twitter:description", content: SEO_DESC },
			{ name: "twitter:image", content: OG_IMAGE },
		],
		links: [{ rel: "canonical", href: PAGE_URL }],
	}),
	component: PrivacyPage,
});

function PrivacyPage() {
	return (
		<main className="min-h-dvh bg-background text-foreground">
			<header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
				<div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5 md:px-8">
					<Link to="/" className="flex items-center">
						<img src="/logo-3.svg" alt="Kedaipal" className="h-9 w-auto" />
					</Link>
					<Link
						to="/"
						className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
					>
						← Back to home
					</Link>
				</div>
			</header>

			<article className="mx-auto max-w-3xl px-5 py-12 md:px-8 md:py-20">
				<h1 className="text-4xl font-bold tracking-tight md:text-5xl">
					Privacy Policy
				</h1>
				<p className="mt-3 text-sm text-muted-foreground">
					Last updated: {LAST_UPDATED}
				</p>

				<div className="mt-10 space-y-8 text-base leading-relaxed text-foreground/90">
					<section className="space-y-3">
						<p>
							This Privacy Policy explains how Kedaipal ("Kedaipal", "we",
							"our", or "us") collects, uses, and shares information when you
							use our services, including the retailer dashboard, hosted
							storefronts, and WhatsApp ordering flow (collectively, the
							"Service"). Kedaipal is currently in beta.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							1. Information We Collect
						</h2>
						<p>
							<strong>Retailer account information.</strong> When a retailer
							signs up, we collect name, email address, authentication
							identifiers (via Clerk), store name, store slug, WhatsApp number,
							and profile preferences.
						</p>
						<p>
							<strong>Catalog and order data.</strong> We store product
							information, inventory, and orders that retailers create or that
							are placed through our storefronts.
						</p>
						<p>
							<strong>Shopper information.</strong> When a shopper places an
							order, we collect the items ordered, the shopper's WhatsApp number
							(required for order confirmation), and any notes they include. We
							do not require shoppers to create an account.
						</p>
						<p>
							<strong>Messaging data.</strong> When messages are exchanged with
							the Kedaipal WhatsApp number, we process the message contents and
							associated metadata to deliver the ordering flow.
						</p>
						<p>
							<strong>Technical data.</strong> We collect basic technical
							information such as IP address, browser type, device type, and log
							data for security and debugging.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							2. How We Use Information
						</h2>
						<ul className="list-disc space-y-2 pl-6">
							<li>To operate and maintain the Service.</li>
							<li>To authenticate retailers and protect accounts.</li>
							<li>
								To process orders and send order confirmations and status
								updates via WhatsApp.
							</li>
							<li>
								To debug issues, monitor performance, and improve the Service.
							</li>
							<li>
								To communicate with retailers about the Service and beta
								changes.
							</li>
							<li>To comply with legal obligations.</li>
						</ul>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							3. How We Share Information
						</h2>
						<p>
							We do not sell personal information. We share information only
							with service providers that help us run the Service, including:
						</p>
						<ul className="list-disc space-y-2 pl-6">
							<li>
								<strong>Meta Platforms (WhatsApp Cloud API)</strong> — to send
								and receive WhatsApp messages.
							</li>
							<li>
								<strong>Convex</strong> — database and backend functions.
							</li>
							<li>
								<strong>Clerk</strong> — retailer authentication.
							</li>
							<li>
								<strong>Cloudflare</strong> — hosting, CDN, and DDoS protection.
							</li>
						</ul>
						<p>
							We may also disclose information if required by law, or to protect
							the rights, safety, or property of Kedaipal, our users, or others.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							4. Cookies and Similar Technologies
						</h2>
						<p>
							We use cookies and similar technologies that are strictly
							necessary to operate the Service, including authenticating
							retailer sessions and remembering cart contents on the storefront.
							We do not use advertising or cross-site tracking cookies.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							5. Data Retention
						</h2>
						<p>
							We retain retailer account data for as long as the account is
							active. Order and messaging data is retained as long as reasonably
							necessary to provide the Service and meet legal obligations. You
							may request deletion of your account at any time.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							6. Your Rights
						</h2>
						<p>
							Subject to applicable law, you may have the right to access,
							correct, delete, or export personal information we hold about you,
							and to object to or restrict certain processing. To exercise these
							rights, please contact us through the Service.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							7. Security
						</h2>
						<p>
							We use reasonable administrative, technical, and physical
							safeguards to protect information. No method of transmission or
							storage is 100% secure, and we cannot guarantee absolute security.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							8. Children's Privacy
						</h2>
						<p>
							The Service is not directed to children under 13, and we do not
							knowingly collect personal information from children under 13.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							9. International Transfers
						</h2>
						<p>
							Kedaipal operates from Malaysia and our service providers may
							process data in other countries. By using the Service, you consent
							to such transfers where permitted by law.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							10. Changes to This Policy
						</h2>
						<p>
							We may update this Privacy Policy from time to time. We will
							update the "Last updated" date at the top of this page when we do.
							Continued use of the Service after changes take effect means you
							accept the updated policy.
						</p>
					</section>

					<section className="space-y-3">
						<h2 className="text-2xl font-semibold tracking-tight">
							11. Contact
						</h2>
						<p>
							If you have questions about this Privacy Policy, please contact
							Kedaipal through our website.
						</p>
					</section>
				</div>
			</article>

			<footer className="border-t border-border/60 bg-background pb-[max(2rem,env(safe-area-inset-bottom))]">
				<div className="mx-auto max-w-3xl px-5 py-8 text-xs text-muted-foreground md:px-8">
					<p>
						© {new Date().getFullYear()} Kedaipal ·{" "}
						<Link to="/privacy" className="hover:text-foreground">
							Privacy
						</Link>{" "}
						·{" "}
						<Link to="/terms" className="hover:text-foreground">
							Terms
						</Link>
					</p>
				</div>
			</footer>
		</main>
	);
}
