# Production Docker Deploy Design

## Goal

Add production Docker packaging, strengthen CI checks, and add a single production deployment workflow for Search Verse.

Production deploys should happen when `dev` receives a push.

## Context

`search-verse` is a Nest API with a SvelteKit static frontend in `web`.

The API serves the frontend from:

```text
web/build
```

The current CI workflow installs dependencies, lints, checks formatting, and builds the Nest API. It does not run Svelte checks or build the frontend.

The app requires these runtime dependencies:

- Postgres for application data.
- Redis for BullMQ ingestion jobs.
- `API_BIBLE_KEY` for the upstream Bible API.

The production server uses the same nginx proxy network pattern as `gate/api`, where containers expose proxy metadata through environment variables and join an external `proxy` network.

## User Decisions

- Add Docker and production deploy support.
- Keep only one deploy workflow.
- Deploy only from `dev`.
- Keep `dev` as the default branch.
- Run frontend checks in CI.
- Include Postgres in Docker Compose.
- Include Redis in Docker Compose.
- Store Postgres data on an explicit host path.
- Store Redis data on an explicit host path.
- Use GitHub repository secrets and variables for deploy configuration.
- Use proxy environment variables and the external proxy network.
- Keep Postgres private on the internal Docker network.

## GitHub Configuration

Use repository secrets for sensitive values:

```text
API_BIBLE_KEY
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASS
REDIS_PASS
SSH_API_HOST
SSH_API_PRIVATE_KEY
SSH_API_USER
```

Use repository variables for non-sensitive values:

```text
APP_PORT=4500
VIRTUAL_HOST=searchverse.asyl.sh
```

The deploy workflow should pass those values to the remote shell. The Compose file should consume them through environment substitution.

## Dockerfile

Add a production `Dockerfile` at the repository root.

The image should:

1. Use Node 22 Alpine.
2. Enable pnpm through Corepack.
3. Install dependencies from `pnpm-lock.yaml`.
4. Copy the repository source.
5. Build the static frontend with `pnpm run build:web`.
6. Build the Nest API with `pnpm run build`.
7. Start the production API with `pnpm start:prod`.

The app serves the built frontend through Nest, so no separate frontend container is needed.

## Docker Ignore

Add `.dockerignore` to keep local and generated files out of the build context:

```text
node_modules
web/node_modules
dist
web/build
.git
.env
.DS_Store
coverage
dump.rdb
```

## Compose Services

Add `docker-compose.yml` with three services:

- `api`
- `postgres`
- `redis`

The `api` service should:

- Build from the repository root.
- Use stable production container and image names.
- Depend on `postgres` and `redis`.
- Join the internal app network.
- Join the external `proxy` network.
- Expose `APP_PORT` to the proxy network.
- Restart unless stopped.

The `postgres` service should:

- Use the official Postgres Alpine image.
- Read `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` from deploy environment variables.
- Map `POSTGRES_PASS` to `POSTGRES_PASSWORD`.
- Persist data to an explicit host path.
- Join only the internal app network.
- Restart unless stopped.

The `redis` service should:

- Use `redis:alpine`.
- Require `REDIS_PASS`.
- Persist data to an explicit host path.
- Join only the internal app network.
- Restart unless stopped.

## Runtime Environment

The `api` service should receive:

```text
NODE_ENV=production
PORT=${APP_PORT}
API_BIBLE_KEY=${API_BIBLE_KEY}
DB_URI=postgresql://${POSTGRES_USER}:${POSTGRES_PASS}@postgres:5432/${POSTGRES_DB}
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=${REDIS_PASS}
REDIS_USE_TLS=false
VIRTUAL_HOST=${VIRTUAL_HOST}
LETSENCRYPT_HOST=${VIRTUAL_HOST}
VIRTUAL_PORT=${APP_PORT}
```

`THROTTLE_TTL` and `THROTTLE_LIMIT` are optional because the app already treats them as optional.

## Persistent Paths

Use explicit server paths for persistence:

```text
~/postgres/search-verse-prod:/var/lib/postgresql/data
~/redis/search-verse-prod:/data
```

These paths make production data easier to inspect and back up than anonymous Docker volumes.

## CI Check Workflow

Update `.github/workflows/check.yml` so it validates both backend and frontend.

The workflow should:

1. Check out the repository.
2. Set up Node 22.22.
3. Set up pnpm 11.
4. Install dependencies.
5. Run backend lint.
6. Run repository format check.
7. Run SvelteKit checks in `web`.
8. Run frontend lint in `web`.
9. Run `pnpm run build:all`.

`build:all` builds the SvelteKit static frontend first, then the Nest API.

## Production Deploy Workflow

Add `.github/workflows/prod.deploy.yml`.

The workflow should:

- Run only on pushes to `dev`.
- Check out the repository.
- Install the SSH key from `SSH_API_PRIVATE_KEY`.
- Add the production host to known hosts.
- Sync the repository to `~/searchverse` on the server.
- Export GitHub secrets and variables into the remote shell.
- Run `docker-compose build --no-cache`.
- Run `docker-compose up -d --force-recreate --remove-orphans`.

The remote export should include:

```text
APP_PORT
VIRTUAL_HOST
API_BIBLE_KEY
POSTGRES_DB
POSTGRES_USER
POSTGRES_PASS
REDIS_PASS
```

Use current action releases verified through `gh`:

```text
actions/checkout@v6.0.2
actions/setup-node@v6.4.0
pnpm/action-setup@v6.0.8
shimataro/ssh-key-action@v2.8.1
appleboy/ssh-action@v1.2.5
```

## Files

Expected changes:

```text
.dockerignore
Dockerfile
docker-compose.yml
.github/workflows/check.yml
.github/workflows/prod.deploy.yml
web/eslint.config.js
```

## Non-Goals

- Do not add development or staging deploy workflows.
- Do not expose Postgres through the HTTP proxy.
- Do not add a separate frontend container.
- Do not add Typesense.
- Do not introduce Doppler.
- Do not commit the design or implementation unless explicitly requested.

## Verification

Before implementation is considered complete:

- `pnpm run lint` passes.
- `pnpm run check:format` passes.
- `pnpm --dir web run check` passes.
- `pnpm --dir web run lint` passes.
- `pnpm run build:all` passes.
- Docker Compose config renders with the expected environment variables.
