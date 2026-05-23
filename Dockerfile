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
