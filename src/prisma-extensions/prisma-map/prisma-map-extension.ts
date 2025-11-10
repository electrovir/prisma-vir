import {mapPrismaValues, type PrismaValueMapper} from './map-values.js';

/**
 * Use this to map Prisma values inside of a `query` Prisma extension, probably under
 * `$allOperations`.
 *
 * This is used inside of {@link createPrismaMapExtension} so if you have existing Prisma extensions
 * (that prevent you from directly using {@link createPrismaMapExtension}), you can use this function
 * and get the same results.
 *
 * @category Internal
 * @example
 *
 * ```ts
 * prismaClient.$extends({
 *     query: {
 *         async $allOperations({
 *             args,
 *             query,
 *         }: {
 *             query: (args: unknown) => Promise<unknown>;
 *             args: unknown;
 *         }) {
 *             return runPrismaMapExtension([myMapper], {args, query});
 *         },
 *     },
 * });
 * ```
 */
export async function runPrismaMapExtension(
    mappers: ReadonlyArray<PrismaValueMapper>,
    {
        args,
        query,
    }: Readonly<{
        args: unknown;
        query: (args: unknown) => Promise<unknown>;
    }>,
) {
    const result = await query(args);
    await mapPrismaValues(result, mappers);
    return result;
}

/**
 * Use this to create a full Prisma extension that maps values based on your defined mappers. The
 * output of this function should be passed directly into `prismaClient.$extends()`.
 *
 * @category Extensions
 * @example
 *
 * ```ts
 * prismaClient.$extends(createPrismaMapExtension([myMapper]));
 * ```
 */
export function createPrismaMapExtension(
    extensionName: string,
    mappers: ReadonlyArray<PrismaValueMapper>,
) {
    return {
        name: extensionName,
        query: {
            /** Catch all query operations so we can map any fields in any models that need mapping. */
            async $allOperations({
                args,
                query,
            }: {
                query: (args: unknown) => Promise<unknown>;
                args: unknown;
            }) {
                return runPrismaMapExtension(mappers, {args, query});
            },
        },
    };
}
