import type { ScopeEntry } from "./lint-walk";
import { isSectionLintChildType } from "./lint-target";
import type { LintRuleId } from "./rules";
import type { LintSeverity, LintableNode } from "./types";

const MAX_DIRECT_CHILDREN = 10;
const MAX_NESTING_DEPTH = 5;
const MAX_LAYER_NAME_LENGTH = 50;

export type NodeRule = {
	id: LintRuleId;
	severity: LintSeverity;
	/** Returns the nodes to report for this rule at the given entry. */
	findTargets: (entry: ScopeEntry, root: LintableNode) => LintableNode[];
};

export const NODE_RULES: NodeRule[] = [
	{
		id: "avoid-groups",
		severity: "warning",
		findTargets: ({ node }) =>
			own(node, node.type === "GROUP" && groupContainsLayoutContent(node)),
	},
	{
		id: "missing-auto-layout",
		severity: "warning",
		findTargets: ({ node }, root) =>
			own(
				node,
				node !== root &&
					isComponentLike(node) &&
					childCount(node) > 1 &&
					node.layoutMode === "NONE",
			),
	},
	{
		id: "fixed-size-container",
		severity: "review",
		findTargets: ({ node }, root) =>
			own(node, node !== root && isFixedSizeContainer(node)),
	},
	{
		id: "absolute-positioning",
		severity: "review",
		findTargets: ({ node, parent }, root) =>
			own(
				node,
				node !== root &&
					node.layoutPositioning === "ABSOLUTE" &&
					parent?.layoutMode !== undefined &&
					parent.layoutMode !== "NONE",
			),
	},
	{
		id: "too-many-children",
		severity: "review",
		findTargets: ({ node }) =>
			own(
				node,
				isComponentLike(node) && childCount(node) >= MAX_DIRECT_CHILDREN,
			),
	},
	{
		id: "deep-nesting",
		severity: "warning",
		// Only the shallowest offending node per branch is reported; deeper nodes
		// are covered by fixing it.
		findTargets: ({ node, depth }) =>
			own(node, depth === MAX_NESTING_DEPTH + 1),
	},
	{
		id: "too-long-name",
		severity: "warning",
		findTargets: ({ node }) =>
			own(
				node,
				node.name.trim().length > MAX_LAYER_NAME_LENGTH &&
					// Text layer names auto-follow their content unless renamed.
					!(node.type === "TEXT" && node.autoRename === true),
			),
	},
	{
		id: "semantic-layer-name",
		severity: "warning",
		findTargets: ({ node }) =>
			own(
				node,
				isComponentLike(node) &&
					childCount(node) > 0 &&
					hasGenericName(node.name),
			),
	},
	{
		id: "duplicate-sibling-names",
		severity: "warning",
		findTargets: (entry) =>
			entry.descended ? findDuplicateSiblingNames(entry.node) : [],
	},
	{
		id: "missing-text-style",
		severity: "warning",
		findTargets: ({ node }) =>
			own(node, node.type === "TEXT" && !node.hasTextStyle),
	},
	{
		id: "placeholder-text",
		severity: "review",
		findTargets: ({ node }) =>
			own(
				node,
				node.type === "TEXT" &&
					node.textContent !== undefined &&
					hasPlaceholderText(node.textContent),
			),
	},
	{
		id: "image-without-alt-hint",
		severity: "warning",
		findTargets: ({ node }) =>
			own(node, node.hasImageFill === true && hasGenericImageName(node.name)),
	},
	{
		id: "default-variant-property-names",
		severity: "warning",
		findTargets: ({ node }) =>
			own(
				node,
				node.type === "COMPONENT_SET" && hasDefaultVariantPropertyNames(node),
			),
	},
	{
		id: "missing-component-description",
		severity: "review",
		findTargets: ({ node, parent }) =>
			own(
				node,
				node.hasDescription === false &&
					(node.type === "COMPONENT_SET" ||
						(node.type === "COMPONENT" && parent?.type !== "COMPONENT_SET")),
			),
	},
	{
		id: "prefer-variables-or-styles",
		severity: "warning",
		findTargets: ({ node }) =>
			own(node, node.hasRawVisualValue === true && !hasTokenReference(node)),
	},
];

function own(node: LintableNode, matched: boolean): LintableNode[] {
	return matched ? [node] : [];
}

function childCount(node: LintableNode): number {
	return node.children?.length ?? 0;
}

function isComponentLike(node: LintableNode): boolean {
	return isSectionLintChildType(node.type);
}

function isFixedSizeContainer(node: LintableNode): boolean {
	return (
		(node.type === "FRAME" || node.type === "COMPONENT") &&
		childCount(node) > 1 &&
		node.layoutMode !== undefined &&
		node.layoutMode !== "NONE" &&
		node.primaryAxisSizingMode === "FIXED"
	);
}

function findDuplicateSiblingNames(node: LintableNode): LintableNode[] {
	const seen = new Set<string>();
	const duplicates: LintableNode[] = [];
	for (const child of node.children ?? []) {
		// Repeated instances are a normal list pattern, and hidden layers are
		// already reported separately.
		if (child.type === "INSTANCE" || child.visible === false) {
			continue;
		}
		const name = child.name.trim().toLowerCase();
		if (!name) {
			continue;
		}
		if (seen.has(name)) {
			duplicates.push(child);
		} else {
			seen.add(name);
		}
	}
	return duplicates;
}

function hasGenericName(name: string): boolean {
	const trimmed = name.trim();
	return (
		trimmed.length < 3 ||
		/^(section|frame|component|instance|group|rectangle|layer|text|ellipse|vector)(\s+\d+)?$/i.test(
			trimmed,
		)
	);
}

function hasGenericImageName(name: string): boolean {
	return (
		hasGenericName(name) ||
		/^(image|img|photo|picture|pic|icon|thumbnail|banner)(\s+\d+)?$/i.test(
			name.trim(),
		)
	);
}

function hasPlaceholderText(text: string): boolean {
	return (
		/lorem\s+ipsum/i.test(text) ||
		/ダミーテキスト|テキストが入ります/.test(text)
	);
}

function hasDefaultVariantPropertyNames(node: LintableNode): boolean {
	return (node.children ?? []).some(
		(child) =>
			child.type === "COMPONENT" && /(^|,\s*)Property \d+\s*=/.test(child.name),
	);
}

function groupContainsLayoutContent(node: LintableNode): boolean {
	return (node.children ?? []).some(
		(child) =>
			isComponentLike(child) ||
			child.type === "TEXT" ||
			child.hasImageFill === true ||
			groupContainsLayoutContent(child),
	);
}

function hasTokenReference(node: LintableNode): boolean {
	return Boolean(node.tokenReferences && node.tokenReferences.length > 0);
}
