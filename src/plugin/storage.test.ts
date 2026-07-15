import { describe, expect, it, vi } from "vitest";
import {
	AI_HANDOFF_LINTER_SHARED_NAMESPACE,
	AI_HANDOFF_LINTER_SHARED_STATE_KEY,
	writeLintState,
} from "./storage";

describe("shared lint handoff state", () => {
	it("uses a Figma-compatible shared namespace", () => {
		expect(AI_HANDOFF_LINTER_SHARED_NAMESPACE).toMatch(/^[A-Za-z0-9_.]+$/);
	});

	it("publishes the current lint state for MCP consumers", () => {
		const node = {
			id: "42:1",
			setPluginData: vi.fn(),
			setSharedPluginData: vi.fn(),
		} as unknown as BaseNode;
		const state = {
			lastLintedAt: "2026-07-14T00:00:00.000Z",
			activeIssueCount: 0,
			lintStatus: "ai-handoff-ready" as const,
			stale: false,
		};

		writeLintState(node, state);

		expect(node.setPluginData).toHaveBeenCalledWith(
			"code-ready-lint:state",
			JSON.stringify(state),
		);
		expect(node.setSharedPluginData).toHaveBeenCalledWith(
			AI_HANDOFF_LINTER_SHARED_NAMESPACE,
			AI_HANDOFF_LINTER_SHARED_STATE_KEY,
			JSON.stringify({ version: 1, targetNodeId: "42:1", ...state }),
		);
	});

	it("updates the shared handoff state when the lint result becomes stale", () => {
		const node = {
			id: "42:1",
			setPluginData: vi.fn(),
			setSharedPluginData: vi.fn(),
		} as unknown as BaseNode;
		const state = {
			lastLintedAt: "2026-07-14T00:00:00.000Z",
			activeIssueCount: 0,
			lintStatus: "ai-handoff-ready" as const,
			stale: true,
		};

		writeLintState(node, state);

		expect(node.setSharedPluginData).toHaveBeenCalledWith(
			AI_HANDOFF_LINTER_SHARED_NAMESPACE,
			AI_HANDOFF_LINTER_SHARED_STATE_KEY,
			JSON.stringify({ version: 1, targetNodeId: "42:1", ...state }),
		);
	});
});
