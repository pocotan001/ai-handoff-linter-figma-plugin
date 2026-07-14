import { readFileSync } from "node:fs";
import { parse } from "@iarna/toml";
import { describe, expect, it } from "vitest";

type McpServer = {
	command: string;
	args: string[];
};

describe("repository-managed MCP configuration", () => {
	it("defines the same credential-free shadcn server for Codex and Claude", () => {
		const claude = JSON.parse(readFileSync(".mcp.json", "utf8")) as {
			mcpServers: Record<string, McpServer>;
		};
		const codexConfig = parse(readFileSync(".codex/config.toml", "utf8")) as {
			mcp_servers: Record<string, McpServer>;
		};
		const codex = codexConfig.mcp_servers;

		expect(claude.mcpServers).toEqual({ shadcn: expectedServer });
		expect(codex).toEqual({ shadcn: expectedServer });
		assertSafeConfiguration(claude);
		assertSafeConfiguration(codex);
	});
});

const expectedServer: McpServer = {
	command: "bunx",
	args: ["--bun", "shadcn@latest", "mcp"],
};

function assertSafeConfiguration(value: unknown): void {
	if (typeof value === "string") {
		expect(value.startsWith("/")).toBe(false);
		return;
	}

	if (Array.isArray(value)) {
		for (const item of value) {
			assertSafeConfiguration(item);
		}
		return;
	}

	if (!value || typeof value !== "object") {
		return;
	}

	for (const [key, item] of Object.entries(value)) {
		expect(key).not.toMatch(/token|secret|password|authorization|env/i);
		assertSafeConfiguration(item);
	}
}
