<script lang="ts">
	import { resolve } from '$app/paths';
	import { Toaster } from 'svelte-sonner';

	import RouteNav from '$lib/components/route-nav.svelte';
	import ThemeToggle from '$lib/components/theme-toggle.svelte';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<title>SearchVerse</title>
</svelte:head>

<div class="min-h-screen bg-stone-50 text-stone-950 dark:bg-stone-950 dark:text-stone-50">
	<header
		class="sticky top-0 z-40 border-b border-stone-200 bg-stone-50/95 backdrop-blur dark:border-stone-800 dark:bg-stone-950/95"
	>
		<div class="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5">
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
