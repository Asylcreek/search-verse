# Production Docker Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add production Docker packaging, frontend-aware CI checks, and a prod-only GitHub Actions deployment workflow.

**Architecture:** Build one production image that contains the static SvelteKit frontend and Nest API. Run production through Docker Compose with `api`, `postgres`, and `redis` services on an internal network, plus the `api` service on the external proxy network.

**Tech Stack:** GitHub Actions, Docker Compose, Node 22 Alpine, pnpm 11, NestJS, SvelteKit static adapter, Postgres, Redis.

**Design Doc:** `docs/specs/2026-05-23-prod-docker-deploy-design.md`

**Commit Policy:** Do not commit unless the user explicitly asks.

---

## File Structure

- Create `.dockerignore`: exclude local dependencies, builds, env files, git metadata, and generated runtime files from the Docker context.
- Create `Dockerfile`: install pnpm dependencies, build the SvelteKit frontend, build the Nest API, and run the production server.
- Create `docker-compose.yml`: define `api`, `postgres`, and `redis`, wire GitHub-provided env values, persistent host paths, and proxy network settings.
- Modify `.github/workflows/check.yml`: add frontend Svelte checks, frontend lint, and full app build.
- Create `.github/workflows/prod.deploy.yml`: deploy only from `dev` to `~/searchverse` using repo secrets and variables.
- Modify `web/eslint.config.js`: add service worker globals required by the new frontend lint check if lint exposes missing globals.

## Task 1: Add Docker Build Context Rules

**Files:**

- Create: `.dockerignore`

- [ ] **Step 1: Create `.dockerignore`**

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

- [ ] **Step 2: Verify the file exists**

Run: `test -f .dockerignore`

Expected: exits with status `0`.

## Task 2: Add Production Dockerfile

**Files:**

- Create: `Dockerfile`

- [ ] **Step 1: Create `Dockerfile`**

```dockerfile
FROM node:22-alpine

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

WORKDIR /usr/src/app

RUN npm install -g corepack@latest
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY web/package.json ./web/package.json

RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm run build:web
RUN pnpm run build

EXPOSE 4500

CMD ["pnpm", "start:prod"]
```

- [ ] **Step 2: Validate Dockerfile syntax by building the image**

Run: `docker build -t search-verse-prod-test .`

Expected: image build completes successfully.

## Task 3: Add Production Compose Stack

**Files:**

- Create: `docker-compose.yml`

- [ ] **Step 1: Create `docker-compose.yml`**

```yaml
networks:
  searchverse:
    name: searchverse
    driver: bridge
  proxy:
    name: proxy
    external: true

services:
  api:
    container_name: searchverse-api
    image: searchverse-api
    build:
      context: .
    environment:
      - NODE_ENV=production
      - PORT=${APP_PORT}
      - API_BIBLE_KEY=${API_BIBLE_KEY}
      - DB_URI=postgresql://${POSTGRES_USER}:${POSTGRES_PASS}@postgres:5432/${POSTGRES_DB}
      - REDIS_HOST=redis
      - REDIS_PORT=6379
      - REDIS_PASSWORD=${REDIS_PASS}
      - REDIS_USE_TLS=false
      - VIRTUAL_HOST=${VIRTUAL_HOST}
      - LETSENCRYPT_HOST=${VIRTUAL_HOST}
      - VIRTUAL_PORT=${APP_PORT}
    expose:
      - ${APP_PORT}
    depends_on:
      - postgres
      - redis
    networks:
      - searchverse
      - proxy
    restart: unless-stopped

  postgres:
    container_name: searchverse-postgres
    image: postgres:17-alpine
    environment:
      - POSTGRES_DB=${POSTGRES_DB}
      - POSTGRES_USER=${POSTGRES_USER}
      - POSTGRES_PASSWORD=${POSTGRES_PASS}
    volumes:
      - ~/postgres/search-verse-prod:/var/lib/postgresql/data
    networks:
      - searchverse
    restart: unless-stopped

  redis:
    container_name: searchverse-redis
    image: redis:alpine
    command: redis-server --requirepass ${REDIS_PASS} --appendonly yes
    volumes:
      - ~/redis/search-verse-prod:/data
    networks:
      - searchverse
    restart: unless-stopped
```

- [ ] **Step 2: Render the Compose config with local dummy env values**

Run:

```bash
APP_PORT=4500 VIRTUAL_HOST=searchverse.asyl.sh API_BIBLE_KEY=dummy POSTGRES_DB=search_verse POSTGRES_USER=search_verse POSTGRES_PASS=dummy REDIS_PASS=dummy docker-compose config
```

Expected: config renders successfully and includes `api`, `postgres`, and `redis`.

## Task 4: Update Check Workflow

**Files:**

- Modify: `.github/workflows/check.yml`

- [ ] **Step 1: Replace `.github/workflows/check.yml`**

```yaml
name: Check

on: [push, pull_request]

permissions:
  contents: read

jobs:
  main:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v6.0.2
        with:
          persist-credentials: false
      - uses: actions/setup-node@v6.4.0
        with:
          node-version: '^22.22'
      - uses: pnpm/action-setup@v6.0.8
        with:
          version: 11
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      - name: Lint API
        run: pnpm run lint
      - name: Check format
        run: pnpm run check:format
      - name: Check web
        run: pnpm --dir web run check
      - name: Lint web
        run: pnpm --dir web run lint
      - name: Build
        run: pnpm run build:all
```

- [ ] **Step 2: Run the same local validation commands**

Run:

```bash
pnpm run lint
pnpm run check:format
pnpm --dir web run check
pnpm --dir web run lint
pnpm run build:all
```

Expected: every command exits with status `0`.

## Task 5: Add Production Deploy Workflow

**Files:**

- Create: `.github/workflows/prod.deploy.yml`

- [ ] **Step 1: Create `.github/workflows/prod.deploy.yml`**

```yaml
name: Deploy prod

on:
  push:
    branches:
      - dev

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      contents: read
    steps:
      - name: Checkout repository
        uses: actions/checkout@v6.0.2

      - name: Install SSH key
        uses: shimataro/ssh-key-action@v2.8.1
        with:
          key: ${{ secrets.SSH_API_PRIVATE_KEY }}
          known_hosts: 'placeholder-to-prevent-errors'

      - name: Add known hosts
        run: ssh-keyscan -H ${{ secrets.SSH_API_HOST }} >> ~/.ssh/known_hosts

      - name: Copy files
        run: rsync -arvz --delete ./ ${{ secrets.SSH_API_USER }}@${{ secrets.SSH_API_HOST }}:~/searchverse

      - name: Run deployment
        uses: appleboy/ssh-action@v1.2.5
        env:
          APP_PORT: ${{ vars.APP_PORT }}
          VIRTUAL_HOST: ${{ vars.VIRTUAL_HOST }}
          API_BIBLE_KEY: ${{ secrets.API_BIBLE_KEY }}
          POSTGRES_DB: ${{ secrets.POSTGRES_DB }}
          POSTGRES_USER: ${{ secrets.POSTGRES_USER }}
          POSTGRES_PASS: ${{ secrets.POSTGRES_PASS }}
          REDIS_PASS: ${{ secrets.REDIS_PASS }}
        with:
          host: ${{ secrets.SSH_API_HOST }}
          username: ${{ secrets.SSH_API_USER }}
          key: ${{ secrets.SSH_API_PRIVATE_KEY }}
          port: 22
          envs: APP_PORT,VIRTUAL_HOST,API_BIBLE_KEY,POSTGRES_DB,POSTGRES_USER,POSTGRES_PASS,REDIS_PASS
          script: |
            cd ~/searchverse
            export APP_PORT=$APP_PORT VIRTUAL_HOST=$VIRTUAL_HOST API_BIBLE_KEY=$API_BIBLE_KEY POSTGRES_DB=$POSTGRES_DB POSTGRES_USER=$POSTGRES_USER POSTGRES_PASS=$POSTGRES_PASS REDIS_PASS=$REDIS_PASS
            docker-compose build --no-cache
            docker-compose up -d --force-recreate --remove-orphans
```

- [ ] **Step 2: Verify workflow trigger**

Run: `rg -n "branches:|dev|~/searchverse|REDIS_PASS|POSTGRES_PASS" .github/workflows/prod.deploy.yml`

Expected: output includes `dev`, `~/searchverse`, `REDIS_PASS`, and `POSTGRES_PASS`.

## Task 6: Final Verification

**Files:**

- Verify: `.dockerignore`
- Verify: `Dockerfile`
- Verify: `docker-compose.yml`
- Verify: `.github/workflows/check.yml`
- Verify: `.github/workflows/prod.deploy.yml`

- [ ] **Step 1: Check changed files**

Run: `git status --short`

Expected: only the spec, plan, Docker, Compose, and workflow files for this task are changed.

- [ ] **Step 2: Render Compose config**

Run:

```bash
APP_PORT=4500 VIRTUAL_HOST=searchverse.asyl.sh API_BIBLE_KEY=dummy POSTGRES_DB=search_verse POSTGRES_USER=search_verse POSTGRES_PASS=dummy REDIS_PASS=dummy docker-compose config
```

Expected: exits with status `0`.

- [ ] **Step 3: Run full local validation**

Run:

```bash
pnpm run lint
pnpm run check:format
pnpm --dir web run check
pnpm --dir web run lint
pnpm run build:all
```

Expected: every command exits with status `0`.

- [ ] **Step 4: Build Docker image**

Run: `docker build -t search-verse-prod-test .`

Expected: image build completes successfully.
