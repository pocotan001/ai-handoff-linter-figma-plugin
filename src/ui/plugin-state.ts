import { DEFAULT_SETTINGS, type UiSettings } from "../core/settings";
import type {
	LintResult,
	LintStatus,
	LintSummary,
	PluginToUiMessage,
} from "../core/types";
import { applyIgnoreToResult, removeIgnoreFromResult } from "./state";

export type ViewState = {
	result: LintResult | null;
	status: LintStatus | null;
	summary: LintSummary;
	error: string | null;
};

export type PluginUiState = {
	view: ViewState;
	settings: UiSettings;
	isPicking: boolean;
};

export const initialPluginUiState: PluginUiState = {
	view: {
		result: null,
		status: null,
		summary: { error: 0, warning: 0, review: 0 },
		error: null,
	},
	settings: DEFAULT_SETTINGS,
	isPicking: false,
};

export function reducePluginMessage(
	state: PluginUiState,
	message: PluginToUiMessage,
): PluginUiState {
	if (message.type === "settings-loaded") {
		return {
			...state,
			settings: {
				language: message.language,
				disabledRules: message.disabledRules,
			},
		};
	}

	if (message.type === "lint-error") {
		return { ...state, view: { ...state.view, error: message.message } };
	}

	if (message.type === "ignore-saved") {
		return {
			...state,
			view: {
				...state.view,
				...(state.view.result
					? applyIgnoreToResult(state.view.result, message.waiver)
					: {}),
				error: null,
			},
		};
	}

	if (message.type === "ignore-removed") {
		return {
			...state,
			view: {
				...state.view,
				...(state.view.result
					? removeIgnoreFromResult(
							state.view.result,
							message.ruleId,
							message.nodeId,
						)
					: {}),
				error: null,
			},
		};
	}

	if (message.type === "pick-state") {
		return { ...state, isPicking: message.picking };
	}

	return {
		...state,
		view: {
			result: message.result,
			status: message.status,
			summary: message.summary,
			error: null,
		},
	};
}
