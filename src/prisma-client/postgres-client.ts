import {type BasePrismaClient, type SelectFrom} from '@augment-vir/common';
import {PrismaPg} from '@prisma/adapter-pg';
import {createPgliteAdapter} from 'prisma-pglite';
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
    /**
     * These options are applied to the database URL's search / query parameters. If omitted or set
     * to `undefined`, the default is used. Set to an empty object to ignore the default.
     *
     * @default
     * ```ts
     * {
     *     sslmode: 'no-verify',
     *     connection_limit: 5,
     *     pool_timeout: 30,
     * }
     *  ```
     */
    options?: Readonly<Record<string, string | number>> | undefined;
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
        throw new Error(`Cannot connect to database without a host.`);
    }

    return buildUrl({
        hostname: connectionParams.host,
        protocol: 'postgresql',
        port: connectionParams.port,
        paths: [connectionParams.dbname],
        username: connectionParams.username,
        password: connectionParams.password,
        search: connectionParams.options || {
            sslmode: 'no-verify',
            connection_limit: 5,
            pool_timeout: 30,
        },
    }).href;
}

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
): Promise<EngineClientOutput<PrismaClient>> {
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
