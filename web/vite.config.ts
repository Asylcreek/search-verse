import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			'/v1': {
				target: process.env.PUBLIC_API_BASE_URL ?? 'http://localhost:4500',
				changeOrigin: true
			}
		}
	}
});
