import {assert, check} from '@augment-vir/assert';
import {copyThroughJson} from '@augment-vir/common';
import {describe, it, itCases} from '@augment-vir/test';
import {mapPrismaValues, type MappedPrismaValue, type PrismaValueMapper} from './map-values.js';

function mapToFakeDate(value: unknown): MappedPrismaValue {
    if (!check.instanceOf(value, Date)) {
        return undefined;
    }

    return {
        replacement: 'fake date',
    };
}

describe(mapPrismaValues.name, () => {
    it('ignores if no mappers', async () => {
        const values = [
            'a',
            new Date(),
        ];
        const valuesCopy = copyThroughJson(values);

        await mapPrismaValues(
            [
                'a',
                new Date(),
            ],
            [],
        );

        assert.deepEquals(valuesCopy, copyThroughJson(values));
    });

    async function testMapPrismaValues(
        input: unknown,
        mappers: ReadonlyArray<PrismaValueMapper>,
    ): Promise<unknown> {
        await mapPrismaValues(input, mappers);

        return input;
    }

    itCases(testMapPrismaValues, [
        {
            it: 'maps an array',
            inputs: [
                [
                    'a',
                    new Date(),
                ],
                [
                    mapToFakeDate,
                ],
            ],
            expect: [
                'a',
                'fake date',
            ],
        },
        {
            it: 'maps multiple nested object',
            inputs: [
                {
                    user: {
                        name: 'person',
                        someDate: new Date(),
                    },
                    author: {
                        name: 'up',
                        anotherDate: new Date(),
                    },
                    name: 'george',
                },
                [
                    mapToFakeDate,
                ],
            ],
            expect: {
                user: {
                    name: 'person',
                    someDate: 'fake date',
                },
                author: {
                    name: 'up',
                    anotherDate: 'fake date',
                },
                name: 'george',
            },
        },
    ]);
});
