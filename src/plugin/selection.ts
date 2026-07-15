import { isLintTargetType } from "../core/lint-target";
import type { Locale } from "../core/locales";

const targetDescription =
	"section, frame, component, component set, or instance";
const japaneseTargetDescription =
	"セクション、フレーム、コンポーネント、コンポーネントセット、またはインスタンス";

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
	locale: Locale = "en",
): string {
	if (locale === "ja") {
		const prefix = `${japaneseTargetDescription}を1つだけ選択してください。`;

		if (selection.length === 0) {
			return `${prefix}現在の選択: なし。`;
		}

		if (selection.length > 1) {
			return `${prefix}現在の選択: ${selection.length}個のノード。`;
		}

		return `${prefix}現在の選択タイプ: ${selection[0]?.type ?? "unknown"}。`;
	}

	if (selection.length === 0) {
		return `Select exactly one ${targetDescription}. Current selection: none.`;
	}

	if (selection.length > 1) {
		return `Select exactly one ${targetDescription}. Current selection: ${selection.length} nodes.`;
	}

	return `Select exactly one ${targetDescription}. Current selection type: ${selection[0]?.type ?? "unknown"}.`;
}
