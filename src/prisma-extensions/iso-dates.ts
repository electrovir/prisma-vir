import {type PrismaValueMapper} from './prisma-map/map-values.js';
import {createPrismaMapExtension} from './prisma-map/prisma-map-extension.js';

/**
 * Creates an extension that maps all date values to ISO strings.
 *
 * @category Extensions
 */
export function createIsoDatesPrismaExtension() {
    return createPrismaMapExtension('iso-dates', [
        (value) => {
            if (value instanceof Date) {
                return {
                    replacement: value.toISOString(),
                };
            } else {
                return undefined;
            }
        },
    ] satisfies ReadonlyArray<PrismaValueMapper>);
}
