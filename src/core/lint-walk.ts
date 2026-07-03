import type { LintableNode } from "./types";

export type ScopeEntry = {
	node: LintableNode;
	parent: LintableNode | null;
	/** Nesting depth from the scope root (0 for the root itself). */
	depth: number;
	/** False when the walk stopped at this node (hidden layer or instance boundary). */
	descended: boolean;
};

export type LintScope = {
	entries: ScopeEntry[];
	instanceRoots: LintableNode[];
};

/**
 * Walks the lint scope. Hidden layers are included (so they can be reported)
 * but their contents are skipped, and non-root instances are boundaries whose
 * internals are linted separately via walkInstanceInternals.
 */
export function walkScope(root: LintableNode): LintScope {
	const entries: ScopeEntry[] = [];
	const instanceRoots: LintableNode[] = [];

	const visit = (
		node: LintableNode,
		parent: LintableNode | null,
		depth: number,
	): void => {
		const hidden = node.visible === false;
		const instanceBoundary = node.type === "INSTANCE" && node !== root;
		const descended = !hidden && !instanceBoundary;
		entries.push({ node, parent, depth, descended });

		if (instanceBoundary && !hidden) {
			instanceRoots.push(node);
		}
		if (!descended) {
			return;
		}
		for (const child of node.children ?? []) {
			visit(child, node, depth + 1);
		}
	};

	visit(root, null, 0);
	return { entries, instanceRoots };
}

/**
 * Walks the contents of an instance. Hidden layers inside instances usually
 * represent variant or boolean-prop states, so hidden subtrees are skipped
 * entirely instead of reported. The instance node itself is excluded because
 * it is already checked in the main scope.
 */
export function walkInstanceInternals(instance: LintableNode): ScopeEntry[] {
	const entries: ScopeEntry[] = [];

	const visit = (
		node: LintableNode,
		parent: LintableNode | null,
		depth: number,
	): void => {
		if (node.visible === false) {
			return;
		}
		if (node !== instance) {
			entries.push({ node, parent, depth, descended: true });
		}
		for (const child of node.children ?? []) {
			visit(child, node, depth + 1);
		}
	};

	visit(instance, null, 0);
	return entries;
}
