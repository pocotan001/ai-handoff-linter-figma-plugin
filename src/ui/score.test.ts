import { describe, expect, it } from "vitest";
import { CONFIGURABLE_RULES } from "../core/rules";
import { RULE_WEIGHTS, calculateLintScore, getScoreTone } from "./score";
import type { LintIssue } from "../core/types";

function issue(overrides: Partial<LintIssue>): LintIssue {
	return {
		id: `${overrides.ruleId ?? "missing-auto-layout"}:1:1`,
		ruleId: overrides.ruleId ?? "missing-auto-layout",
		severity: overrides.severity ?? "warning",
		nodeId: overrides.nodeId ?? "1:1",
		nodeName: overrides.nodeName ?? "Layer",
		message: "Message",
		recommendation: "Recommendation",
		...overrides,
	};
}

describe("calculateLintScore", () => {
	it("returns 100 when there are no active issues", () => {
		expect(calculateLintScore([])).toBe(100);
	});

	it("scores by failed rule weight instead of raw issue count", () => {
		const issues = Array.from({ length: 20 }, (_, index) =>
			issue({
				ruleId: "prefer-variables-or-styles",
				severity: "warning",
				nodeId: `1:${index}`,
			}),
		);

		expect(calculateLintScore(issues)).toBe(89);
	});

	it("lets high-impact error rules pull the score below orange", () => {
		expect(
			calculateLintScore([
				issue({ ruleId: "root-auto-layout", severity: "error" }),
			]),
		).toBe(49);
	});

	it("keeps review-only issues below green without treating them like failures", () => {
		expect(
			calculateLintScore([
				issue({ ruleId: "too-many-children", severity: "review" }),
			]),
		).toBe(89);
	});

	it("weights every configurable rule", () => {
		for (const ruleId of CONFIGURABLE_RULES) {
			expect(
				RULE_WEIGHTS[ruleId],
				`missing weight for ${ruleId}`,
			).toBeGreaterThan(0);
		}
	});

	it("counts issues from newly added rules against the score", () => {
		const failRule = (ruleId: string): LintIssue[] => [
			issue({ ruleId, severity: "warning", nodeId: "1:1" }),
			issue({ ruleId, severity: "warning", nodeId: "1:2" }),
		];
		const baseIssues = [
			...failRule("missing-auto-layout"),
			...failRule("semantic-layer-name"),
			...failRule("prefer-variables-or-styles"),
			...failRule("missing-text-style"),
		];

		expect(calculateLintScore(baseIssues)).toBe(69);
		expect(
			calculateLintScore([
				...baseIssues,
				...failRule("duplicate-sibling-names"),
			]),
		).toBe(63);
	});

	it("excludes disabled rules from the weight denominator", () => {
		const issues = [
			issue({
				ruleId: "prefer-variables-or-styles",
				severity: "warning",
				nodeId: "1:1",
			}),
			issue({
				ruleId: "prefer-variables-or-styles",
				severity: "warning",
				nodeId: "1:2",
			}),
		];
		const allOtherRules = Object.keys(RULE_WEIGHTS).filter(
			(ruleId) => ruleId !== "prefer-variables-or-styles",
		);

		expect(calculateLintScore(issues, allOtherRules)).toBe(0);
		expect(calculateLintScore(issues)).toBe(89);
	});
});

describe("getScoreTone", () => {
	it("uses red for designs that are not AI Handoff Ready", () => {
		expect(getScoreTone(49, "needs-design-fix")).toBe("red");
		expect(getScoreTone(30, "needs-improvement")).toBe("red");
	});

	it("uses green, orange, and red from the score threshold", () => {
		expect(getScoreTone(90, "ai-handoff-ready")).toBe("green");
		expect(getScoreTone(50, "needs-improvement")).toBe("orange");
		expect(getScoreTone(49, "ai-handoff-ready")).toBe("red");
	});

	it("uses neutral when there is no lint status", () => {
		expect(getScoreTone(0, null)).toBe("neutral");
	});
});
