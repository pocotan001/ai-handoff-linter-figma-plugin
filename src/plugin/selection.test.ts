import { describe, expect, it } from "vitest";
import { getSelectionTarget } from "./selection";

const node = (type: SceneNode["type"]): SceneNode => ({ type }) as SceneNode;

describe("plugin selection", () => {
	it("accepts exactly one lint target", () => {
		expect(getSelectionTarget([node("FRAME")])).toMatchObject({
			type: "FRAME",
		});
		expect(getSelectionTarget([])).toBeNull();
		expect(getSelectionTarget([node("TEXT")])).toBeNull();
		expect(getSelectionTarget([node("FRAME"), node("COMPONENT")])).toBeNull();
	});
});
