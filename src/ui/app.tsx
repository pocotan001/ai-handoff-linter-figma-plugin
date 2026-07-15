import { useEffect, useState } from "react";
import { getLintStatus, summarizeIssues } from "../core/linter";
import { isPluginToUiMessage } from "../core/message-guards";
import { messages, resolveLocale } from "./i18n";
import { IssueList } from "./issue-list";
import { initialPluginUiState, reducePluginMessage } from "./plugin-state";
import { post } from "./post";
import { ResizeHandle } from "./resize-handle";
import { SettingsView } from "./settings-view";
import "./styles.css";

type AppView = "issues" | "settings";

export function App() {
	const [appView, setAppView] = useState<AppView>("issues");
	const [pluginState, setPluginState] = useState(initialPluginUiState);
	const { isPicking, settings, view } = pluginState;
	const locale = resolveLocale(settings.language, navigator.language);
	const t = messages[locale];

	const updateSettings = (nextSettings: typeof settings) => {
		post({
			type: "save-settings",
			language: nextSettings.language,
			disabledRules: nextSettings.disabledRules,
		});
	};

	useEffect(() => {
		window.onmessage = (event: MessageEvent<{ pluginMessage?: unknown }>) => {
			const message = event.data?.pluginMessage;
			if (isPluginToUiMessage(message)) {
				setPluginState((current) => reducePluginMessage(current, message));
			}
		};

		// Tell the plugin the handler above is registered; the plugin defers
		// settings-loaded and the initial lint until this arrives.
		post({ type: "ui-ready", navigatorLanguage: navigator.language });

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
		(issue) => !settings.disabledRules.includes(issue.ruleId),
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
