import { env } from '$env/dynamic/public';

export interface ApiResponse<T> {
	status: 'success';
	data: T;
}

export interface Translation {
	id: string;
	abbreviation: string;
	name: string;
	language: string;
	copyright: string;
	last_synced_at: string | null;
	created_at: string;
	updated_at: string;
}

export interface BookChapterMetadata {
	number: number;
	verses: number;
}

export interface BookMetadata {
	id: string;
	name: string;
	testament: 'OT' | 'NT';
	position: number;
	chapters: BookChapterMetadata[];
}

export interface SearchResult {
	reference: string;
	displayReference: string;
	translation: string;
	book: string;
	bookName: string;
	chapter: number;
	verse: number;
	text: string;
	copyright: string;
}

export interface VerseTranslationResult {
	id: string;
	abbreviation: string;
	text: string;
	copyright: string;
}

export interface VerseComparison {
	reference: string;
	displayReference: string;
	book: string;
	bookName: string;
	chapter: number;
	verse: number;
	translations: VerseTranslationResult[];
}

export interface PaginatedResponse<T> {
	totalDocuments: number;
	totalPages: number;
	currentPage: number;
	numOfResults: number;
	data: T[];
}

export interface SearchVersesParams {
	q: string;
	abbreviations: string[];
	page: number;
	limit: number;
}

export interface CompareVerseParams {
	reference: string;
	translations: string[];
}

export class ApiError extends Error {
	constructor(
		message: string,
		public status: number
	) {
		super(message);
		this.name = 'ApiError';
	}
}

function apiUrl(path: string, searchParams?: URLSearchParams) {
	const baseUrl = (env.PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');
	const query = searchParams?.toString();

	return `${baseUrl}/v1${path}${query ? `?${query}` : ''}`;
}

async function fetchJson<T>(url: string): Promise<T> {
	const response = await fetch(url);

	if (!response.ok) {
		const body = await response.json().catch(() => null);
		const message =
			typeof body?.message === 'string' ? body.message : `Request failed with ${response.status}`;

		throw new ApiError(message, response.status);
	}

	const body = (await response.json()) as ApiResponse<T>;

	return body.data;
}

export function fetchTranslations() {
	return fetchJson<Translation[]>(apiUrl('/translations'));
}

export function fetchBooks() {
	return fetchJson<BookMetadata[]>(apiUrl('/books'));
}

export function searchVerses(params: SearchVersesParams) {
	const searchParams = new URLSearchParams({
		q: params.q,
		abbreviations: params.abbreviations.join(','),
		page: String(params.page)
	});

	return fetchJson<PaginatedResponse<SearchResult>>(apiUrl('/search', searchParams));
}

export function compareVerse(params: CompareVerseParams) {
	const searchParams = new URLSearchParams({
		translations: params.translations.join(',')
	});

	return fetchJson<VerseComparison>(
		apiUrl(`/verses/${encodeURIComponent(params.reference)}`, searchParams)
	);
}
