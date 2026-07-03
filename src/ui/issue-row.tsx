import { EyeOffIcon, Undo2Icon } from "lucide-react";
import {
	type KeyboardEvent as ReactKeyboardEvent,
	useEffect,
	useState,
} from "react";
import { Button } from "@/src/components/ui/button";
import { Field, FieldLabel } from "@/src/components/ui/field";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/src/components/ui/popover";
import { Textarea } from "@/src/components/ui/textarea";
import { cn } from "@/src/lib/utils";
import type { LintIssue } from "../core/types";
import { translateIssueCopy, type Messages } from "./i18n";
import { LayerNameMeta } from "./layer-name-meta";
import { post } from "./post";

export function IssueRow({ issue, t }: { issue: LintIssue; t: Messages }) {
	const [isIgnoring, setIsIgnoring] = useState(false);
	const [isSaving, setIsSaving] = useState(false);
	const [reason, setReason] = useState("");
	const copy = translateIssueCopy(issue, t);
	const nodeName = issue.nodeName.trim();

	useEffect(() => {
		if (issue.waiver) {
			setIsSaving(false);
			setIsIgnoring(false);
			setReason("");
		}
	}, [issue.waiver]);

	const submitIgnore = () => {
		const trimmedReason = reason.trim();
		if (!trimmedReason || isSaving) {
			return;
		}

		setIsSaving(true);
		post({
			type: "ignore-issue",
			ruleId: issue.ruleId,
			nodeId: issue.nodeId,
			reason: trimmedReason,
		});
	};

	const selectNode = () => {
		post({ type: "select-node", nodeId: issue.nodeId });
	};

	const selectNodeFromKeyboard = (
		event: ReactKeyboardEvent<HTMLDivElement>,
	) => {
		if (event.key !== "Enter" && event.key !== " ") {
			return;
		}

		event.preventDefault();
		selectNode();
	};

	return (
		// biome-ignore lint/a11y/useSemanticElements: The row contains nested action buttons, so it cannot be a semantic button.
		<div
			className="group/issue cursor-default px-4 py-3 hover:bg-muted/40"
			onClick={selectNode}
			onKeyDown={selectNodeFromKeyboard}
			role="button"
			tabIndex={0}
			title={t.selectNode}
		>
			<div className="flex min-w-0 items-center justify-between gap-2">
				<p className="min-w-0 text-sm font-medium leading-snug">
					{copy.message}
				</p>
				<div className="flex shrink-0 items-center">
					{issue.waiver ? (
						<Button
							aria-label={t.stopIgnoringIssue}
							title={t.stopIgnoringIssue}
							variant="ghost"
							size="xs"
							className="text-muted-foreground hover:text-foreground"
							onClick={(event) => {
								event.stopPropagation();
								post({
									type: "remove-ignore",
									ruleId: issue.ruleId,
									nodeId: issue.nodeId,
								});
							}}
							onPointerDown={(event) => event.stopPropagation()}
						>
							<Undo2Icon data-icon="inline-start" aria-hidden="true" />
							<span>{t.stopIgnoringIssue}</span>
						</Button>
					) : (
						<IgnorePopover
							isIgnoring={isIgnoring}
							isSaving={isSaving}
							reason={reason}
							onOpenChange={(open) => {
								setIsIgnoring(open);
								if (!open) {
									setReason("");
								}
							}}
							onReasonChange={setReason}
							onSubmit={submitIgnore}
							onCancel={() => {
								setReason("");
								setIsIgnoring(false);
							}}
							t={t}
						/>
					)}
				</div>
			</div>
			<div className="mt-1 flex min-w-0 items-start gap-2">
				<p className="min-w-0 flex-1 text-xs leading-5 text-muted-foreground">
					{copy.recommendation}
				</p>
			</div>
			{nodeName ? <LayerNameMeta name={nodeName} className="mt-1" /> : null}
			{issue.waiver ? (
				<div className="mt-1 text-xs leading-5 text-muted-foreground">
					{t.ignoredReason(issue.waiver.reason)}
				</div>
			) : null}
		</div>
	);
}

function IgnorePopover({
	isIgnoring,
	isSaving,
	reason,
	onOpenChange,
	onReasonChange,
	onSubmit,
	onCancel,
	t,
}: {
	isIgnoring: boolean;
	isSaving: boolean;
	reason: string;
	onOpenChange: (open: boolean) => void;
	onReasonChange: (reason: string) => void;
	onSubmit: () => void;
	onCancel: () => void;
	t: Messages;
}) {
	return (
		<Popover open={isIgnoring} onOpenChange={onOpenChange}>
			<PopoverTrigger
				render={
					<Button
						aria-label={t.ignoreIssue}
						aria-pressed={isIgnoring}
						title={t.ignoreIssue}
						variant="ghost"
						size="icon-xs"
						className={cn(
							"text-muted-foreground transition-opacity group-hover/issue:opacity-100",
							isIgnoring ? "opacity-100" : "opacity-0",
						)}
						onClick={(event) => event.stopPropagation()}
						onPointerDown={(event) => event.stopPropagation()}
					/>
				}
			>
				<EyeOffIcon aria-hidden="true" />
			</PopoverTrigger>
			<PopoverContent align="end" className="w-64">
				<Field>
					<FieldLabel>{t.ignoreIssue}</FieldLabel>
					<Textarea
						autoFocus
						className="min-h-16 resize-y text-xs"
						rows={2}
						value={reason}
						onChange={(event) => onReasonChange(event.currentTarget.value)}
						placeholder={t.ignoreReasonPlaceholder}
					/>
				</Field>
				<div className="flex justify-end gap-1.5">
					<Button
						size="xs"
						disabled={!reason.trim() || isSaving}
						onClick={onSubmit}
					>
						{isSaving ? t.saving : t.saveIgnoreReason}
					</Button>
					<Button
						variant="ghost"
						size="xs"
						disabled={isSaving}
						onClick={onCancel}
					>
						{t.cancel}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
