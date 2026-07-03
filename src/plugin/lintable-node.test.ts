import { describe, expect, it } from "vitest";
import { collectSectionLintTargets } from "./lintable-node";

function sceneNode(type: string, id: string, children?: unknown[]): SceneNode {
	return {
		type,
		id,
		...(children ? { children } : {}),
	} as unknown as SceneNode;
}

describe("collectSectionLintTargets", () => {
	it("keeps only lintable node types as section lint targets", () => {
		const targets = collectSectionLintTargets([
			sceneNode("FRAME", "1:frame"),
			sceneNode("TEXT", "1:text"),
			sceneNode("INSTANCE", "1:instance"),
			sceneNode("RECTANGLE", "1:rect"),
		]);

		expect(targets.map((node) => node.id)).toEqual(["1:frame", "1:instance"]);
	});

	it("descends into non-lintable containers to find nested targets", () => {
		const targets = collectSectionLintTargets([
			sceneNode("GROUP", "1:group", [
				sceneNode("COMPONENT", "1:component"),
				sceneNode("VECTOR", "1:vector"),
			]),
		]);

		expect(targets.map((node) => node.id)).toEqual(["1:component"]);
	});

	it("does not descend into lintable targets themselves", () => {
		const targets = collectSectionLintTargets([
			sceneNode("FRAME", "1:outer", [sceneNode("FRAME", "1:inner")]),
		]);

		expect(targets.map((node) => node.id)).toEqual(["1:outer"]);
	});
});
