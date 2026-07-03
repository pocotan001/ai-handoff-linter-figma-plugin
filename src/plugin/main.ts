import { isLintTargetType } from "../core/lint-target";
import {
	applyWaivers,
	getLintStatus,
	lintNode,
	summarizeIssues,
} from "../core/linter";
import {
	DEFAULT_SETTINGS,
	normalizeSettings,
	type UiSettings,
} from "../core/settings";
import type {
	DesignToken,
	LintIssue,
	LintStatus,
	LintWaiver,
	UiToPluginMessage,
} from "../core/types";
import {
	areAnnotationsEqual,
	syncAiHandoffLinterAnnotations,
} from "./annotations";
import {
	collectNodeIds,
	shouldAutoLintForDocumentChanges,
	type AutoLintDocumentChange,
} from "./auto-lint";
import { collectSectionLintTargets, toLintableNode } from "./lintable-node";
import { toLintTargetState } from "./lint-state";
import {
	getDevStatusType,
	readLintState,
	readSettings,
	readWaivers,
	writeLintState,
	writeSettings,
	writeWaivers,
} from "./storage";
import { collectFigmaDesignTokens } from "./tokens";
import {
	DEFAULT_PLUGIN_WINDOW_SIZE,
	clampPluginWindowSize,
} from "./window-size";

declare const __html__: string;

const AUTO_LINT_DELAY_MS = 500;

let currentTarget: SceneNode | null = null;
let currentTargetNodeIds = new Set<string>();
let currentWaivers: LintWaiver[] = [];
let currentDisabledRules: string[] = [...DEFAULT_SETTINGS.disabledRules];
let pickingTarget = false;
let autoLintTimer: ReturnType<typeof setTimeout> | null = null;
let nodeChangePage: PageNode | null = null;

figma.showUI(__html__, DEFAULT_PLUGIN_WINDOW_SIZE);
figma.on("selectionchange", () => {
	void handleSelectionChange();
});
// With documentAccess: "dynamic-page", figma.on("documentchange") would
// require loading every page first. Watching the current page plus style
// changes covers the same auto-lint triggers without that cost.
figma.on("currentpagechange", () => {
	watchCurrentPageForNodeChanges();
});
figma.on("stylechange", (event) => {
	handleDocumentChanges(event.styleChanges as AutoLintDocumentChange[]);
});
watchCurrentPageForNodeChanges();

figma.ui.onmessage = async (message: UiToPluginMessage) => {
	try {
		await handleMessage(message);
	} catch (error) {
		postError(
			error instanceof Error ? error.message : "Unexpected plugin error.",
		);
	}
};

async function handleMessage(message: UiToPluginMessage): Promise<void> {
	// The UI signals readiness after registering its message handler; posting
	// settings or lint results before that would silently drop the messages.
	if (message.type === "ui-ready") {
		await initializePlugin();
		return;
	}

	if (message.type === "select-node") {
		await selectNode(message.nodeId);
		return;
	}

	if (message.type === "ignore-issue") {
		const waiver = addIgnore(message.ruleId, message.nodeId, message.reason);
		if (!waiver) {
			postError("No lint target is selected.");
			return;
		}

		await rerunCurrentTarget();
		figma.ui.postMessage({ type: "ignore-saved", waiver });
		figma.notify("Ignore reason saved.");
		return;
	}

	if (message.type === "remove-ignore") {
		removeIgnore(message.ruleId, message.nodeId);
		await rerunCurrentTarget();
		figma.ui.postMessage({
			type: "ignore-removed",
			ruleId: message.ruleId,
			nodeId: message.nodeId,
		});
		return;
	}

	if (message.type === "start-pick-target") {
		beginTargetSelection();
		return;
	}

	if (message.type === "cancel-pick-target") {
		pickingTarget = false;
		figma.ui.postMessage({ type: "pick-state", picking: false });
		return;
	}

	if (message.type === "resize-window") {
		const size = clampPluginWindowSize({
			width: message.width,
			height: message.height,
		});
		figma.ui.resize(size.width, size.height);
		return;
	}

	if (message.type === "save-settings") {
		const settings = normalizeSettings({
			language: message.language,
			disabledRules: message.disabledRules,
		});
		currentDisabledRules = settings.disabledRules;
		await writeSettings(settings);
		figma.ui.postMessage({
			type: "settings-loaded",
			language: settings.language,
			disabledRules: settings.disabledRules,
		});
		if (currentTarget && !currentTarget.removed) {
			await lintTarget(currentTarget);
		}
	}
}

async function initializePlugin(): Promise<void> {
	const settings = await loadSettingsSafely();
	currentDisabledRules = settings.disabledRules;
	figma.ui.postMessage({
		type: "settings-loaded",
		language: settings.language,
		disabledRules: settings.disabledRules,
	});
	void runLint();
}

async function loadSettingsSafely(): Promise<UiSettings> {
	try {
		return await readSettings();
	} catch (error) {
		postError(
			error instanceof Error ? error.message : "Failed to load settings.",
		);
		return DEFAULT_SETTINGS;
	}
}

async function runLint(): Promise<void> {
	const target = getSelectionTarget();
	if (!target) {
		postError(getSelectionErrorMessage("before running lint"));
		return;
	}

	await lintSelectionTarget(target);
}

async function handleSelectionChange(): Promise<void> {
	if (!pickingTarget) {
		return;
	}

	const target = getSelectionTarget();
	if (!target) {
		if (figma.currentPage.selection.length === 0) {
			return;
		}

		postError(getSelectionErrorMessage());
		return;
	}

	pickingTarget = false;
	figma.ui.postMessage({ type: "pick-state", picking: false });
	await lintSelectionTarget(target);
}

function beginTargetSelection(): void {
	figma.currentPage.selection = [];
	pickingTarget = true;
	figma.ui.postMessage({ type: "pick-state", picking: true });
	figma.notify(
		"Select a section, frame, component, component set, or instance to lint.",
	);
}

async function lintSelectionTarget(target: SceneNode): Promise<void> {
	currentTarget = target;
	currentWaivers = readWaivers(target);
	await lintTarget(target);
}

async function rerunCurrentTarget(): Promise<void> {
	clearAutoLintTimer();
	if (!currentTarget || currentTarget.removed) {
		await runLint();
		return;
	}

	await lintTarget(currentTarget);
}

async function lintTarget(target: SceneNode): Promise<void> {
	const tokenCatalog = await readTokenCatalog();
	const lintable = toLintableNode(target, tokenCatalog);
	currentTargetNodeIds = collectNodeIds(lintable);
	const rawResult = lintNode(lintable);
	const result = {
		rootNodeId: rawResult.rootNodeId,
		rootNodeName: rawResult.rootNodeName,
		issues: applyWaivers(rawResult.issues, currentWaivers).filter(
			(issue) => !currentDisabledRules.includes(issue.ruleId),
		),
	};

	const status = getLintStatus(result.issues);
	const summary = summarizeIssues(result.issues);
	const targetState = writeCurrentLintState(target, status, result.issues);
	syncReadyForDevAnnotations(target, targetState);
	figma.ui.postMessage({
		type: "lint-result",
		result,
		status,
		summary,
		waivers: currentWaivers,
		targetState,
	});
}

function watchCurrentPageForNodeChanges(): void {
	if (nodeChangePage === figma.currentPage) {
		return;
	}

	nodeChangePage?.off("nodechange", handlePageNodeChange);
	nodeChangePage = figma.currentPage;
	nodeChangePage.on("nodechange", handlePageNodeChange);
}

function handlePageNodeChange(event: NodeChangeEvent): void {
	handleDocumentChanges(event.nodeChanges as AutoLintDocumentChange[]);
}

function handleDocumentChanges(changes: AutoLintDocumentChange[]): void {
	if (
		shouldAutoLintForDocumentChanges(
			changes,
			currentTarget,
			currentTargetNodeIds,
		)
	) {
		markCurrentLintStateStale();
		scheduleAutoLint();
	}
}

function writeCurrentLintState(
	target: BaseNode,
	status: LintStatus,
	issues: LintIssue[],
) {
	const state = {
		lastLintedAt: new Date().toISOString(),
		activeIssueCount: issues.filter((issue) => !issue.waiver).length,
		lintStatus: status,
		stale: false,
	};
	writeLintState(target, state);
	return toLintTargetState(state, getDevStatusType(target));
}

function syncReadyForDevAnnotations(
	target: SceneNode,
	targetState: ReturnType<typeof writeCurrentLintState>,
): void {
	for (const annotationTarget of getReadyForDevAnnotationTargets(target)) {
		const nextAnnotations = syncAiHandoffLinterAnnotations(
			annotationTarget.annotations,
			targetState,
		);
		if (!areAnnotationsEqual(annotationTarget.annotations, nextAnnotations)) {
			annotationTarget.annotations = nextAnnotations;
		}
	}
}

function getReadyForDevAnnotationTargets(
	target: SceneNode,
): AnnotationTargetNode[] {
	if (target.type === "SECTION") {
		return collectSectionLintTargets(target.children).filter(
			isAnnotationTarget,
		);
	}

	return isAnnotationTarget(target) ? [target] : [];
}

type AnnotationTargetNode = SceneNode & {
	annotations: ReadonlyArray<Annotation>;
};

function isAnnotationTarget(node: SceneNode): node is AnnotationTargetNode {
	return "annotations" in node;
}

function markCurrentLintStateStale(): void {
	if (!currentTarget || currentTarget.removed) {
		return;
	}

	const stored = readLintState(currentTarget);
	const nextState = stored ? { ...stored, stale: true } : null;
	if (nextState) {
		writeLintState(currentTarget, nextState);
	}
}

function scheduleAutoLint(): void {
	clearAutoLintTimer();
	autoLintTimer = setTimeout(() => {
		autoLintTimer = null;
		void rerunCurrentTarget();
	}, AUTO_LINT_DELAY_MS);
}

function clearAutoLintTimer(): void {
	if (autoLintTimer === null) {
		return;
	}

	clearTimeout(autoLintTimer);
	autoLintTimer = null;
}

function getSelectionTarget(): SceneNode | null {
	const selection = figma.currentPage.selection;
	if (selection.length !== 1) {
		return null;
	}

	const target = selection[0];
	return isLintTargetType(target.type) ? target : null;
}

function getSelectionErrorMessage(suffix?: string): string {
	const selection = figma.currentPage.selection;
	const targetDescription =
		"section, frame, component, component set, or instance";
	const action = suffix ? ` ${suffix}` : "";

	if (selection.length === 0) {
		return `Select exactly one ${targetDescription}${action}. Current selection: none.`;
	}

	if (selection.length > 1) {
		return `Select exactly one ${targetDescription}${action}. Current selection: ${selection.length} nodes.`;
	}

	return `Select exactly one ${targetDescription}${action}. Current selection type: ${selection[0].type}.`;
}

async function selectNode(nodeId: string): Promise<void> {
	const node = await figma.getNodeByIdAsync(nodeId);
	if (!node || !("visible" in node)) {
		postError("The selected issue node no longer exists.");
		return;
	}

	figma.currentPage.selection = [node as SceneNode];
	figma.viewport.scrollAndZoomIntoView([node as SceneNode]);
}

function addIgnore(
	ruleId: string,
	nodeId: string,
	reason: string,
): LintWaiver | null {
	if (!currentTarget) {
		return null;
	}

	const waiver = {
		ruleId,
		nodeId,
		reason: reason.trim(),
		createdAt: new Date().toISOString(),
	};
	currentWaivers = currentWaivers.filter(
		(waiver) => waiver.ruleId !== ruleId || waiver.nodeId !== nodeId,
	);
	currentWaivers.push(waiver);
	writeWaivers(currentTarget, currentWaivers);
	return waiver;
}

function removeIgnore(ruleId: string, nodeId: string): void {
	if (!currentTarget) {
		return;
	}

	currentWaivers = currentWaivers.filter(
		(waiver) => waiver.ruleId !== ruleId || waiver.nodeId !== nodeId,
	);
	writeWaivers(currentTarget, currentWaivers);
}

async function readTokenCatalog(): Promise<DesignToken[]> {
	try {
		return await collectFigmaDesignTokens(figma);
	} catch {
		return [];
	}
}

function postError(message: string): void {
	figma.ui.postMessage({ type: "lint-error", message });
}
