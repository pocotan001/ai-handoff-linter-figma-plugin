import { describe, expect, it } from "vitest";
import { applyWaivers, getLintStatus, lintNode } from "./linter";
import type { LintableNode, LintWaiver } from "./types";

function node(overrides: Partial<LintableNode> = {}): LintableNode {
	return {
		id: "1:1",
		name: "Screen",
		type: "FRAME",
		children: [],
		...overrides,
	};
}

describe("lintNode", () => {
	it("marks a multi-child root frame without auto layout as error", () => {
		const result = lintNode(
			node({
				layoutMode: "NONE",
				children: [
					node({ id: "1:2", name: "Title", type: "TEXT" }),
					node({ id: "1:3", name: "Button", type: "FRAME" }),
				],
			}),
		);

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				ruleId: "root-auto-layout",
				severity: "error",
				nodeId: "1:1",
			}),
		);
		expect(getLintStatus(result.issues)).toBe("needs-design-fix");
	});

	it("accepts sections as lint roots and reports issues inside their lintable children", () => {
		const result = lintNode(
			node({
				id: "1:section",
				name: "Checkout flow",
				type: "SECTION",
				children: [
					node({
						id: "1:screen",
						name: "Frame 1",
						type: "FRAME",
						layoutMode: "NONE",
						children: [
							node({ id: "1:title", name: "Title", type: "TEXT" }),
							node({ id: "1:body", name: "Body", type: "TEXT" }),
						],
					}),
					node({
						id: "1:component",
						name: "Component 1",
						type: "COMPONENT",
						children: [node({ id: "1:label", name: "Label", type: "TEXT" })],
					}),
					node({
						id: "1:instance",
						name: "Instance 1",
						type: "INSTANCE",
						children: [
							node({
								id: "1:icon",
								name: "Rectangle",
								type: "RECTANGLE",
								hasImageFill: true,
							}),
						],
					}),
				],
			}),
		);

		expect(result.issues.map((issue) => issue.ruleId)).not.toContain(
			"target-frame",
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({
				ruleId: "too-many-children",
				nodeId: "1:section",
			}),
		);
		expect(result.issues).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					ruleId: "missing-auto-layout",
					nodeId: "1:screen",
				}),
				expect.objectContaining({
					ruleId: "semantic-layer-name",
					nodeId: "1:component",
				}),
				expect.objectContaining({
					ruleId: "instance-internal-issues",
					severity: "review",
					nodeId: "1:instance",
				}),
			]),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({ nodeId: "1:icon" }),
		);
	});

	it("accepts component sets as lint roots", () => {
		const result = lintNode(
			node({
				id: "1:component-set",
				name: "Button",
				type: "COMPONENT_SET",
				children: [
					node({
						id: "1:component",
						name: "Primary",
						type: "COMPONENT",
						children: [node({ id: "1:label", name: "Label", type: "TEXT" })],
					}),
				],
			}),
		);

		expect(result.issues.map((issue) => issue.ruleId)).not.toContain(
			"target-frame",
		);
	});

	it("flags non-root frames with multiple children and no Auto Layout as missing-auto-layout", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "Card",
						type: "FRAME",
						layoutMode: "NONE",
						children: [
							node({ id: "1:3", name: "Title", type: "TEXT" }),
							node({ id: "1:4", name: "Body", type: "TEXT" }),
						],
					}),
				],
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({ ruleId: "missing-auto-layout", nodeId: "1:2" }),
		);
	});

	it("reviews multi-child Auto Layout frames with fixed primary axis as fixed-size-container", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "ContentPanel",
						type: "FRAME",
						layoutMode: "VERTICAL",
						primaryAxisSizingMode: "FIXED",
						children: [
							node({ id: "1:3", name: "Title", type: "TEXT" }),
							node({ id: "1:4", name: "Body", type: "TEXT" }),
						],
					}),
				],
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				ruleId: "fixed-size-container",
				severity: "review",
				nodeId: "1:2",
			}),
		);
	});

	it("does not flag single-child Auto Layout frames with fixed primary axis", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "AvatarFrame",
						type: "FRAME",
						layoutMode: "VERTICAL",
						primaryAxisSizingMode: "FIXED",
						children: [node({ id: "1:3", name: "Avatar", type: "RECTANGLE" })],
					}),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"fixed-size-container",
		);
	});

	it("does not flag instances with fixed primary axis", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "CardInstance",
						type: "INSTANCE",
						layoutMode: "VERTICAL",
						primaryAxisSizingMode: "FIXED",
						children: [
							node({ id: "1:3", name: "Title", type: "TEXT" }),
							node({ id: "1:4", name: "Body", type: "TEXT" }),
						],
					}),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"fixed-size-container",
		);
	});

	it("does not flag Auto Layout frames with Hug (AUTO) primary axis", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "Sidebar",
						type: "FRAME",
						layoutMode: "VERTICAL",
						primaryAxisSizingMode: "AUTO",
					}),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"fixed-size-container",
		);
	});

	it("does not flag non-ASCII layer names", () => {
		const result = lintNode(node({ name: "ボタン" }));
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"non-ascii-layer-name",
		);
	});

	it("flags TEXT nodes without a text style as missing-text-style", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({ id: "1:2", name: "Label", type: "TEXT", hasTextStyle: false }),
				],
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({ ruleId: "missing-text-style", nodeId: "1:2" }),
		);
	});

	it("does not flag TEXT nodes that have a text style", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({ id: "1:2", name: "Label", type: "TEXT", hasTextStyle: true }),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"missing-text-style",
		);
	});

	it("flags image layers with generic names as image-without-alt-hint", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "Rectangle",
						type: "RECTANGLE",
						hasImageFill: true,
					}),
				],
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				ruleId: "image-without-alt-hint",
				nodeId: "1:2",
			}),
		);
	});

	it("does not flag image layers with descriptive names", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "HeroPhoto",
						type: "RECTANGLE",
						hasImageFill: true,
					}),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"image-without-alt-hint",
		);
	});

	it("flags generic names only on component-like containers with children", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "Frame 1",
						type: "FRAME",
						children: [node({ id: "1:3", name: "Title", type: "TEXT" })],
					}),
					node({ id: "1:4", name: "Frame 2", type: "FRAME" }),
					node({
						id: "1:5",
						name: "Group 1",
						type: "GROUP",
						children: [node({ id: "1:6", name: "Label", type: "TEXT" })],
					}),
					node({ id: "1:7", name: "Rectangle 4", type: "RECTANGLE" }),
				],
			}),
		);

		expect(result.issues).toContainEqual(
			expect.objectContaining({ ruleId: "semantic-layer-name", nodeId: "1:2" }),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({ ruleId: "semantic-layer-name", nodeId: "1:4" }),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({ ruleId: "semantic-layer-name", nodeId: "1:5" }),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({ ruleId: "semantic-layer-name", nodeId: "1:7" }),
		);
	});

	it("flags layers nested more than 5 levels as deep-nesting", () => {
		const deep = node({ id: "1:7", name: "Deep", type: "FRAME" });
		const l5 = node({ id: "1:6", name: "L5", type: "FRAME", children: [deep] });
		const l4 = node({ id: "1:5", name: "L4", type: "FRAME", children: [l5] });
		const l3 = node({ id: "1:4", name: "L3", type: "FRAME", children: [l4] });
		const l2 = node({ id: "1:3", name: "L2", type: "FRAME", children: [l3] });
		const l1 = node({ id: "1:2", name: "L1", type: "FRAME", children: [l2] });
		const result = lintNode(node({ layoutMode: "VERTICAL", children: [l1] }));
		expect(result.issues).toContainEqual(
			expect.objectContaining({ ruleId: "deep-nesting", nodeId: "1:7" }),
		);
	});

	it("does not flag layers at exactly 5 levels of nesting", () => {
		const l5 = node({ id: "1:6", name: "L5", type: "FRAME" });
		const l4 = node({ id: "1:5", name: "L4", type: "FRAME", children: [l5] });
		const l3 = node({ id: "1:4", name: "L3", type: "FRAME", children: [l4] });
		const l2 = node({ id: "1:3", name: "L2", type: "FRAME", children: [l3] });
		const l1 = node({ id: "1:2", name: "L1", type: "FRAME", children: [l2] });
		const result = lintNode(node({ layoutMode: "VERTICAL", children: [l1] }));
		expect(result.issues.map((i) => i.ruleId)).not.toContain("deep-nesting");
	});

	it("flags groups that contain content or layout layers", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "Group 1",
						type: "GROUP",
						children: [node({ id: "1:3", name: "Label", type: "TEXT" })],
					}),
				],
			}),
		);

		expect(result.issues).toContainEqual(
			expect.objectContaining({ ruleId: "avoid-groups", nodeId: "1:2" }),
		);
	});

	it("allows vector-only groups used for icons or decoration", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "Icon",
						type: "GROUP",
						children: [node({ id: "1:3", name: "Path", type: "VECTOR" })],
					}),
				],
			}),
		);

		expect(result.issues.map((issue) => issue.ruleId)).not.toContain(
			"avoid-groups",
		);
	});

	it("reports raw visual values without duplicating generic group names", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:3",
						name: "Rectangle 4",
						type: "RECTANGLE",
						layoutPositioning: "ABSOLUTE",
						hasRawVisualValue: true,
					}),
				],
			}),
		);

		expect(result.issues.map((issue) => issue.ruleId)).toEqual(
			expect.arrayContaining(["prefer-variables-or-styles"]),
		);
		expect(result.issues.map((issue) => issue.ruleId)).not.toContain(
			"semantic-layer-name",
		);
		expect(getLintStatus(result.issues)).toBe("needs-improvement");
	});

	it("flags hidden layers as invisible-layer", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "HiddenCard",
						type: "FRAME",
						visible: false,
					}),
				],
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({ ruleId: "invisible-layer", nodeId: "1:2" }),
		);
	});

	it("does not flag visible layers", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({ id: "1:2", name: "Card", type: "FRAME", visible: true }),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain("invisible-layer");
	});

	it("reviews frames with 10 or more direct children as too-many-children", () => {
		const children = Array.from({ length: 10 }, (_, i) =>
			node({ id: `1:${i + 2}`, name: `Item${i + 1}`, type: "FRAME" }),
		);
		const result = lintNode(node({ layoutMode: "VERTICAL", children }));
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				ruleId: "too-many-children",
				severity: "review",
				nodeId: "1:1",
			}),
		);
	});

	it("does not flag frames with fewer than 10 children", () => {
		const children = Array.from({ length: 9 }, (_, i) =>
			node({ id: `1:${i + 2}`, name: `Item${i + 1}`, type: "FRAME" }),
		);
		const result = lintNode(node({ layoutMode: "VERTICAL", children }));
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"too-many-children",
		);
	});

	it("flags layer names over 50 characters as too-long-name", () => {
		const longName = "A".repeat(51);
		const result = lintNode(node({ layoutMode: "VERTICAL", name: longName }));
		expect(result.issues).toContainEqual(
			expect.objectContaining({ ruleId: "too-long-name" }),
		);
	});

	it("does not flag layer names of 50 characters or fewer", () => {
		const result = lintNode(
			node({ layoutMode: "VERTICAL", name: "A".repeat(50) }),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain("too-long-name");
	});

	it("skips long names on auto-renamed text layers", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "P".repeat(80),
						type: "TEXT",
						autoRename: true,
						hasTextStyle: true,
					}),
					node({
						id: "1:3",
						name: "R".repeat(80),
						type: "TEXT",
						autoRename: false,
						hasTextStyle: true,
					}),
				],
			}),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({ ruleId: "too-long-name", nodeId: "1:2" }),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({ ruleId: "too-long-name", nodeId: "1:3" }),
		);
	});

	it("reports only invisible-layer for hidden layers and skips their contents", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "Frame 3",
						type: "FRAME",
						layoutMode: "NONE",
						visible: false,
						children: [
							node({
								id: "1:3",
								name: "Frame 4",
								type: "FRAME",
								children: [node({ id: "1:4", name: "Label", type: "TEXT" })],
							}),
							node({ id: "1:5", name: "Body", type: "TEXT" }),
						],
					}),
				],
			}),
		);

		expect(
			result.issues.filter((i) => i.nodeId === "1:2").map((i) => i.ruleId),
		).toEqual(["invisible-layer"]);
		expect(
			result.issues.filter(
				(i) => i.nodeId === "1:3" || i.nodeId === "1:4" || i.nodeId === "1:5",
			),
		).toEqual([]);
	});

	it("aggregates instance internals into a single review issue on the instance", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "UserCard",
						type: "INSTANCE",
						layoutMode: "VERTICAL",
						children: [
							node({
								id: "1:3",
								name: "Content",
								type: "FRAME",
								layoutMode: "NONE",
								children: [
									node({ id: "1:4", name: "Title", type: "TEXT" }),
									node({ id: "1:5", name: "Body", type: "TEXT" }),
								],
							}),
						],
					}),
				],
			}),
		);

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				ruleId: "instance-internal-issues",
				severity: "review",
				nodeId: "1:2",
			}),
		);
		expect(
			result.issues.filter((i) => i.nodeId !== "1:2" && i.nodeId !== "1:1"),
		).toEqual([]);
	});

	it("does not aggregate anything for clean instances", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "UserCard",
						type: "INSTANCE",
						layoutMode: "VERTICAL",
						children: [
							node({
								id: "1:3",
								name: "Label",
								type: "TEXT",
								hasTextStyle: true,
							}),
						],
					}),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"instance-internal-issues",
		);
	});

	it("ignores hidden layers inside instances", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "ToggleRow",
						type: "INSTANCE",
						layoutMode: "VERTICAL",
						children: [
							node({
								id: "1:3",
								name: "CheckedState",
								type: "FRAME",
								layoutMode: "NONE",
								visible: false,
								children: [
									node({ id: "1:4", name: "Icon A", type: "TEXT" }),
									node({ id: "1:5", name: "Icon B", type: "TEXT" }),
								],
							}),
						],
					}),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"instance-internal-issues",
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain("invisible-layer");
	});

	it("lints instance internals directly when the instance is the lint root", () => {
		const result = lintNode(
			node({
				id: "1:1",
				name: "UserCard",
				type: "INSTANCE",
				layoutMode: "VERTICAL",
				children: [
					node({ id: "1:2", name: "Label", type: "TEXT", hasTextStyle: false }),
				],
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({ ruleId: "missing-text-style", nodeId: "1:2" }),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"instance-internal-issues",
		);
	});

	it("flags duplicate sibling names on non-instance layers", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({ id: "1:2", name: "Card", type: "FRAME" }),
					node({ id: "1:3", name: "card ", type: "FRAME" }),
					node({ id: "1:4", name: "Item", type: "INSTANCE" }),
					node({ id: "1:5", name: "Item", type: "INSTANCE" }),
				],
			}),
		);

		expect(result.issues).toContainEqual(
			expect.objectContaining({
				ruleId: "duplicate-sibling-names",
				nodeId: "1:3",
			}),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({
				ruleId: "duplicate-sibling-names",
				nodeId: "1:2",
			}),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({
				ruleId: "duplicate-sibling-names",
				nodeId: "1:5",
			}),
		);
	});

	it("reviews absolutely positioned layers inside Auto Layout frames", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "Badge",
						type: "FRAME",
						layoutPositioning: "ABSOLUTE",
					}),
				],
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				ruleId: "absolute-positioning",
				severity: "review",
				nodeId: "1:2",
			}),
		);
	});

	it("does not flag absolute positioning outside Auto Layout", () => {
		const result = lintNode(
			node({
				layoutMode: "NONE",
				children: [
					node({
						id: "1:2",
						name: "Badge",
						type: "FRAME",
						layoutPositioning: "ABSOLUTE",
					}),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"absolute-positioning",
		);
	});

	it("flags component sets with default variant property names", () => {
		const result = lintNode(
			node({
				id: "1:set",
				name: "Button",
				type: "COMPONENT_SET",
				children: [
					node({
						id: "1:2",
						name: "Property 1=Default",
						type: "COMPONENT",
						children: [
							node({
								id: "1:3",
								name: "Label",
								type: "TEXT",
								hasTextStyle: true,
							}),
						],
					}),
				],
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				ruleId: "default-variant-property-names",
				nodeId: "1:set",
			}),
		);
	});

	it("does not flag component sets with named variant properties", () => {
		const result = lintNode(
			node({
				id: "1:set",
				name: "Button",
				type: "COMPONENT_SET",
				children: [
					node({
						id: "1:2",
						name: "Size=Large, State=Hover",
						type: "COMPONENT",
						children: [
							node({
								id: "1:3",
								name: "Label",
								type: "TEXT",
								hasTextStyle: true,
							}),
						],
					}),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"default-variant-property-names",
		);
	});

	it("reviews components without a description", () => {
		const result = lintNode(
			node({
				id: "1:1",
				name: "UserCard",
				type: "COMPONENT",
				layoutMode: "VERTICAL",
				hasDescription: false,
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				ruleId: "missing-component-description",
				severity: "review",
				nodeId: "1:1",
			}),
		);
	});

	it("does not flag variants inside a component set for missing descriptions", () => {
		const result = lintNode(
			node({
				id: "1:set",
				name: "Button",
				type: "COMPONENT_SET",
				hasDescription: true,
				children: [
					node({
						id: "1:2",
						name: "Size=Large",
						type: "COMPONENT",
						hasDescription: false,
						children: [
							node({
								id: "1:3",
								name: "Label",
								type: "TEXT",
								hasTextStyle: true,
							}),
						],
					}),
				],
			}),
		);
		expect(result.issues.map((i) => i.ruleId)).not.toContain(
			"missing-component-description",
		);
	});

	it("reviews placeholder text content", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "Body",
						type: "TEXT",
						hasTextStyle: true,
						textContent: "Lorem ipsum dolor sit amet",
					}),
					node({
						id: "1:3",
						name: "Title",
						type: "TEXT",
						hasTextStyle: true,
						textContent: "Order summary",
					}),
				],
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({ ruleId: "placeholder-text", nodeId: "1:2" }),
		);
		expect(result.issues).not.toContainEqual(
			expect.objectContaining({ ruleId: "placeholder-text", nodeId: "1:3" }),
		);
	});

	it("flags image layers with image-generic names like image 2", () => {
		const result = lintNode(
			node({
				layoutMode: "VERTICAL",
				children: [
					node({
						id: "1:2",
						name: "image 2",
						type: "RECTANGLE",
						hasImageFill: true,
					}),
				],
			}),
		);
		expect(result.issues).toContainEqual(
			expect.objectContaining({
				ruleId: "image-without-alt-hint",
				nodeId: "1:2",
			}),
		);
	});

	it("does not count nesting depth inside instances", () => {
		const deepInside = node({
			id: "1:9",
			name: "Deep",
			type: "FRAME",
			children: [
				node({
					id: "1:10",
					name: "Deeper",
					type: "FRAME",
					children: [node({ id: "1:11", name: "Deepest", type: "FRAME" })],
				}),
			],
		});
		const instance = node({
			id: "1:5",
			name: "Widget",
			type: "INSTANCE",
			layoutMode: "VERTICAL",
			children: [deepInside],
		});
		const l3 = node({
			id: "1:4",
			name: "L3",
			type: "FRAME",
			layoutMode: "VERTICAL",
			children: [instance],
		});
		const l2 = node({
			id: "1:3",
			name: "L2",
			type: "FRAME",
			layoutMode: "VERTICAL",
			children: [l3],
		});
		const l1 = node({
			id: "1:2",
			name: "L1",
			type: "FRAME",
			layoutMode: "VERTICAL",
			children: [l2],
		});
		const result = lintNode(node({ layoutMode: "VERTICAL", children: [l1] }));
		expect(result.issues.map((i) => i.ruleId)).not.toContain("deep-nesting");
	});
});

describe("waivers", () => {
	it("removes waived error issues from the blocking status", () => {
		const result = lintNode(
			node({
				layoutMode: "NONE",
				children: [
					node({ id: "1:2", name: "Title", type: "TEXT" }),
					node({ id: "1:3", name: "Group 1", type: "GROUP" }),
				],
			}),
		);
		const waiver: LintWaiver = {
			ruleId: "root-auto-layout",
			nodeId: "1:1",
			reason: "Legacy imported screen; implementation will flatten manually.",
			createdAt: "2026-06-19T00:00:00.000Z",
		};

		const waivedIssues = applyWaivers(result.issues, [waiver]);

		expect(
			waivedIssues.find((issue) => issue.ruleId === "root-auto-layout")?.waiver,
		).toEqual(waiver);
		expect(getLintStatus(waivedIssues)).toBe("needs-improvement");
	});

	it("uses AI Handoff Ready with ignored issues only when all active issues are resolved", () => {
		const waiver: LintWaiver = {
			ruleId: "root-auto-layout",
			nodeId: "1:1",
			reason: "Accepted exception.",
			createdAt: "2026-06-19T00:00:00.000Z",
		};

		expect(
			getLintStatus([
				{
					id: "root-auto-layout:1:1",
					ruleId: "root-auto-layout",
					severity: "error",
					nodeId: "1:1",
					nodeName: "Screen",
					message:
						"Root frame has multiple children but does not use Auto Layout.",
					recommendation: "Use Auto Layout.",
					waiver,
				},
			]),
		).toBe("ai-handoff-ready-with-ignored-issues");
	});

	it("returns ai-handoff-ready-with-ignored-issues when all warnings (not errors) are waived", () => {
		const waiver: LintWaiver = {
			ruleId: "naming-convention",
			nodeId: "1:2",
			reason: "Legacy component, accepted.",
			createdAt: "2026-06-19T00:00:00.000Z",
		};

		expect(
			getLintStatus([
				{
					id: "naming-convention:1:2",
					ruleId: "naming-convention",
					severity: "warning",
					nodeId: "1:2",
					nodeName: "Button",
					message: "Layer name does not follow naming convention.",
					recommendation: "Rename the layer.",
					waiver,
				},
			]),
		).toBe("ai-handoff-ready-with-ignored-issues");
	});
});
