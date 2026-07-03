import { describe, expect, it } from "vitest";
import { isLintTargetType } from "./lint-target";

describe("lint target selection", () => {
	it("accepts ready-for-dev node types plus instances", () => {
		expect(isLintTargetType("SECTION")).toBe(true);
		expect(isLintTargetType("FRAME")).toBe(true);
		expect(isLintTargetType("COMPONENT")).toBe(true);
		expect(isLintTargetType("COMPONENT_SET")).toBe(true);
		expect(isLintTargetType("INSTANCE")).toBe(true);
	});

	it("rejects non-frame-like node types", () => {
		expect(isLintTargetType("RECTANGLE")).toBe(false);
		expect(isLintTargetType("GROUP")).toBe(false);
	});
});
