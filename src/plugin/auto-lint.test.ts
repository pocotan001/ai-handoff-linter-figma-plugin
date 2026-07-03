import { describe, expect, it } from "vitest";
import {
	collectNodeIds,
	shouldAutoLintForDocumentChanges,
	type AutoLintNode,
} from "./auto-lint";

describe("auto lint document changes", () => {
	it("reruns when a changed node is inside the current lint target", () => {
		const target = node("target");
		const child = node("child", target);
		const outside = node("outside");

		expect(
			shouldAutoLintForDocumentChanges(
				[{ type: "PROPERTY_CHANGE", id: child.id, node: child }],
				target,
				new Set([target.id, child.id]),
			),
		).toBe(true);
		expect(
			shouldAutoLintForDocumentChanges(
				[{ type: "PROPERTY_CHANGE", id: outside.id, node: outside }],
				target,
				new Set([target.id, child.id]),
			),
		).toBe(false);
	});

	it("reruns deleted nodes only when they were in the last lint target tree", () => {
		const target = node("target");

		expect(
			shouldAutoLintForDocumentChanges(
				[
					{
						type: "DELETE",
						id: "removed-child",
						node: { id: "removed-child", removed: true },
					},
				],
				target,
				new Set([target.id, "removed-child"]),
			),
		).toBe(true);
		expect(
			shouldAutoLintForDocumentChanges(
				[
					{
						type: "DELETE",
						id: "outside",
						node: { id: "outside", removed: true },
					},
				],
				target,
				new Set([target.id, "removed-child"]),
			),
		).toBe(false);
	});

	it("reruns when styles change because token lint can be affected", () => {
		const target = node("target");

		expect(
			shouldAutoLintForDocumentChanges(
				[{ type: "STYLE_PROPERTY_CHANGE", id: "style-id" }],
				target,
				new Set([target.id]),
			),
		).toBe(true);
	});

	it("collects ids for the lint target tree", () => {
		const target = {
			id: "target",
			children: [
				{ id: "child-a" },
				{
					id: "child-b",
					children: [{ id: "grandchild" }],
				},
			],
		};

		expect(collectNodeIds(target)).toEqual(
			new Set(["target", "child-a", "child-b", "grandchild"]),
		);
	});
});

function node(id: string, parent: AutoLintNode | null = null): AutoLintNode {
	return { id, parent };
}
