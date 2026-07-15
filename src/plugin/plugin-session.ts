import {
	applyWaivers,
	getLintStatus,
	lintNode,
	summarizeIssues,
} from "../core/linter";
import type { Locale } from "../core/locales";
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
	type AutoLintDocumentChange,
	collectNodeIds,
	shouldAutoLintForDocumentChanges,
} from "./auto-lint";
import { toLintTargetState } from "./lint-state";
import { collectSectionLintTargets, toLintableNode } from "./lintable-node";
import { getSelectionErrorMessage, getSelectionTarget } from "./selection";
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
import { clampPluginWindowSize } from "./window-size";

const AUTO_LINT_DELAY_MS = 500;

export class PluginSession {
	private currentTarget: SceneNode | null = null;
	private currentTargetNodeIds = new Set<string>();
	private currentWaivers: LintWaiver[] = [];
	private currentDisabledRules: string[] = [...DEFAULT_SETTINGS.disabledRules];
	private pickingTarget = false;
	private autoLintTimer: ReturnType<typeof setTimeout> | null = null;
	private nodeChangePage: PageNode | null = null;
	private locale: Locale = "en";
	private navigatorLanguage = "en";

	constructor(private readonly figmaApi: PluginAPI) {}

	async handleMessage(message: UiToPluginMessage): Promise<void> {
		// The UI signals readiness after registering its message handler; posting
		// settings or lint results before that would silently drop the messages.
		if (message.type === "ui-ready") {
			this.navigatorLanguage = message.navigatorLanguage;
			await this.initializePlugin();
			return;
		}

		if (message.type === "select-node") {
			await this.selectNode(message.nodeId);
			return;
		}

		if (message.type === "ignore-issue") {
			const waiver = this.addIgnore(
				message.ruleId,
				message.nodeId,
				message.reason,
			);
			if (!waiver) {
				this.postError("No lint target is selected.");
				return;
			}

			await this.rerunCurrentTarget();
			this.figmaApi.ui.postMessage({ type: "ignore-saved", waiver });
			this.figmaApi.notify(
				this.locale === "ja"
					? "無視する理由を保存しました。"
					: "Ignore reason saved.",
			);
			return;
		}

		if (message.type === "remove-ignore") {
			this.removeIgnore(message.ruleId, message.nodeId);
			await this.rerunCurrentTarget();
			this.figmaApi.ui.postMessage({
				type: "ignore-removed",
				ruleId: message.ruleId,
				nodeId: message.nodeId,
			});
			return;
		}

		if (message.type === "start-pick-target") {
			this.beginTargetSelection();
			return;
		}

		if (message.type === "cancel-pick-target") {
			this.pickingTarget = false;
			this.figmaApi.ui.postMessage({ type: "pick-state", picking: false });
			return;
		}

		if (message.type === "resize-window") {
			const size = clampPluginWindowSize({
				width: message.width,
				height: message.height,
			});
			this.figmaApi.ui.resize(size.width, size.height);
			return;
		}

		if (message.type === "save-settings") {
			const settings = normalizeSettings({
				language: message.language,
				disabledRules: message.disabledRules,
			});
			this.currentDisabledRules = settings.disabledRules;
			this.locale = resolvePluginLocale(
				settings.language,
				this.navigatorLanguage,
			);
			await writeSettings(settings);
			this.figmaApi.ui.postMessage({
				type: "settings-loaded",
				language: settings.language,
				disabledRules: settings.disabledRules,
			});
			if (this.currentTarget && !this.currentTarget.removed) {
				await this.lintTarget(this.currentTarget);
			}
		}
	}

	async handleSelectionChange(): Promise<void> {
		if (!this.pickingTarget) {
			return;
		}

		const selection = this.figmaApi.currentPage.selection;
		const target = getSelectionTarget(selection);
		if (!target) {
			if (selection.length === 0) {
				return;
			}

			this.pickingTarget = false;
			this.figmaApi.ui.postMessage({ type: "pick-state", picking: false });
			this.figmaApi.notify(getSelectionErrorMessage(selection, this.locale), {
				error: true,
				timeout: 5_000,
			});
			return;
		}

		this.pickingTarget = false;
		this.figmaApi.ui.postMessage({ type: "pick-state", picking: false });
		await this.lintSelectionTarget(target);
	}

	handlePageChange(): void {
		this.watchCurrentPageForNodeChanges();
	}

	handleStyleChanges(changes: AutoLintDocumentChange[]): void {
		this.handleDocumentChanges(changes);
	}

	handleNodeChanges(changes: AutoLintDocumentChange[]): void {
		this.handleDocumentChanges(changes);
	}

	private async initializePlugin(): Promise<void> {
		const settings = await this.loadSettingsSafely();
		this.currentDisabledRules = settings.disabledRules;
		this.locale = resolvePluginLocale(
			settings.language,
			this.navigatorLanguage,
		);
		this.figmaApi.ui.postMessage({
			type: "settings-loaded",
			language: settings.language,
			disabledRules: settings.disabledRules,
		});
		void this.runLint();
	}

	private async loadSettingsSafely(): Promise<UiSettings> {
		try {
			return await readSettings();
		} catch (error) {
			this.postError(
				error instanceof Error ? error.message : "Failed to load settings.",
			);
			return DEFAULT_SETTINGS;
		}
	}

	private async runLint(): Promise<void> {
		const selection = this.figmaApi.currentPage.selection;
		const target = getSelectionTarget(selection);
		if (!target) {
			return;
		}

		await this.lintSelectionTarget(target);
	}

	private beginTargetSelection(): void {
		this.figmaApi.currentPage.selection = [];
		this.pickingTarget = true;
		this.figmaApi.ui.postMessage({ type: "pick-state", picking: true });
	}

	private async lintSelectionTarget(target: SceneNode): Promise<void> {
		this.currentTarget = target;
		this.currentWaivers = readWaivers(target);
		await this.lintTarget(target);
	}

	private async rerunCurrentTarget(): Promise<void> {
		this.clearAutoLintTimer();
		if (!this.currentTarget || this.currentTarget.removed) {
			await this.runLint();
			return;
		}

		await this.lintTarget(this.currentTarget);
	}

	private async lintTarget(target: SceneNode): Promise<void> {
		const tokenCatalog = await this.readTokenCatalog();
		const lintable = toLintableNode(target, tokenCatalog);
		this.currentTargetNodeIds = collectNodeIds(lintable);
		const rawResult = lintNode(lintable);
		const result = {
			rootNodeId: rawResult.rootNodeId,
			rootNodeName: rawResult.rootNodeName,
			issues: applyWaivers(rawResult.issues, this.currentWaivers).filter(
				(issue) => !this.currentDisabledRules.includes(issue.ruleId),
			),
		};

		const status = getLintStatus(result.issues);
		const summary = summarizeIssues(result.issues);
		const targetState = this.writeCurrentLintState(
			target,
			status,
			result.issues,
		);
		this.syncReadyForDevAnnotations(target, targetState);
		this.figmaApi.ui.postMessage({
			type: "lint-result",
			result,
			status,
			summary,
			waivers: this.currentWaivers,
			targetState,
		});
	}

	private watchCurrentPageForNodeChanges(): void {
		if (this.nodeChangePage === this.figmaApi.currentPage) {
			return;
		}

		this.nodeChangePage?.off("nodechange", this.handlePageNodeChange);
		this.nodeChangePage = this.figmaApi.currentPage;
		this.nodeChangePage.on("nodechange", this.handlePageNodeChange);
	}

	private readonly handlePageNodeChange = (event: NodeChangeEvent): void => {
		this.handleNodeChanges(event.nodeChanges as AutoLintDocumentChange[]);
	};

	private handleDocumentChanges(changes: AutoLintDocumentChange[]): void {
		if (
			shouldAutoLintForDocumentChanges(
				changes,
				this.currentTarget,
				this.currentTargetNodeIds,
			)
		) {
			this.markCurrentLintStateStale();
			this.scheduleAutoLint();
		}
	}

	private writeCurrentLintState(
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

	private syncReadyForDevAnnotations(
		target: SceneNode,
		targetState: ReturnType<PluginSession["writeCurrentLintState"]>,
	): void {
		for (const annotationTarget of this.getReadyForDevAnnotationTargets(
			target,
		)) {
			const nextAnnotations = syncAiHandoffLinterAnnotations(
				annotationTarget.annotations,
				targetState,
			);
			if (!areAnnotationsEqual(annotationTarget.annotations, nextAnnotations)) {
				annotationTarget.annotations = nextAnnotations;
			}
		}
	}

	private getReadyForDevAnnotationTargets(
		target: SceneNode,
	): AnnotationTargetNode[] {
		if (target.type === "SECTION") {
			return collectSectionLintTargets(target.children).filter(
				isAnnotationTarget,
			);
		}

		return isAnnotationTarget(target) ? [target] : [];
	}

	private markCurrentLintStateStale(): void {
		if (!this.currentTarget || this.currentTarget.removed) {
			return;
		}

		const stored = readLintState(this.currentTarget);
		const nextState = stored ? { ...stored, stale: true } : null;
		if (nextState) {
			writeLintState(this.currentTarget, nextState);
		}
	}

	private scheduleAutoLint(): void {
		this.clearAutoLintTimer();
		this.autoLintTimer = setTimeout(() => {
			this.autoLintTimer = null;
			void this.rerunCurrentTarget();
		}, AUTO_LINT_DELAY_MS);
	}

	private clearAutoLintTimer(): void {
		if (this.autoLintTimer === null) {
			return;
		}

		clearTimeout(this.autoLintTimer);
		this.autoLintTimer = null;
	}

	private async selectNode(nodeId: string): Promise<void> {
		const node = await this.figmaApi.getNodeByIdAsync(nodeId);
		if (!node || !("visible" in node)) {
			this.postError("The selected issue node no longer exists.");
			return;
		}

		this.figmaApi.currentPage.selection = [node as SceneNode];
		this.figmaApi.viewport.scrollAndZoomIntoView([node as SceneNode]);
	}

	private addIgnore(
		ruleId: string,
		nodeId: string,
		reason: string,
	): LintWaiver | null {
		if (!this.currentTarget) {
			return null;
		}

		const waiver = {
			ruleId,
			nodeId,
			reason: reason.trim(),
			createdAt: new Date().toISOString(),
		};
		this.currentWaivers = this.currentWaivers.filter(
			(candidate) => candidate.ruleId !== ruleId || candidate.nodeId !== nodeId,
		);
		this.currentWaivers.push(waiver);
		writeWaivers(this.currentTarget, this.currentWaivers);
		return waiver;
	}

	private removeIgnore(ruleId: string, nodeId: string): void {
		if (!this.currentTarget) {
			return;
		}

		this.currentWaivers = this.currentWaivers.filter(
			(waiver) => waiver.ruleId !== ruleId || waiver.nodeId !== nodeId,
		);
		writeWaivers(this.currentTarget, this.currentWaivers);
	}

	private async readTokenCatalog(): Promise<DesignToken[]> {
		try {
			return await collectFigmaDesignTokens(this.figmaApi);
		} catch {
			return [];
		}
	}

	private postError(message: string): void {
		this.figmaApi.ui.postMessage({ type: "lint-error", message });
	}
}

function resolvePluginLocale(
	language: UiSettings["language"],
	navigatorLanguage: string,
): Locale {
	if (language !== "auto") {
		return language;
	}

	return navigatorLanguage.toLowerCase().startsWith("ja") ? "ja" : "en";
}

type AnnotationTargetNode = SceneNode & {
	annotations: ReadonlyArray<Annotation>;
};

function isAnnotationTarget(node: SceneNode): node is AnnotationTargetNode {
	return "annotations" in node;
}
