import { describe, expect, it } from "vitest";
import {
	CONFIGURABLE_RULES,
	DEFAULT_DISABLED_RULES,
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

	it("only disables configurable rules by default", () => {
		for (const ruleId of DEFAULT_DISABLED_RULES) {
			expect(CONFIGURABLE_RULES).toContain(ruleId);
		}
		expect(DEFAULT_DISABLED_RULES).toEqual([]);
	});
});
