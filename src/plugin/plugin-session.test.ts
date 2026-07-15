import { beforeEach, describe, expect, it, vi } from "vitest";
import { PluginSession } from "./plugin-session";

describe("PluginSession", () => {
	beforeEach(() => {
		vi.unstubAllGlobals();
	});

	it("does not report an error when initialized without a lint target", async () => {
		const runtime = createRuntime();
		const session = new PluginSession(runtime.figma);

		expect(runtime.postMessage).not.toHaveBeenCalled();

		await session.handleMessage({ type: "ui-ready", navigatorLanguage: "en" });

		expect(runtime.postMessage.mock.calls.map(([message]) => message)).toEqual([
			{
				type: "settings-loaded",
				language: "en",
				disabledRules: [],
			},
		]);
	});

	it("starts and cancels target picking without notifications", async () => {
		const runtime = createRuntime();
		const session = new PluginSession(runtime.figma);

		await session.handleMessage({ type: "start-pick-target" });
		await session.handleMessage({ type: "cancel-pick-target" });

		expect(runtime.selection).toEqual([]);
		expect(runtime.postMessage.mock.calls.map(([message]) => message)).toEqual([
			{ type: "pick-state", picking: true },
			{ type: "pick-state", picking: false },
		]);
		expect(runtime.notify).not.toHaveBeenCalled();
	});

	it("clamps resize requests and saves settings without a live target", async () => {
		const runtime = createRuntime();
		const session = new PluginSession(runtime.figma);

		await session.handleMessage({
			type: "resize-window",
			width: 100,
			height: 1000,
		});
		await session.handleMessage({
			type: "save-settings",
			language: "ja",
			disabledRules: ["avoid-groups"],
		});

		expect(runtime.resize).toHaveBeenCalledWith(360, 720);
		expect(runtime.setAsync).toHaveBeenCalledWith(
			"code-ready-linter:settings",
			{
				language: "ja",
				disabledRules: ["avoid-groups"],
			},
		);
		expect(runtime.postMessage).toHaveBeenLastCalledWith({
			type: "settings-loaded",
			language: "ja",
			disabledRules: ["avoid-groups"],
		});
	});
});

function createRuntime() {
	const postMessage = vi.fn();
	const resize = vi.fn();
	const notify = vi.fn();
	const setAsync = vi.fn(async () => undefined);
	const selection: SceneNode[] = [];
	const figma = {
		currentPage: {
			selection,
			on: vi.fn(),
			off: vi.fn(),
		},
		ui: { postMessage, resize },
		notify,
		clientStorage: {
			getAsync: vi.fn(async () => ({ language: "en", disabledRules: [] })),
			setAsync,
		},
		getNodeByIdAsync: vi.fn(async () => null),
		viewport: { scrollAndZoomIntoView: vi.fn() },
	} as unknown as PluginAPI;

	vi.stubGlobal("figma", figma);
	return { figma, notify, postMessage, resize, selection, setAsync };
}
