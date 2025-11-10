import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {createMockPrismaClient} from '../prisma-client.mock.js';
import {createPrefixedIdExtension} from './prefixed-ids.js';

describe(createPrefixedIdExtension.name, () => {
    it('maps ids', async () => {
        const prismaClient = (await createMockPrismaClient()).$extends(createPrefixedIdExtension());

        try {
            const newUser = await prismaClient.user.create({
                data: {
                    email: 'fake@example.com',
                    // eslint-disable-next-line sonarjs/no-hardcoded-passwords
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
        }
    });
    it('uses custom options ids', async () => {
        const prismaClient = (await createMockPrismaClient()).$extends(
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
                    // eslint-disable-next-line sonarjs/no-hardcoded-passwords
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
        }
    });
});
