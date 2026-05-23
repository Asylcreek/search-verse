import js from '@eslint/js';
import * as typescriptParser from '@typescript-eslint/parser';
import eslintPluginSvelte from 'eslint-plugin-svelte';
import * as svelteParser from 'svelte-eslint-parser';

import svelteConfig from './svelte.config.js';

export default [
	js.configs.recommended,
	...eslintPluginSvelte.configs['flat/recommended'],
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: typescriptParser,
				project: './tsconfig.json',
				extraFileExtensions: ['.svelte'],
				svelteConfig
			}
		}
	},
	{
		files: ['src/service-worker.js'],
		languageOptions: {
			globals: {
				caches: 'readonly',
				fetch: 'readonly',
				self: 'readonly',
				URL: 'readonly'
			}
		}
	},
	{
		ignores: [
			'.DS_Store',
			'node_modules',
			'.svelte-kit',
			'build',
			'package',
			'.env',
			'.env.*',
			'!.env.example',
			'pnpm-lock.yaml',
			'package-lock.json',
			'yarn.lock'
		]
	}
];
