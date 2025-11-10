import {
    type AnyObject,
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
    options: PartialWithUndefined<PrefixedIdOptions<ModelName>> = {},
) {
    return {
        name: 'prefixed-id',
        query: {
            $allModels: {
                /** Hook into all model creations. */
                async create({
                    query,
                    args,
                    model: modelName,
                }: {
                    query: (args: unknown) => Promise<unknown>;
                    model: string;
                    args: {
                        data: any;
                    };
                }): Promise<unknown> {
                    const optionParams: PrefixedIdOptionCallbackParams<ModelName> = {
                        modelName: modelName as ModelName,
                    };

                    const idColumnName: string =
                        (await options.getIdColumnName?.(optionParams)) || 'id';

                    if (!(idColumnName in args.data)) {
                        const baseId: string =
                            (await options.createBaseId?.(optionParams)) || createCuid2();

                        const prefix: string =
                            (await options.createPrefix?.(optionParams)) ||
                            createDefaultIdPrefix(optionParams);

                        (args.data as AnyObject)[idColumnName] = [
                            prefix,
                            baseId,
                        ].join('');
                    }

                    return query(args);
                },
            },
        },
    };
}
