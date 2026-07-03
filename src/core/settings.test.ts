import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, normalizeSettings } from "./settings";

const DEFAULT_DISABLED: string[] = [];

describe("settings normalization", () => {
	it("defaults language to auto", () => {
		expect(normalizeSettings({})).toEqual({
			language: "auto",
			disabledRules: DEFAULT_DISABLED,
		});
	});

	it("loads valid language settings", () => {
		expect(normalizeSettings({ language: "ja" })).toEqual({
			language: "ja",
			disabledRules: DEFAULT_DISABLED,
		});
	});

	it("falls back to auto for invalid settings", () => {
		expect(normalizeSettings({ language: "de" as never })).toEqual({
			language: "auto",
			disabledRules: DEFAULT_DISABLED,
		});
	});

	it("loads disabled rules", () => {
		expect(
			normalizeSettings({ language: "en", disabledRules: ["avoid-groups"] }),
		).toEqual({ language: "en", disabledRules: ["avoid-groups"] });
	});

	it("respects an explicitly empty disabledRules array", () => {
		expect(normalizeSettings({ language: "en", disabledRules: [] })).toEqual({
			language: "en",
			disabledRules: [],
		});
	});

	it("exports default settings", () => {
		expect(DEFAULT_SETTINGS).toEqual({
			language: "auto",
			disabledRules: DEFAULT_DISABLED,
		});
	});
});
