import {assert} from '@augment-vir/assert';
import {arrayToObject} from '@augment-vir/common';
import {describe, it} from '@augment-vir/test';
import {rm, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {testFilesDir, testPrismaConfigMultiRelation} from '../file-paths.mock.js';
import {prismaApi} from '../prisma-api/prisma-api.js';
import {clearTestDatabaseOutputs} from '../prisma-api/prisma-database.mock.js';
import {getSchemaPathFromConfig} from '../prisma-schema/prisma-config.js';
import {createTempSchema} from '../prisma-schema/temp-schema.js';
import {buildExactWhereFixture, exactWhereCases} from './exact-where.cases.mock.js';
import {createGeneratorTest} from './test-generator.mock.js';
import {findTypeErrorLines} from './type-check.mock.js';

describe('exact-where generator', () => {
    createGeneratorTest(import.meta, testPrismaConfigMultiRelation);

    it('catches unknown where keys without rejecting valid queries', async () => {
        const fixturePath = join(testFilesDir, 'temp-exact-where-cases.ts');
        /** Branded fields are generated too so the branded-id guard is actually exercised. */
        const {tempSchemaPath} = await createTempSchema({
            originalSchemaPath: await getSchemaPathFromConfig({
                configPath: testPrismaConfigMultiRelation,
            }),
            key: 'exact-where-types',
            transform({originalSchemaContents}) {
                return `${originalSchemaContents}

generator brandedFieldsTest {
    provider = "tsx ../src/prisma-generators/branded-fields.generator.ts"
    output = "./generated"
}

generator exactWhereTest {
    provider = "tsx ../src/prisma-generators/exact-where.generator.ts"
    output = "./generated"
}`;
            },
        });
        const tempConfigPath = join(testFilesDir, 'temp-exact-where-types.config.ts');

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

            const {contents, lineRanges} = buildExactWhereFixture(exactWhereCases);

            await writeFile(fixturePath, contents);

            const errorLines = findTypeErrorLines(fixturePath);

            assert.deepEquals(
                arrayToObject(lineRanges, ({description, firstLine, lastLine}) => {
                    return {
                        key: description,
                        value: errorLines.some((errorLine) => {
                            return errorLine >= firstLine && errorLine <= lastLine;
                        }),
                    };
                }),
                arrayToObject(exactWhereCases, ({description, shouldError}) => {
                    return {
                        key: description,
                        value: shouldError,
                    };
                }),
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
