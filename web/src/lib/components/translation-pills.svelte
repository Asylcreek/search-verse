<script lang="ts">
	import { onMount } from 'svelte';
	import { SvelteSet } from 'svelte/reactivity';

	import { createTranslationsQuery } from '$lib/queries/searchverse';
	import { readSelectedTranslations, writeSelectedTranslations } from '$lib/storage';
	import { cn } from '$lib/utils/cn';

	let { onChange }: { onChange?: CallableFunction } = $props();

	const selected = new SvelteSet<string>();

	const selectedValues = $derived(Array.from(selected));
	const translationsQuery = createTranslationsQuery();

	onMount(() => {
		for (const abbreviation of readSelectedTranslations()) {
			selected.add(abbreviation);
		}

		onChange?.(Array.from(selected));
	});

	function toggle(abbreviation: string) {
		if (selected.has(abbreviation)) {
			selected.delete(abbreviation);
		} else {
			selected.add(abbreviation);
		}

		const selectedTranslations = Array.from(selected);

		writeSelectedTranslations(selectedTranslations);
		onChange?.(selectedTranslations);
	}
</script>

{#if translationsQuery.isLoading}
	<div class="text-center text-sm text-stone-500 dark:text-stone-400">Loading translations...</div>
{:else if translationsQuery.isError}
	<div class="text-center text-sm text-red-600 dark:text-red-400">Translations failed to load.</div>
{:else}
	<div
		class="mx-auto flex w-full max-w-2xl flex-wrap justify-center gap-2"
		aria-label="Translations"
	>
		{#each translationsQuery.data ?? [] as translation (translation.abbreviation)}
			{@const active = selectedValues.includes(translation.abbreviation)}
			<button
				type="button"
				class={cn(
					'border px-3 py-2 text-xs transition',
					active
						? 'border-stone-800 bg-stone-800 text-stone-50 dark:border-stone-50 dark:bg-stone-50 dark:text-stone-950'
						: 'border-stone-300 bg-stone-100 text-stone-700 hover:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300'
				)}
				aria-pressed={active}
				title={translation.name}
				onclick={() => toggle(translation.abbreviation)}
			>
				{translation.abbreviation}
			</button>
		{/each}
	</div>
{/if}
