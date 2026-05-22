<script lang="ts">
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { toast } from 'svelte-sonner';

	import TranslationPills from '$lib/components/translation-pills.svelte';
	import VersePicker from '$lib/components/verse-picker.svelte';
	import VerseResultCard from '$lib/components/verse-result-card.svelte';
	import { compareResults } from '$lib/mock-data';

	let selectedTranslations = $state<string[]>([]);
	let warnedForReference = $state('');

	function updateSelectedTranslations(selection: string[]) {
		selectedTranslations = selection;
	}

	function updateVerse(selection: { book: string; chapter: string; verse: string }) {
		if (!selection.book || !selection.chapter || !selection.verse) {
			return;
		}

		const nextReference = `${selection.book} ${selection.chapter}:${selection.verse}`;

		replaceState(
			resolve(
				`/compare?book=${encodeURIComponent(selection.book)}&chapter=${encodeURIComponent(selection.chapter)}&verse=${encodeURIComponent(selection.verse)}`
			),
			{}
		);

		if (selectedTranslations.length === 0 && warnedForReference !== nextReference) {
			warnedForReference = nextReference;
			toast.error('Select at least one translation.');
		}
	}
</script>

<section class="grid gap-6 pt-10">
	<div class="mx-auto max-w-2xl text-center">
		<h1
			class="m-0 font-serif text-4xl leading-tight font-semibold tracking-normal text-stone-950 dark:text-stone-50"
		>
			Compare one verse across various translations.
		</h1>
	</div>

	<VersePicker onChange={updateVerse} />
	<TranslationPills onChange={updateSelectedTranslations} />

	<div class="grid gap-4">
		{#each compareResults as result (result.translation)}
			<VerseResultCard {result} showReference={false} />
		{/each}
	</div>
</section>
