import {
    type BasePrismaClient,
    type PartialWithUndefined,
    type SelectFrom,
} from '@augment-vir/common';
import {PrismaPg} from '@prisma/adapter-pg';
import {type PoolConfig} from 'pg';
import {createPgliteAdapter, type PrismaPgliteAdapter} from 'prisma-pglite';
import {type Constructor} from 'type-fest';
import {buildUrl} from 'url-vir';
import {getDefaultTopLevelDatabaseDirPath} from './default-path.js';
import {
    type CreatePrismaClientParams,
    type EngineClientOutput,
    type PrismaDatabaseEngine,
} from './prisma-client-types.js';

/**
 * Connection parameters for a live Postgres database connection.
 *
 * @category Internal
 */
export type PostgresConnectionParams = {
    host: string;
    dbname: string;
    username: string;
    password: string;
    port: number;
} & PartialWithUndefined<{
    /**
     * Set `PoolConfig` options for the `pg` package. Omit this or set it to `undefined` to use this
     * package's defaults ({@link defaultPoolConfig}). Setting this to an object will overwrite all
     * the defaults, so make sure to merge {@link defaultPoolConfig} into your config if you want to
     * keep any defaults that you don't want to overwrite.
     *
     * @default defaultPoolConfig
     */
    poolConfig: Omit<PoolConfig, 'connectionString'>;
    /** These are applied to the database URL's search / query parameters. */
    searchParams: Readonly<Record<string, string | number>>;
}>;

/**
 * Default pool config options.
 *
 * @category Internal
 */
export const defaultPoolConfig: Readonly<Omit<PoolConfig, 'connectionString'>> = {
    ssl: {
        rejectUnauthorized: false,
    },
    connectionTimeoutMillis: 30_000,
    max: 5,
};

/**
 * Create a database connection URL for a live Postgres database.
 *
 * @category Internal
 */
export function createPostgresDatabaseUrl(
    connectionParams: Readonly<PostgresConnectionParams>,
): string {
    if (!connectionParams.host) {
        throw new Error('Cannot connect to database without a host.');
    }

    return buildUrl({
        hostname: connectionParams.host,
        protocol: 'postgresql',
        port: connectionParams.port,
        paths: [connectionParams.dbname],
        username: connectionParams.username,
        password: connectionParams.password,
        search: connectionParams.searchParams,
    }).href;
}

/**
 * The adapter returned by the postgres prisma client creation.
 *
 * @category Internal
 */
export type PostgresAdapter = PrismaPgliteAdapter | PrismaPg;

/**
 * Creates a Postgres Prisma client.
 *
 * @category Internal
 */
export async function createPostgresPrismaClient<PrismaClient extends BasePrismaClient>(
    prismaClientConstructor: Constructor<PrismaClient>,
    {
        connection,
        schemaPath,
        databaseDir,
        migrationsDirPath,
    }: Readonly<
        SelectFrom<
            CreatePrismaClientParams<PrismaDatabaseEngine.Postgres, PrismaClient>,
            {
                connection: true;
                schemaPath: true;
                databaseDir: true;
                migrationsDirPath: true;
            }
        >
    >,
): Promise<EngineClientOutput<PrismaDatabaseEngine.Postgres, PrismaClient>> {
    const shouldResetDatabase: boolean = !!connection.dev && connection.dev.resetDatabase;

    /* node:coverage disable: we cannot create a real Postgres server in tests. */
    const adapter =
        'dev' in connection
            ? await createPgliteAdapter({
                  schemaFilePath: schemaPath,
                  databaseName: connection.dev.databaseName,
                  migrationsDirPath,
                  dbDirName: connection.dev.test,
                  resetDatabase: shouldResetDatabase,
                  dbParentDirPath: databaseDir || getDefaultTopLevelDatabaseDirPath(),
              })
            : new PrismaPg({
                  ...(connection.liveConnection.poolConfig || defaultPoolConfig),
                  connectionString: createPostgresDatabaseUrl(connection.liveConnection),
              });

    /* node:coverage enable */

    const basePrismaClient = new prismaClientConstructor({
        adapter,
    });

    return {
        adapter,
        basePrismaClient,
        wasJustInitialized: 'wasJustInitialized' in adapter && adapter.wasJustInitialized,
        /* node:coverage disable next 1: we cannot create a real Postgres server in tests.  */
        databasePath: 'databaseDirPath' in adapter ? adapter.databaseDirPath : undefined,
    };
}
