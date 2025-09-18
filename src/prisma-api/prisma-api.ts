import {addData, dumpData, type PrismaDataDumpOptions} from './model-data.js';
import {generatePrismaClient} from './prisma-client.js';
import {doesPrismaDiffExist, getPrismaDiff, resetDevPrismaDatabase} from './prisma-database.js';
import {type PrismaMigrationNeededError, PrismaResetNeededError} from './prisma-errors.js';
import {
    applyPrismaMigrationsToDev,
    applyPrismaMigrationsToProd,
    createPrismaMigration,
    getMigrationStatus,
} from './prisma-migrations.js';

export type {PrismaAddModelData, PrismaDataDumpOptions, PrismaDumpOutput} from './model-data.js';
export * from './prisma-errors.js';
export type {PrismaMigrationStatus} from './prisma-migrations.js';
export {prismaCommandsThatSupportNoHints, runPrismaCommand} from './run-prisma-command.js';

/**
 * Centralized API for interacting with some parts of Prisma.
 *
 * ## Prisma flows
 *
 * - Deploy to production
 *
 *   - `prisma.migration.applyProd()`
 * - Update dev environment
 *
 *   - Apply migrations: `prisma.migration.applyDev`
 *
 *       - If throws {@link PrismaMigrationNeededError}, prompt user for a new migration name and pass it to
 *               `prisma.migration.create`
 *       - If throws {@link PrismaResetNeededError}, reset the database with `prisma.database.resetDev`
 *   - Generate client: `prisma.client.isCurrent`
 *
 *       - If `false`, run `prisma.client.generate`
 *
 * @category Main
 */
export const prismaApi = {
    migration: {
        /**
         * Get current migration status.
         *
         * @see https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-status
         */
        status: getMigrationStatus,
        /**
         * Creates a new migration.
         *
         * @see https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-dev
         */
        create: createPrismaMigration,
        /**
         * Apply all migrations. Meant for a production environment.
         *
         * @see https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-deploy
         */
        applyProd: applyPrismaMigrationsToProd,
        /**
         * Apply all migrations. Meant for a development environment, with less protections than
         * `prisma.migration.applyProd()`
         *
         * @throws `PrismaMigrationNeededError` when a new migration is required so the user needs
         *   to input a name.
         * @throws `PrismaResetNeededError` when there's a migration mismatch with the database and
         *   it needs to be reset.
         * @see https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-dev
         */
        applyDev: applyPrismaMigrationsToDev,
    },
    database: {
        /**
         * Force resets a dev database to match the current Prisma schema and migrations.
         *
         * **This will destroy all data. Do not use in production.**
         *
         * @see https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-reset
         */
        resetDev: resetDevPrismaDatabase,
        /**
         * Uses `prisma.database.diff` to detect if there are any differences between the current
         * database and the Prisma schema that should control it.
         */
        hasDiff: doesPrismaDiffExist,
        /**
         * Gets a string list of all differences between the current database and the Prisma schema
         * that should control it.
         *
         * @see https://www.prisma.io/docs/orm/reference/prisma-cli-reference#migrate-diff
         */
        diff: getPrismaDiff,
    },
    client: {
        /**
         * Runs Prisma generators included in the given Prisma schema (which usually includes the
         * Prisma JS client). This will work even if the database doesn't exist yet.
         *
         * @example
         *
         * ```ts
         * import {prismaApi} from 'prisma-vir';
         *
         * prismaApi.client.generate('../../prisma/schema.prisma');
         * ```
         */
        generate: generatePrismaClient,
        /**
         * Adds a collection of create data entries to a database through a `PrismaClient` instance.
         * This is particularly useful for setting up mocks in a mock PrismaClient.
         *
         * @example
         *
         * ```ts
         * import {prismaApi} from 'prisma-vir';
         * import {PrismaClient} from '@prisma/client';
         *
         * await prismaApi.client.addData(new PrismaClient(), [
         *     {
         *         user: {
         *             mockUser1: {
         *                 first_name: 'one',
         *                 id: 123,
         *                 // etc.
         *             },
         *             mockUser2: {
         *                 first_name: 'two',
         *                 id: 124,
         *                 authRole: 'user',
         *                 // etc.
         *             },
         *         },
         *     },
         *     {
         *         region: [
         *             {
         *                 id: 1,
         *                 name: 'North America',
         *                 // etc.
         *             },
         *             {
         *                 id: 2,
         *                 name: 'Europe',
         *                 // etc.
         *             },
         *         ],
         *     },
         * ]);
         * ```
         */
        addData,
        /**
         * Dump data from the current database through a `PrismaClient` instance.
         *
         * @see {@link PrismaDataDumpOptions}
         */
        dumpData,
    },
};
