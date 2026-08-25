# prisma-vir

Prisma utilities for interacting with migrations, databases, schemas, and creating Prisma clients with optional testing databases (supporting only Postgres and SQLite).

Reference docs: https://electrovir.github.io/prisma-vir

## Install

```sh
npm i prisma-vir
```

## Client Usage

Use `createPrismaClient` to easily create a prisma client in either Postgres or SQLite with automatic configuration for tests.

## API Usage

Use `prismaApi` to run Prisma commands as an API.

## Generators Usage

This package exposes the following generators:

-   `prisma-shapes`: generates [`object-shape-tester`](https://www.npmjs.com/package/object-shape-tester) `Shape` instances for each model.
-   `prisma-string-dates`: converts all `Date` or `string` types for date fields into `UtcIsoString` from [`date-vir`](https://www.npmjs.com/package/date-vir).
-   `prisma-branded-fields`: converts all `id` fields into branded string types so that id types do not clash with each other and allows you to add a `/// @branded()` comment above any other field to also brand it. This generator also accepts an optional brand key `prefix` (as a generator input in your Prisma schema).

## Formatting Usage

Run `prisma-format [check|write] [schema-path]` to check or write four-space Prisma schema formatting. When omitted, `check|write` defaults to `write` and `schema-path` defaults to `prisma/schema.prisma`.

## Extensions

-   `createPrefixedIdExtension`: creates an extension that will insert prefixes before every model's id field. This requires ides to be string types.
-   `createIsoDatesPrismaExtension`: this creates an extension which maps all `Date` types into ISO strings. Use in conjunction with the `prisma-string-dates` generator for proper types.
