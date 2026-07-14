import { describe, expect, it } from "vitest";
import {
	findDuplicateSiblingNames,
	hasGenericImageName,
	hasGenericName,
	hasPlaceholderText,
} from "./node-rule-predicates";
import type { LintableNode } from "./types";

describe("node rule predicates", () => {
	it("identifies generic names and placeholder content", () => {
		expect(hasGenericName("Frame 1")).toBe(true);
		expect(hasGenericName("Checkout summary")).toBe(false);
		expect(hasGenericImageName("Image")).toBe(true);
		expect(hasPlaceholderText("Lorem ipsum dolor sit amet")).toBe(true);
	});

	it("finds duplicate visible non-instance sibling names", () => {
		const duplicates = findDuplicateSiblingNames(
			node({
				children: [
					node({ id: "1:2", name: "Label" }),
					node({ id: "1:3", name: " label " }),
					node({ id: "1:4", name: "Label", type: "INSTANCE" }),
					node({ id: "1:5", name: "Label", visible: false }),
				],
			}),
		);

		expect(duplicates.map((child) => child.id)).toEqual(["1:3"]);
	});
});

function node(overrides: Partial<LintableNode> = {}): LintableNode {
	return {
		id: "1:1",
		name: "Screen",
		type: "FRAME",
		children: [],
		...overrides,
	};
}
