import { existsSync, readFileSync, realpathSync } from "node:fs";
import { describe, expect, it } from "vitest";

const componentsJson = readFileSync(
	new URL("../components.json", import.meta.url),
	"utf8",
);
const styles = readFileSync(
	new URL("./ui/styles.css", import.meta.url),
	"utf8",
);
const utils = readFileSync(new URL("./lib/utils.ts", import.meta.url), "utf8");
const dialog = readFileSync(
	new URL("./components/dialog.tsx", import.meta.url),
	"utf8",
);

describe("shadcn manual installation", () => {
	it("configures the shadcn style imports and theme variables", () => {
		expect(styles).toContain('@import "tw-animate-css";');
		expect(styles).toContain('@import "shadcn/tailwind.css";');
		expect(styles).toContain("@custom-variant dark");
		expect(styles).toContain("--color-background: var(--background);");
		expect(styles).toContain("--radius-sm: calc(var(--radius) * 0.6);");
	});

	it("provides the shadcn cn helper", () => {
		expect(utils).toContain('import { type ClassValue, clsx } from "clsx";');
		expect(utils).toContain('import { twMerge } from "tailwind-merge";');
		expect(utils).toContain("export function cn(...inputs: ClassValue[])");
	});

	it("creates components.json with the project aliases", () => {
		const config = JSON.parse(componentsJson) as {
			style: string;
			tailwind: { css: string; baseColor: string; cssVariables: boolean };
			aliases: Record<string, string>;
			iconLibrary: string;
		};

		expect(config.style).toBe("base-nova");
		expect(config.tailwind).toMatchObject({
			css: "src/ui/styles.css",
			baseColor: "neutral",
			cssVariables: true,
		});
		expect(config.aliases).toEqual({
			components: "~/components",
			utils: "~/lib/utils",
			ui: "~/components",
			lib: "~/lib",
			hooks: "~/hooks",
		});
		expect(config.iconLibrary).toBe("lucide");
	});

	it("uses the strictest TypeScript configuration and source alias", () => {
		const tsconfig = JSON.parse(
			readFileSync(new URL("../tsconfig.json", import.meta.url), "utf8"),
		) as {
			extends: string;
			compilerOptions: { paths: Record<string, string[]> };
		};

		expect(tsconfig.extends).toBe("@tsconfig/strictest/tsconfig.json");
		expect(tsconfig.compilerOptions.paths).toEqual({
			"~/*": ["./src/*"],
		});
	});

	it("uses Base UI primitives instead of Radix UI primitives", () => {
		expect(dialog).toContain("@base-ui/react");
		expect(dialog).not.toContain('"radix-ui"');
	});

	it("shares the locked shadcn skill with Claude", () => {
		expect(existsSync(".agents/skills/shadcn/SKILL.md")).toBe(true);
		expect(realpathSync(".claude/skills/shadcn")).toBe(
			realpathSync(".agents/skills/shadcn"),
		);
	});
});
