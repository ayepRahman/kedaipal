import { motion } from "framer-motion";

export function PageLoader() {
	return (
		<div className="flex min-h-dvh items-center justify-center bg-background">
			<motion.img
				src="/logo-3.svg"
				alt="Kedaipal"
				className="h-10"
				animate={{ scale: [0.9, 1.1, 0.9] }}
				transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
			/>
		</div>
	);
}
