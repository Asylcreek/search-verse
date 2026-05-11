# Template NestJS

## Things to note

1. This is a [Nest](https://github.com/nestjs/nest) framework TypeScript starter repository.
2. eslint and prettier are setup.
3. env vars are read using the `@nestjs/config` package
4. husky and lint-staged are setup
5. some Github actions are also setup to build your app on push and pull request
6. pnpm is the package manager used

You would/might need to update the packages when you clone this repo to make sure they are up to date and all.

Enjoy!!!

## Installation

```bash
 pnpm install
```

## Running the app

```bash
# development
pnpm run start

# watch mode
pnpm run start:dev

# production mode
pnpm run start:prod
```

## Test

```bash
# unit tests
pnpm run test

# e2e tests
pnpm run test:e2e

# test coverage
pnpm run test:cov
```

## License

Nest is [MIT licensed](LICENSE).
