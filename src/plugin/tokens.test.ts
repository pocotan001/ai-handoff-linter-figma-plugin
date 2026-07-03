import { describe, expect, it } from "vitest";
import {
	collectFigmaDesignTokens,
	figmaStyleToDesignToken,
	figmaVariableToDesignToken,
} from "./tokens";

describe("figmaVariableToDesignToken", () => {
	it("normalizes Figma variables into a vendor-neutral token schema", () => {
		const token = figmaVariableToDesignToken(
			{
				id: "VariableID:1:2",
				key: "variable-key",
				name: "color/background/default",
				resolvedType: "COLOR",
				variableCollectionId: "VariableCollectionId:1:1",
				valuesByMode: {
					light: { r: 1, g: 1, b: 1, a: 1 },
					dark: { type: "VARIABLE_ALIAS", id: "VariableID:1:3" },
				},
			},
			{
				id: "VariableCollectionId:1:1",
				key: "collection-key",
				name: "Theme",
				modes: [
					{ modeId: "light", name: "Light" },
					{ modeId: "dark", name: "Dark" },
				],
			},
		);

		expect(token).toEqual({
			name: "color/background/default",
			path: ["color", "background", "default"],
			type: "color",
			source: "figma-variable",
			value: "#ffffff",
			modes: {
				Light: "#ffffff",
				Dark: {
					type: "alias",
					id: "VariableID:1:3",
				},
			},
			figma: {
				id: "VariableID:1:2",
				key: "variable-key",
				collectionId: "VariableCollectionId:1:1",
				collectionKey: "collection-key",
				collectionName: "Theme",
			},
		});
	});
});

describe("figmaStyleToDesignToken", () => {
	it("normalizes Figma styles as composite design tokens", () => {
		const token = figmaStyleToDesignToken({
			id: "S:1",
			key: "style-key",
			name: "type/body/sm",
			type: "TEXT",
			fontSize: 14,
			fontName: { family: "Inter", style: "Regular" },
			lineHeight: { unit: "PIXELS", value: 20 },
		});

		expect(token).toMatchObject({
			name: "type/body/sm",
			path: ["type", "body", "sm"],
			type: "textStyle",
			source: "figma-style",
			figma: {
				id: "S:1",
				key: "style-key",
			},
		});
		expect(token.value).toMatchObject({
			fontSize: 14,
			fontName: { family: "Inter", style: "Regular" },
			lineHeight: { unit: "PIXELS", value: 20 },
		});
	});
});

describe("collectFigmaDesignTokens", () => {
	it("collects variables and styles through a Figma-native adapter", async () => {
		const tokens = await collectFigmaDesignTokens({
			variables: {
				getLocalVariableCollectionsAsync: async () => [
					{
						id: "VariableCollectionId:1:1",
						key: "collection-key",
						name: "Theme",
						modes: [{ modeId: "default", name: "Default" }],
					},
				],
				getLocalVariablesAsync: async () => [
					{
						id: "VariableID:1:2",
						key: "variable-key",
						name: "space/md",
						resolvedType: "FLOAT",
						variableCollectionId: "VariableCollectionId:1:1",
						valuesByMode: { default: 16 },
					},
				],
			},
			getLocalPaintStylesAsync: async () => [
				{
					id: "S:paint",
					key: "paint-key",
					name: "surface/default",
					type: "PAINT",
					paints: [],
				},
			],
			getLocalTextStylesAsync: async () => [],
			getLocalEffectStylesAsync: async () => [],
			getLocalGridStylesAsync: async () => [],
		});

		expect(tokens.map((token) => `${token.source}:${token.name}`)).toEqual([
			"figma-variable:space/md",
			"figma-style:surface/default",
		]);
	});
});
