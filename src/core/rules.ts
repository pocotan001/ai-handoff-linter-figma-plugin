import type { IssueCopy } from "./issue-copy";

export const LINT_RULES = [
	{ id: "target-frame", configurable: false },
	{ id: "root-auto-layout", configurable: true },
	{ id: "avoid-groups", configurable: true },
	{ id: "missing-auto-layout", configurable: true },
	{ id: "fixed-size-container", configurable: true },
	{ id: "absolute-positioning", configurable: true },
	{ id: "invisible-layer", configurable: true },
	{ id: "too-many-children", configurable: true },
	{ id: "deep-nesting", configurable: true },
	{ id: "semantic-layer-name", configurable: true },
	{ id: "duplicate-sibling-names", configurable: true },
	{ id: "too-long-name", configurable: true },
	{ id: "prefer-variables-or-styles", configurable: true },
	{ id: "missing-text-style", configurable: true },
	{ id: "placeholder-text", configurable: true },
	{ id: "image-without-alt-hint", configurable: true },
	{ id: "instance-internal-issues", configurable: true },
	{ id: "default-variant-property-names", configurable: true },
	{ id: "missing-component-description", configurable: true },
] as const;

export type LintRuleId = (typeof LINT_RULES)[number]["id"];
export type ConfigurableRuleId = Extract<
	(typeof LINT_RULES)[number],
	{ configurable: true }
>["id"];

export const CONFIGURABLE_RULES = LINT_RULES.filter((rule) => rule.configurable)
	.map((rule) => rule.id)
	.sort((a, b) =>
		formatRuleId(a).localeCompare(formatRuleId(b)),
	) as ConfigurableRuleId[];

export const DEFAULT_DISABLED_RULES: ConfigurableRuleId[] = [];

export function formatRuleId(ruleId: string): string {
	return ruleId.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getRuleDescription(
	ruleId: ConfigurableRuleId,
	issueCopy: Record<string, IssueCopy>,
): string {
	return issueCopy[ruleId]?.message ?? formatRuleId(ruleId);
}
