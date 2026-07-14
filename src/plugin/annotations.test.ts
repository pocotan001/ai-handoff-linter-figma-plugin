import { describe, expect, it } from "vitest";
import {
	AI_HANDOFF_LINTER_ANNOTATION_PREFIX,
	areAnnotationsEqual,
	syncAiHandoffLinterAnnotations,
} from "./annotations";

describe("AI Handoff Ready annotations", () => {
	it("adds a plugin annotation when Ready for Dev is not AI Handoff Ready", () => {
		const annotations = syncAiHandoffLinterAnnotations([], {
			readiness: "needs-fixes",
			devStatus: "READY_FOR_DEV",
		});

		expect(annotations).toHaveLength(1);
		expect(annotations[0]?.labelMarkdown).toContain(
			AI_HANDOFF_LINTER_ANNOTATION_PREFIX,
		);
	});

	it("adds an AI Handoff Ready annotation when lint passes even without Ready for Dev", () => {
		const annotations = syncAiHandoffLinterAnnotations([], {
			readiness: "ai-handoff-ready",
			devStatus: null,
		});

		expect(annotations).toHaveLength(1);
		expect(annotations[0]?.labelMarkdown).toContain("AI Handoff Ready.");
	});

	it("replaces plugin annotations with an AI Handoff Ready annotation when lint passes", () => {
		const designerAnnotation = { label: "Designer note" };
		const annotations = syncAiHandoffLinterAnnotations(
			[
				designerAnnotation,
				{
					labelMarkdown: `${AI_HANDOFF_LINTER_ANNOTATION_PREFIX} Resolve lint issues.`,
				},
			],
			{
				readiness: "ai-handoff-ready",
				devStatus: "READY_FOR_DEV",
			},
		);

		expect(annotations).toHaveLength(2);
		expect(annotations[0]).toBe(designerAnnotation);
		expect(annotations[1]?.labelMarkdown).toContain("AI Handoff Ready.");
	});

	it("replaces stale plugin annotations without touching other annotations", () => {
		const designerAnnotation = { label: "Keep this" };
		const annotations = syncAiHandoffLinterAnnotations(
			[
				{
					labelMarkdown: `${AI_HANDOFF_LINTER_ANNOTATION_PREFIX} Old message.`,
				},
				designerAnnotation,
			],
			{
				readiness: "stale",
				devStatus: "READY_FOR_DEV",
			},
		);

		expect(annotations).toHaveLength(2);
		expect(annotations[0]).toBe(designerAnnotation);
		expect(annotations[1]?.labelMarkdown).toContain("lint result is stale");
	});

	it("does not add annotations when the node is not Ready for Dev", () => {
		expect(
			syncAiHandoffLinterAnnotations([], {
				readiness: "needs-fixes",
				devStatus: null,
			}),
		).toEqual([]);
	});

	it("detects unchanged annotations so the plugin can avoid extra writes", () => {
		expect(
			areAnnotationsEqual(
				[
					{ label: "Designer note" },
					{
						labelMarkdown: `${AI_HANDOFF_LINTER_ANNOTATION_PREFIX} Active issues.`,
					},
				],
				[
					{ label: "Designer note" },
					{
						labelMarkdown: `${AI_HANDOFF_LINTER_ANNOTATION_PREFIX} Active issues.`,
					},
				],
			),
		).toBe(true);
		expect(areAnnotationsEqual([{ label: "Old" }], [{ label: "New" }])).toBe(
			false,
		);
	});
});
