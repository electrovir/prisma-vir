import {assert} from '@augment-vir/assert';
import {describe, it} from '@augment-vir/test';
import {mkdir, readFile, rm, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {notCommittedDirPath} from '../file-paths.js';
import {formatPrismaSchema, PrismaFormatMode} from './format-prisma-schema.js';

const schemaPath = join(notCommittedDirPath, 'format-prisma-schema.prisma');
const schemaUri = pathToFileURL(resolve(schemaPath)).href;
const unformattedSchema = [
    'model User {',
    '  id String @id',
    '}',
    '',
].join('\n');
const formattedSchema = [
    'model User {',
    '    id String @id',
    '}',
    '',
].join('\n');

async function writeTestSchema() {
    await mkdir(notCommittedDirPath, {
        recursive: true,
    });
    await writeFile(schemaPath, unformattedSchema);
}

async function removeTestSchema() {
    await rm(schemaPath, {
        force: true,
    });
}

describe(formatPrismaSchema.name, () => {
    it('formats with four-space indentation', async () => {
        await writeTestSchema();

        try {
            await formatPrismaSchema({
                mode: PrismaFormatMode.Write,
                schemaPath,
                formatter(schemaFiles, params) {
                    assert.deepEquals(
                        {
                            params: JSON.parse(params),
                            schemaFiles: JSON.parse(schemaFiles),
                        },
                        {
                            params: {
                                options: {
                                    insertSpaces: true,
                                    tabSize: 4,
                                },
                                textDocument: {
                                    uri: schemaUri,
                                },
                            },
                            schemaFiles: [
                                [
                                    schemaUri,
                                    unformattedSchema,
                                ],
                            ],
                        },
                    );

                    return JSON.stringify([
                        [
                            schemaUri,
                            formattedSchema,
                        ],
                    ]);
                },
            });

            assert.strictEquals(await readFile(schemaPath, 'utf8'), formattedSchema);
        } finally {
            await removeTestSchema();
        }
    });

    it('errors when the formatter omits the schema', async () => {
        await writeTestSchema();

        try {
            await assert.throws(
                formatPrismaSchema({
                    mode: PrismaFormatMode.Write,
                    schemaPath,
                    formatter() {
                        return '[]';
                    },
                }),
                {
                    matchMessage: 'No formatted schema returned',
                },
            );
        } finally {
            await removeTestSchema();
        }
    });

    it('fails checks without changing an unformatted schema', async () => {
        await writeTestSchema();

        try {
            await assert.throws(
                formatPrismaSchema({
                    mode: PrismaFormatMode.Check,
                    schemaPath,
                    formatter() {
                        return JSON.stringify([
                            [
                                schemaUri,
                                formattedSchema,
                            ],
                        ]);
                    },
                }),
                {
                    matchMessage: 'is not formatted',
                },
            );
            assert.strictEquals(await readFile(schemaPath, 'utf8'), unformattedSchema);
        } finally {
            await removeTestSchema();
        }
    });
});
