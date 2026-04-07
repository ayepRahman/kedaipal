import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({ component: Landing });

function Landing() {
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-stretch gap-6 px-5 pb-[env(safe-area-inset-bottom)] pt-12">
			<header className="flex flex-col gap-2">
				<p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
					Kedaipal
				</p>
				<h1 className="text-3xl font-bold leading-tight text-neutral-900">
					Order hub for small retailers.
				</h1>
				<p className="text-sm text-neutral-600">
					WhatsApp-first commerce. One dashboard for every channel.
				</p>
			</header>
			<section className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-sm text-neutral-700">
				Project scaffold ready. Features coming soon.
			</section>
		</main>
	);
}
