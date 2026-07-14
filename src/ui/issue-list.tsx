import { MousePointer2Icon, SettingsIcon } from "lucide-react";
import { Button } from "~/components/button";
import { Card, CardContent } from "~/components/card";
import type { LintIssue, LintStatus, LintSummary } from "../core/types";
import { CircularScore } from "./circular-score";
import { formatStatus, type Messages } from "./i18n";
import { type IssueGroup, IssueTabs, issueSeverities } from "./issue-tabs";
import { LayerNameMeta } from "./layer-name-meta";
import { post } from "./post";
import { calculateLintScore, getScoreTone } from "./score";

export function IssueList({
	disabledRules,
	error,
	isPicking,
	issues,
	onOpenSettings,
	status,
	summary,
	targetName,
	t,
}: {
	disabledRules: string[];
	error: string | null;
	isPicking: boolean;
	issues: LintIssue[];
	onOpenSettings: () => void;
	status: LintStatus | null;
	summary: LintSummary;
	targetName: string | null;
	t: Messages;
}) {
	const activeIssues = issues.filter((issue) => !issue.waiver);
	const ignoredIssues = issues.filter((issue) => issue.waiver);
	const issueGroups = groupIssuesForTabs(activeIssues, ignoredIssues);
	const score =
		status !== null ? calculateLintScore(activeIssues, disabledRules) : null;
	const tone = getScoreTone(score ?? 0, status);
	const lintTargetName = targetName?.trim();

	return (
		<section className="flex h-full min-h-0 min-w-0 flex-col">
			<div className="flex shrink-0 items-center gap-4 border-b bg-background px-4 py-3">
				<CircularScore score={score} tone={tone} />
				<div className="flex min-w-0 flex-1 flex-col gap-1.5">
					<span className="text-sm font-semibold leading-none text-foreground">
						{formatStatus(status, t)}
					</span>
					<IssueSummaryLine
						summary={summary}
						ignoredCount={ignoredIssues.length}
						t={t}
					/>
					{lintTargetName ? <LayerNameMeta name={lintTargetName} /> : null}
				</div>
				<div className="flex shrink-0 items-center gap-1.5">
					<Button
						aria-label={t.runLint}
						variant={isPicking ? "default" : "outline"}
						title={t.runLint}
						onClick={() =>
							post({
								type: isPicking ? "cancel-pick-target" : "start-pick-target",
							})
						}
						onPointerDown={(event) => event.stopPropagation()}
					>
						<MousePointer2Icon data-icon="inline-start" aria-hidden="true" />
						<span>{t.runLint}</span>
					</Button>
					<Button
						aria-label={t.settings}
						size="icon"
						variant="outline"
						className="text-muted-foreground"
						title={t.settings}
						onClick={onOpenSettings}
					>
						<SettingsIcon aria-hidden="true" />
					</Button>
				</div>
			</div>
			<div className="min-h-0 flex-1 overflow-hidden">
				{error ? (
					<div className="h-full overflow-auto overscroll-contain p-4">
						<Card className="border-destructive/30 bg-destructive/10 py-0">
							<CardContent className="px-4 py-7 text-center text-xs text-destructive">
								{error}
							</CardContent>
						</Card>
					</div>
				) : issueGroups.every((group) => group.issues.length === 0) ? (
					<div className="h-full overflow-auto overscroll-contain p-4">
						<div className="rounded-md border border-dashed px-4 py-7 text-center text-xs text-muted-foreground">
							{t.noActiveIssues}
						</div>
					</div>
				) : (
					<IssueTabs groups={issueGroups} t={t} />
				)}
			</div>
		</section>
	);
}

function groupIssuesForTabs(
	activeIssues: LintIssue[],
	ignoredIssues: LintIssue[],
): IssueGroup[] {
	return issueSeverities.map((severity) => ({
		severity,
		issues:
			severity === "ignored"
				? ignoredIssues
				: activeIssues.filter((issue) => issue.severity === severity),
	}));
}

function IssueSummaryLine({
	summary,
	ignoredCount,
	t,
}: {
	summary: LintSummary;
	ignoredCount: number;
	t: Messages;
}) {
	const segments = [
		summary.error > 0 && `${summary.error} ${t.error}`,
		summary.warning > 0 && `${summary.warning} ${t.warning}`,
		summary.review > 0 && `${summary.review} ${t.review}`,
		ignoredCount > 0 && `${ignoredCount} ${t.ignored}`,
	].filter(Boolean) as string[];

	if (segments.length === 0) return null;

	return (
		<p className="text-xs text-muted-foreground">{segments.join(" / ")}</p>
	);
}
