<script lang="ts">
	import { resolve } from '$app/paths';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { Toaster } from 'svelte-sonner';

	import RouteNav from '$lib/components/route-nav.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import '../app.css';

	let SvelteQueryDevtools = $state<
		typeof import('@tanstack/svelte-query-devtools').SvelteQueryDevtools | undefined
	>(undefined);

	if (import.meta.env.DEV) {
		import('@tanstack/svelte-query-devtools').then((mod) => {
			SvelteQueryDevtools = mod.SvelteQueryDevtools;
		});
	}

	let { data, children } = $props();
</script>

<svelte:head>
	<title>SearchVerse</title>
</svelte:head>

<QueryClientProvider client={data.queryClient}>
	<div class="min-h-screen bg-stone-50 text-stone-950 dark:bg-stone-950 dark:text-stone-50">
		<header
			class="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95"
		>
			<div
				class="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-5 px-6 py-5"
			>
				<a href={resolve('/')} class="font-serif text-2xl font-semibold tracking-normal"
					>SearchVerse</a
				>
				<RouteNav />
			</div>
		</header>

		<main class="mx-auto w-full max-w-5xl px-6 pb-16">
			{@render children()}
		</main>
	</div>

	<ThemeToggle />
	<Toaster richColors position="top-center" />

	{#if import.meta.env.DEV && SvelteQueryDevtools}
		<SvelteQueryDevtools />
	{/if}
</QueryClientProvider>
