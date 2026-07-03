import type { LintIssue, LintStatus } from "../core/types";

// target-frame is deliberately unweighted: it is a gating error that the
// plugin prevents in practice, and it still caps the score via its severity.
export const RULE_WEIGHTS: Record<string, number> = {
	"root-auto-layout": 16,
	"missing-auto-layout": 10,
	"avoid-groups": 5,
	"fixed-size-container": 4,
	"absolute-positioning": 4,
	"invisible-layer": 8,
	"too-many-children": 3,
	"deep-nesting": 5,
	"semantic-layer-name": 10,
	"duplicate-sibling-names": 6,
	"too-long-name": 2,
	"prefer-variables-or-styles": 8,
	"missing-text-style": 7,
	"placeholder-text": 3,
	"image-without-alt-hint": 5,
	"instance-internal-issues": 6,
	"default-variant-property-names": 6,
	"missing-component-description": 4,
};

export function calculateLintScore(
	issues: LintIssue[],
	disabledRules: string[] = [],
): number {
	const activeIssues = issues.filter((issue) => !issue.waiver);
	if (activeIssues.length === 0) {
		return 100;
	}

	// Disabled rules are excluded from the denominator so turning rules off
	// does not inflate the score of the rules that remain.
	const weightedRules = Object.entries(RULE_WEIGHTS).filter(
		([ruleId]) => !disabledRules.includes(ruleId),
	);
	const totalWeight = weightedRules.reduce(
		(total, [, weight]) => total + weight,
		0,
	);
	const issuesByRule = groupIssuesByRule(activeIssues);
	const passedWeight = weightedRules.reduce((total, [ruleId, weight]) => {
		return total + weight * getRuleScore(issuesByRule.get(ruleId) ?? []);
	}, 0);
	const score =
		totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 100;

	if (activeIssues.some((issue) => issue.severity === "error")) {
		return Math.min(score, 49);
	}

	return Math.min(score, 89);
}

export type ScoreTone = "green" | "orange" | "red" | "neutral";

export function getScoreTone(
	score: number,
	status: LintStatus | null,
): ScoreTone {
	if (!status) {
		return "neutral";
	}

	if (
		(status === "ai-handoff-ready" ||
			status === "ai-handoff-ready-with-ignored-issues") &&
		score >= 90
	) {
		return "green";
	}

	if (score >= 50) {
		return "orange";
	}

	return "red";
}

function getRuleScore(issues: LintIssue[]): number {
	if (issues.length === 0) {
		return 1;
	}

	if (issues.some((issue) => issue.severity === "error")) {
		return 0;
	}

	if (issues.some((issue) => issue.severity === "warning")) {
		return issues.length === 1 ? 0.5 : 0;
	}

	return 0.8;
}

function groupIssuesByRule(issues: LintIssue[]): Map<string, LintIssue[]> {
	const groups = new Map<string, LintIssue[]>();
	for (const issue of issues) {
		groups.set(issue.ruleId, [...(groups.get(issue.ruleId) ?? []), issue]);
	}
	return groups;
}
