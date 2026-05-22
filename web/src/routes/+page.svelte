<script lang="ts">
	import { createSearchParamsSchema, useSearchParams } from 'runed/kit';
	import { toast } from 'svelte-sonner';

	import SearchBar from '$lib/components/search-bar.svelte';
	import TranslationPills from '$lib/components/translation-pills.svelte';
	import VerseResultCard from '$lib/components/verse-result-card.svelte';
	import { createSearchQuery } from '$lib/queries/searchverse';

	function currentLimit() {
		return 20;
	}

	const searchParams = useSearchParams(
		createSearchParamsSchema({
			q: { type: 'string', default: '' },
			page: { type: 'number', default: 1 }
		}),
		{ noScroll: true, pushHistory: false }
	);

	let query = $derived(searchParams.q);
	let selectedTranslations = $state<string[]>([]);
	let translationsHydrated = $state(false);

	const searchQuery = createSearchQuery({
		q: () => searchParams.q,
		abbreviations: () => selectedTranslations,
		page: () => searchParams.page,
		limit: currentLimit
	});

	function updateSelectedTranslations(selection: string[]) {
		selectedTranslations = selection;

		if (!translationsHydrated) {
			translationsHydrated = true;
			return;
		}

		if (!searchParams.q) {
			return;
		}

		searchParams.page = 1;
	}

	function updateQuery(value: string) {
		query = value;

		if (value.trim() === '' && searchParams.q) {
			searchParams.update({ q: '', page: 1 });
		}
	}

	function search() {
		const trimmedQuery = query.trim();

		if (!trimmedQuery) {
			toast.error('Enter a search query.');
			return;
		}

		if (selectedTranslations.length === 0) {
			toast.error('Select at least one translation.');
			return;
		}

		searchParams.update({ q: trimmedQuery, page: 1 });
	}

	function goToPage(page: number) {
		searchParams.page = page;
	}
</script>

<section class="grid gap-6 pt-10">
	<div class="mx-auto max-w-2xl text-center">
		<h1
			class="m-0 font-serif text-4xl leading-tight font-semibold tracking-normal text-stone-950 dark:text-stone-50"
		>
			Find the verse from the words you remember.
		</h1>
	</div>

	<SearchBar bind:value={query} oninput={updateQuery} onsubmit={search} />
	<TranslationPills onChange={updateSelectedTranslations} />

	{#if searchParams.q && selectedTranslations.length > 0}
		{#if searchQuery.isLoading}
			<div class="text-center text-sm text-stone-500 dark:text-stone-400">Searching...</div>
		{:else if searchQuery.isError}
			<div
				class="grid justify-items-center gap-3 text-center text-sm text-stone-600 dark:text-stone-300"
			>
				<div>Search failed.</div>
				<button
					type="button"
					class="border border-stone-300 px-3 py-2 text-xs uppercase dark:border-stone-700"
					onclick={() => searchQuery.refetch()}
				>
					Retry
				</button>
			</div>
		{:else if searchQuery.data}
			<div class="text-center text-xs text-stone-500 uppercase dark:text-stone-400">
				{searchQuery.data.totalDocuments} results
			</div>

			{#if searchQuery.data.data.length === 0}
				<div class="text-center text-sm text-stone-500 dark:text-stone-400">No results found.</div>
			{:else}
				<div class="grid gap-4">
					{#each searchQuery.data.data as result (result.reference + result.translation)}
						<VerseResultCard {result} />
					{/each}
				</div>
			{/if}

			{#if searchQuery.data.totalPages > 1}
				<nav class="flex items-center justify-center gap-3" aria-label="Search results pages">
					<button
						type="button"
						class="border border-stone-300 px-3 py-2 text-xs uppercase disabled:opacity-40 dark:border-stone-700"
						disabled={searchQuery.data.currentPage <= 1}
						onclick={() => goToPage(searchQuery.data.currentPage - 1)}
					>
						Previous
					</button>
					<div class="text-xs text-stone-500 uppercase dark:text-stone-400">
						Page {searchQuery.data.currentPage} of {searchQuery.data.totalPages}
					</div>
					<button
						type="button"
						class="border border-stone-300 px-3 py-2 text-xs uppercase disabled:opacity-40 dark:border-stone-700"
						disabled={searchQuery.data.currentPage >= searchQuery.data.totalPages}
						onclick={() => goToPage(searchQuery.data.currentPage + 1)}
					>
						Next
					</button>
				</nav>
			{/if}
		{/if}
	{:else if !searchParams.q}
		<div
			class="flex h-80 w-full flex-col justify-center text-center text-sm text-stone-500 dark:text-stone-400"
		>
			Search results would appear here
		</div>
	{/if}
</section>
