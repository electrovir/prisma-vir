import {assert, check} from '@augment-vir/assert';
import {arrayToObject, filterMap, typedObjectFromEntries} from '@augment-vir/common';
import {type DMMF} from '@prisma/generator-helper';

/**
 * An individual relation field's relation information, used in {@link FieldRelations}.
 *
 * @category Internal
 */
export type FieldRelation = {
    relationModelName: string;
    relationModelId: string;
};

/**
 * All field relations, output from {@link extractRelations}.
 *
 * @category Internal
 */
export type FieldRelations = {
    [ModelNameWithRelation in string]: {
        [RelationIdFieldName in string]: FieldRelation;
    };
};

/**
 * Extracts all fields with relations.
 *
 * @category Internal
 */
export function extractRelations(dmmf: DMMF.Document): FieldRelations {
    return arrayToObject(
        dmmf.datamodel.models,
        (model) => {
            const relationEntries = filterMap(
                model.fields,
                (
                    field,
                ):
                    | undefined
                    | [
                          string,
                          FieldRelation,
                      ] => {
                    if (
                        !field.relationToFields ||
                        !check.isLengthAtLeast(field.relationToFields, 1)
                    ) {
                        return undefined;
                    }

                    assert.isLengthExactly(
                        field.relationToFields,
                        1,
                        `Unable to handle relation to multiple fields for field '${field.name}' in model '${model.name}'.`,
                    );

                    assert.isDefined(
                        field.relationFromFields,
                        `Found no relation to fields for field '${field.name}' in model '${model.name}'.`,
                    );
                    assert.isLengthAtLeast(
                        field.relationFromFields,
                        1,
                        `Found empty relation fields for field '${field.name}' in model '${model.name}'.`,
                    );
                    assert.isLengthExactly(
                        field.relationFromFields,
                        1,
                        `Unable to handle relation from multiple fields for field '${field.name}' in model '${model.name}'.`,
                    );

                    const relationToField = field.relationToFields[0];
                    const relationFromField = field.relationFromFields[0];

                    return [
                        relationFromField,
                        {
                            relationModelName: field.type,
                            relationModelId: relationToField,
                        },
                    ];
                },
                check.isTruthy,
            );

            return {
                key: model.name,
                value: typedObjectFromEntries(relationEntries),
            };
        },
        {
            useRequired: true,
        },
    );
}
