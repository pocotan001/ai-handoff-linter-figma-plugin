import { defineConfig } from "vite";

export default defineConfig({
	build: {
		emptyOutDir: true,
		lib: {
			entry: "src/plugin/main.ts",
			name: "CodeReadyLinterPlugin",
			formats: ["iife"],
			fileName: () => "plugin.js",
		},
		outDir: "dist",
		target: "es2017",
	},
});
