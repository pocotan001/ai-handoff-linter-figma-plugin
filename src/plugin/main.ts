import { isUiToPluginMessage } from "../core/message-guards";
import type { AutoLintDocumentChange } from "./auto-lint";
import { PluginSession } from "./plugin-session";
import { DEFAULT_PLUGIN_WINDOW_SIZE } from "./window-size";

declare const __html__: string;

figma.showUI(__html__, DEFAULT_PLUGIN_WINDOW_SIZE);

const session = new PluginSession(figma);

figma.on("selectionchange", () => {
	void session.handleSelectionChange();
});
// With documentAccess: "dynamic-page", figma.on("documentchange") would
// require loading every page first. Watching the current page plus style
// changes covers the same auto-lint triggers without that cost.
figma.on("currentpagechange", () => {
	session.handlePageChange();
});
figma.on("stylechange", (event) => {
	session.handleStyleChanges(event.styleChanges as AutoLintDocumentChange[]);
});
session.handlePageChange();

figma.ui.onmessage = async (message: unknown) => {
	if (!isUiToPluginMessage(message)) {
		return;
	}

	try {
		await session.handleMessage(message);
	} catch (error) {
		figma.ui.postMessage({
			type: "lint-error",
			message:
				error instanceof Error ? error.message : "Unexpected plugin error.",
		});
	}
};
