/* eslint-disable sonarjs/no-hardcoded-passwords */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import {assert} from '@augment-vir/assert';
import {selectFrom} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {existsSync} from 'node:fs';
import {rm} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {repoDirPath} from '../file-paths.js';
import {dbDirPath, testPrismaSchemaPath} from '../file-paths.mock.js';
import {prismaApi} from '../prisma-api/prisma-api.js';
import {clearTestDatabaseOutputs} from '../prisma-api/prisma-database.mock.js';
import {createPrismaClient} from './create-prisma-client.js';
import {PrismaDatabaseEngine} from './prisma-client-types.js';
import {createSqliteDatabaseUrl, createSqlitePrismaClient} from './sqlite-client.js';

async function importFresh<T = unknown>(importPath: string): Promise<T> {
    return await import(`${importPath}?${Date.now()}`);
}

describe(createSqlitePrismaClient.name, () => {
    it('creates a test sqlite client', async (testContext) => {
        await clearTestDatabaseOutputs();

        await prismaApi.client.generate({
            schemaPath: testPrismaSchemaPath,
        });

        // @ts-ignore: this might not be generated yet
        const {PrismaClient} = await importFresh('../../test-files/generated/client.js');

        const {databasePath, prismaClient} = await createPrismaClient(
            PrismaDatabaseEngine.Sqlite,
            PrismaClient,
            {
                connection: {
                    dev: {
                        resetDatabase: true,
                        test: testContext,
                    },
                },
                schemaPath: testPrismaSchemaPath,
            },
        );

        assert.isString(databasePath);

        assert.strictEquals(
            relative(repoDirPath, databasePath),
            join(
                '.not-committed',
                'db',
                'create_sqlite_prisma_client_creates_a_test_sqlite_client.db',
            ),
        );

        const mockUser = {
            email: 'derp@example.com',
            password: 'test password',
        };

        const newUser = await prismaClient.user.create({
            data: mockUser,
            select: {
                id: true,
                email: true,
                password: true,
            },
        });

        assert.isDefined(newUser.id);
        assert.deepEquals(selectFrom(newUser, {email: true, password: true}), mockUser);
    });
    it('creates a dev sqlite client', async () => {
        await clearTestDatabaseOutputs();

        await prismaApi.client.generate({
            schemaPath: testPrismaSchemaPath,
        });

        // @ts-ignore: this might not be generated yet
        const {PrismaClient} = await importFresh('../../test-files/generated/client.js');

        const {databasePath, prismaClient} = await createPrismaClient(
            PrismaDatabaseEngine.Sqlite,
            PrismaClient,
            {
                connection: {
                    dev: {
                        resetDatabase: false,
                    },
                },
                schemaPath: testPrismaSchemaPath,
            },
        );

        assert.isString(databasePath);

        assert.strictEquals(
            relative(repoDirPath, databasePath),
            join('.not-committed', 'db', 'dev.db'),
        );

        const mockUser = {
            email: 'derp@example.com',
            password: 'test password',
        };

        const newUser = await prismaClient.user.create({
            data: mockUser,
            select: {
                id: true,
                email: true,
                password: true,
            },
        });

        assert.isDefined(newUser.id);
        assert.deepEquals(selectFrom(newUser, {email: true, password: true}), mockUser);
    });
    it('works with migrations', async (testContext) => {
        await clearTestDatabaseOutputs();

        const {path: databasePath, url: databaseUrl} = createSqliteDatabaseUrl({
            test: testContext,
        });

        await prismaApi.client.generate({
            schemaPath: testPrismaSchemaPath,
        });
        await prismaApi.migration.create({
            migrationName: 'init',
            schemaPath: testPrismaSchemaPath,
            env: {
                DATABASE_URL: databaseUrl,
            },
        });

        assert.isTrue(existsSync(databasePath));
        await rm(databasePath, {force: true});
        assert.isFalse(existsSync(databasePath));

        // @ts-ignore: this might not be generated yet
        const {PrismaClient} = await importFresh('../../test-files/generated/client.js');

        const {prismaClient} = await createPrismaClient(PrismaDatabaseEngine.Sqlite, PrismaClient, {
            connection: {
                dev: {
                    resetDatabase: true,
                    test: testContext,
                },
            },
            schemaPath: testPrismaSchemaPath,
        });

        assert.isString(databasePath);

        assert.strictEquals(
            relative(repoDirPath, databasePath),
            join('.not-committed', 'db', 'create_sqlite_prisma_client_works_with_migrations.db'),
        );

        const mockUser = {
            email: 'derp@example.com',
            password: 'test password',
        };

        const newUser = await prismaClient.user.create({
            data: mockUser,
            select: {
                id: true,
                email: true,
                password: true,
            },
        });

        assert.isDefined(newUser.id);
        assert.deepEquals(selectFrom(newUser, {email: true, password: true}), mockUser);
    });
    it('works with a test string', async () => {
        await clearTestDatabaseOutputs();

        await prismaApi.client.generate({
            schemaPath: testPrismaSchemaPath,
        });

        // @ts-ignore: this might not be generated yet
        const {PrismaClient} = await importFresh('../../test-files/generated/client.js');

        const {databasePath, prismaClient} = await createPrismaClient(
            PrismaDatabaseEngine.Sqlite,
            PrismaClient,
            {
                connection: {
                    dev: {
                        resetDatabase: true,
                        test: 'hello there',
                    },
                },
                schemaPath: testPrismaSchemaPath,
            },
        );

        assert.isString(databasePath);

        assert.strictEquals(
            relative(repoDirPath, databasePath),
            join('.not-committed', 'db', 'hello_there.db'),
        );

        const mockUser = {
            email: 'derp@example.com',
            password: 'test password',
        };

        const newUser = await prismaClient.user.create({
            data: mockUser,
            select: {
                id: true,
                email: true,
                password: true,
            },
        });

        assert.isDefined(newUser.id);
        assert.deepEquals(selectFrom(newUser, {email: true, password: true}), mockUser);
    });
    it('creates a prod sqlite client', async () => {
        await clearTestDatabaseOutputs();

        await prismaApi.client.generate({
            schemaPath: testPrismaSchemaPath,
        });

        // @ts-ignore: this might not be generated yet
        const {PrismaClient} = await importFresh('../../test-files/generated/client.js');

        const dbPath = join(dbDirPath, 'prod-sqlite.db');

        const {databasePath, prismaClient} = await createPrismaClient(
            PrismaDatabaseEngine.Sqlite,
            PrismaClient,
            {
                connection: {
                    liveConnection: {
                        filePath: dbPath,
                    },
                },
                schemaPath: testPrismaSchemaPath,
            },
        );

        assert.isString(databasePath);

        assert.strictEquals(databasePath, dbPath);

        const mockUser = {
            email: 'derp@example.com',
            password: 'test password',
        };

        const newUser = await prismaClient.user.create({
            data: mockUser,
            select: {
                id: true,
                email: true,
                password: true,
            },
        });

        assert.isDefined(newUser.id);
        assert.deepEquals(selectFrom(newUser, {email: true, password: true}), mockUser);
    });
});
