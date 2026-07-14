import { isSectionLintChildType } from "../core/lint-target";
import type { DesignToken, LintableNode, TokenReference } from "../core/types";

/** Converts a Figma scene node into the plain tree the linter operates on. */
export function toLintableNode(
	node: SceneNode,
	tokenCatalog: DesignToken[],
): LintableNode {
	const layoutMode = getLayoutMode(node);
	const layoutPositioning = getLayoutPositioning(node);
	const primaryAxisSizingMode = getPrimaryAxisSizingMode(node);
	const hasDescription =
		"description" in node ? node.description.trim().length > 0 : undefined;
	const autoRename = "autoRename" in node ? node.autoRename : undefined;
	const textContent = node.type === "TEXT" ? node.characters : undefined;
	const visible =
		"visible" in node ? (node as { visible: boolean }).visible : undefined;

	return {
		id: node.id,
		name: node.name,
		type: node.type,
		...(layoutMode === undefined ? {} : { layoutMode }),
		...(layoutPositioning === undefined ? {} : { layoutPositioning }),
		...(primaryAxisSizingMode === undefined ? {} : { primaryAxisSizingMode }),
		children: getLintableChildren(node).map((child) =>
			toLintableNode(child, tokenCatalog),
		),
		hasRawVisualValue: hasRawVisualValue(node),
		hasTextStyle: hasStyleId(node, "textStyleId"),
		hasImageFill: getHasImageFill(node),
		...(hasDescription === undefined ? {} : { hasDescription }),
		...(autoRename === undefined ? {} : { autoRename }),
		...(textContent === undefined ? {} : { textContent }),
		...(visible === undefined ? {} : { visible }),
		tokenReferences: getTokenReferences(node, tokenCatalog),
	};
}

/**
 * Sections are containers for multiple deliverables, so linting one collects
 * the lintable frames, components, and instances inside it.
 */
export function collectSectionLintTargets(
	nodes: readonly SceneNode[],
): SceneNode[] {
	const targets: SceneNode[] = [];
	for (const node of nodes) {
		if (isSectionLintChildType(node.type)) {
			targets.push(node);
			continue;
		}

		if ("children" in node) {
			targets.push(...collectSectionLintTargets(node.children));
		}
	}
	return targets;
}

function getLintableChildren(node: SceneNode): SceneNode[] {
	if (!("children" in node)) {
		return [];
	}

	if (node.type !== "SECTION") {
		return [...node.children];
	}

	return collectSectionLintTargets(node.children);
}

function getLayoutMode(node: SceneNode): LintableNode["layoutMode"] {
	return "layoutMode" in node ? node.layoutMode : undefined;
}

function getLayoutPositioning(
	node: SceneNode,
): LintableNode["layoutPositioning"] {
	return "layoutPositioning" in node ? node.layoutPositioning : undefined;
}

function getPrimaryAxisSizingMode(
	node: SceneNode,
): LintableNode["primaryAxisSizingMode"] {
	return "primaryAxisSizingMode" in node
		? (node.primaryAxisSizingMode as "FIXED" | "AUTO")
		: undefined;
}

function getHasImageFill(node: SceneNode): boolean {
	if (!("fills" in node)) return false;
	const fills = node.fills;
	if (!Array.isArray(fills)) return false;
	return fills.some((fill) => fill.type === "IMAGE");
}

function hasStyleId(node: SceneNode, key: string): boolean {
	if (!(key in node)) {
		return false;
	}

	const value = (node as unknown as Record<string, unknown>)[key];
	return typeof value === "string" && value.length > 0;
}

function hasRawVisualValue(node: SceneNode): boolean {
	return (
		hasRawChannelValue(node, "fills", "fillStyleId") ||
		hasRawChannelValue(node, "strokes", "strokeStyleId") ||
		hasRawChannelValue(node, "effects", "effectStyleId")
	);
}

// A channel is raw only when it has entries that are not covered by a style,
// a variable binding, or media content (image/video fills cannot be tokens).
function hasRawChannelValue(
	node: SceneNode,
	key: "fills" | "strokes" | "effects",
	styleKey: string,
): boolean {
	if (hasStyleId(node, styleKey) || isChannelVariableBound(node, key)) {
		return false;
	}

	const value = (node as unknown as Record<string, unknown>)[key];
	if (!Array.isArray(value)) {
		return false;
	}

	return value.some(
		(entry) => !isMediaPaint(entry) && !hasEntryBoundVariables(entry),
	);
}

function isChannelVariableBound(node: SceneNode, key: string): boolean {
	if (!("boundVariables" in node) || !node.boundVariables) {
		return false;
	}

	const bound = (node.boundVariables as Record<string, unknown>)[key];
	return Array.isArray(bound) ? bound.length > 0 : Boolean(bound);
}

function isMediaPaint(entry: unknown): boolean {
	const type = (entry as { type?: string } | null)?.type;
	return type === "IMAGE" || type === "VIDEO";
}

function hasEntryBoundVariables(entry: unknown): boolean {
	const bound = (entry as { boundVariables?: Record<string, unknown> } | null)
		?.boundVariables;
	return Boolean(bound && Object.keys(bound).length > 0);
}

function getTokenReferences(
	node: SceneNode,
	tokenCatalog: DesignToken[],
): TokenReference[] {
	const tokenIds = new Set<string>();
	for (const styleId of getStyleIds(node)) {
		tokenIds.add(styleId);
	}
	collectVariableAliasIds(
		"boundVariables" in node ? node.boundVariables : undefined,
		tokenIds,
	);

	const tokensById = new Map(
		tokenCatalog.flatMap((token) =>
			token.figma ? [[token.figma.id, token]] : [],
		),
	);
	const references: TokenReference[] = [];
	for (const id of tokenIds) {
		const token = tokensById.get(id);
		if (token) {
			references.push({
				id,
				name: token.name,
				type: token.type,
				source: token.source,
			});
		}
	}
	return references;
}

function getStyleIds(node: SceneNode): string[] {
	return [
		"fillStyleId",
		"strokeStyleId",
		"textStyleId",
		"effectStyleId",
		"gridStyleId",
	].flatMap((key) => {
		if (!(key in node)) {
			return [];
		}

		const value = (node as unknown as Record<string, unknown>)[key];
		return typeof value === "string" && value.length > 0 ? [value] : [];
	});
}

function collectVariableAliasIds(value: unknown, tokenIds: Set<string>): void {
	if (!value) {
		return;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			collectVariableAliasIds(item, tokenIds);
		}
		return;
	}

	if (typeof value !== "object") {
		return;
	}

	const maybeAlias = value as { type?: unknown; id?: unknown };
	if (
		maybeAlias.type === "VARIABLE_ALIAS" &&
		typeof maybeAlias.id === "string"
	) {
		tokenIds.add(maybeAlias.id);
		return;
	}

	for (const item of Object.values(value)) {
		collectVariableAliasIds(item, tokenIds);
	}
}
