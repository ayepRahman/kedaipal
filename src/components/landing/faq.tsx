import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "../../lib/utils";
import { m } from "../../paraglide/messages";
import { Button } from "../ui/button";

export function Faq() {
	const [openIndex, setOpenIndex] = useState<number | null>(0);
	const faqItems = [
		{ q: m.faq_q_1(), a: m.faq_a_1() },
		{ q: m.faq_q_9(), a: m.faq_a_9() },
		{ q: m.faq_q_2(), a: m.faq_a_2() },
		{ q: m.faq_q_3(), a: m.faq_a_3() },
		{ q: m.faq_q_4(), a: m.faq_a_4() },
		{ q: m.faq_q_5(), a: m.faq_a_5() },
		{ q: m.faq_q_6(), a: m.faq_a_6() },
		{ q: m.faq_q_7(), a: m.faq_a_7() },
		{ q: m.faq_q_10(), a: m.faq_a_10() },
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
								<section
									id={panelId}
									aria-labelledby={buttonId}
									hidden={!isOpen}
									className="border-t border-border px-5 py-4 text-sm text-muted-foreground"
								>
									{item.a}
								</section>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
