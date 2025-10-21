import {camelCaseToKebabCase, kebabCaseToCamelCase} from '@augment-vir/common';

/**
 * Creates a TypeScript type name for id fields.
 *
 * @category Internal
 */
export function createIdTypeName({fieldName, modelName}: {modelName: string; fieldName: string}) {
    return kebabCaseToCamelCase(
        [
            camelCaseToKebabCase(modelName),
            camelCaseToKebabCase(fieldName),
        ].join('-'),
        {
            capitalizeFirstLetter: true,
        },
    );
}
