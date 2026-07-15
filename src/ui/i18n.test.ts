import { describe, expect, it } from "vitest";
import { isLocalePreference, LOCALE_PREFERENCES } from "../core/locales";
import { resolveLocale } from "./i18n";

describe("resolveLocale", () => {
	it("keeps locale preferences in one shared list", () => {
		expect(LOCALE_PREFERENCES).toEqual(["auto", "en", "ja"]);
		expect(isLocalePreference("auto")).toBe(true);
		expect(isLocalePreference("ja")).toBe(true);
		expect(isLocalePreference("de")).toBe(false);
	});

	it("uses Japanese for auto mode when navigator language is Japanese", () => {
		expect(resolveLocale("auto", "ja-JP")).toBe("ja");
	});

	it("uses English for auto mode when navigator language is not Japanese", () => {
		expect(resolveLocale("auto", "en-US")).toBe("en");
		expect(resolveLocale("auto", "fr-FR")).toBe("en");
	});

	it("uses an explicit locale over navigator language", () => {
		expect(resolveLocale("en", "ja-JP")).toBe("en");
		expect(resolveLocale("ja", "en-US")).toBe("ja");
	});
});
