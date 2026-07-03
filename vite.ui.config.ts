import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const uiRoot = fileURLToPath(new URL("src/ui", import.meta.url));
const uiHtml = fileURLToPath(new URL("src/ui/ui.html", import.meta.url));

export default defineConfig({
	root: uiRoot,
	plugins: [react(), tailwindcss(), inlineUiAssets()],
	build: {
		emptyOutDir: false,
		outDir: "../../dist",
		rollupOptions: {
			input: uiHtml,
		},
		target: "es2018",
	},
});

function inlineUiAssets(): Plugin {
	return {
		name: "inline-ui-assets",
		enforce: "post",
		generateBundle(_, bundle) {
			const htmlFile = bundle["ui.html"];
			if (htmlFile?.type !== "asset" || typeof htmlFile.source !== "string") {
				return;
			}

			let html = htmlFile.source;
			for (const [fileName, file] of Object.entries(bundle)) {
				if (fileName === "ui.html") {
					continue;
				}

				if (file.type === "chunk") {
					html = html.replace(
						scriptTagPattern(fileName),
						() => `<script>${escapeScript(file.code)}</script>`,
					);
					delete bundle[fileName];
				}

				if (
					file.type === "asset" &&
					fileName.endsWith(".css") &&
					typeof file.source === "string"
				) {
					html = html.replace(
						styleTagPattern(fileName),
						() => `<style>${file.source}</style>`,
					);
					delete bundle[fileName];
				}
			}

			html = moveScriptsToBodyEnd(html);
			htmlFile.source = html;
		},
	};
}

function scriptTagPattern(fileName: string): RegExp {
	return new RegExp(
		`<script[^>]+src=["'][./]*${escapeRegExp(fileName)}["'][^>]*></script>`,
	);
}

function styleTagPattern(fileName: string): RegExp {
	return new RegExp(
		`<link[^>]+href=["'][./]*${escapeRegExp(fileName)}["'][^>]*>`,
	);
}

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapeScript(code: string): string {
	return code.replace(/<\/script/gi, "<\\/script");
}

function moveScriptsToBodyEnd(html: string): string {
	const scripts: string[] = [];
	const withoutScripts = html.replace(
		/<script>[\s\S]*?<\/script>/g,
		(script) => {
			scripts.push(script);
			return "";
		},
	);

	if (scripts.length === 0) {
		return html;
	}

	return withoutScripts.replace("</body>", () => `${scripts.join("")}</body>`);
}
