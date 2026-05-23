import { createQuery } from '@tanstack/svelte-query';

import { compareVerse, fetchBooks, fetchTranslations, searchVerses } from '$lib/api/searchverse';
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

export function createBooksQuery() {
	return createQuery(() => ({
		queryKey: [queryKeys.GET_BOOKS],
		queryFn: fetchBooks
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

export interface CompareQueryInputs {
	reference: () => string;
	abbreviations: () => string[];
}

export function createCompareQuery(inputs: CompareQueryInputs) {
	return createQuery(() => {
		const reference = inputs.reference().trim();
		const normalizedAbbreviations = normalizeAbbreviations(inputs.abbreviations());

		return {
			queryKey: [queryKeys.COMPARE, reference, normalizedAbbreviations],
			queryFn: () =>
				compareVerse({
					reference,
					translations: normalizedAbbreviations
				}),
			enabled: () => reference.length > 0 && normalizedAbbreviations.length > 0
		};
	});
}
