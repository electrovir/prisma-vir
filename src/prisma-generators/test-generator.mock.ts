import {assert, check} from '@augment-vir/assert';
import {filterMap, getObjectTypedEntries, indent, wrapString} from '@augment-vir/common';
import {type DirContents, readAllDirContents, readFileIfExists} from '@augment-vir/node';
import {it} from '@augment-vir/test';
import {createPatch} from 'diff';
import {rm, writeFile} from 'node:fs/promises';
import {basename, join} from 'node:path';
import {generatedPrismaClientDirPath, simplePrismaSchemaPath} from '../file-paths.mock.js';
import {prismaApi} from '../prisma-api/prisma-api.js';
import {clearTestDatabaseOutputs} from '../prisma-api/prisma-database.mock.js';
import {createTempSchema} from '../prisma-schema/temp-schema.js';

const filesToExclude = ['class.ts'];

export function createGeneratorTest(
    importMeta: ImportMeta,
    schemaPath = simplePrismaSchemaPath,
    generatorInputs: Record<string, string> = {},
) {
    return it('generates', async () => {
        const generatorName = basename(importMeta.filename).replace('.generator.test.ts', '');

        await clearTestDatabaseOutputs();

        const generatorInputStrings = getObjectTypedEntries(generatorInputs)
            .map(
                ([
                    key,
                    value,
                ]) => {
                    return indent(
                        [
                            key,
                            wrapString({value, wrapper: '"'}),
                        ].join(' = '),
                    );
                },
            )
            .join('\n');

        const {tempSchemaPath} = await createTempSchema({
            originalSchemaPath: schemaPath,
            key: generatorName,
            transform({originalSchemaContents}) {
                return (
                    originalSchemaContents +
                    `

generator TEST {
    provider = "tsx ../src/prisma-generators/${generatorName}.generator.ts"
    output = "./generated"
${generatorInputStrings}
}`
                );
            },
        });
        try {
            await prismaApi.client.generate({
                schemaPath,
            });

            const dirContentsBefore = await readAllDirContents(generatedPrismaClientDirPath, {
                recursive: true,
                excludeList: filesToExclude,
            });

            await clearTestDatabaseOutputs();
            await prismaApi.client.generate({
                schemaPath: tempSchemaPath,
            });

            const dirContentsAfter = await readAllDirContents(generatedPrismaClientDirPath, {
                recursive: true,
                excludeList: filesToExclude,
            });

            const patch = createDirContentsPatch(dirContentsBefore, dirContentsAfter);

            const snapshotFile = join(importMeta.dirname, `${generatorName}.snapshot`);

            const snapshotContents = (await readFileIfExists(snapshotFile)) || '';

            await writeFile(snapshotFile, patch);

            assert.strictEquals(patch, snapshotContents);
        } finally {
            await rm(tempSchemaPath, {force: true});
        }
    });
}

function createDirContentsPatch(
    dirContentsBefore: DirContents | undefined,
    dirContentsAfter: DirContents,
): string {
    const patches: string[] = filterMap(
        Object.entries(dirContentsAfter),
        ([
            filePath,
            afterContents,
        ]): string | undefined => {
            const beforeContents = dirContentsBefore?.[filePath];

            if (check.isObject(afterContents)) {
                return createDirContentsPatch(
                    check.isObject(beforeContents) ? beforeContents : undefined,
                    afterContents,
                );
            } else {
                const beforeString: string = check.isObject(beforeContents)
                    ? ''
                    : beforeContents || '';

                if (beforeString === afterContents) {
                    return undefined;
                } else {
                    return createPatch(filePath, beforeString, afterContents);
                }
            }
        },
        check.isTruthy,
    );

    return patches.join('\n\n');
}
