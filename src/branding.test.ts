import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AI_HANDOFF_LINTER_ANNOTATION_PREFIX } from "./plugin/annotations";

const manifest = JSON.parse(
	readFileSync(new URL("../manifest.json", import.meta.url), "utf8"),
) as { name: string };
const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const uiHtml = readFileSync(new URL("./ui/ui.html", import.meta.url), "utf8");

describe("product branding", () => {
	it("uses AI Handoff Linter as the public plugin name", () => {
		expect(manifest.name).toBe("AI Handoff Linter");
		expect(uiHtml).toContain("<title>AI Handoff Linter</title>");
		expect(readme).toContain("# AI Handoff Linter");
	});

	it("describes the product as an AI coding handoff tool", () => {
		expect(readme).toContain("AI coding agents");
		expect(readme).toContain("AI-assisted implementation");
		expect(readme).toContain("AI Handoff Ready");
		expect(readme).not.toContain("hand off to developers");
		expect(readme).not.toContain("Code Ready");
	});

	it("uses the public product name in annotations", () => {
		expect(AI_HANDOFF_LINTER_ANNOTATION_PREFIX).toBe("AI Handoff Linter:");
	});
});
