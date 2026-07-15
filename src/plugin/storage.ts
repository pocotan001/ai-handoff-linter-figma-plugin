import { normalizeSettings, type UiSettings } from "../core/settings";
import type { DevStatusType, LintWaiver } from "../core/types";
import type { StoredLintState } from "./lint-state";

const WAIVERS_KEY = "code-ready-lint:waivers";
const LINT_STATE_KEY = "code-ready-lint:state";
export const AI_HANDOFF_LINTER_SHARED_NAMESPACE = "ai_handoff_linter";
export const AI_HANDOFF_LINTER_SHARED_STATE_KEY = "lint-state-v1";
const SETTINGS_KEY = "code-ready-linter:settings";
const LEGACY_SETTINGS_LANGUAGE_KEY = "settings:language";
const LEGACY_SETTINGS_DISABLED_RULES_KEY = "settings:disabled-rules";

export function readWaivers(node: BaseNode): LintWaiver[] {
	try {
		const value = node.getPluginData(WAIVERS_KEY);
		return value ? (JSON.parse(value) as LintWaiver[]) : [];
	} catch {
		return [];
	}
}

export function writeWaivers(node: BaseNode, waivers: LintWaiver[]): void {
	node.setPluginData(
		WAIVERS_KEY,
		waivers.length > 0 ? JSON.stringify(waivers) : "",
	);
}

export function readLintState(node: BaseNode): StoredLintState | null {
	try {
		const value = node.getPluginData(LINT_STATE_KEY);
		return value ? (JSON.parse(value) as StoredLintState) : null;
	} catch {
		return null;
	}
}

export function writeLintState(node: BaseNode, state: StoredLintState): void {
	node.setPluginData(LINT_STATE_KEY, JSON.stringify(state));
	node.setSharedPluginData(
		AI_HANDOFF_LINTER_SHARED_NAMESPACE,
		AI_HANDOFF_LINTER_SHARED_STATE_KEY,
		JSON.stringify({ version: 1, targetNodeId: node.id, ...state }),
	);
}

export function getDevStatusType(node: BaseNode): DevStatusType | null {
	if (!("devStatus" in node)) {
		return null;
	}

	const status = (node as { devStatus: { type: DevStatusType } | null })
		.devStatus;
	return status?.type ?? null;
}

/** Reads saved settings from clientStorage; may reject on storage errors. */
export async function readSettings(): Promise<UiSettings> {
	const settings = await figma.clientStorage.getAsync(SETTINGS_KEY);
	if (isSettingsRecord(settings)) {
		return normalizeSettings(settings);
	}

	const [language, disabledRules] = await Promise.all([
		figma.clientStorage.getAsync(LEGACY_SETTINGS_LANGUAGE_KEY),
		figma.clientStorage.getAsync(LEGACY_SETTINGS_DISABLED_RULES_KEY),
	]);
	return normalizeSettings({ language, disabledRules });
}

export async function writeSettings(settings: UiSettings): Promise<void> {
	await figma.clientStorage.setAsync(SETTINGS_KEY, settings);
}

function isSettingsRecord(value: unknown): value is Partial<UiSettings> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
