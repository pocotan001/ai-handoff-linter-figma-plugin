import { isLocalePreference, type LocalePreference } from "./locales";
import { DEFAULT_DISABLED_RULES } from "./rules";

export type UiSettings = {
	language: LocalePreference;
	disabledRules: string[];
};

export const DEFAULT_SETTINGS: UiSettings = {
	language: "auto",
	disabledRules: [...DEFAULT_DISABLED_RULES],
};

export function normalizeSettings(settings: Partial<UiSettings>): UiSettings {
	return {
		language: isLocalePreference(settings.language)
			? settings.language
			: DEFAULT_SETTINGS.language,
		disabledRules: Array.isArray(settings.disabledRules)
			? settings.disabledRules.filter((r) => typeof r === "string")
			: [...DEFAULT_DISABLED_RULES],
	};
}
