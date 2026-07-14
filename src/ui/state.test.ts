import { describe, expect, it } from "vitest";
import type { LintResult, LintWaiver } from "../core/types";
import { applyIgnoreToResult, removeIgnoreFromResult } from "./state";

const result: LintResult = {
	rootNodeId: "1:1",
	rootNodeName: "Screen",
	issues: [
		{
			id: "root-auto-layout:1:1",
			ruleId: "root-auto-layout",
			severity: "error",
			nodeId: "1:1",
			nodeName: "Screen",
			message: "Root frame has multiple children but does not use Auto Layout.",
			recommendation: "Use Auto Layout.",
		},
	],
};

const waiver: LintWaiver = {
	ruleId: "root-auto-layout",
	nodeId: "1:1",
	reason: "Legacy screen.",
	createdAt: "2026-06-19T00:00:00.000Z",
};

describe("UI waiver state", () => {
	it("marks a matching issue as waived and updates the status", () => {
		const updated = applyIgnoreToResult(result, waiver);

		expect(updated.result.issues[0]?.waiver).toEqual(waiver);
		expect(updated.status).toBe("ai-handoff-ready-with-ignored-issues");
		expect(updated.summary.error).toBe(0);
	});

	it("removes a waiver and updates the status", () => {
		const waived = applyIgnoreToResult(result, waiver);
		const updated = removeIgnoreFromResult(
			waived.result,
			waiver.ruleId,
			waiver.nodeId,
		);

		expect(updated.result.issues[0]?.waiver).toBeUndefined();
		expect(updated.status).toBe("needs-design-fix");
		expect(updated.summary.error).toBe(1);
	});
});
