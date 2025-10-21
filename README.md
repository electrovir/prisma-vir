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
-   `prisma-tagged-ids`: converts all `id` fields into tagged string types so that id types do not clash with each other. Add a `/// @taggedId()` comment above a field to also tag it as an id.
