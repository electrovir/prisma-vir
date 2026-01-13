/* eslint-disable @typescript-eslint/ban-ts-comment */

// @ts-ignore: this might not be generated yet
import {testPrismaMigrationsDirPath, testPrismaSchemaPostgresPath} from './file-paths.mock.js';
import {prismaApi} from './prisma-api/prisma-api.js';
import {clearTestDatabaseOutputs} from './prisma-api/prisma-database.mock.js';
import {createPrismaClient} from './prisma-client/create-prisma-client.js';
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

    const {prismaClient} = await createPrismaClient(PrismaDatabaseEngine.Postgres, PrismaClient, {
        schemaPath: testPrismaSchemaPostgresPath,
        migrationsDirPath: testPrismaMigrationsDirPath,
        connection: {
            dev: {
                resetDatabase: true,
            },
        },
    });

    return prismaClient;
}
