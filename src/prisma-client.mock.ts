/* eslint-disable @typescript-eslint/ban-ts-comment */

// @ts-ignore: this might not be generated yet
import {type PrismaBetterSQLite3} from '@prisma/adapter-better-sqlite3';
import {PrismaPgliteAdapter} from 'prisma-pglite';
import {testPrismaMigrationsDirPath, testPrismaSchemaPostgresPath} from './file-paths.mock.js';
import {prismaApi} from './prisma-api/prisma-api.js';
import {clearTestDatabaseOutputs} from './prisma-api/prisma-database.mock.js';
import {createPrismaClient} from './prisma-client/create-prisma-client.js';
import {type PostgresAdapter} from './prisma-client/postgres-client.js';
import {PrismaDatabaseEngine} from './prisma-client/prisma-client-types.js';

async function importFresh<T = unknown>(importPath: string): Promise<T> {
    /* node:coverage ignore next 1: dynamic import is not a conditional branch */
    return await import(`${importPath}?${Date.now()}`);
}

export async function createMockPrismaClient() {
    await clearTestDatabaseOutputs();

    await prismaApi.client.generate({
        schemaPath: testPrismaSchemaPostgresPath,
    });

    // @ts-ignore: this might not be generated yet
    const {PrismaClient} = await importFresh('../test-files/generated/client.js');

    const {prismaClient, adapter} = await createPrismaClient(
        PrismaDatabaseEngine.Postgres,
        PrismaClient,
        {
            schemaPath: testPrismaSchemaPostgresPath,
            migrationsDirPath: testPrismaMigrationsDirPath,
            connection: {
                dev: {
                    resetDatabase: true,
                },
            },
        },
    );

    return {
        prismaClient,
        adapter,
    };
}

/** Close the PGlite instance inside a Prisma adapter to prevent open handle leaks. */
export async function closePgliteAdapter(adapter: PostgresAdapter | PrismaBetterSQLite3) {
    if (adapter instanceof PrismaPgliteAdapter) {
        await adapter.pgliteClient.close();
    }
}
