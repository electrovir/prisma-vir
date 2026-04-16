import {assert, assertWrap} from '@augment-vir/assert';
import {selectFrom} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {closePgliteAdapter, createMockPrismaClient} from '../prisma-client.mock.js';
import {createPrefixedIdExtension} from './prefixed-ids.js';

describe(createPrefixedIdExtension.name, () => {
    it('maps ids', async () => {
        const {prismaClient: basePrismaClient, adapter} = await createMockPrismaClient();
        const prismaClient = basePrismaClient.$extends(createPrefixedIdExtension());

        try {
            const newUser = await prismaClient.user.create({
                data: {
                    email: 'fake@example.com',
                    password: 'fake password',
                },
                select: {
                    id: true,
                    email: true,
                    createdAt: true,
                },
            });
            assert.isDefined(newUser);
            assert.strictEquals(newUser.email, 'fake@example.com');
            assert.startsWith(newUser.id, 'u_');
        } finally {
            await prismaClient.$disconnect();
            await closePgliteAdapter(adapter);
        }
    });
    it('uses custom options ids', async () => {
        const {prismaClient: basePrismaClient, adapter} = await createMockPrismaClient();
        const prismaClient = basePrismaClient.$extends(
            createPrefixedIdExtension({
                createBaseId() {
                    return 'my-id';
                },
                createPrefix() {
                    return 'TEST_';
                },
                getIdColumnName(params) {
                    return 'id';
                },
            }),
        );

        try {
            const newUser = await prismaClient.user.create({
                data: {
                    email: 'fake@example.com',
                    password: 'fake password',
                },
                select: {
                    id: true,
                    email: true,
                    createdAt: true,
                },
            });
            assert.isDefined(newUser);
            assert.strictEquals(newUser.email, 'fake@example.com');
            assert.strictEquals(newUser.id, 'TEST_my-id');
        } finally {
            await prismaClient.$disconnect();
            await closePgliteAdapter(adapter);
        }
    });
    it('uses custom options ids with create many', async () => {
        const {prismaClient: basePrismaClient, adapter} = await createMockPrismaClient();
        const prismaClient = basePrismaClient.$extends(
            createPrefixedIdExtension({
                createPrefix() {
                    return 'TEST_';
                },
                getIdColumnName() {
                    return 'id';
                },
            }),
        );

        try {
            const data = [
                {
                    email: 'fake@example.com',
                    password: 'fake password',
                },
                {
                    email: 'fake2@example.com',
                    password: 'fake password',
                },
                {
                    email: 'fake3@example.com',
                    password: 'fake password',
                },
            ];

            await prismaClient.user.createMany({
                data,
            });

            const newUsers = await prismaClient.user.findMany({
                select: {
                    id: true,
                    email: true,
                    password: true,
                },
            });

            assert.isLengthExactly(newUsers, data.length);
            assert.isLengthExactly(data, 3);
            newUsers.forEach((newUser: any, index) => {
                assert.deepEquals(
                    selectFrom(newUser, {
                        email: true,
                        password: true,
                    }),
                    assertWrap.isDefined(data[index]),
                );
                assert.startsWith(newUser.id, 'TEST_');
            });
        } finally {
            await prismaClient.$disconnect();
            await closePgliteAdapter(adapter);
        }
    });
});
