import { CopyIcon, SparklesIcon } from "lucide-react";
import { useState } from "react";
import { Button } from "~/components/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "~/components/dialog";
import { Textarea } from "~/components/textarea";
import type { LintIssue } from "../core/types";
import { createFigmaAgentPrompt } from "./figma-agent-prompt";
import type { Messages } from "./i18n";
import { post } from "./post";

export function FigmaAgentRepair({
	issues,
	targetId,
	targetName,
	t,
}: {
	issues: LintIssue[];
	targetId: string;
	targetName: string;
	t: Messages;
}) {
	const [isOpen, setIsOpen] = useState(false);
	const prompt = createFigmaAgentPrompt({ issues, targetName, t });

	const openPrompt = () => {
		post({ type: "select-node", nodeId: targetId });
		setIsOpen(true);
	};

	const copyPrompt = () => {
		post(
			copyWithExecCommand(prompt)
				? { type: "notify", message: t.agentPromptCopied }
				: {
						type: "notify",
						message: t.agentPromptCopyFailed,
						error: true,
					},
		);
	};

	return (
		<>
			<Button
				aria-label={t.fixWithFigmaAgent}
				title={t.fixWithFigmaAgent}
				size="icon"
				variant="outline"
				className="text-muted-foreground"
				onClick={openPrompt}
			>
				<SparklesIcon aria-hidden="true" />
			</Button>
			<Dialog open={isOpen} onOpenChange={setIsOpen}>
				<DialogContent className="h-[min(32rem,calc(100dvh-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-hidden">
					<DialogHeader>
						<DialogTitle>{t.agentPrompt}</DialogTitle>
						<DialogDescription>
							{t.figmaAgentRepairDescription}
						</DialogDescription>
					</DialogHeader>
					<Textarea
						readOnly
						value={prompt}
						rows={12}
						className="field-sizing-fixed h-full min-h-0 resize-none overflow-auto text-xs leading-5"
						onFocus={(event) => event.currentTarget.select()}
					/>
					<DialogFooter>
						<Button onClick={copyPrompt}>
							<CopyIcon data-icon="inline-start" aria-hidden="true" />
							<span>{t.copyAgentPrompt}</span>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
}

function copyWithExecCommand(text: string): boolean {
	// ponytail: deprecated API until Figma provides native clipboard writes;
	// Clipboard API access is not reliable in Figma's plugin UI.
	const field = document.createElement("textarea");
	field.value = text;
	field.setAttribute("aria-hidden", "true");
	field.style.position = "fixed";
	field.style.opacity = "0";
	field.style.pointerEvents = "none";
	document.body.append(field);
	field.select();

	try {
		return document.execCommand("copy");
	} finally {
		field.remove();
	}
}
