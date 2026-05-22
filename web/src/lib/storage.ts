const selectedTranslationsKey = 'searchverse:selected-translations';
const colorSchemeKey = 'searchverse:color-scheme';

export type ColorScheme = 'light' | 'dark';

export function readSelectedTranslations() {
	if (typeof localStorage === 'undefined') {
		return [];
	}

	const value = localStorage.getItem(selectedTranslationsKey);

	if (!value) {
		return [];
	}

	try {
		const parsed = JSON.parse(value);
		return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
	} catch {
		return [];
	}
}

export function writeSelectedTranslations(translations: string[]) {
	localStorage.setItem(selectedTranslationsKey, JSON.stringify(translations));
}

export function readColorScheme() {
	if (typeof localStorage === 'undefined') {
		return null;
	}

	const value = localStorage.getItem(colorSchemeKey);
	return value === 'light' || value === 'dark' ? value : null;
}

export function writeColorScheme(colorScheme: ColorScheme) {
	localStorage.setItem(colorSchemeKey, colorScheme);
}
