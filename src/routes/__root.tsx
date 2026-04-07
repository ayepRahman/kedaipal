import { ClerkProvider, useAuth } from "@clerk/tanstack-react-start";
import { TanStackDevtools } from "@tanstack/react-devtools";
import {
	createRootRoute,
	HeadContent,
	Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { getConvexClient } from "../lib/convex";
import { clientEnv } from "../lib/env";
import appCss from "../styles.css?url";

export const Route = createRootRoute({
	head: () => ({
		meta: [
			{ charSet: "utf-8" },
			{
				name: "viewport",
				content:
					"width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover",
			},
			{ name: "theme-color", content: "#0F172A" },
			{ title: "Kedaipal — Order Hub for Small Retailers" },
		],
		links: [{ rel: "stylesheet", href: appCss }],
	}),
	shellComponent: RootDocument,
});

function Providers({ children }: { children: React.ReactNode }) {
	const publishableKey = clientEnv.VITE_CLERK_PUBLISHABLE_KEY;
	if (!publishableKey || !clientEnv.VITE_CONVEX_URL) {
		return <SetupNotice />;
	}
	const convex = getConvexClient();
	return (
		<ClerkProvider publishableKey={publishableKey}>
			<ConvexProviderWithClerk client={convex} useAuth={useAuth}>
				{children}
			</ConvexProviderWithClerk>
		</ClerkProvider>
	);
}

function SetupNotice() {
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-4 px-5 text-sm text-foreground">
			<h1 className="text-2xl font-bold">Setup required</h1>
			<p className="text-muted-foreground">
				Missing env vars. Copy <code>.env.local.example</code> to{" "}
				<code>.env.local</code> and fill in Convex + Clerk keys.
			</p>
			<ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
				<li>
					<code>pnpm dlx convex dev</code> — provisions Convex deployment and
					writes <code>VITE_CONVEX_URL</code>.
				</li>
				<li>
					Create a Clerk app at dashboard.clerk.com and paste the publishable
					key into <code>VITE_CLERK_PUBLISHABLE_KEY</code>.
				</li>
				<li>
					In Clerk, add a JWT template named <code>convex</code> and connect it
					from the Convex dashboard.
				</li>
			</ol>
		</main>
	);
}

function RootDocument({ children }: { children: React.ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<HeadContent />
			</head>
			<body className="min-h-dvh bg-background font-sans text-foreground antialiased">
				<Providers>{children}</Providers>
				<TanStackDevtools
					config={{ position: "bottom-right" }}
					plugins={[
						{
							name: "Tanstack Router",
							render: <TanStackRouterDevtoolsPanel />,
						},
					]}
				/>
				<Scripts />
			</body>
		</html>
	);
}
