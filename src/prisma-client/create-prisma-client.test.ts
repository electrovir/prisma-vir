/* eslint-disable sonarjs/no-hardcoded-passwords */
/* eslint-disable @typescript-eslint/ban-ts-comment */

import {assert} from '@augment-vir/assert';
import {selectFrom} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {testPrismaSchemaPostgresPath} from '../file-paths.mock.js';
import {prismaApi} from '../prisma-api/prisma-api.js';
import {clearTestDatabaseOutputs} from '../prisma-api/prisma-database.mock.js';
import {type PrismaValueMapper} from '../prisma-extensions/prisma-map/map-values.js';
import {createPrismaMapExtension} from '../prisma-extensions/prisma-map/prisma-map-extension.js';
import {createPrismaClient} from './create-prisma-client.js';
import {PrismaDatabaseEngine} from './prisma-client-types.js';

async function importFresh<T = unknown>(importPath: string): Promise<T> {
    return await import(`${importPath}?${Date.now()}`);
}

describe(createPrismaClient.name, () => {
    it('seeds the database', async (testContext) => {
        await clearTestDatabaseOutputs();

        await prismaApi.client.generate({
            schemaPath: testPrismaSchemaPostgresPath,
        });

        // @ts-ignore: this might not be generated yet
        const {PrismaClient} = await importFresh('../../test-files/generated/client.js');

        const mockUser = {
            email: 'derp@example.com',
            password: 'test password',
        };

        const {prismaClient} = await createPrismaClient(
            PrismaDatabaseEngine.Postgres,
            PrismaClient,
            {
                connection: {
                    dev: {
                        resetDatabase: true,
                        test: testContext,
                    },
                },
                schemaPath: testPrismaSchemaPostgresPath,
                async seedScript({prismaClient}) {
                    await prismaClient.user.create({
                        data: mockUser,
                        select: {
                            id: true,
                        },
                    });
                },
            },
        );
        const newUser = await prismaClient.user.findFirst({
            select: {
                email: true,
                password: true,
                createdAt: true,
            },
        });

        assert.isDefined(newUser);
        assert.instanceOf(newUser.createdAt, Date);
        assert.deepEquals(selectFrom(newUser, {email: true, password: true}), mockUser);
    });
    it('extends the client', async (testContext) => {
        await clearTestDatabaseOutputs();

        await prismaApi.client.generate({
            schemaPath: testPrismaSchemaPostgresPath,
        });

        // @ts-ignore: this might not be generated yet
        const {PrismaClient} = await importFresh('../../test-files/generated/client.js');

        const mockUser = {
            email: 'derp@example.com',
            password: 'test password',
        };

        const {prismaClient} = await createPrismaClient(
            PrismaDatabaseEngine.Postgres,
            PrismaClient,
            {
                connection: {
                    dev: {
                        resetDatabase: true,
                        test: testContext,
                    },
                },
                schemaPath: testPrismaSchemaPostgresPath,
                extendScript({prismaClient}) {
                    const mappers: ReadonlyArray<PrismaValueMapper> = [
                        (value) => {
                            if (value instanceof Date) {
                                return {
                                    replacement: value.toISOString(),
                                };
                            } else {
                                return undefined;
                            }
                        },
                    ];

                    return prismaClient.$extends(createPrismaMapExtension('test', mappers));
                },
            },
        );

        const newUser = await prismaClient.user.create({
            data: mockUser,
            select: {
                email: true,
                password: true,
                createdAt: true,
            },
        });

        assert.isString(newUser.createdAt);
        assert.deepEquals(selectFrom(newUser, {email: true, password: true}), mockUser);
    });
    it('fails with an invalid engine', async (testContext) => {
        await clearTestDatabaseOutputs();

        await prismaApi.client.generate({
            schemaPath: testPrismaSchemaPostgresPath,
        });

        // @ts-ignore: this might not be generated yet
        const {PrismaClient} = await importFresh('../../test-files/generated/client.js');

        await assert.throws(
            () =>
                createPrismaClient(
                    // @ts-expect-error: intentionally incorrect database engine
                    'INVALID',
                    PrismaClient,
                    {
                        connection: {
                            dev: {
                                resetDatabase: true,
                                test: testContext,
                            },
                        },
                        schemaPath: testPrismaSchemaPostgresPath,
                    },
                ),
            {
                matchMessage: "Unexpected prisma database engine: 'INVALID'",
            },
        );
    });
});
