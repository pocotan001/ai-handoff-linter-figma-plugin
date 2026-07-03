import { getLintStatus, summarizeIssues } from "../core/linter";
import type {
	LintIssue,
	LintResult,
	LintStatus,
	LintSummary,
	LintWaiver,
} from "../core/types";

export type UpdatedLintResult = {
	result: LintResult;
	status: LintStatus;
	summary: LintSummary;
};

export function applyIgnoreToResult(
	result: LintResult,
	waiver: LintWaiver,
): UpdatedLintResult {
	return updateResultIssues(result, (issues) =>
		issues.map((issue) =>
			isSameIssue(issue, waiver.ruleId, waiver.nodeId)
				? { ...issue, waiver }
				: issue,
		),
	);
}

export function removeIgnoreFromResult(
	result: LintResult,
	ruleId: string,
	nodeId: string,
): UpdatedLintResult {
	return updateResultIssues(result, (issues) =>
		issues.map((issue) => {
			if (!isSameIssue(issue, ruleId, nodeId)) {
				return issue;
			}

			const { waiver: _waiver, ...activeIssue } = issue;
			return activeIssue;
		}),
	);
}

function updateResultIssues(
	result: LintResult,
	update: (issues: LintIssue[]) => LintIssue[],
): UpdatedLintResult {
	const issues = update(result.issues);
	return {
		result: {
			...result,
			issues,
		},
		status: getLintStatus(issues),
		summary: summarizeIssues(issues),
	};
}

function isSameIssue(
	issue: LintIssue,
	ruleId: string,
	nodeId: string,
): boolean {
	return issue.ruleId === ruleId && issue.nodeId === nodeId;
}
