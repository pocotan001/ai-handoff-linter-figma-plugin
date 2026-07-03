export type PluginWindowSize = {
	width: number;
	height: number;
};

export const DEFAULT_PLUGIN_WINDOW_SIZE: PluginWindowSize = {
	width: 480,
	height: 600,
};

const MIN_PLUGIN_WINDOW_SIZE: PluginWindowSize = {
	width: 360,
	height: 320,
};

const MAX_PLUGIN_WINDOW_SIZE: PluginWindowSize = {
	width: 960,
	height: 720,
};

export function clampPluginWindowSize(
	size: PluginWindowSize,
): PluginWindowSize {
	return {
		width: clamp(
			Math.round(size.width),
			MIN_PLUGIN_WINDOW_SIZE.width,
			MAX_PLUGIN_WINDOW_SIZE.width,
		),
		height: clamp(
			Math.round(size.height),
			MIN_PLUGIN_WINDOW_SIZE.height,
			MAX_PLUGIN_WINDOW_SIZE.height,
		),
	};
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(Math.max(value, min), max);
}
