import {
	EyeOffIcon,
	InfoIcon,
	TriangleAlertIcon,
	XCircleIcon,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/tabs";
import type { LintIssue, LintSeverity } from "../core/types";
import { formatSeverity, type Messages } from "./i18n";
import { IssueRow } from "./issue-row";

export const issueSeverities = [
	"error",
	"warning",
	"review",
	"ignored",
] as const;
export type IssueSeverityTab = (typeof issueSeverities)[number];

export type IssueGroup = {
	severity: IssueSeverityTab;
	issues: LintIssue[];
};

export function IssueTabs({
	groups,
	t,
}: {
	groups: IssueGroup[];
	t: Messages;
}) {
	const defaultValue =
		groups.find((group) => group.issues.length > 0)?.severity ??
		groups[0]?.severity;

	return (
		<Tabs defaultValue={defaultValue} className="h-full min-h-0 gap-0">
			<div className="shrink-0 border-b bg-background px-4 py-2">
				<TabsList className="w-full justify-start">
					{groups.map(({ issues, severity }) => (
						<TabsTrigger
							key={severity}
							value={severity}
							disabled={issues.length === 0}
						>
							<SeverityIcon
								disabled={issues.length === 0}
								severity={severity}
							/>
							<span>{formatTabLabel(severity, t)}</span>
						</TabsTrigger>
					))}
				</TabsList>
			</div>
			{groups.map(({ issues, severity }) => (
				<TabsContent
					key={severity}
					value={severity}
					className="min-h-0 overflow-auto overscroll-contain p-4"
				>
					<div className="overflow-hidden rounded-lg border bg-background">
						<div className="divide-y">
							{issues.map((issue) => (
								<IssueRow key={issue.id} issue={issue} t={t} />
							))}
						</div>
					</div>
				</TabsContent>
			))}
		</Tabs>
	);
}

function formatTabLabel(severity: IssueSeverityTab, t: Messages): string {
	return severity === "ignored" ? t.ignored : formatSeverity(severity, t);
}

function SeverityIcon({
	disabled,
	severity,
}: {
	disabled: boolean;
	severity: IssueSeverityTab;
}) {
	return (
		<span
			className={
				disabled
					? "shrink-0 text-muted-foreground/45"
					: severityIconColor(severity)
			}
		>
			<SeverityGlyph severity={severity} />
		</span>
	);
}

function severityIconColor(severity: IssueSeverityTab): string {
	if (severity === "error") return "shrink-0 text-red-600 dark:text-red-400";
	if (severity === "warning")
		return "shrink-0 text-yellow-600 dark:text-yellow-400";
	if (severity === "review") return "shrink-0 text-blue-600 dark:text-blue-400";
	return "shrink-0 text-muted-foreground";
}

function SeverityGlyph({ severity }: { severity: LintSeverity | "ignored" }) {
	if (severity === "error") return <XCircleIcon className="size-4" />;
	if (severity === "warning") return <TriangleAlertIcon className="size-4" />;
	if (severity === "review") return <InfoIcon className="size-4" />;
	return <EyeOffIcon className="size-4" />;
}
