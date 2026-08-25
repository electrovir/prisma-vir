import {assert, assertWrap} from '@augment-vir/assert';
import {existsSync} from 'node:fs';
import {readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

/** @category Internal */
export type PrismaSchemaFormatter = (schema: string, params: string) => string;

export enum PrismaFormatMode {
    Check = 'check',
    Write = 'write',
}

type FormattingActionParams = {
    absoluteSchemaPath: string;
    formattedSchemaContents: string;
    schemaContents: string;
    schemaPath: string;
};

const formattingActions: Record<
    PrismaFormatMode,
    (params: Readonly<FormattingActionParams>) => Promise<void>
> = {
    [PrismaFormatMode.Check]: ({
        absoluteSchemaPath,
        formattedSchemaContents,
        schemaContents,
        schemaPath,
    }) => {
        if (schemaContents !== formattedSchemaContents) {
            throw new Error(
                `Prisma schema '${absoluteSchemaPath}' is not formatted. Run 'prisma-format write ${schemaPath}'.`,
            );
        }

        return Promise.resolve();
    },
    [PrismaFormatMode.Write]: async ({absoluteSchemaPath, formattedSchemaContents}) => {
        await writeFile(absoluteSchemaPath, formattedSchemaContents);
    },
};

/**
 * Run the prisma formatter with 4 spaces.
 *
 * @category Internal
 */
export async function formatPrismaSchema({
    mode,
    schemaPath,
    formatter,
}: Readonly<{
    mode: PrismaFormatMode;
    schemaPath: string;
    formatter?: PrismaSchemaFormatter | undefined;
}>) {
    const absoluteSchemaPath = resolve(schemaPath);

    if (!existsSync(absoluteSchemaPath)) {
        throw new Error(`Prisma schema file does not exist: '${absoluteSchemaPath}'`);
    }

    const schemaContents = await readFile(absoluteSchemaPath, 'utf8');

    const schemaUri = pathToFileURL(absoluteSchemaPath).href;
    const prismaSchemaFormatter: PrismaSchemaFormatter =
        formatter || (await import('@prisma/prisma-schema-wasm')).format;
    const formatterOutput = prismaSchemaFormatter(
        JSON.stringify([
            [
                schemaUri,
                schemaContents,
            ],
        ]),
        JSON.stringify({
            textDocument: {
                uri: schemaUri,
            },
            options: {
                insertSpaces: true,
                tabSize: 4,
            },
        }),
    );
    const formattedSchemaOutput: unknown = JSON.parse(formatterOutput);
    const formattedSchemas = assertWrap.isArray(formattedSchemaOutput).map((formattedSchema) => {
        const formattedSchemaParts = assertWrap.isArray(formattedSchema);

        assert.isLengthExactly(formattedSchemaParts, 2);

        return {
            contents: assertWrap.isString(formattedSchemaParts[1]),
            uri: assertWrap.isString(formattedSchemaParts[0]),
        };
    });
    const formattedSchema = formattedSchemas.find(({uri}) => uri === schemaUri);

    assert.isDefined(formattedSchema, `No formatted schema returned for '${absoluteSchemaPath}'.`);

    await formattingActions[mode]({
        absoluteSchemaPath,
        formattedSchemaContents: formattedSchema.contents,
        schemaContents,
        schemaPath,
    });
}
