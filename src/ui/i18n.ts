import { ISSUE_COPY, type IssueCopy } from "../core/issue-copy";
import type { Locale, LocalePreference } from "../core/locales";
import type { LintIssue, LintSeverity, LintStatus } from "../core/types";

export type Messages = {
	settings: string;
	language: string;
	languageOptions: Record<LocalePreference, string>;
	runLint: string;
	noLintResult: string;
	needsDesignFix: string;
	needsImprovement: string;
	aiHandoffReady: string;
	aiHandoffReadyWithIgnoredIssues: string;
	error: string;
	warning: string;
	review: string;
	ignored: string;
	noActiveIssues: string;
	selectNode: string;
	saveIgnoreReason: string;
	saving: string;
	cancel: string;
	stopIgnoringIssue: string;
	ignoreIssue: string;
	ignoreReasonPlaceholder: string;
	ignoredReason: (reason: string) => string;
	resizeWindow: string;
	rules: string;
	fixWithFigmaAgent: string;
	figmaAgentRepairDescription: string;
	agentPrompt: string;
	copyAgentPrompt: string;
	agentPromptCopied: string;
	agentPromptCopyFailed: string;
	agentRecommendation: string;
	agentPromptIntro: (targetName: string) => string;
	agentPromptGuardrails: string;
	agentPromptIssues: string;
	agentPromptFinish: string;
	issueCopy: Record<string, IssueCopy>;
};

export const messages: Record<Locale, Messages> = {
	en: {
		settings: "Settings",
		language: "Language",
		languageOptions: {
			auto: "Auto",
			en: "English",
			ja: "Japanese",
		},
		runLint: "Run lint",
		noLintResult: "No lint results",
		needsDesignFix: "Needs design fixes",
		needsImprovement: "Needs improvements",
		aiHandoffReady: "AI Handoff Ready",
		aiHandoffReadyWithIgnoredIssues: "AI Handoff Ready, with ignored issues",
		error: "Error",
		warning: "Warning",
		review: "Review",
		ignored: "Ignored",
		noActiveIssues: "No active issues.",
		selectNode: "Select node",
		saveIgnoreReason: "Save reason",
		saving: "Saving...",
		cancel: "Cancel",
		stopIgnoringIssue: "Stop ignoring",
		ignoreIssue: "Ignore",
		ignoreReasonPlaceholder: "Why is this issue being ignored?",
		ignoredReason: (reason) => `Ignored because: ${reason}`,
		resizeWindow: "Resize window",
		rules: "Rules",
		fixWithFigmaAgent: "Fix with Figma Agent",
		figmaAgentRepairDescription:
			"Copy the current lint findings and paste them into Figma Agent.",
		agentPrompt: "Figma Agent prompt",
		copyAgentPrompt: "Copy prompt",
		agentPromptCopied: "Copied",
		agentPromptCopyFailed: "Copy failed. Select the text and copy it manually.",
		agentRecommendation: "Recommendation",
		agentPromptIntro: (targetName) =>
			`Prepare the selected “${targetName}” for AI coding handoff. Fix the lint findings below directly in this Figma Design file.`,
		agentPromptGuardrails:
			"Preserve the visual result, existing design-system choices, and component intent. Follow the file's existing naming conventions. Make a change only when you can infer its intent confidently; otherwise, leave it unchanged and explain why. Fix instance-internal issues in the main component, not the instance. Do not make unrelated changes.",
		agentPromptIssues: "Lint findings:",
		agentPromptFinish:
			"When you finish, summarize the changes and any findings you intentionally left unchanged.",
		issueCopy: ISSUE_COPY.en,
	},
	ja: {
		settings: "設定",
		language: "言語",
		languageOptions: {
			auto: "自動",
			en: "英語",
			ja: "日本語",
		},
		runLint: "Lint を実行",
		noLintResult: "まだ Lint 結果がありません",
		needsDesignFix: "デザイン修正が必要",
		needsImprovement: "改善が必要",
		aiHandoffReady: "AI Handoff Ready",
		aiHandoffReadyWithIgnoredIssues:
			"無視した指摘があります（AI Handoff Ready）",
		error: "エラー",
		warning: "警告",
		review: "レビュー",
		ignored: "無視済み",
		noActiveIssues: "対応が必要な指摘はありません。",
		selectNode: "ノードを選択",
		saveIgnoreReason: "理由を保存",
		saving: "保存中...",
		cancel: "キャンセル",
		stopIgnoringIssue: "無視を解除",
		ignoreIssue: "無視する",
		ignoreReasonPlaceholder: "この指摘を無視する理由を入力",
		ignoredReason: (reason) => `無視した理由：${reason}`,
		resizeWindow: "ウィンドウサイズを変更",
		rules: "ルール",
		fixWithFigmaAgent: "Figma Agent で修正",
		figmaAgentRepairDescription:
			"現在の Lint 指摘をコピーして Figma Agent に貼り付けます。",
		agentPrompt: "Figma Agent 用プロンプト",
		copyAgentPrompt: "プロンプトをコピー",
		agentPromptCopied: "コピーしました",
		agentPromptCopyFailed:
			"コピーできませんでした。本文を選択して手動でコピーしてください。",
		agentRecommendation: "推奨対応",
		agentPromptIntro: (targetName) =>
			`選択中の「${targetName}」を、AI コーディングに渡せる状態に整えてください。以下の Lint 指摘を、この Figma Design ファイル上で直接修正してください。`,
		agentPromptGuardrails:
			"見た目、既存のデザインシステム、コンポーネントの意図を維持してください。ファイル内の既存の命名規則を優先してください。意図に確信が持てる場合だけ変更し、不確かな場合は変更せず理由を説明してください。インスタンス内部の指摘はインスタンスではなくメインコンポーネントで修正してください。指摘と無関係な変更はしないでください。",
		agentPromptIssues: "Lint 指摘:",
		agentPromptFinish:
			"完了後、変更内容と、意図的に変更しなかった指摘を要約してください。",
		issueCopy: ISSUE_COPY.ja,
	},
};

export function resolveLocale(
	preference: LocalePreference,
	navigatorLanguage: string,
): Locale {
	if (preference !== "auto") {
		return preference;
	}

	return navigatorLanguage.toLowerCase().startsWith("ja") ? "ja" : "en";
}

export function formatStatus(status: LintStatus | null, t: Messages): string {
	if (status === "needs-design-fix") {
		return t.needsDesignFix;
	}
	if (status === "needs-improvement") {
		return t.needsImprovement;
	}
	if (status === "ai-handoff-ready-with-ignored-issues") {
		return t.aiHandoffReadyWithIgnoredIssues;
	}
	if (status === "ai-handoff-ready") {
		return t.aiHandoffReady;
	}
	return t.noLintResult;
}

export function formatSeverity(severity: LintSeverity, t: Messages): string {
	if (severity === "error") {
		return t.error;
	}
	if (severity === "warning") {
		return t.warning;
	}
	return t.review;
}

export function translateIssueCopy(issue: LintIssue, t: Messages): IssueCopy {
	return (
		t.issueCopy[issue.ruleId] ?? {
			message: issue.message,
			recommendation: issue.recommendation,
		}
	);
}
