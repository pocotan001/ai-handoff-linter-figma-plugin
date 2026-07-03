import { ISSUE_COPY } from "./issue-copy";
import { walkInstanceInternals, walkScope, type ScopeEntry } from "./lint-walk";
import { NODE_RULES } from "./node-rules";
import { isLintTargetType } from "./lint-target";
import type { LintRuleId } from "./rules";
import type {
	LintIssue,
	LintResult,
	LintStatus,
	LintSummary,
	LintWaiver,
	LintableNode,
} from "./types";

export function lintNode(root: LintableNode): LintResult {
	const issues: LintIssue[] = [];

	collectRootIssues(root, issues);

	const scope = walkScope(root);
	for (const entry of scope.entries) {
		collectEntryIssues(entry, root, issues);
	}

	// Issues inside an instance can only be fixed on its main component, so
	// they are reported as a single review item on the instance itself.
	for (const instance of scope.instanceRoots) {
		if (hasInternalIssues(instance, root)) {
			issues.push(makeIssue("instance-internal-issues", "review", instance));
		}
	}

	return {
		rootNodeId: root.id,
		rootNodeName: root.name,
		issues,
	};
}

export function applyWaivers(
	issues: LintIssue[],
	waivers: LintWaiver[],
): LintIssue[] {
	return issues.map((issue) => {
		const waiver = waivers.find(
			(candidate) =>
				candidate.ruleId === issue.ruleId && candidate.nodeId === issue.nodeId,
		);
		return waiver ? { ...issue, waiver } : issue;
	});
}

export function getLintStatus(issues: LintIssue[]): LintStatus {
	const active = issues.filter((issue) => !issue.waiver);
	if (active.some((issue) => issue.severity === "error")) {
		return "needs-design-fix";
	}
	if (active.length > 0) {
		return "needs-improvement";
	}
	return issues.length > 0
		? "ai-handoff-ready-with-ignored-issues"
		: "ai-handoff-ready";
}

export function summarizeIssues(issues: LintIssue[]): LintSummary {
	const active = issues.filter((issue) => !issue.waiver);
	return {
		error: active.filter((issue) => issue.severity === "error").length,
		warning: active.filter((issue) => issue.severity === "warning").length,
		review: active.filter((issue) => issue.severity === "review").length,
	};
}

function collectRootIssues(root: LintableNode, issues: LintIssue[]): void {
	if (!isLintTargetType(root.type)) {
		issues.push(makeIssue("target-frame", "error", root));
	}
	if ((root.children?.length ?? 0) > 1 && root.layoutMode === "NONE") {
		issues.push(makeIssue("root-auto-layout", "error", root));
	}
}

function collectEntryIssues(
	entry: ScopeEntry,
	root: LintableNode,
	issues: LintIssue[],
): void {
	// Hidden layers get a single report; their other problems become moot once
	// the layer is removed or shown.
	if (entry.node.visible === false) {
		issues.push(makeIssue("invisible-layer", "warning", entry.node));
		return;
	}

	for (const rule of NODE_RULES) {
		for (const target of rule.findTargets(entry, root)) {
			issues.push(makeIssue(rule.id, rule.severity, target));
		}
	}
}

function hasInternalIssues(
	instance: LintableNode,
	root: LintableNode,
): boolean {
	return walkInstanceInternals(instance).some((entry) =>
		NODE_RULES.some((rule) => rule.findTargets(entry, root).length > 0),
	);
}

function makeIssue(
	ruleId: LintRuleId,
	severity: LintIssue["severity"],
	node: LintableNode,
): LintIssue {
	const copy = ISSUE_COPY.en[ruleId];
	return {
		id: `${ruleId}:${node.id}`,
		ruleId,
		severity,
		nodeId: node.id,
		nodeName: node.name,
		message: copy.message,
		recommendation: copy.recommendation,
	};
}
