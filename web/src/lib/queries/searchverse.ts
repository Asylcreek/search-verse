import { createQuery } from '@tanstack/svelte-query';

import { fetchTranslations, searchVerses } from '$lib/api/searchverse';
import { queryKeys } from './query-keys';

export function normalizeAbbreviations(abbreviations: string[]) {
	return [...new Set(abbreviations.map((value) => value.trim()).filter(Boolean))].sort();
}

export function createTranslationsQuery() {
	return createQuery(() => ({
		queryKey: [queryKeys.GET_TRANSLATIONS],
		queryFn: fetchTranslations
	}));
}

export interface SearchQueryInputs {
	q: () => string;
	abbreviations: () => string[];
	page: () => number;
	limit: () => number;
}

export function createSearchQuery(inputs: SearchQueryInputs) {
	return createQuery(() => {
		const q = inputs.q().trim();
		const normalizedAbbreviations = normalizeAbbreviations(inputs.abbreviations());

		return {
			queryKey: [queryKeys.SEARCH, q, normalizedAbbreviations, inputs.page(), inputs.limit()],
			queryFn: () =>
				searchVerses({
					q,
					abbreviations: normalizedAbbreviations,
					page: inputs.page(),
					limit: inputs.limit()
				}),
			enabled: () => q.length > 0 && normalizedAbbreviations.length > 0
		};
	});
}
