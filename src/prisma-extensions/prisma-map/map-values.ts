import {check} from '@augment-vir/assert';
import {type AnyObject, awaitedForEach, type MaybePromise} from '@augment-vir/common';

/**
 * Output from {@link PrismaValueMapper}.
 *
 * @category Internal
 */
export type MappedPrismaValue =
    | {
          /** If present, the value set to this key will replace the original value. */
          replacement: unknown;
      }
    | undefined;

/**
 * A function that takes an existing output from Prisma and maps it to something else. Return
 * `undefined` to skip mapping (preserve the existing value). Otherwise, return `{replacement:
 * <new-value-here>}` (see {@link MappedPrismaValue}.
 *
 * @category Internal
 */
export type PrismaValueMapper = (value: unknown) => MaybePromise<MappedPrismaValue>;

/**
 * Recursively maps values.
 *
 * In the pursuit of performance, this mutates the first argument, `value`, and returns nothing.
 *
 * @category Internal
 */
export async function mapPrismaValues(
    value: unknown,
    mappers: ReadonlyArray<PrismaValueMapper>,
    parent?: Readonly<{
        parentValue: AnyObject;
        childKey: PropertyKey;
    }>,
): Promise<void> {
    if (!mappers.length) {
        return;
    }

    if (check.isArray(value)) {
        await Promise.all(
            value.map(async (innerValue, index) =>
                mapPrismaValues(innerValue, mappers, {
                    childKey: index,
                    parentValue: value,
                }),
            ),
        );
    } else if (check.isPlainObject(value)) {
        await Promise.all(
            Object.entries(value).map(
                async ([
                    childKey,
                    innerValue,
                ]) =>
                    await mapPrismaValues(innerValue, mappers, {
                        parentValue: value,
                        childKey,
                    }),
            ),
        );
    } else if (parent) {
        await awaitedForEach(mappers, async (mapper) => {
            const output = await mapper(value);
            if (output) {
                parent.parentValue[parent.childKey] = output.replacement;
            }
        });
    }
}
