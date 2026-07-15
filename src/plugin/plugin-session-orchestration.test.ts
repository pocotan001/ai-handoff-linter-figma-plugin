import { afterEach, describe, expect, it, vi } from "vitest";
import { PluginSession } from "./plugin-session";

afterEach(() => {
	vi.useRealTimers();
	vi.unstubAllGlobals();
});

describe("PluginSession orchestration", () => {
	it("persists waivers, reruns lint, and confirms the saved ignore", async () => {
		const target = lintTarget();
		const runtime = createRuntime();
		const session = new PluginSession(runtime.figma);

		await pickTarget(session, runtime.page, target);
		await session.handleMessage({
			type: "ignore-issue",
			ruleId: "root-auto-layout",
			nodeId: target.id,
			reason: "Intentional layout.",
		});

		expect(target.getPluginData("code-ready-lint:waivers")).toContain(
			'"reason":"Intentional layout."',
		);
		expect(runtime.postMessage).toHaveBeenLastCalledWith(
			expect.objectContaining({
				type: "ignore-saved",
				waiver: expect.objectContaining({ ruleId: "root-auto-layout" }),
			}),
		);
		await session.handleMessage({
			type: "remove-ignore",
			ruleId: "root-auto-layout",
			nodeId: target.id,
		});
		expect(target.getPluginData("code-ready-lint:waivers")).toBe("");
		expect(runtime.postMessage).toHaveBeenLastCalledWith({
			type: "ignore-removed",
			ruleId: "root-auto-layout",
			nodeId: target.id,
		});
	});

	it("switches targets and selects issue nodes through the Figma API", async () => {
		const firstTarget = lintTarget();
		const secondTarget = readyTarget({ id: "2:1", name: "Second screen" });
		const runtime = createRuntime();
		const session = new PluginSession(runtime.figma);

		await pickTarget(session, runtime.page, firstTarget);
		await pickTarget(session, runtime.page, secondTarget);
		const lintResults = runtime.postMessage.mock.calls
			.map(([message]) => message)
			.filter((message) => message.type === "lint-result");
		expect(lintResults[lintResults.length - 1]).toEqual(
			expect.objectContaining({
				result: expect.objectContaining({ rootNodeId: "2:1" }),
				waivers: [],
			}),
		);

		runtime.getNodeByIdAsync.mockResolvedValue(secondTarget);
		await session.handleMessage({ type: "select-node", nodeId: "2:1" });
		expect(runtime.page.selection).toEqual([secondTarget]);
		expect(runtime.scrollAndZoomIntoView).toHaveBeenCalledWith([secondTarget]);
	});

	it("finishes picking when the selection changes to a valid target", async () => {
		const target = readyTarget();
		const runtime = createRuntime();
		const session = new PluginSession(runtime.figma);

		await session.handleMessage({ type: "start-pick-target" });
		runtime.page.selection = [target];
		await session.handleSelectionChange();

		expect(runtime.postMessage).toHaveBeenCalledWith({
			type: "pick-state",
			picking: false,
		});
		expect(runtime.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: "lint-result" }),
		);
	});

	it("stops picking with an error notification after an unsupported selection", async () => {
		const text = node({ type: "TEXT" });
		const target = readyTarget();
		const runtime = createRuntime();
		const session = new PluginSession(runtime.figma);

		await session.handleMessage({ type: "start-pick-target" });
		runtime.postMessage.mockClear();
		runtime.notify.mockClear();
		runtime.page.selection = [text];
		await session.handleSelectionChange();

		expect(runtime.postMessage).toHaveBeenCalledWith({
			type: "pick-state",
			picking: false,
		});
		expect(runtime.notify).toHaveBeenCalledWith(expect.any(String), {
			error: true,
			timeout: 5_000,
		});

		await session.handleMessage({ type: "start-pick-target" });
		runtime.page.selection = [target];
		await session.handleSelectionChange();

		expect(runtime.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: "lint-result" }),
		);
	});

	it("marks lint state stale and debounces a relevant node change", async () => {
		vi.useFakeTimers();
		const target = readyTarget();
		const runtime = createRuntime();
		const session = new PluginSession(runtime.figma);

		await pickTarget(session, runtime.page, target);
		runtime.postMessage.mockClear();
		session.handleNodeChanges([
			{ type: "PROPERTY_CHANGE", id: target.id, node: target },
		]);

		expect(target.getPluginData("code-ready-lint:state")).toContain(
			'"stale":true',
		);
		expect(runtime.postMessage).not.toHaveBeenCalled();
		await vi.advanceTimersByTimeAsync(500);
		expect(runtime.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({ type: "lint-result" }),
		);
	});

	it("replaces the watched page listener after a page change", () => {
		const runtime = createRuntime();
		const session = new PluginSession(runtime.figma);

		session.handlePageChange();
		const firstPage = runtime.page;
		const nextPage = page();
		runtime.setCurrentPage(nextPage);
		session.handlePageChange();

		expect(firstPage.off).toHaveBeenCalledWith("nodechange", expect.anything());
		expect(nextPage.on).toHaveBeenCalledWith("nodechange", expect.anything());
	});

	it("synchronizes ready annotations and recovers from settings or token errors", async () => {
		const target = readyTarget({ annotations: [] }) as SceneNode & {
			annotations: ReadonlyArray<Annotation>;
		};
		const runtime = createRuntime({ settingsError: true, tokenError: true });
		const session = new PluginSession(runtime.figma);

		await pickTarget(session, runtime.page, target);
		await session.handleMessage({ type: "ui-ready", navigatorLanguage: "en" });
		await Promise.resolve();

		expect(target.annotations).toEqual([
			expect.objectContaining({
				labelMarkdown: expect.stringContaining("AI Handoff Ready"),
			}),
		]);
		expect(runtime.postMessage).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "lint-error",
				message: "Storage failed.",
			}),
		);
	});
});

async function pickTarget(
	session: PluginSession,
	pageNode: TestPage,
	target: SceneNode,
): Promise<void> {
	await session.handleMessage({ type: "start-pick-target" });
	pageNode.selection = [target];
	await session.handleSelectionChange();
}

type TestPage = {
	selection: SceneNode[];
	on: ReturnType<typeof vi.fn>;
	off: ReturnType<typeof vi.fn>;
};

function createRuntime(
	options: { settingsError?: boolean; tokenError?: boolean } = {},
) {
	let currentPage = page();
	const postMessage = vi.fn();
	const notify = vi.fn();
	const getNodeByIdAsync = vi.fn(
		async (_nodeId: string): Promise<BaseNode | null> => null,
	);
	const scrollAndZoomIntoView = vi.fn();
	const figma = {
		get currentPage() {
			return currentPage;
		},
		ui: { postMessage, resize: vi.fn() },
		notify,
		clientStorage: {
			getAsync: vi.fn(async () => {
				if (options.settingsError) {
					throw new Error("Storage failed.");
				}
				return { language: "en", disabledRules: [] };
			}),
			setAsync: vi.fn(async () => undefined),
		},
		variables: {
			getLocalVariableCollectionsAsync: vi.fn(async () => {
				if (options.tokenError) throw new Error("Tokens failed.");
				return [];
			}),
			getLocalVariablesAsync: vi.fn(async () => []),
		},
		getLocalPaintStylesAsync: vi.fn(async () => []),
		getLocalTextStylesAsync: vi.fn(async () => []),
		getLocalEffectStylesAsync: vi.fn(async () => []),
		getLocalGridStylesAsync: vi.fn(async () => []),
		getNodeByIdAsync,
		viewport: { scrollAndZoomIntoView },
	} as unknown as PluginAPI;

	vi.stubGlobal("figma", figma);
	return {
		figma,
		getNodeByIdAsync,
		notify,
		postMessage,
		get page() {
			return currentPage;
		},
		setCurrentPage(nextPage: TestPage) {
			currentPage = nextPage;
		},
		scrollAndZoomIntoView,
	};
}

function page(): TestPage {
	return { selection: [], on: vi.fn(), off: vi.fn() };
}

function lintTarget(): SceneNode {
	return node({
		name: "Screen",
		layoutMode: "NONE",
		children: [
			node({ id: "1:2", type: "TEXT" }),
			node({ id: "1:3", type: "TEXT" }),
		],
	});
}

function readyTarget(overrides: Record<string, unknown> = {}): SceneNode {
	return node({ name: "Screen", layoutMode: "VERTICAL", ...overrides });
}

function node(overrides: Record<string, unknown> = {}): SceneNode {
	const data = new Map<string, string>();
	const sharedData = new Map<string, string>();
	return {
		id: "1:1",
		name: "Layer",
		type: "FRAME",
		children: [],
		removed: false,
		visible: true,
		getPluginData: (key: string) => data.get(key) ?? "",
		setPluginData: (key: string, value: string) => data.set(key, value),
		getSharedPluginData: (namespace: string, key: string) =>
			sharedData.get(`${namespace}:${key}`) ?? "",
		setSharedPluginData: (namespace: string, key: string, value: string) =>
			sharedData.set(`${namespace}:${key}`, value),
		...overrides,
	} as unknown as SceneNode;
}
