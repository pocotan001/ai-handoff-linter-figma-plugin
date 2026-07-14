import { isSectionLintChildType } from "./lint-target";
import type { LintableNode } from "./types";

export function childCount(node: LintableNode): number {
	return node.children?.length ?? 0;
}

export function isComponentLike(node: LintableNode): boolean {
	return isSectionLintChildType(node.type);
}

export function isFixedSizeContainer(node: LintableNode): boolean {
	return (
		(node.type === "FRAME" || node.type === "COMPONENT") &&
		childCount(node) > 1 &&
		node.layoutMode !== undefined &&
		node.layoutMode !== "NONE" &&
		node.primaryAxisSizingMode === "FIXED"
	);
}

export function findDuplicateSiblingNames(node: LintableNode): LintableNode[] {
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

export function hasGenericName(name: string): boolean {
	const trimmed = name.trim();
	return (
		trimmed.length < 3 ||
		/^(section|frame|component|instance|group|rectangle|layer|text|ellipse|vector)(\s+\d+)?$/i.test(
			trimmed,
		)
	);
}

export function hasGenericImageName(name: string): boolean {
	return (
		hasGenericName(name) ||
		/^(image|img|photo|picture|pic|icon|thumbnail|banner)(\s+\d+)?$/i.test(
			name.trim(),
		)
	);
}

export function hasPlaceholderText(text: string): boolean {
	return (
		/lorem\s+ipsum/i.test(text) ||
		/ダミーテキスト|テキストが入ります/.test(text)
	);
}

export function hasDefaultVariantPropertyNames(node: LintableNode): boolean {
	return (node.children ?? []).some(
		(child) =>
			child.type === "COMPONENT" && /(^|,\s*)Property \d+\s*=/.test(child.name),
	);
}

export function groupContainsLayoutContent(node: LintableNode): boolean {
	return (node.children ?? []).some(
		(child) =>
			isComponentLike(child) ||
			child.type === "TEXT" ||
			child.hasImageFill === true ||
			groupContainsLayoutContent(child),
	);
}

export function hasTokenReference(node: LintableNode): boolean {
	return Boolean(node.tokenReferences && node.tokenReferences.length > 0);
}
