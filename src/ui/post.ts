import type { UiToPluginMessage } from "../core/types";

/** Sends a message from the plugin UI iframe to the plugin main thread. */
export function post(message: UiToPluginMessage): void {
	parent.postMessage({ pluginMessage: message }, "https://www.figma.com");
}
