import {
    type BasePrismaClient,
    type MaybePromise,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {type UniversalTestContext} from '@augment-vir/test';
import {type DynamicClientExtensionThis} from '@prisma/client/runtime/client.js';
import {type PrismaConfig} from '@prisma/config';
import {type RequireExactlyOne} from 'type-fest';
import {type PostgresConnectionParams} from './postgres-client.js';
import {type SqliteConnectionParams} from './sqlite-client.js';

/* node:coverage disable next 12 */
/**
 * Used purely for constructing the type {@link SqlMigrationAwareDriverAdapterFactory}.
 *
 * @category Internal
 */
export const fakePrismaConfig: PrismaConfig = {
    engine: 'js',
    adapter() {
        return {} as any;
    },
};

/**
 * We have to reconstruct this type because Prisma doesn't export it.
 *
 * @category Internal
 */
export type SqlMigrationAwareDriverAdapterFactory = Awaited<
    ReturnType<(typeof fakePrismaConfig)['adapter']>
>;

/**
 * Internal outputs of each Prisma client engine constructor.
 *
 * @category Internal
 */
export type EngineClientOutput<PrismaClient extends BasePrismaClient> = {
    adapter: SqlMigrationAwareDriverAdapterFactory;
    databasePath: string | undefined;
    basePrismaClient: PrismaClient;
    wasJustInitialized: boolean;
};

/**
 * The supported database engines by this package's `createPrismaClient` function.
 *
 * @category Internal
 */
export enum PrismaDatabaseEngine {
    Postgres = 'postgres',
    Sqlite = 'sqlite',
}

/**
 * Mapping of supported database engines to their connection parameters.
 *
 * @category Internal
 */
export type DatabaseConnectionParams = {
    [PrismaDatabaseEngine.Postgres]: PostgresConnectionParams;
    [PrismaDatabaseEngine.Sqlite]: SqliteConnectionParams;
};

/**
 * Connection parameters for dev and test databases.
 *
 * @category Internal
 */
export type DevDatabaseConnection = PartialWithUndefined<{
    /** Use a different directory for the database, for tests. */
    test: UniversalTestContext | string;
    /** Allow multiple databases with the same dev params but with different names. */
    databaseName: string;
}> & {
    /**
     * - `true`: reset the database right now. (Recommended for tests.)
     * - `false`: never reset the database.
     */
    resetDatabase: boolean;
};

/**
 * All parameters for `createPrismaClient`.
 *
 * @category Internal
 */
export type CreatePrismaClientParams<
    Engine extends PrismaDatabaseEngine,
    PrismaClient extends BasePrismaClient = BasePrismaClient,
> = {
    schemaPath: string;
    migrationsDirPath: string;
    connection: RequireExactlyOne<{
        /** For databases in dev or in tests. */
        dev: DevDatabaseConnection;
        /** For connection to live databases in production-like environments. */
        liveConnection: DatabaseConnectionParams[Engine];
    }>;
} & PartialWithUndefined<{
    /**
     * If defined, this will override the folder for all file system databases.
     *
     * @default
     * - join('<dir of package-lock.json>', '.not-committed', 'db')
     * - join(process.cwd(), '.not-committed', 'db')
     */
    databaseDir: string;
    /** A script intended for adding prisma client extensions. */
    extendScript: (params: {
        prismaClient: PrismaClient;
    }) => DynamicClientExtensionThis<any, any, any>;
    /**
     * - When set: this script will be executed _only if `connection.dev` is set_ and only if the
     *   database was just freshly setup, or if it was just reset.
     * - When omitted or `undefined`: no seeding will ever be executed.
     */
    seedScript: (params: {
        test: UniversalTestContext | string | undefined;
        prismaClient: PrismaClient;
    }) => MaybePromise<void>;
}>;

/**
 * Output from `createPrismaClient`.
 *
 * @category Internal
 */
export type CreatePrismaClientOutput<PrismaClient extends BasePrismaClient> = {
    adapter: SqlMigrationAwareDriverAdapterFactory;
    prismaClient: PrismaClient;
    databasePath: string | undefined;
};
