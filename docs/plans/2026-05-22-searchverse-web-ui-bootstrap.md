# SearchVerse Web UI Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bootstrap the SvelteKit frontend from the provided template, build static UI-only screens, and serve the production frontend assets from the Nest app.

**Architecture:** The existing Nest app stays at the repository root. The SvelteKit app lives in `web/` as a pnpm workspace package during development, then builds static assets into `web/build` for Nest to serve in production. This phase uses mock/static UI data only; backend endpoint integration is intentionally deferred to the next plan.

**Tech Stack:** NestJS 11, SvelteKit 2, Svelte 5, Tailwind v4, Bits UI, `svelte-sonner`, `@sveltejs/adapter-static`, `@nestjs/serve-static`, pnpm.

---

## Root Cause Note for the Reported Error

The reported error:

```text
web/vite.config.ts:1:27 - error TS2307: Cannot find module '@sveltejs/kit/vite'
web/vite.config.ts:2:30 - error TS2307: Cannot find module 'vite'
```

is caused by the root Nest TypeScript watcher seeing `web/vite.config.ts` as part of the backend TypeScript project. The root `tsconfig.json` currently has no `exclude`, so a new `web/` directory can be compiled by Nest even though SvelteKit/Vite dependencies belong to the `web` package.

This plan fixes that by excluding `web` from the root TypeScript projects and adding `web` as a real pnpm workspace package.

## File Structure

Create:

- `web/` copied from `git@github.com:Asylcreek/template-sveltekit-typescript.git`
- `web/src/routes/+layout.svelte`: app shell, navigation, theme/toast host.
- `web/src/routes/+layout.ts`: static adapter route options.
- `web/src/routes/+page.svelte`: UI-only homepage search screen.
- `web/src/routes/compare/+page.svelte`: UI-only compare screen.
- `web/src/lib/components/route-nav.svelte`
- `web/src/lib/components/search-bar.svelte`
- `web/src/lib/components/translation-pills.svelte`
- `web/src/lib/components/verse-result-card.svelte`
- `web/src/lib/components/copyright-modal.svelte`
- `web/src/lib/components/verse-picker.svelte`
- `web/src/lib/mock-data.ts`
- `web/src/lib/storage.ts`
- `web/src/app.css`

Modify:

- `pnpm-workspace.yaml`: include `web`.
- `package.json`: add root scripts for web development/build and production serving.
- `tsconfig.json`: exclude `web` from root Nest compilation.
- `tsconfig.build.json`: exclude `web` from root Nest build.
- `src/app.module.ts`: add production static asset serving.
- `web/package.json`: rename package and add frontend dependencies.
- `web/svelte.config.js`: switch to static adapter with `web/build` output.

Do not make git commits unless explicitly requested.

---

### Task 1: Copy the SvelteKit Template into `web/`

**Files:**

- Create: `web/**`
- Modify: `pnpm-workspace.yaml`
- Modify: `tsconfig.json`
- Modify: `tsconfig.build.json`

- [ ] **Step 1: Copy the template**

Run:

```bash
git clone --depth 1 git@github.com:Asylcreek/template-sveltekit-typescript.git /private/tmp/searchverse-template-sveltekit
mkdir web
rsync -a --exclude .git --exclude pnpm-lock.yaml /private/tmp/searchverse-template-sveltekit/ web/
```

Expected:

```text
web/package.json
web/svelte.config.js
web/vite.config.ts
web/src/routes/+page.svelte
```

- [ ] **Step 2: Add `web` to the pnpm workspace**

Modify `pnpm-workspace.yaml`:

```yaml
packages:
  - '.'
  - 'web'

allowBuilds:
  '@nestjs/core': true
  esbuild: true
  msgpackr-extract: true
  unrs-resolver: true
```

- [ ] **Step 3: Exclude `web` from root TypeScript compilation**

Modify `tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "types": ["jest", "node"],
    "declaration": true,
    "removeComments": true,
    "emitDecoratorMetadata": true,
    "experimentalDecorators": true,
    "allowSyntheticDefaultImports": true,
    "target": "ES2021",
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": ".",
    "incremental": true,
    "skipLibCheck": true,
    "strictNullChecks": false,
    "noImplicitAny": false,
    "strictBindCallApply": false,
    "forceConsistentCasingInFileNames": false,
    "noFallthroughCasesInSwitch": false
  },
  "exclude": ["web", "node_modules", "dist"]
}
```

Modify `tsconfig.build.json`:

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": false
  },
  "exclude": [
    "node_modules",
    "test",
    "dist",
    "web",
    "**/*spec.ts",
    "drizzle.config.ts"
  ]
}
```

- [ ] **Step 4: Install workspace dependencies**

Run:

```bash
pnpm install
```

Expected: install completes and root `node_modules` links the `web` workspace package.

- [ ] **Step 5: Verify the reported error is fixed**

Run:

```bash
pnpm run build
```

Expected: Nest build does not compile `web/vite.config.ts`; the previous `@sveltejs/kit/vite` and `vite` root compiler errors do not appear.

---

### Task 2: Configure the Web Package for This App

**Files:**

- Modify: `web/package.json`
- Modify: `web/svelte.config.js`
- Create: `web/src/routes/+layout.ts`

- [ ] **Step 1: Update `web/package.json`**

Set the package name and add dependencies needed for the UI-only screens:

```json
{
  "name": "search-verse-web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "vite dev",
    "build": "vite build",
    "preview": "vite preview",
    "check": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json",
    "check:watch": "svelte-kit sync && svelte-check --tsconfig ./tsconfig.json --watch",
    "check:format": "prettier --check .",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "bits-ui": "^2.0.0",
    "svelte-sonner": "^1.0.0"
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "@sveltejs/adapter-static": "^3.0.10",
    "@sveltejs/kit": "^2.60.1",
    "@sveltejs/vite-plugin-svelte": "^7.1.2",
    "@tailwindcss/vite": "^4.0.0",
    "@trivago/prettier-plugin-sort-imports": "^6.0.2",
    "@types/eslint": "9.6.1",
    "@typescript-eslint/eslint-plugin": "^8.59.4",
    "@typescript-eslint/parser": "^8.59.4",
    "cspell": "^10.0.0",
    "eslint": "^10.4.0",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-svelte": "^3.17.1",
    "prettier": "^3.8.3",
    "prettier-plugin-svelte": "^4.0.1",
    "svelte": "^5.55.9",
    "svelte-check": "^4.4.8",
    "svelte-eslint-parser": "^1.6.1",
    "tailwindcss": "^4.0.0",
    "tslib": "^2.8.1",
    "typescript": "^6.0.3",
    "vite": "^8.0.14"
  },
  "type": "module"
}
```

- [ ] **Step 2: Configure static adapter**

Replace `web/svelte.config.js`:

```js
import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      pages: 'build',
      assets: 'build',
      fallback: '200.html',
      strict: false,
    }),
  },
};

export default config;
```

- [ ] **Step 3: Add static route options**

Create `web/src/routes/+layout.ts`:

```ts
export const prerender = true;
export const ssr = false;
```

- [ ] **Step 4: Install dependencies and check Svelte**

Run:

```bash
pnpm install
pnpm --dir web run check
```

Expected: `svelte-check` completes without missing `@sveltejs/kit/vite` or `vite` errors.

---

### Task 3: Add Tailwind v4 and App Styling Foundation

**Files:**

- Modify: `web/vite.config.ts`
- Create: `web/src/app.css`
- Modify: `web/src/routes/+layout.svelte`

- [ ] **Step 1: Add Tailwind Vite plugin**

Modify `web/vite.config.ts`:

```ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
});
```

- [ ] **Step 2: Create global CSS**

Create `web/src/app.css`:

```css
@import 'tailwindcss';

@custom-variant dark (&:where(.dark, .dark *));

:root {
  color-scheme: light;
}

:root.dark {
  color-scheme: dark;
}

body {
  margin: 0;
}
```

- [ ] **Step 3: Create app shell layout**

Replace `web/src/routes/+layout.svelte`:

```svelte
<script lang="ts">
  import RouteNav from '$lib/components/route-nav.svelte';
  import { Toaster } from 'svelte-sonner';

  import '../app.css';

  let { children } = $props();
</script>

<svelte:head>
  <title>SearchVerse</title>
</svelte:head>

<div
  class="min-h-screen bg-stone-50 text-stone-950 dark:bg-stone-950 dark:text-stone-50"
>
  <header
    class="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-5"
  >
    <a href="/" class="font-serif text-2xl font-semibold tracking-normal"
      >SearchVerse</a
    >
    <RouteNav />
  </header>

  <main class="mx-auto w-full max-w-5xl px-6 pb-16">
    {@render children()}
  </main>
</div>

<Toaster richColors position="top-center" />
```

- [ ] **Step 4: Run Svelte check**

Run:

```bash
pnpm --dir web run check
```

Expected: check passes.

---

### Task 4: Build Static UI Components

**Files:**

- Create: `web/src/lib/components/route-nav.svelte`
- Create: `web/src/lib/components/search-bar.svelte`
- Create: `web/src/lib/components/translation-pills.svelte`
- Create: `web/src/lib/components/verse-result-card.svelte`
- Create: `web/src/lib/components/copyright-modal.svelte`
- Create: `web/src/lib/components/verse-picker.svelte`
- Create: `web/src/lib/mock-data.ts`
- Create: `web/src/lib/storage.ts`

- [ ] **Step 1: Add mock data**

Create `web/src/lib/mock-data.ts`:

```ts
export interface TranslationOption {
  abbreviation: string;
  name: string;
}

export interface VerseResult {
  reference?: string;
  text: string;
  translation: string;
  testament?: string;
  copyright: string;
}

export const translations: TranslationOption[] = [
  { abbreviation: 'KJV', name: 'King James Version' },
  { abbreviation: 'NLT', name: 'New Living Translation' },
  { abbreviation: 'AMP', name: 'Amplified Bible' },
  { abbreviation: 'ESV', name: 'English Standard Version' },
  { abbreviation: 'NIV', name: 'New International Version' },
  { abbreviation: 'ASV', name: 'American Standard Version' },
];

export const searchResults: VerseResult[] = [
  {
    reference: '1 Corinthians 13:4',
    text: 'Love is patient and kind. Love is not jealous or boastful or proud.',
    translation: 'NLT',
    testament: 'New Testament',
    copyright: 'New Living Translation copyright notice appears here.',
  },
  {
    reference: '1 Corinthians 13:4',
    text: 'Charity suffereth long, and is kind; charity envieth not; charity vaunteth not itself.',
    translation: 'KJV',
    testament: 'New Testament',
    copyright: 'King James Version. Public Domain.',
  },
];

export const compareResults: VerseResult[] = [
  {
    text: 'For God so loved the world, that he gave his only begotten Son...',
    translation: 'KJV',
    copyright: 'King James Version. Public Domain.',
  },
  {
    text: 'For this is how God loved the world: He gave his one and only Son...',
    translation: 'NLT',
    copyright: 'New Living Translation copyright notice appears here.',
  },
];

export const books = [
  'Genesis',
  'Exodus',
  'Psalms',
  'Matthew',
  'John',
  'Romans',
];
export const chapters = ['1', '2', '3', '4', '5'];
export const verses = ['1', '2', '3', '16', '17'];
```

- [ ] **Step 2: Add selected translation persistence helper**

Create `web/src/lib/storage.ts`:

```ts
const selectedTranslationsKey = 'searchverse:selected-translations';

export function readSelectedTranslations() {
  if (typeof localStorage === 'undefined') {
    return [];
  }

  const value = localStorage.getItem(selectedTranslationsKey);

  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item) => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

export function writeSelectedTranslations(translations: string[]) {
  localStorage.setItem(selectedTranslationsKey, JSON.stringify(translations));
}
```

- [ ] **Step 3: Add route nav**

Create `web/src/lib/components/route-nav.svelte`:

```svelte
<script lang="ts">
  import { page } from '$app/state';
</script>

<nav
  class="flex border border-stone-300 bg-white/70 p-1 text-xs text-stone-600 uppercase dark:border-stone-700 dark:bg-stone-900/70 dark:text-stone-300"
>
  <a
    href="/"
    class="px-3 py-2 {page.url.pathname === '/'
      ? 'bg-stone-950 text-stone-50 dark:bg-stone-50 dark:text-stone-950'
      : ''}"
  >
    Home
  </a>
  <a
    href="/compare"
    class="px-3 py-2 {page.url.pathname === '/compare'
      ? 'bg-stone-950 text-stone-50 dark:bg-stone-50 dark:text-stone-950'
      : ''}"
  >
    Compare
  </a>
</nav>
```

- [ ] **Step 4: Add reusable UI components**

Create the remaining components with the approved visual structure:

- `search-bar.svelte`: query input and submit button.
- `translation-pills.svelte`: centered multi-select translation pills.
- `verse-result-card.svelte`: optional top-left reference, prominent verse text, bottom-left translation, bottom-right copyright button.
- `copyright-modal.svelte`: modal for the clicked card's copyright.
- `verse-picker.svelte`: three searchable selects with static mock options.

Keep these components UI-only. Do not add API calls in this task.

- [ ] **Step 5: Run Svelte check**

Run:

```bash
pnpm --dir web run check
```

Expected: check passes.

---

### Task 5: Build the Homepage and Compare Screens with Mock Data

**Files:**

- Modify: `web/src/routes/+page.svelte`
- Create: `web/src/routes/compare/+page.svelte`

- [ ] **Step 1: Implement homepage UI**

Replace `web/src/routes/+page.svelte` with a UI-only screen that:

- centers the title
- shows the search bar
- shows centered translation pills
- shows `2 results`
- renders mock search result cards
- shows toast on search when query is empty or no translation is selected

- [ ] **Step 2: Implement compare UI**

Create `web/src/routes/compare/+page.svelte` with a UI-only screen that:

- centers the title
- shows the three searchable selects
- shows centered translation pills
- shows `John 3:16`
- renders mock compare result cards without a top-left reference
- resets chapter and verse when book changes
- resets verse when chapter changes
- shows toast when a full verse is selected but no translation is selected

- [ ] **Step 3: Run web checks and build**

Run:

```bash
pnpm --dir web run check
pnpm --dir web run build
```

Expected:

- Svelte check passes.
- `web/build/index.html` exists.
- `web/build/200.html` exists.
- SvelteKit build completes.

---

### Task 6: Add Nest Static Asset Serving

**Files:**

- Modify: `package.json`
- Modify: `src/app.module.ts`

- [ ] **Step 1: Add Nest static dependency**

Run:

```bash
pnpm add @nestjs/serve-static
```

Expected: root `package.json` includes `@nestjs/serve-static`.

- [ ] **Step 2: Configure `ServeStaticModule`**

Modify `src/app.module.ts`:

```ts
import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

import { ApiBibleModule } from './api-bible/api-bible.module';
import { BooksModule } from './book/book.module';
import { BullConfigModule } from './config/bull-config.module';
import { DatabaseModule } from './database/database.module';
import { validate } from './env-validation/env.validation';
import { IngestionModule } from './ingestion/ingestion.module';
import { ResponseInterceptor } from './interceptors/response.interceptor';
import { SearchModule } from './search/search.module';
import { TranslationModule } from './translation/translation.module';
import { GlobalExceptionFilter } from './utils/global-exception.filter';
import { VerseModule } from './verse/verse.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'web', 'build'),
      exclude: ['/v1/*path'],
    }),
    BullConfigModule,
    ScheduleModule.forRoot(),
    DatabaseModule,
    ApiBibleModule,
    IngestionModule,
    TranslationModule,
    SearchModule,
    VerseModule,
    BooksModule,
  ],
  controllers: [],
  providers: [
    {
      provide: APP_PIPE,
      useValue: new ValidationPipe({
        whitelist: true,
        stopAtFirstError: true,
        transform: true,
      }),
    },
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_INTERCEPTOR, useValue: new ResponseInterceptor() },
  ],
})
export class AppModule {}
```

- [ ] **Step 3: Add root scripts**

Modify root `package.json` scripts:

```json
{
  "scripts": {
    "build": "nest build",
    "build:web": "pnpm --dir web run build",
    "build:all": "pnpm run build:web && pnpm run build",
    "start:web": "pnpm --dir web run dev",
    "start:prod": "node dist/main"
  }
}
```

Keep existing scripts that are not shown here.

- [ ] **Step 4: Run root build**

Run:

```bash
pnpm run build:all
```

Expected:

- `web/build` exists.
- `dist` exists.
- Nest build succeeds.
- Root build does not compile `web/vite.config.ts`.

---

### Task 7: Verify Development and Production Behavior

**Files:**

- No planned file changes.

- [ ] **Step 1: Verify web development server**

Run:

```bash
pnpm run start:web
```

Expected:

- Vite starts the SvelteKit app.
- `/` renders the homepage mock UI.
- `/compare` renders the compare mock UI.

- [ ] **Step 2: Verify Nest production serving**

Run:

```bash
pnpm run build:all
PORT=3000 pnpm run start:prod
```

Expected:

- `http://localhost:3000/` serves the SvelteKit homepage.
- `http://localhost:3000/compare` serves the SvelteKit compare page on direct request.
- `http://localhost:3000/v1/translations` is handled by the API, not the frontend fallback.

- [ ] **Step 3: Verify formatting and checks**

Run:

```bash
pnpm run check:format
pnpm --dir web run check
pnpm run build
```

Expected:

- Formatting check passes.
- Svelte check passes.
- Nest build passes.

## Deferred to the Next Plan

The next plan will integrate real backend endpoints into the frontend:

- `GET /translations`
- `GET /books`
- `GET /search`
- `GET /verses/:reference`
- TanStack Query setup and query keys
- API error handling
- loading/empty/error states backed by real responses
