import { describe, expect, it } from "vitest";
import type { LintIssue } from "../core/types";
import { createFigmaAgentPrompt } from "./figma-agent-prompt";
import { messages } from "./i18n";

const issue: LintIssue = {
	id: "semantic-layer-name:1:2",
	ruleId: "semantic-layer-name",
	severity: "warning",
	nodeId: "1:2",
	nodeName: "Group 1",
	message: "Layer name is too generic to infer implementation intent.",
	recommendation: "Rename the layer to describe its role.",
};

describe("createFigmaAgentPrompt", () => {
	it("includes the target and localized lint guidance", () => {
		const prompt = createFigmaAgentPrompt({
			issues: [issue],
			targetName: "Checkout",
			t: messages.ja,
		});

		expect(prompt).toContain("Checkout");
		expect(prompt).toContain("Group 1");
		expect(prompt).toContain("警告");
		expect(prompt).toContain(
			"レイヤー名が汎用的すぎるため、実装時の意図を推測しにくくなっています。",
		);
	});

	it("formats localized severity and recommendations", () => {
		const prompt = createFigmaAgentPrompt({
			issues: [issue],
			targetName: "Checkout",
			t: messages.en,
		});

		expect(prompt).toContain("[Warning] Group 1");
		expect(prompt).toContain("Recommendation:");
	});

	it("excludes review findings", () => {
		const prompt = createFigmaAgentPrompt({
			issues: [
				issue,
				{
					...issue,
					id: "absolute-positioning:1:3",
					nodeId: "1:3",
					nodeName: "Decorative overlay",
					severity: "review",
				},
			],
			targetName: "Checkout",
			t: messages.en,
		});

		expect(prompt).not.toContain("Decorative overlay");
	});
});
