import {assertWrap} from '@augment-vir/assert';
import {type MaybePromise, type PartialWithUndefined, randomString} from '@augment-vir/common';
import {sanitizePath} from '@augment-vir/node';
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
            sanitizePath(randomString(4)),
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

    return {tempSchemaPath};
}

/**
 * Creates a Prisma schema copied from the `originalSchemaPath` with the supplied
 * `datasourceReplacement` instead of the original schema's datasource.
 *
 * @category Internal
 */
export async function createTempSchemaWithReplacedDatasourceUrl({
    datasourceReplacement,
    originalSchemaPath,
    key,
}: Readonly<{
    originalSchemaPath: string;
    datasourceReplacement: string;
    key?: string | undefined;
}>) {
    return await createTempSchema({
        originalSchemaPath,
        key,
        transform({originalSchemaContents}) {
            enum DatasourceStatus {
                NotFound = 'not-found',
                Started = 'started',
                Ended = 'ended',
            }

            let datasourceStatus = DatasourceStatus.NotFound;

            return originalSchemaContents
                .split('\n')
                .map((line) => {
                    if (datasourceStatus === DatasourceStatus.NotFound) {
                        if (line.trim().startsWith('datasource ')) {
                            datasourceStatus = DatasourceStatus.Started;
                        }
                    } else if (datasourceStatus === DatasourceStatus.Started) {
                        if (line.trim().startsWith('url ')) {
                            return [
                                assertWrap.isString(line.split('=', 1)[0]),
                                datasourceReplacement,
                            ].join('= ');
                        } else {
                            return line;
                        }
                    }

                    return line;
                })
                .join('\n');
        },
    });
}
