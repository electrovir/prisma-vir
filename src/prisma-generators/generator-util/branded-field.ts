import {camelCaseToKebabCase, kebabCaseToCamelCase, StringCase} from '@augment-vir/common';
import {type Field, type Model} from '@prisma/dmmf';
import {type FieldRelation, type FieldRelations} from './relation.js';

/**
 * Creates a TypeScript type name for id fields.
 *
 * @category Internal
 */
export function createBrandedTypeName({
    fieldName,
    fileModelName,
    relation,
}: Readonly<BrandedField>) {
    const modelForIdName: string = relation?.relationModelName || fileModelName;
    const idNameInModel = relation?.relationModelId || fieldName;

    return {
        brandedFieldName: kebabCaseToCamelCase(
            [
                camelCaseToKebabCase(modelForIdName),
                camelCaseToKebabCase(idNameInModel),
            ].join('-'),
            {
                firstLetterCase: StringCase.Upper,
            },
        ),
        originalModelName: modelForIdName,
        originalFieldName: idNameInModel,
    };
}

export type BrandedField = {
    fileModelName: string;
    fieldName: string;
    relation?: FieldRelation | undefined;
};

export function createBrandedTypeNameFromField(
    relationFields: Readonly<FieldRelations>,
    model: Readonly<Model>,
    field: Readonly<Field>,
) {
    const [
        ,
        brandedName,
    ] = createBrandedFieldParams(relationFields, model, field) || [];

    if (!brandedName) {
        return undefined;
    }

    return createBrandedTypeName(brandedName);
}

export function createBrandedFieldParams(
    relationFields: Readonly<FieldRelations>,
    model: Readonly<Model>,
    field: Readonly<Field>,
):
    | [
          string,
          BrandedField,
      ]
    | undefined {
    const relation = relationFields[model.name]?.[field.name];
    const isCommentBranded: boolean = !!field.documentation?.includes('@branded()');

    if (field.isId || isCommentBranded) {
        if (relation) {
            throw new Error(
                `Cannot brand an @id() or @branded() field that is also a relation id: ${model.name}.${field.name}`,
            );
        } else if (field.isId && isCommentBranded) {
            throw new Error(
                `Cannot brand an @id() field with @branded(): ${model.name}.${field.name}`,
            );
        }

        return [
            field.name,
            {
                fileModelName: model.name,
                fieldName: field.name,
                relation: undefined,
            },
        ] as const;
    } else if (relation) {
        return [
            field.name,
            {
                fileModelName: model.name,
                fieldName: field.name,
                relation,
            },
        ] as const;
    }

    return undefined;
}
