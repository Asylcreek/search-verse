<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';

	import { cn } from '$lib/utils/cn';
</script>

<nav
	class="ml-auto flex border border-stone-300 bg-white/70 p-1 text-xs text-stone-600 uppercase dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300"
	aria-label="Main navigation"
>
	<a
		href={resolve('/')}
		class={cn(
			'px-3 py-2',
			page.url.pathname === '/' && 'bg-stone-950 text-stone-50 dark:bg-stone-50 dark:text-stone-950'
		)}
	>
		Search
	</a>
	<a
		href={resolve('/compare')}
		class={cn(
			'px-3 py-2',
			page.url.pathname.startsWith('/compare') &&
				'bg-stone-950 text-stone-50 dark:bg-stone-50 dark:text-stone-950'
		)}
	>
		Compare
	</a>
</nav>
