import { describe, expect, it } from "vitest";
import { messages } from "../ui/i18n";
import {
	CONFIGURABLE_RULES,
	DEFAULT_DISABLED_RULES,
	formatRuleId,
	getRuleDescription,
	LINT_RULES,
} from "./rules";

describe("lint rule registry", () => {
	it("keeps configurable rule ids unique", () => {
		expect(new Set(CONFIGURABLE_RULES).size).toBe(CONFIGURABLE_RULES.length);
	});

	it("keeps non-configurable lint rules out of settings", () => {
		expect(LINT_RULES.map((rule) => rule.id)).toContain("target-frame");
		expect(CONFIGURABLE_RULES).not.toContain("target-frame");
	});

	it("does not include non-ASCII layer name enforcement", () => {
		expect(LINT_RULES.map((rule) => rule.id)).not.toContain(
			"non-ascii-layer-name",
		);
	});

	it("sorts configurable rules by label", () => {
		expect(CONFIGURABLE_RULES).toEqual(
			[...CONFIGURABLE_RULES].sort((a, b) =>
				formatRuleId(a).localeCompare(formatRuleId(b)),
			),
		);
	});

	it("has localized issue copy for every configurable rule", () => {
		for (const ruleId of CONFIGURABLE_RULES) {
			expect(messages.en.issueCopy[ruleId]?.message).toBeTruthy();
			expect(messages.ja.issueCopy[ruleId]?.message).toBeTruthy();
		}
	});

	it("only disables configurable rules by default", () => {
		for (const ruleId of DEFAULT_DISABLED_RULES) {
			expect(CONFIGURABLE_RULES).toContain(ruleId);
		}
		expect(DEFAULT_DISABLED_RULES).toEqual([]);
	});

	it("formats rule labels and descriptions from the shared registry", () => {
		expect(formatRuleId("missing-auto-layout")).toBe("Missing Auto Layout");
		expect(
			getRuleDescription("missing-auto-layout", messages.en.issueCopy),
		).toBe("This frame has multiple children but does not use Auto Layout.");
	});
});
