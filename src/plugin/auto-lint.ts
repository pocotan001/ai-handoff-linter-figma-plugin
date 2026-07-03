export type AutoLintNode = {
	id: string;
	parent?: AutoLintNode | null;
	children?: readonly AutoLintNode[];
	removed?: boolean;
};

export type AutoLintDocumentChange = {
	type: string;
	id: string;
	node?: AutoLintNode | null;
};

/** Decides whether a document change warrants an automatic lint rerun. */
export function shouldAutoLintForDocumentChanges(
	changes: AutoLintDocumentChange[],
	target: AutoLintNode | null,
	targetNodeIds: ReadonlySet<string>,
): boolean {
	if (!target) {
		return false;
	}

	return changes.some((change) => {
		if (isStyleChange(change.type)) {
			return true;
		}

		if (change.type === "DELETE" || change.node?.removed) {
			return targetNodeIds.has(change.id);
		}

		return Boolean(
			change.node && isNodeInTargetTree(change.node, target, targetNodeIds),
		);
	});
}

export function collectNodeIds(node: AutoLintNode): Set<string> {
	const ids = new Set<string>();
	collectNodeId(node, ids);
	return ids;
}

function collectNodeId(node: AutoLintNode, ids: Set<string>): void {
	ids.add(node.id);
	for (const child of node.children ?? []) {
		collectNodeId(child, ids);
	}
}

function isNodeInTargetTree(
	node: AutoLintNode,
	target: AutoLintNode,
	targetNodeIds: ReadonlySet<string>,
): boolean {
	if (targetNodeIds.has(node.id)) {
		return true;
	}

	let current = node.parent ?? null;
	while (current) {
		if (current.id === target.id) {
			return true;
		}
		current = current.parent ?? null;
	}

	return false;
}

function isStyleChange(type: string): boolean {
	return (
		type === "STYLE_CREATE" ||
		type === "STYLE_DELETE" ||
		type === "STYLE_PROPERTY_CHANGE"
	);
}
