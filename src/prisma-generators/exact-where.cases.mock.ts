// cspell:word contians

/**
 * Every case the exact-where generator is expected to catch, plus the valid queries it must leave
 * alone. Each case's `code` is emitted into a single fixture file which is then type checked once;
 * `shouldError` is compared against whether that case's lines produced any diagnostic.
 */
export type ExactWhereCase = {
    description: string;
    shouldError: boolean;
    code: string;
};

const badCases: ExactWhereCase[] = [
    {
        description: 'unknown key as the only where key',
        code: `prismaClient.userMulti.findMany({
    where: {bogus: 1},
})`,
    },
    {
        description: 'unknown key beside a valid sibling',
        code: `prismaClient.userMulti.findMany({
    where: {bogus: 1, email: 'a'},
})`,
    },
    {
        description: 'unknown key in a to-one relation filter',
        code: `prismaClient.postMulti.findMany({
    where: {content: 'x', author: {bogus: 1, email: 'a'}},
})`,
    },
    {
        description: 'unknown key two relations deep',
        code: `prismaClient.postMulti.findMany({
    where: {author: {email: 'a', authorOf: {some: {bogus: 1, content: 'x'}}}},
})`,
    },
    {
        description: 'unknown key in an AND array element',
        code: `prismaClient.userMulti.findMany({
    where: {AND: [{email: 'a'}, {bogus: 1, password: 'b'}]},
})`,
    },
    {
        description: 'unknown key in an OR array element',
        code: `prismaClient.userMulti.findMany({
    where: {OR: [{bogus: 1, email: 'a'}]},
})`,
    },
    {
        description: 'unknown key in NOT',
        code: `prismaClient.userMulti.findMany({
    where: {NOT: {bogus: 1, email: 'a'}},
})`,
    },
    {
        description: 'unknown key in a list relation some filter',
        code: `prismaClient.userMulti.findMany({
    where: {email: 'a', authorOf: {some: {bogus: 1, content: 'x'}}},
})`,
    },
    {
        description: 'unknown key in a list relation every filter',
        code: `prismaClient.userMulti.findMany({
    where: {authorOf: {every: {bogus: 1, content: 'x'}}},
})`,
    },
    {
        description: 'unknown key inside a relation is filter',
        code: `prismaClient.postMulti.findMany({
    where: {author: {is: {bogus: 1, email: 'a'}}},
})`,
    },
    {
        description: 'unknown key in findFirst',
        code: `prismaClient.userMulti.findFirst({
    where: {bogus: 1, email: 'a'},
})`,
    },
    {
        description: 'unknown key in findUnique',
        code: `prismaClient.userMulti.findUnique({
    where: {id: userMultiId, bogus: 1},
})`,
    },
    {
        description: 'unknown key in updateMany',
        code: `prismaClient.userMulti.updateMany({
    where: {bogus: 1, email: 'a'},
    data: {password: 'b'},
})`,
    },
    {
        description: 'unknown key in deleteMany',
        code: `prismaClient.userMulti.deleteMany({
    where: {bogus: 1, email: 'a'},
})`,
    },
    {
        description: 'unknown key in count, which uses Subset rather than SelectSubset',
        code: `prismaClient.userMulti.count({
    where: {bogus: 1, email: 'a'},
})`,
    },
    {
        description: 'unknown key in aggregate, which uses Subset rather than SelectSubset',
        code: `prismaClient.userMulti.aggregate({
    where: {bogus: 1, email: 'a'},
    _count: true,
})`,
    },
    {
        description: 'unknown key in groupBy, which uses SubsetIntersection',
        code: `prismaClient.userMulti.groupBy({
    by: ['email'],
    where: {bogus: 1, password: 'b'},
})`,
    },
].map((badCase) => {
    return {
        ...badCase,
        shouldError: true,
    };
});

const goodCases: ExactWhereCase[] = [
    {
        description: 'simple equality',
        code: `prismaClient.userMulti.findMany({
    where: {email: 'a'},
})`,
    },
    {
        description: 'scalar filter objects',
        code: `prismaClient.userMulti.findMany({
    where: {email: {contains: 'a'}, password: {in: ['b']}},
})`,
    },
    {
        description: 'date filters as both Date and string',
        code: `prismaClient.userMulti.findMany({
    where: {createdAt: {gte: new Date()}, updatedAt: '2020-01-01T00:00:00.000Z'},
})`,
    },
    {
        description: 'branded id equality',
        code: `prismaClient.userMulti.findMany({
    where: {extraId, email: 'a'},
})`,
    },
    {
        description: 'branded id inside a filter',
        code: `prismaClient.userMulti.findMany({
    where: {extraId: {not: extraId}},
})`,
    },
    {
        description: 'AND, OR, and NOT together',
        code: `prismaClient.userMulti.findMany({
    where: {
        AND: [{email: 'a'}],
        OR: [{password: 'b'}, {email: 'c'}],
        NOT: {password: 'd'},
    },
})`,
    },
    {
        description: 'to-one relation filter two relations deep',
        code: `prismaClient.postMulti.findMany({
    where: {author: {email: 'a', authorOf: {some: {content: 'x'}}}},
})`,
    },
    {
        description: 'list relation every, some, and none',
        code: `prismaClient.userMulti.findMany({
    where: {authorOf: {every: {content: 'x'}, some: {content: 'y'}, none: {content: 'z'}}},
})`,
    },
    {
        description: 'relation is and isNot',
        code: `prismaClient.postMulti.findMany({
    where: {author: {is: {email: 'a'}}, editor: {isNot: {email: 'b'}}},
})`,
    },
    {
        description: 'where passed as a prebuilt typed variable',
        code: 'prismaClient.userMulti.findMany({where: whereFragment})',
    },
    {
        description: 'where built by spreading a typed fragment',
        code: `prismaClient.userMulti.findMany({
    where: {...whereFragment, password: 'b'},
})`,
    },
    {
        description: 'the skip sentinel as a field value',
        code: `prismaClient.userMulti.findMany({
    where: {email: Prisma.skip, password: 'b'},
})`,
    },
    {
        description: 'select, include, and orderBy alongside where',
        code: `prismaClient.userMulti.findMany({
    where: {email: 'a'},
    select: {id: true, authorOf: {select: {content: true}}},
    orderBy: {createdAt: 'asc'},
})`,
    },
    {
        description: 'an empty where',
        code: `prismaClient.userMulti.findMany({
    where: {},
})`,
    },
    {
        description: 'no where at all',
        code: `prismaClient.userMulti.findMany({
    select: {id: true},
})`,
    },
    {
        description: 'count with a valid where',
        code: `prismaClient.userMulti.count({
    where: {email: 'a'},
    select: true,
})`,
    },
    {
        description: 'groupBy with a valid where',
        code: `prismaClient.userMulti.groupBy({
    by: ['email'],
    where: {password: 'b'},
})`,
    },
    {
        description: 'a where field written with a computed key',
        code: "genericField('email', 'a')",
    },
].map((goodCase) => {
    return {
        ...goodCase,
        shouldError: false,
    };
});

/**
 * Cases the generator does not catch. They are asserted as passing so that closing either gap shows
 * up as a test failure rather than going unnoticed.
 *
 * A misspelled scalar filter operator is missed because the generator deliberately stops descending
 * at scalar filters: a field whose value is still an unresolved generic would otherwise leave the
 * conditional deferred and reject the caller's own argument. It is only caught when the misspelled
 * key is the sole key in the filter, where TypeScript's own excess property check still fires.
 */
const knownGapCases: ExactWhereCase[] = [
    {
        description:
            'known gap: a misspelled scalar filter operator beside a valid operator is missed',
        shouldError: false,
        code: `prismaClient.userMulti.findMany({
    where: {email: {contians: 'a', contains: 'b'}},
})`,
    },
];

export const exactWhereCases: ReadonlyArray<Readonly<ExactWhereCase>> = [
    ...badCases,
    ...goodCases,
    ...knownGapCases,
];

const fixtureHeader = `import {Prisma, type PrismaClient} from './generated/client.js';
import type {UserMultiExtraId, UserMultiId} from './generated/models/UserMulti.js';

declare const prismaClient: PrismaClient;
declare const extraId: UserMultiExtraId;
declare const userMultiId: UserMultiId;
declare const whereFragment: Prisma.UserMultiWhereInput;

function genericField<Field extends 'email' | 'password'>(field: Field, value: string) {
    return prismaClient.userMulti.findMany({
        where: {[field]: value},
    });
}
`;

/**
 * Builds the fixture file contents plus, for each case, the 1-indexed line range its code occupies
 * so diagnostics can be attributed back to it.
 */
export function buildExactWhereFixture(cases: ReadonlyArray<Readonly<ExactWhereCase>>): {
    contents: string;
    lineRanges: {description: string; firstLine: number; lastLine: number}[];
} {
    return cases.reduce(
        (accum, currentCase, index) => {
            const codeLines = `export const case${index} = ${currentCase.code};`.split('\n');
            const firstLine = accum.contents.split('\n').length;

            return {
                contents: [
                    accum.contents,
                    ...codeLines,
                    '',
                ].join('\n'),
                lineRanges: [
                    ...accum.lineRanges,
                    {
                        description: currentCase.description,
                        firstLine,
                        lastLine: firstLine + codeLines.length - 1,
                    },
                ],
            };
        },
        {
            contents: fixtureHeader,
            lineRanges: [],
        } as ReturnType<typeof buildExactWhereFixture>,
    );
}
