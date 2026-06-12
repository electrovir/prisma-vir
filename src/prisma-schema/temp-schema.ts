import {
    type MaybePromise,
    type PartialWithUndefined,
    randomString,
    sanitizeFileName,
} from '@augment-vir/common';
import {readFile, writeFile} from 'node:fs/promises';
import {dirname, join} from 'node:path';

/**
 * Creates a Prisma schema copied from the `originalSchemaPath` with the supplied `transform`
 * applied to its contents.
 *
 * @category Internal
 */
export async function createTempSchema({
    originalSchemaPath,
    transform,
    key,
}: Readonly<
    {
        originalSchemaPath: string;
    } & PartialWithUndefined<{
        transform: (params: {
            originalSchemaContents: string;
            originalSchemaPath: string;
        }) => MaybePromise<string>;
        key: string;
    }>
>): Promise<{tempSchemaPath: string}> {
    const tempKey =
        key ||
        [
            Date.now(),
            sanitizeFileName(randomString(4)),
        ].join('-');

    const tempSchemaName = `temp-schema-${tempKey}.prisma`;
    const tempSchemaPath = join(dirname(originalSchemaPath), tempSchemaName);

    const originalSchemaContents = String(await readFile(originalSchemaPath));

    const transformedSchema = transform
        ? await transform({
              originalSchemaContents,
              originalSchemaPath,
          })
        : originalSchemaContents;

    await writeFile(tempSchemaPath, transformedSchema);

    return {
        tempSchemaPath,
    };
}
