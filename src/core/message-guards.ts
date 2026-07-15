import { isLocalePreference } from "./locales";
import type { PluginToUiMessage, UiToPluginMessage } from "./types";

export function isUiToPluginMessage(
	value: unknown,
): value is UiToPluginMessage {
	if (!isRecord(value) || typeof value.type !== "string") {
		return false;
	}

	if (value.type === "ui-ready") {
		const { navigatorLanguage } = value;
		return isString(navigatorLanguage);
	}

	if (
		value.type === "start-pick-target" ||
		value.type === "cancel-pick-target"
	) {
		return true;
	}

	if (value.type === "select-node") {
		return isString(value.nodeId);
	}

	if (value.type === "ignore-issue") {
		return (
			isString(value.ruleId) && isString(value.nodeId) && isString(value.reason)
		);
	}

	if (value.type === "remove-ignore") {
		return isString(value.ruleId) && isString(value.nodeId);
	}

	if (value.type === "resize-window") {
		return isNumber(value.width) && isNumber(value.height);
	}

	return (
		value.type === "save-settings" &&
		isLocalePreference(value.language) &&
		isStringArray(value.disabledRules)
	);
}

export function isPluginToUiMessage(
	value: unknown,
): value is PluginToUiMessage {
	if (!isRecord(value) || typeof value.type !== "string") {
		return false;
	}

	if (value.type === "lint-result") {
		return (
			isLintResult(value.result) &&
			isLintStatus(value.status) &&
			isLintSummary(value.summary) &&
			isLintWaiverArray(value.waivers) &&
			isLintTargetState(value.targetState)
		);
	}

	if (value.type === "ignore-saved") {
		return isLintWaiver(value.waiver);
	}

	if (value.type === "ignore-removed") {
		return isString(value.ruleId) && isString(value.nodeId);
	}

	if (value.type === "pick-state") {
		return typeof value.picking === "boolean";
	}

	if (value.type === "lint-error") {
		return isString(value.message);
	}

	return (
		value.type === "settings-loaded" &&
		isLocalePreference(value.language) &&
		isStringArray(value.disabledRules)
	);
}

function isLintResult(value: unknown): boolean {
	return (
		isRecord(value) &&
		isString(value.rootNodeId) &&
		isString(value.rootNodeName) &&
		Array.isArray(value.issues) &&
		value.issues.every(isLintIssue)
	);
}

function isLintIssue(value: unknown): boolean {
	return (
		isRecord(value) &&
		isString(value.id) &&
		isString(value.ruleId) &&
		isLintSeverity(value.severity) &&
		isString(value.nodeId) &&
		isString(value.nodeName) &&
		isString(value.message) &&
		isString(value.recommendation) &&
		(value.evidence === undefined || isString(value.evidence)) &&
		(value.waiver === undefined || isLintWaiver(value.waiver))
	);
}

function isLintSummary(value: unknown): boolean {
	return (
		isRecord(value) &&
		isNumber(value.error) &&
		isNumber(value.warning) &&
		isNumber(value.review)
	);
}

function isLintWaiverArray(value: unknown): boolean {
	return Array.isArray(value) && value.every(isLintWaiver);
}

function isLintWaiver(value: unknown): boolean {
	return (
		isRecord(value) &&
		isString(value.ruleId) &&
		isString(value.nodeId) &&
		isString(value.reason) &&
		isString(value.createdAt)
	);
}

function isLintTargetState(value: unknown): boolean {
	return (
		isRecord(value) &&
		isLintReadiness(value.readiness) &&
		(value.lastLintedAt === undefined || isString(value.lastLintedAt)) &&
		(value.activeIssueCount === undefined ||
			isNumber(value.activeIssueCount)) &&
		(value.devStatus === undefined ||
			value.devStatus === null ||
			value.devStatus === "READY_FOR_DEV" ||
			value.devStatus === "COMPLETED")
	);
}

function isLintSeverity(value: unknown): boolean {
	return value === "error" || value === "warning" || value === "review";
}

function isLintStatus(value: unknown): boolean {
	return (
		value === "needs-design-fix" ||
		value === "needs-improvement" ||
		value === "ai-handoff-ready" ||
		value === "ai-handoff-ready-with-ignored-issues"
	);
}

function isLintReadiness(value: unknown): boolean {
	return (
		value === "lint-required" ||
		value === "stale" ||
		value === "needs-fixes" ||
		value === "ai-handoff-ready"
	);
}

type UnknownRecord = {
	[key: string]: unknown;
	type?: unknown;
	nodeId?: unknown;
	ruleId?: unknown;
	reason?: unknown;
	width?: unknown;
	height?: unknown;
	language?: unknown;
	disabledRules?: unknown;
	result?: unknown;
	status?: unknown;
	summary?: unknown;
	waivers?: unknown;
	targetState?: unknown;
	waiver?: unknown;
	picking?: unknown;
	message?: unknown;
	rootNodeId?: unknown;
	rootNodeName?: unknown;
	issues?: unknown;
	id?: unknown;
	severity?: unknown;
	nodeName?: unknown;
	recommendation?: unknown;
	evidence?: unknown;
	error?: unknown;
	warning?: unknown;
	review?: unknown;
	createdAt?: unknown;
	readiness?: unknown;
	lastLintedAt?: unknown;
	activeIssueCount?: unknown;
	devStatus?: unknown;
};

function isRecord(value: unknown): value is UnknownRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isString(value: unknown): value is string {
	return typeof value === "string";
}

function isStringArray(value: unknown): value is string[] {
	return Array.isArray(value) && value.every(isString);
}

function isNumber(value: unknown): value is number {
	return typeof value === "number" && Number.isFinite(value);
}
