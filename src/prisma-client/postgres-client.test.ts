/* eslint-disable @typescript-eslint/ban-ts-comment */

import {assert} from '@augment-vir/assert';
import {selectFrom} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {join, relative} from 'node:path';
import {repoDirPath} from '../file-paths.js';
import {testPrismaConfigPostgresPath} from '../file-paths.mock.js';
import {prismaApi} from '../prisma-api/prisma-api.js';
import {clearTestDatabaseOutputs} from '../prisma-api/prisma-database.mock.js';
import {closePgliteAdapter} from '../prisma-client.mock.js';
import {createPrismaClient} from './create-prisma-client.js';
import {createPostgresDatabaseUrl} from './postgres-client.js';
import {PrismaDatabaseEngine} from './prisma-client-types.js';

async function importFresh<T = unknown>(importPath: string): Promise<T> {
    return await import(`${importPath}?${Date.now()}`);
}

describe(createPostgresDatabaseUrl.name, () => {
    it('creates a pglite client', async (testContext) => {
        await clearTestDatabaseOutputs();

        await prismaApi.client.generate({
            configPath: testPrismaConfigPostgresPath,
        });

        // @ts-ignore: this might not be generated yet
        const {PrismaClient} = await importFresh('../../test-files/generated/client.js');

        const {databasePath, prismaClient, adapter} = await createPrismaClient(
            PrismaDatabaseEngine.Postgres,
            PrismaClient,
            {
                connection: {
                    dev: {
                        resetDatabase: true,
                        test: testContext,
                    },
                },
                configPath: testPrismaConfigPostgresPath,
            },
        );

        try {
            assert.isString(databasePath);

            assert.strictEquals(
                relative(repoDirPath, databasePath),
                join(
                    '.not-committed',
                    'db',
                    'create_postgres_database_url_creates_a_pglite_client',
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
            assert.deepEquals(
                selectFrom(newUser, {
                    email: true,
                    password: true,
                }),
                mockUser,
            );
        } finally {
            await prismaClient.$disconnect();
            await closePgliteAdapter(adapter);
        }
    });
    it('builds URL without search params by default', () => {
        assert.strictEquals(
            createPostgresDatabaseUrl({
                dbname: 'dbname',
                host: 'host',
                password: 'password',
                port: 5,
                username: 'username',
            }),
            'postgresql://username:password@host:5/dbname',
        );
    });
    it('includes search params in URL', () => {
        assert.strictEquals(
            createPostgresDatabaseUrl({
                dbname: 'dbname',
                host: 'host',
                password: 'password',
                port: 5,
                username: 'username',
                searchParams: {
                    sslmode: 'require',
                    statement_timeout: 5000,
                },
            }),
            'postgresql://username:password@host:5/dbname?sslmode=require&statement_timeout=5000',
        );
    });
    it('works with empty search params', () => {
        assert.strictEquals(
            createPostgresDatabaseUrl({
                dbname: '',
                host: 'host',
                password: '',
                port: 0,
                username: '',
                searchParams: {},
            }),
            'postgresql://host:0/',
        );
    });
    it('fails with an empty host', () => {
        assert.throws(
            () =>
                createPostgresDatabaseUrl({
                    dbname: '',
                    host: '',
                    password: '',
                    port: 5,
                    username: '',
                }),
            {
                matchMessage: 'without a host',
            },
        );
    });
});
