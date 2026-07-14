import { isLintTargetType } from "../core/lint-target";

const targetDescription =
	"section, frame, component, component set, or instance";

export function getSelectionTarget(
	selection: readonly SceneNode[],
): SceneNode | null {
	const target = selection[0];
	return selection.length === 1 && target && isLintTargetType(target.type)
		? target
		: null;
}

export function getSelectionErrorMessage(
	selection: readonly SceneNode[],
	suffix?: string,
): string {
	const action = suffix ? ` ${suffix}` : "";

	if (selection.length === 0) {
		return `Select exactly one ${targetDescription}${action}. Current selection: none.`;
	}

	if (selection.length > 1) {
		return `Select exactly one ${targetDescription}${action}. Current selection: ${selection.length} nodes.`;
	}

	return `Select exactly one ${targetDescription}${action}. Current selection type: ${selection[0]?.type ?? "unknown"}.`;
}
