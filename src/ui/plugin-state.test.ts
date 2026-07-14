import { describe, expect, it } from "vitest";
import type { PluginToUiMessage } from "../core/types";
import { initialPluginUiState, reducePluginMessage } from "./plugin-state";

describe("plugin UI state", () => {
	it("loads settings and records lint errors", () => {
		const withSettings = reducePluginMessage(initialPluginUiState, {
			type: "settings-loaded",
			language: "ja",
			disabledRules: ["avoid-groups"],
		});
		const withError = reducePluginMessage(withSettings, {
			type: "lint-error",
			message: "Select a target.",
		});

		expect(withSettings.settings).toEqual({
			language: "ja",
			disabledRules: ["avoid-groups"],
		});
		expect(withError.view.error).toBe("Select a target.");
	});

	it("updates ignore state and clears errors without a result", () => {
		const errorState = {
			...initialPluginUiState,
			view: { ...initialPluginUiState.view, error: "Previous error." },
		};
		const cleared = reducePluginMessage(errorState, {
			type: "ignore-saved",
			waiver: {
				ruleId: "avoid-groups",
				nodeId: "1:1",
				reason: "Intentional.",
				createdAt: "2026-07-13T00:00:00.000Z",
			},
		});

		expect(cleared.view).toEqual({ ...errorState.view, error: null });
	});

	it("updates pick state and accepts lint results", () => {
		const picking = reducePluginMessage(initialPluginUiState, {
			type: "pick-state",
			picking: true,
		});
		const next = reducePluginMessage(picking, lintResultMessage);

		expect(picking.isPicking).toBe(true);
		expect(next.view).toEqual({
			result: lintResultMessage.result,
			status: "ai-handoff-ready",
			summary: { error: 0, warning: 0, review: 0 },
			error: null,
		});
	});
});

const lintResultMessage = {
	type: "lint-result",
	result: {
		rootNodeId: "1:1",
		rootNodeName: "Screen",
		issues: [],
	},
	status: "ai-handoff-ready",
	summary: { error: 0, warning: 0, review: 0 },
	waivers: [],
	targetState: {
		readiness: "ai-handoff-ready",
		lastLintedAt: "2026-07-13T00:00:00.000Z",
		activeIssueCount: 0,
		devStatus: null,
	},
} satisfies Extract<PluginToUiMessage, { type: "lint-result" }>;
