import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {testFilesDir, testPrismaConfigMultiRelation} from '../file-paths.mock.js';
import {prismaApi} from '../prisma-api/prisma-api.js';
import {clearTestDatabaseOutputs} from '../prisma-api/prisma-database.mock.js';
import {getSchemaPathFromConfig} from '../prisma-schema/prisma-config.js';
import {createTempSchema} from '../prisma-schema/temp-schema.js';
import {createGeneratorTest} from './test-generator.mock.js';
import {findTypeErrorLines} from './type-check.mock.js';

describe('block-or-throw generator', () => {
    createGeneratorTest(import.meta, testPrismaConfigMultiRelation);

    it('blocks OrThrow methods on plain and extended clients', async () => {
        const fixturePath = join(testFilesDir, 'temp-block-or-throw-cases.ts');
        const {tempSchemaPath} = await createTempSchema({
            originalSchemaPath: await getSchemaPathFromConfig({
                configPath: testPrismaConfigMultiRelation,
            }),
            key: 'block-or-throw-types',
            transform({originalSchemaContents}) {
                return `${originalSchemaContents}

generator blockOrThrowTest {
    provider = "tsx ../src/prisma-generators/block-or-throw.generator.ts"
    output = "./generated"
}`;
            },
        });
        const tempConfigPath = join(testFilesDir, 'temp-block-or-throw-types.config.ts');

        await writeFile(
            tempConfigPath,
            [
                "import {defineConfig} from 'prisma/config';",
                '',
                'export default defineConfig({',
                `    schema: ${JSON.stringify(tempSchemaPath)},`,
                '    datasource: {',
                '        url: process.env.DATABASE_URL,',
                '    },',
                '});',
                '',
            ].join('\n'),
        );

        try {
            await clearTestDatabaseOutputs();
            await prismaApi.client.generate({
                configPath: tempConfigPath,
            });

            await writeFile(
                fixturePath,
                [
                    "import type {PrismaClient} from './generated/client.js';",
                    '',
                    'declare const prismaClient: PrismaClient;',
                    'const extendedClient = prismaClient.$extends({});',
                    '',
                    "export const case1 = prismaClient.userMulti.findUnique({where: {id: 'a'}});",
                    'export const case2 = prismaClient.postMulti.findFirst();',
                    "export const case3 = extendedClient.userMulti.findUnique({where: {id: 'a'}});",
                    'export const case4 = extendedClient.postMulti.findFirst();',
                    "export const case5 = prismaClient.userMulti.findUniqueOrThrow({where: {id: 'a'}});",
                    'export const case6 = prismaClient.postMulti.findFirstOrThrow();',
                    "export const case7 = extendedClient.userMulti.findUniqueOrThrow({where: {id: 'a'}});",
                    'export const case8 = extendedClient.postMulti.findFirstOrThrow();',
                    '',
                ].join('\n'),
            );

            assert.deepEquals(
                findTypeErrorLines(fixturePath),
                [
                    10,
                    11,
                    12,
                    13,
                ],
            );
        } finally {
            await rm(tempSchemaPath, {
                force: true,
            });
            await rm(tempConfigPath, {
                force: true,
            });
            await rm(fixturePath, {
                force: true,
            });
        }
    });
});
