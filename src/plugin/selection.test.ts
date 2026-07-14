import { describe, expect, it } from "vitest";
import { getSelectionErrorMessage, getSelectionTarget } from "./selection";

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

	it("preserves selection error copy", () => {
		expect(getSelectionErrorMessage([], "before running lint")).toBe(
			"Select exactly one section, frame, component, component set, or instance before running lint. Current selection: none.",
		);
		expect(getSelectionErrorMessage([node("FRAME"), node("TEXT")])).toBe(
			"Select exactly one section, frame, component, component set, or instance. Current selection: 2 nodes.",
		);
		expect(getSelectionErrorMessage([node("TEXT")])).toBe(
			"Select exactly one section, frame, component, component set, or instance. Current selection type: TEXT.",
		);
	});
});
