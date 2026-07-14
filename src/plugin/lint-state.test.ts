import { describe, expect, it } from "vitest";
import {
	getLintReadiness,
	type StoredLintState,
	shouldWarnReadyForDev,
} from "./lint-state";

describe("lint readiness", () => {
	it("requires lint when there is no stored lint state", () => {
		expect(getLintReadiness(null)).toBe("lint-required");
	});

	it("marks stored stale lint state as stale", () => {
		expect(getLintReadiness(state({ stale: true, activeIssueCount: 0 }))).toBe(
			"stale",
		);
	});

	it("marks current lint state with active issues as needs-fixes", () => {
		expect(getLintReadiness(state({ activeIssueCount: 2 }))).toBe(
			"needs-fixes",
		);
	});

	it("marks current lint state without active issues as ai-handoff-ready", () => {
		expect(getLintReadiness(state({ activeIssueCount: 0 }))).toBe(
			"ai-handoff-ready",
		);
	});

	it("warns when Figma Ready for Dev is set before lint is AI Handoff Ready", () => {
		expect(
			shouldWarnReadyForDev({
				readiness: "lint-required",
				devStatus: "READY_FOR_DEV",
			}),
		).toBe(true);
		expect(
			shouldWarnReadyForDev({ readiness: "stale", devStatus: "READY_FOR_DEV" }),
		).toBe(true);
		expect(
			shouldWarnReadyForDev({
				readiness: "needs-fixes",
				devStatus: "READY_FOR_DEV",
			}),
		).toBe(true);
		expect(
			shouldWarnReadyForDev({
				readiness: "ai-handoff-ready",
				devStatus: "READY_FOR_DEV",
			}),
		).toBe(false);
		expect(
			shouldWarnReadyForDev({ readiness: "needs-fixes", devStatus: null }),
		).toBe(false);
	});
});

function state(overrides: Partial<StoredLintState> = {}): StoredLintState {
	return {
		lastLintedAt: "2026-06-25T00:00:00.000Z",
		activeIssueCount: 0,
		lintStatus: "ai-handoff-ready",
		stale: false,
		...overrides,
	};
}
