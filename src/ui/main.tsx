import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { getLintStatus, summarizeIssues } from "../core/linter";
import type {
	LintResult,
	LintStatus,
	LintSummary,
	PluginToUiMessage,
} from "../core/types";
import { DEFAULT_SETTINGS, type UiSettings } from "../core/settings";
import { messages, resolveLocale } from "./i18n";
import { IssueList } from "./issue-list";
import { ResizeHandle } from "./resize-handle";
import { SettingsView } from "./settings-view";
import { post } from "./post";
import { applyIgnoreToResult, removeIgnoreFromResult } from "./state";
import "./styles.css";

type AppView = "issues" | "settings";

type ViewState = {
	result: LintResult | null;
	status: LintStatus | null;
	summary: LintSummary;
	error: string | null;
};

const initialState: ViewState = {
	result: null,
	status: null,
	summary: { error: 0, warning: 0, review: 0 },
	error: null,
};

function App() {
	const [appView, setAppView] = useState<AppView>("issues");
	const [view, setView] = useState(initialState);
	const [isPicking, setIsPicking] = useState(false);
	const [settings, setSettings] = useState<UiSettings>(DEFAULT_SETTINGS);
	const locale = resolveLocale(settings.language, navigator.language);
	const t = messages[locale];

	const updateSettings = (nextSettings: UiSettings) => {
		setSettings(nextSettings);
		post({
			type: "save-settings",
			language: nextSettings.language,
			disabledRules: nextSettings.disabledRules,
		});
	};

	useEffect(() => {
		window.onmessage = (
			event: MessageEvent<{ pluginMessage: PluginToUiMessage }>,
		) => {
			const message = event.data?.pluginMessage;
			if (!message) {
				return;
			}

			if (message.type === "settings-loaded") {
				const loaded = {
					language: message.language,
					disabledRules: message.disabledRules,
				};
				setSettings(loaded);
				return;
			}

			if (message.type === "lint-error") {
				setView((current) => ({ ...current, error: message.message }));
				return;
			}

			if (message.type === "ignore-saved") {
				setView((current) => ({
					...current,
					...(current.result
						? applyIgnoreToResult(current.result, message.waiver)
						: {}),
					error: null,
				}));
				return;
			}

			if (message.type === "ignore-removed") {
				setView((current) => ({
					...current,
					...(current.result
						? removeIgnoreFromResult(
								current.result,
								message.ruleId,
								message.nodeId,
							)
						: {}),
					error: null,
				}));
				return;
			}

			if (message.type === "pick-state") {
				setIsPicking(message.picking);
				return;
			}

			setView({
				result: message.result,
				status: message.status,
				summary: message.summary,
				error: null,
			});
		};

		// Tell the plugin the handler above is registered; the plugin defers
		// settings-loaded and the initial lint until this arrives.
		post({ type: "ui-ready" });

		return () => {
			window.onmessage = null;
		};
	}, []);

	useEffect(() => {
		if (!isPicking) {
			return;
		}

		const cancelPickFromOutside = () => post({ type: "cancel-pick-target" });
		document.addEventListener("pointerdown", cancelPickFromOutside);
		return () =>
			document.removeEventListener("pointerdown", cancelPickFromOutside);
	}, [isPicking]);

	const allIssues = view.result?.issues ?? [];
	const issues = allIssues.filter(
		(i) => !settings.disabledRules.includes(i.ruleId),
	);
	const summary = summarizeIssues(issues);
	const status = view.result ? getLintStatus(issues) : view.status;

	return (
		<div className="relative grid h-full min-h-0 grid-rows-[1fr] overflow-hidden bg-muted/40 text-xs text-foreground">
			<main className="h-full min-h-0 min-w-0 overflow-hidden">
				{appView === "settings" ? (
					<SettingsView
						onBack={() => setAppView("issues")}
						onChange={updateSettings}
						settings={settings}
						t={t}
					/>
				) : (
					<IssueList
						disabledRules={settings.disabledRules}
						error={view.error}
						isPicking={isPicking}
						issues={issues}
						onOpenSettings={() => setAppView("settings")}
						status={status}
						summary={summary}
						targetName={view.result?.rootNodeName ?? null}
						t={t}
					/>
				)}
			</main>
			<ResizeHandle label={t.resizeWindow} />
		</div>
	);
}

const root = document.getElementById("root");

if (!root) {
	throw new Error("Root element not found");
}

createRoot(root).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
