/* eslint-disable @typescript-eslint/ban-ts-comment */

// @ts-ignore: this might not be generated yet
import {type Prisma, type PrismaClient} from '../../test-files/generated/client.js';

import {assert} from '@augment-vir/assert';
import {
    prismaModelCreateExclude,
    prismaModelCreateOmitId,
    type AnyObject,
} from '@augment-vir/common';
import {describe, it, itCasesWithContext, type UniversalTestContext} from '@augment-vir/test';
import {type IsAny} from 'type-fest';
import {testPrismaConfigPath} from '../file-paths.mock.js';
import {createPrismaClient} from '../prisma-client/create-prisma-client.js';
import {PrismaDatabaseEngine} from '../prisma-client/prisma-client-types.js';
import {addData, dumpData, getAllPrismaModelKeys, type PrismaAddModelData} from './model-data.js';
import {prismaApi} from './prisma-api.js';
import {clearTestDatabaseOutputs} from './prisma-database.mock.js';

async function importFresh<T = unknown>(importPath: string): Promise<T> {
    return await import(`${importPath}?${Date.now()}`);
}

async function setupPrismaClient(testContext: UniversalTestContext) {
    await clearTestDatabaseOutputs();

    await prismaApi.client.generate({
        configPath: testPrismaConfigPath,
    });
    // @ts-ignore: this might not be generated yet
    const {PrismaClient} = await importFresh('../../test-files/generated/client.js');
    const {prismaClient} = await createPrismaClient(PrismaDatabaseEngine.Sqlite, PrismaClient, {
        configPath: testPrismaConfigPath,
        connection: {
            dev: {
                resetDatabase: true,
                test: testContext,
            },
        },
    });

    return prismaClient as any;
}

describe(
    [
        addData.name,
        dumpData.name,
    ].join(' and '),
    () => {
        async function testData(
            testContext: UniversalTestContext,
            data: IsAny<PrismaClient> extends true
                ? any
                : PrismaAddModelData<PrismaClient, Prisma.TypeMap>,
        ) {
            const prismaClient = await setupPrismaClient(testContext);
            try {
                await prismaApi.client.addData({
                    prismaClient,
                    data,
                });

                const dumpedData = await prismaApi.client.dumpData({
                    prismaClient,
                    omitFields: [
                        'createdAt',
                        'updatedAt',
                        'id',
                    ],
                });

                return dumpedData;
            } finally {
                await prismaClient.$disconnect();
            }
        }

        it('includes all fields by default', async (testContext) => {
            const prismaClient = await setupPrismaClient(testContext);

            await prismaApi.client.addData<any, any>({
                prismaClient,
                data: {
                    user: [
                        {
                            email: 'fake@example.com',
                            password: 'fake password',
                        },
                    ],
                    region: {
                        region1: {
                            regionName: 'fake',
                        },
                    },
                },
            });

            assert.hasKeys(
                (
                    await prismaApi.client.dumpData({
                        prismaClient,
                    })
                ).user?.[0],
                [
                    'createdAt',
                    'email',
                    'firstName',
                    'id',
                    'lastName',
                    'password',
                    'phoneNumber',
                    'role',
                    'updatedAt',
                ],
            );
            await prismaClient.$disconnect();
        });

        it('handles a dump error', async (testContext) => {
            const prismaClient = await setupPrismaClient(testContext);

            (prismaClient as AnyObject).invalidMode = {};

            await assert.throws(
                prismaApi.client.dumpData({
                    prismaClient,
                }),
                {
                    matchMessage: 'Failed to read data for model',
                },
            );

            await prismaClient.$disconnect();
        });

        it('dumps without limit', async (testContext) => {
            const prismaClient = await setupPrismaClient(testContext);
            assert.isDefined(
                await prismaApi.client.dumpData({
                    prismaClient,
                    limit: 0,
                }),
            );

            await prismaClient.$disconnect();
        });

        it('adds without id', async (testContext) => {
            const prismaClient = await setupPrismaClient(testContext);

            await prismaApi.client.addData<any, any>({
                prismaClient,
                data: {
                    user: [
                        {
                            email: 'fake@example.com',
                            password: 'fake password',
                            id: 'fake-id',
                        },
                    ],
                },
            });

            assert.deepEquals(
                await prismaClient.user.findMany({
                    select: {
                        id: true,
                    },
                }),
                [
                    {
                        id: 'fake-id',
                    },
                ],
            );

            await prismaApi.client.addData<any, any>({
                prismaClient,
                data: {
                    user: [
                        {
                            email: 'fake2@example.com',
                            password: 'fake password 2',
                            id: 'fake-id-2',
                            [prismaModelCreateOmitId]: true,
                        },
                    ],
                },
            });

            assert.notStrictEquals(
                (
                    await prismaClient.user.findFirstOrThrow({
                        where: {
                            id: {
                                not: 'fake-id',
                            },
                        },
                        select: {
                            id: true,
                        },
                    })
                ).id,
                'fake-id-2',
            );

            await prismaClient.$disconnect();
        });

        itCasesWithContext(testData, [
            {
                it: 'adds a mix of keyed and array data',
                input: [
                    {
                        // @ts-ignore: might not be generated yet
                        User: [
                            {
                                email: 'fake@example.com',
                                password: 'fake password',
                            },
                        ],
                        // @ts-ignore: might be generated with branded ids
                        Region: {
                            region1: {
                                regionName: 'fake',
                            },
                        },
                    },
                ],
                expect: {
                    region: [
                        {
                            regionName: 'fake',
                        },
                    ],
                    user: [
                        {
                            email: 'fake@example.com',
                            password: 'fake password',
                            firstName: null,
                            lastName: null,
                            role: null,
                            phoneNumber: null,
                        },
                    ],
                },
            },
            {
                it: 'adds keyed-only data',
                input: {
                    // @ts-ignore: might not be generated yet
                    User: [
                        {
                            email: 'fake@example.com',
                            password: 'fake password',
                        },
                    ],
                    // @ts-ignore: might be generated with branded ids
                    Region: {
                        region1: {
                            regionName: 'fake',
                        },
                    },
                },
                expect: {
                    region: [
                        {
                            regionName: 'fake',
                        },
                    ],
                    user: [
                        {
                            email: 'fake@example.com',
                            password: 'fake password',
                            firstName: null,
                            lastName: null,
                            role: null,
                            phoneNumber: null,
                        },
                    ],
                },
            },
            {
                it: 'leaves out excluded entries',
                input: {
                    // @ts-ignore: might not be generated yet
                    User: [
                        {
                            email: 'fake@example.com',
                            password: 'fake password',
                            [prismaModelCreateExclude]: true,
                        },
                        {
                            email: 'fake2@example.com',
                            password: 'fake password 2',
                        },
                    ],
                    Region: [
                        {
                            // @ts-ignore: might be generated with branded ids
                            regionName: 'fake',
                        },
                    ],
                },
                expect: {
                    region: [
                        {
                            regionName: 'fake',
                        },
                    ],
                    user: [
                        {
                            email: 'fake2@example.com',
                            password: 'fake password 2',
                            firstName: null,
                            lastName: null,
                            role: null,
                            phoneNumber: null,
                        },
                    ],
                },
            },
            {
                it: 'fails with informative message',
                input: {
                    // @ts-ignore: might not be generated yet
                    User: [
                        // @ts-ignore: intentionally missing fields
                        {},
                    ],
                },
                throws: {
                    matchMessage: "Failed to create many 'User' entries",
                },
            },
        ]);
    },
);

describe(getAllPrismaModelKeys.name, () => {
    it('gets all model names', async (testContext) => {
        const prismaClient = await setupPrismaClient(testContext);

        assert.deepEquals(getAllPrismaModelKeys(prismaClient), [
            'region',
            'user',
            'userPost',
            'userSettings',
            'userStats',
        ]);

        await prismaClient.$disconnect();
    });
});
