export const SUPPORTED_LOCALES = ["en", "ja"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const LOCALE_PREFERENCES = ["auto", ...SUPPORTED_LOCALES] as const;
export type LocalePreference = (typeof LOCALE_PREFERENCES)[number];

export function isLocalePreference(value: unknown): value is LocalePreference {
	return (
		typeof value === "string" &&
		LOCALE_PREFERENCES.includes(value as LocalePreference)
	);
}
