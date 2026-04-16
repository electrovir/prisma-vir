import {assert, check} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {closePgliteAdapter, createMockPrismaClient} from '../../prisma-client.mock.js';
import {type MappedPrismaValue} from './map-values.js';
import {createPrismaMapExtension} from './prisma-map-extension.js';

export function mapDates(value: unknown): MappedPrismaValue {
    if (!check.instanceOf(value, Date)) {
        return undefined;
    }

    return {
        replacement: value.toISOString(),
    };
}

describe(createPrismaMapExtension.name, () => {
    it('overwrites a Date object', async () => {
        const {prismaClient: basePrismaClient, adapter} = await createMockPrismaClient();
        const prismaClient = basePrismaClient.$extends(
            createPrismaMapExtension('test', [
                mapDates,
            ]),
        );

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
