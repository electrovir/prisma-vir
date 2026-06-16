import {
    type AnyObject,
    awaitedForEach,
    camelCaseToKebabCase,
    type MaybePromise,
    type PartialWithUndefined,
} from '@augment-vir/common';
import {createId as createCuid2} from '@paralleldrive/cuid2';

export {createId as createCuid2} from '@paralleldrive/cuid2';

/**
 * Params for callbacks in {@link PrefixedIdOptions}.
 *
 * @category Internal
 */
export type PrefixedIdOptionCallbackParams<ModelName extends string = string> = {
    modelName: ModelName;
};

/**
 * Options for {@link createPrefixedIdExtension}.
 *
 * @category Internal
 */
export type PrefixedIdOptions<ModelName extends string = string> = {
    /** @default createCuid2 */
    createBaseId(params: PrefixedIdOptionCallbackParams<ModelName>): MaybePromise<string>;
    /** @default createDefaultIdPrefix */
    createPrefix(params: PrefixedIdOptionCallbackParams<ModelName>): MaybePromise<string>;
    /** @default 'id' */
    getIdColumnName(params: PrefixedIdOptionCallbackParams<ModelName>): MaybePromise<string>;
};

/**
 * Produces a default model id prefix which is an abbreviation of the model name suffixed with `_`.
 *
 * @category Internal
 * @example
 *
 * - 'User' -> 'u_'
 * - 'Team' -> 't_'
 * - 'EventLog' -> 'el_'
 */
export function createDefaultIdPrefix<const ModelName extends string = string>({
    modelName,
}: PrefixedIdOptionCallbackParams<ModelName>) {
    const kebabCaseName = camelCaseToKebabCase(modelName).replaceAll('_', '-');

    return (
        kebabCaseName
            .split('-')
            .map((entry) => entry[0])
            .join('') + '_'
    );
}

/**
 * Creates an extension that adds a prefix to every table's id field.
 *
 * @category Extensions
 */
export function createPrefixedIdExtension<ModelName extends string>(
    options: Readonly<PartialWithUndefined<PrefixedIdOptions<ModelName>>> = {},
) {
    return {
        name: 'prefixed-id',
        query: {
            $allModels: {
                /** Handle model creation. */
                async create({
                    query,
                    args,
                    model: modelName,
                }: {
                    query: (args: unknown) => Promise<unknown>;
                    model: string;
                    args: {
                        data?: any;
                    };
                }): Promise<unknown> {
                    if (args.data) {
                        await insertId({
                            data: args.data,
                            modelName,
                            options,
                        });
                    }

                    return query(args);
                },
                /** Handle model creations. */
                async createMany({
                    query,
                    args,
                    model: modelName,
                }: {
                    query: (args: unknown) => Promise<unknown>;
                    model: string;
                    args: {
                        data?: any;
                    };
                }): Promise<unknown> {
                    if (args.data) {
                        await awaitedForEach(args.data as any[], async (dataEntry: AnyObject) => {
                            await insertId({
                                data: dataEntry,
                                modelName,
                                options,
                            });
                        });
                    }

                    return query(args);
                },
                /**
                 * Handle model upsert. When the upsert is keyed on a unique constraint other than
                 * the id column, the `create` branch carries no id, so it must be prefixed here
                 * just like a plain `create`.
                 */
                async upsert({
                    query,
                    args,
                    model: modelName,
                }: {
                    query: (args: unknown) => Promise<unknown>;
                    model: string;
                    args: {
                        create?: any;
                    };
                }): Promise<unknown> {
                    if (args.create) {
                        await insertId({
                            data: args.create,
                            modelName,
                            options,
                        });
                    }

                    return query(args);
                },
            },
        },
        /**
         * Unfortunately, Prisma's extension types are such a mess that we gotta just cast this to
         * `any` entirely.
         */
    } as any;
}

async function insertId({
    data,
    modelName,
    options,
}: {
    modelName: string;
    options: Readonly<PartialWithUndefined<PrefixedIdOptions>>;
    data: AnyObject;
}) {
    const optionParams: PrefixedIdOptionCallbackParams = {
        modelName,
    };

    const idColumnName: string = (await options.getIdColumnName?.(optionParams)) || 'id';

    if (!(idColumnName in data)) {
        const baseId: string = (await options.createBaseId?.(optionParams)) || createCuid2();

        const prefix: string =
            (await options.createPrefix?.(optionParams)) || createDefaultIdPrefix(optionParams);

        data[idColumnName] = [
            prefix,
            baseId,
        ].join('');
    }
}
