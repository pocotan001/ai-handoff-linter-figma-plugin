import { describe, expect, it } from "vitest";
import { isPluginToUiMessage, isUiToPluginMessage } from "./message-guards";

describe("plugin message guards", () => {
	it("accepts valid UI requests and rejects malformed payloads", () => {
		expect(
			isUiToPluginMessage({
				type: "save-settings",
				language: "ja",
				disabledRules: ["avoid-groups"],
			}),
		).toBe(true);
		expect(
			isUiToPluginMessage({
				type: "resize-window",
				width: "wide",
				height: 500,
			}),
		).toBe(false);
	});

	it("rejects malformed plugin responses before they reach rendering", () => {
		expect(
			isPluginToUiMessage({
				type: "settings-loaded",
				language: "en",
				disabledRules: undefined,
			}),
		).toBe(false);
		expect(
			isPluginToUiMessage({ type: "lint-error", message: "Select a target." }),
		).toBe(true);
	});
});
