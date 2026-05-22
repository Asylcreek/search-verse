# SearchVerse Web

SvelteKit frontend for SearchVerse.

## Stack

- SvelteKit
- TypeScript
- Tailwind CSS v4
- Bits UI
- svelte-sonner

## Developing

Install dependencies from the repository root:

```bash
pnpm install
```

Start the web app:

```bash
pnpm run dev
```

## Building

Build the static frontend:

```bash
pnpm run build
```

Preview the production build:

```bash
pnpm run preview
```

## Production

The root Nest app builds this frontend into `web/build` and serves those assets in production.
