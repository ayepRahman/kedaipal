import { SignIn } from "@clerk/tanstack-react-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in/$")({
	component: SignInPage,
});

function SignInPage() {
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-md items-center justify-center px-5 py-12">
			<SignIn
				routing="path"
				path="/sign-in"
				signUpUrl="/sign-up"
				fallbackRedirectUrl="/app"
				forceRedirectUrl="/app"
			/>
		</main>
	);
}
