import {assert, assertWrap, check} from '@augment-vir/assert';
import {
    addSuffix,
    sanitizeFileName,
    type BasePrismaClient,
    type Constructor,
    type PartialWithUndefined,
    type SelectFrom,
} from '@augment-vir/common';
import {extractTestNameAsDir, type UniversalTestContext} from '@augment-vir/test';
import {PrismaBetterSqlite3} from '@prisma/adapter-better-sqlite3';
import {existsSync} from 'node:fs';
import {mkdir, rm} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {prismaApi} from '../prisma-api/prisma-api.js';
import {getDefaultTopLevelDatabaseDirPath} from './default-path.js';
import {
    type CreatePrismaClientParams,
    type DevDatabaseConnection,
    type EngineClientOutput,
    type PrismaDatabaseEngine,
} from './prisma-client-types.js';

/** Prisma requires forward slashes in `file:` URLs, even on Windows. */
function toFileUrl(filePath: string) {
    return `file:${filePath.replaceAll('\\', '/')}`;
}

/**
 * All connection parameters for connecting to a SQLite database.
 *
 * @category Internal
 */
export type SqliteConnectionParams = {
    filePath: string;
};

/**
 * Creates a SQLite Prisma client.
 *
 * @category Internal
 */
export async function createSqlitePrismaClient<PrismaClient extends BasePrismaClient>(
    prismaClientConstructor: Constructor<PrismaClient>,
    {
        connection,
        databaseDir,
        configPath,
    }: Readonly<
        SelectFrom<
            CreatePrismaClientParams<PrismaDatabaseEngine.Sqlite, PrismaClient>,
            {
                connection: true;
                databaseDir: true;
                configPath: true;
            }
        >
    >,
): Promise<EngineClientOutput<PrismaDatabaseEngine.Sqlite, PrismaClient>> {
    const adapter: PrismaBetterSqlite3 & Partial<ExtraAdapterProperties> =
        'dev' in connection
            ? await createDevSqliteAdapter(connection.dev, databaseDir)
            : new PrismaBetterSqlite3({
                  url: toFileUrl(connection.liveConnection.filePath),
              });
    const databasePath: string =
        ('databasePath' in adapter && adapter.databasePath) ||
        assertWrap.isString(connection.liveConnection?.filePath);

    const alreadyExisted = existsSync(databasePath);

    const basePrismaClient = new prismaClientConstructor({
        adapter,
    });

    const wasJustInitialized = 'wasJustInitialized' in adapter && adapter.wasJustInitialized;

    if (!alreadyExisted) {
        await prismaApi.database.resetDev({
            configPath,
            withMigrations: false,
            env: {
                DATABASE_URL: toFileUrl(databasePath),
            },
        });
    }

    return {
        adapter,
        basePrismaClient,
        wasJustInitialized,
        databasePath,
    };
}

type ExtraAdapterProperties = {
    wasJustInitialized: boolean;
    databasePath: string;
};

/**
 * Create a database connection URL for a live SQLite database.
 *
 * @category Internal
 */
export function createSqliteDatabaseUrl({
    databaseDir,
    test,
    databaseName,
}: PartialWithUndefined<{
    test: string | UniversalTestContext;
    databaseDir: string;
    databaseName: string;
}> = {}) {
    const databaseDirName = test
        ? check.isString(test)
            ? sanitizeFileName(test)
            : extractTestNameAsDir(test)
        : 'dev';

    assert.isTruthy(databaseDirName);

    const databaseFileName = addSuffix({
        value: databaseName || 'db',
        suffix: '.db',
    });

    const databasePath = join(
        databaseDir || getDefaultTopLevelDatabaseDirPath(),
        databaseDirName,
        databaseFileName,
    );

    return {
        path: databasePath,
        url: toFileUrl(databasePath),
    };
}

async function createDevSqliteAdapter(
    devParams: DevDatabaseConnection,
    databaseDir: string | undefined,
): Promise<PrismaBetterSqlite3 & ExtraAdapterProperties> {
    const {path, url} = createSqliteDatabaseUrl({
        databaseDir,
        test: devParams.test,
        databaseName: devParams.databaseName,
    });
    await mkdir(dirname(path), {
        recursive: true,
    });
    const didDatabaseExistAlready = existsSync(path);

    if (devParams.resetDatabase) {
        await rm(path, {
            force: true,
        });
    }

    const adapter = new PrismaBetterSqlite3({
        url,
    });

    Object.assign(adapter, {
        wasJustInitialized: devParams.resetDatabase || !didDatabaseExistAlready,
        databasePath: path,
    } satisfies ExtraAdapterProperties);

    return adapter as PrismaBetterSqlite3 & ExtraAdapterProperties;
}
