<script lang="ts">
	import { Moon, Sun } from '@lucide/svelte';
	import { onMount } from 'svelte';

	import { readColorScheme, writeColorScheme } from '$lib/storage';

	let isDark = $state(false);

	function applyTheme(nextIsDark: boolean) {
		isDark = nextIsDark;
		globalThis.document.documentElement.classList.toggle('dark', nextIsDark);
		writeColorScheme(nextIsDark ? 'dark' : 'light');
	}

	onMount(() => {
		const colorScheme = readColorScheme();
		isDark = colorScheme
			? colorScheme === 'dark'
			: globalThis.document.documentElement.classList.contains('dark');
	});
</script>

<button
	type="button"
	class="fixed bottom-5 left-5 z-50 grid size-11 place-items-center border border-stone-300 bg-white text-stone-700 shadow-lg transition hover:border-stone-500 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-200"
	aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
	title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
	onclick={() => applyTheme(!isDark)}
>
	{#if isDark}
		<Sun size={18} strokeWidth={1.8} aria-hidden="true" />
	{:else}
		<Moon size={18} strokeWidth={1.8} aria-hidden="true" />
	{/if}
</button>
