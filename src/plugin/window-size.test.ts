import { describe, expect, it } from "vitest";
import { clampPluginWindowSize } from "./window-size";

describe("plugin window sizing", () => {
	it("clamps requested window sizes to the supported range", () => {
		expect(clampPluginWindowSize({ width: 200, height: 120 })).toEqual({
			width: 360,
			height: 320,
		});
		expect(clampPluginWindowSize({ width: 1200, height: 900 })).toEqual({
			width: 960,
			height: 720,
		});
		expect(clampPluginWindowSize({ width: 480, height: 420 })).toEqual({
			width: 480,
			height: 420,
		});
	});
});
