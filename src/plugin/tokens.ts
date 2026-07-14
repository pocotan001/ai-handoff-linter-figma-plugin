import type {
	DesignToken,
	DesignTokenAlias,
	DesignTokenType,
	DesignTokenValue,
} from "../core/types";

type FigmaVariableCollectionLike = {
	id: string;
	key?: string;
	name: string;
	modes: Array<{ modeId: string; name: string }>;
};

type FigmaVariableLike = {
	id: string;
	key?: string;
	name: string;
	resolvedType: "BOOLEAN" | "COLOR" | "FLOAT" | "STRING";
	variableCollectionId: string;
	valuesByMode: Record<string, unknown>;
};

type FigmaStyleLike = {
	id: string;
	key?: string;
	name: string;
	type: "PAINT" | "TEXT" | "EFFECT" | "GRID";
	paints?: unknown;
	fontSize?: unknown;
	fontName?: unknown;
	letterSpacing?: unknown;
	lineHeight?: unknown;
	paragraphSpacing?: unknown;
	textCase?: unknown;
	textDecoration?: unknown;
	effects?: unknown;
	layoutGrids?: unknown;
};

type FigmaDesignTokenApi = {
	variables: {
		getLocalVariableCollectionsAsync(): Promise<FigmaVariableCollectionLike[]>;
		getLocalVariablesAsync(): Promise<FigmaVariableLike[]>;
	};
	getLocalPaintStylesAsync(): Promise<FigmaStyleLike[]>;
	getLocalTextStylesAsync(): Promise<FigmaStyleLike[]>;
	getLocalEffectStylesAsync(): Promise<FigmaStyleLike[]>;
	getLocalGridStylesAsync(): Promise<FigmaStyleLike[]>;
};

export async function collectFigmaDesignTokens(
	figmaApi: FigmaDesignTokenApi,
): Promise<DesignToken[]> {
	const [
		collections,
		variables,
		paintStyles,
		textStyles,
		effectStyles,
		gridStyles,
	] = await Promise.all([
		figmaApi.variables.getLocalVariableCollectionsAsync(),
		figmaApi.variables.getLocalVariablesAsync(),
		figmaApi.getLocalPaintStylesAsync(),
		figmaApi.getLocalTextStylesAsync(),
		figmaApi.getLocalEffectStylesAsync(),
		figmaApi.getLocalGridStylesAsync(),
	]);

	const collectionsById = new Map(
		collections.map((collection) => [collection.id, collection]),
	);
	return [
		...variables.flatMap((variable) => {
			const collection = collectionsById.get(variable.variableCollectionId);
			return collection
				? [figmaVariableToDesignToken(variable, collection)]
				: [];
		}),
		...paintStyles.map(figmaStyleToDesignToken),
		...textStyles.map(figmaStyleToDesignToken),
		...effectStyles.map(figmaStyleToDesignToken),
		...gridStyles.map(figmaStyleToDesignToken),
	];
}

export function figmaVariableToDesignToken(
	variable: FigmaVariableLike,
	collection: FigmaVariableCollectionLike,
): DesignToken {
	const modes = Object.fromEntries(
		collection.modes
			.filter((mode) => mode.modeId in variable.valuesByMode)
			.map((mode) => [
				mode.name,
				normalizeTokenValue(variable.valuesByMode[mode.modeId]),
			]),
	);

	return {
		name: variable.name,
		path: nameToPath(variable.name),
		type: variableTypeToTokenType(variable.resolvedType),
		value: Object.values(modes)[0] ?? "",
		modes,
		source: "figma-variable",
		figma: {
			id: variable.id,
			collectionId: collection.id,
			collectionName: collection.name,
			...(variable.key === undefined ? {} : { key: variable.key }),
			...(collection.key === undefined
				? {}
				: { collectionKey: collection.key }),
		},
	};
}

export function figmaStyleToDesignToken(style: FigmaStyleLike): DesignToken {
	return {
		name: style.name,
		path: nameToPath(style.name),
		type: styleTypeToTokenType(style.type),
		value: styleValue(style),
		source: "figma-style",
		figma: {
			id: style.id,
			...(style.key === undefined ? {} : { key: style.key }),
		},
	};
}

function nameToPath(name: string): string[] {
	return name
		.split("/")
		.map((part) => part.trim())
		.filter(Boolean);
}

function variableTypeToTokenType(
	type: FigmaVariableLike["resolvedType"],
): DesignTokenType {
	if (type === "COLOR") {
		return "color";
	}
	if (type === "FLOAT") {
		return "number";
	}
	if (type === "BOOLEAN") {
		return "boolean";
	}
	return "string";
}

function styleTypeToTokenType(type: FigmaStyleLike["type"]): DesignTokenType {
	if (type === "PAINT") {
		return "paintStyle";
	}
	if (type === "TEXT") {
		return "textStyle";
	}
	if (type === "EFFECT") {
		return "effectStyle";
	}
	return "gridStyle";
}

function normalizeTokenValue(value: unknown): DesignTokenValue {
	if (isVariableAlias(value)) {
		return {
			type: "alias",
			id: value.id,
		};
	}
	if (isColorValue(value)) {
		return colorToHex(value);
	}
	if (
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}
	if (Array.isArray(value)) {
		return value;
	}
	if (value && typeof value === "object") {
		return value as Record<string, unknown>;
	}
	return "";
}

function styleValue(style: FigmaStyleLike): DesignTokenValue {
	if (style.type === "PAINT") {
		return { paints: style.paints ?? [] };
	}
	if (style.type === "EFFECT") {
		return { effects: style.effects ?? [] };
	}
	if (style.type === "GRID") {
		return { layoutGrids: style.layoutGrids ?? [] };
	}
	return {
		fontSize: style.fontSize,
		fontName: style.fontName,
		letterSpacing: style.letterSpacing,
		lineHeight: style.lineHeight,
		paragraphSpacing: style.paragraphSpacing,
		textCase: style.textCase,
		textDecoration: style.textDecoration,
	};
}

function isVariableAlias(value: unknown): value is DesignTokenAlias {
	return Boolean(
		value &&
			typeof value === "object" &&
			(value as { type?: unknown }).type === "VARIABLE_ALIAS" &&
			typeof (value as { id?: unknown }).id === "string",
	);
}

function isColorValue(
	value: unknown,
): value is { r: number; g: number; b: number; a?: number } {
	if (!value || typeof value !== "object") {
		return false;
	}
	const color = value as { r?: unknown; g?: unknown; b?: unknown };
	return (
		typeof color.r === "number" &&
		typeof color.g === "number" &&
		typeof color.b === "number"
	);
}

function colorToHex(color: {
	r: number;
	g: number;
	b: number;
	a?: number;
}): string {
	const alpha = color.a ?? 1;
	const channels = [color.r, color.g, color.b].map((value) =>
		toHexChannel(value),
	);
	return alpha >= 1
		? `#${channels.join("")}`
		: `#${channels.join("")}${toHexChannel(alpha)}`;
}

function toHexChannel(value: number): string {
	return Math.round(Math.min(Math.max(value, 0), 1) * 255)
		.toString(16)
		.padStart(2, "0");
}
