import { browser } from '$app/environment';
import { QueryClient } from '@tanstack/svelte-query';

export function load() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				enabled: browser,
				staleTime: 1000 * 60 * 5,
				gcTime: 1000 * 60 * 2
			}
		}
	});

	return { queryClient };
}

export const prerender = true;
export const ssr = false;
