import { describe, expect, it } from "vitest";
import { isLocalePreference, LOCALE_PREFERENCES } from "../core/locales";
import type { LintIssue } from "../core/types";
import {
	formatStatus,
	messages,
	resolveLocale,
	translateIssueCopy,
} from "./i18n";

describe("resolveLocale", () => {
	it("keeps locale preferences in one shared list", () => {
		expect(LOCALE_PREFERENCES).toEqual(["auto", "en", "ja"]);
		expect(isLocalePreference("auto")).toBe(true);
		expect(isLocalePreference("ja")).toBe(true);
		expect(isLocalePreference("de")).toBe(false);
		expect(Object.keys(messages.en.languageOptions)).toEqual(
			LOCALE_PREFERENCES,
		);
		expect(Object.keys(messages.ja.languageOptions)).toEqual(
			LOCALE_PREFERENCES,
		);
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

describe("translateIssueCopy", () => {
	it("uses localized issue text for known rule ids", () => {
		const issue = issueFixture({
			ruleId: "root-auto-layout",
			message: "Root frame has multiple children but does not use Auto Layout.",
			recommendation:
				"Use Auto Layout on the root frame or split the design into clearer frame sections.",
		});

		expect(translateIssueCopy(issue, messages.ja)).toBe(
			messages.ja.issueCopy["root-auto-layout"],
		);
	});

	it("falls back to the original issue text for unknown rule ids", () => {
		const issue = issueFixture({
			ruleId: "custom-rule",
			message: "Original message.",
			recommendation: "Original recommendation.",
		});

		expect(translateIssueCopy(issue, messages.ja)).toEqual({
			message: "Original message.",
			recommendation: "Original recommendation.",
		});
	});
});

describe("status labels", () => {
	it("maps lint statuses to localized message keys", () => {
		expect(formatStatus("needs-design-fix", messages.en)).toBe(
			messages.en.needsDesignFix,
		);
		expect(formatStatus("needs-improvement", messages.en)).toBe(
			messages.en.needsImprovement,
		);
		expect(
			formatStatus("ai-handoff-ready-with-ignored-issues", messages.en),
		).toBe(messages.en.aiHandoffReadyWithIgnoredIssues);
		expect(formatStatus("ai-handoff-ready", messages.en)).toBe(
			messages.en.aiHandoffReady,
		);
		expect(formatStatus(null, messages.en)).toBe(messages.en.noLintResult);
	});
});

function issueFixture(
	overrides: Pick<LintIssue, "ruleId" | "message" | "recommendation">,
): LintIssue {
	return {
		id: `${overrides.ruleId}:1`,
		severity: "error",
		nodeId: "1",
		nodeName: "Root",
		...overrides,
	};
}
