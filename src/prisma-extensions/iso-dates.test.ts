import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {closePgliteAdapter, createMockPrismaClient} from '../prisma-client.mock.js';
import {createIsoDatesPrismaExtension} from './iso-dates.js';

describe(createIsoDatesPrismaExtension.name, () => {
    it('converts dates', async () => {
        const {prismaClient: basePrismaClient, adapter} = await createMockPrismaClient();
        const prismaClient = basePrismaClient.$extends(createIsoDatesPrismaExtension());

        try {
            const newUser = await prismaClient.user.create({
                data: {
                    email: 'fake@example.com',
                    password: 'fake password',
                },
                select: {
                    email: true,
                    createdAt: true,
                },
            });
            assert.isDefined(newUser);
            assert.strictEquals(newUser.email, 'fake@example.com');
            assert.isString(newUser.createdAt);
        } finally {
            await prismaClient.$disconnect();
            await closePgliteAdapter(adapter);
        }
    });
});
