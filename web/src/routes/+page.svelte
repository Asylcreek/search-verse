<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';

	import SearchBar from '$lib/components/search-bar.svelte';
	import TranslationPills from '$lib/components/translation-pills.svelte';
	import VerseResultCard from '$lib/components/verse-result-card.svelte';
	import { searchResults } from '$lib/mock-data';

	let query = $state('love is patient');
	let selectedTranslations = $state<string[]>([]);

	function updateSelectedTranslations(selection: string[]) {
		selectedTranslations = selection;
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

		replaceState(resolve(`/?q=${encodeURIComponent(trimmedQuery)}`), {});
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

	<SearchBar bind:value={query} onsubmit={search} />
	<TranslationPills onChange={updateSelectedTranslations} />

	<div class="text-center text-xs text-stone-500 uppercase dark:text-stone-400">
		{searchResults.length} results
	</div>

	<div class="grid gap-4">
		{#each searchResults as result (result.reference + result.translation)}
			<VerseResultCard {result} />
		{/each}
	</div>
</section>
