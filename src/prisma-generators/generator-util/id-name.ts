import {camelCaseToKebabCase, kebabCaseToCamelCase} from '@augment-vir/common';
import {type Field, type Model} from '@prisma/dmmf';
import {type FieldRelation, type FieldRelations} from './relation.js';

/**
 * Creates a TypeScript type name for id fields.
 *
 * @category Internal
 */
export function createIdTypeName({fieldName, fileModelName, relation}: Readonly<TaggedIdField>) {
    const modelForIdName: string = relation?.relationModelName || fileModelName;
    const idNameInModel = relation?.relationModelId || fieldName;

    return {
        taggedIdName: kebabCaseToCamelCase(
            [
                camelCaseToKebabCase(modelForIdName),
                camelCaseToKebabCase(idNameInModel),
            ].join('-'),
            {
                capitalizeFirstLetter: true,
            },
        ),
        originalModelName: modelForIdName,
        originalFieldName: idNameInModel,
    };
}

export type TaggedIdField = {
    fileModelName: string;
    fieldName: string;
    relation?: FieldRelation | undefined;
};

export function createTaggedIdName(
    relationFields: Readonly<FieldRelations>,
    model: Readonly<Model>,
    field: Readonly<Field>,
) {
    const [
        ,
        taggedId,
    ] = createTaggedIdParams(relationFields, model, field) || [];

    if (!taggedId) {
        return undefined;
    }

    return createIdTypeName(taggedId);
}

export function createTaggedIdParams(
    relationFields: Readonly<FieldRelations>,
    model: Readonly<Model>,
    field: Readonly<Field>,
): [string, TaggedIdField] | undefined {
    const relation = relationFields[model.name]?.[field.name];
    const isCommentTagged: boolean = !!field.documentation?.includes('@taggedId()');

    if (field.isId || isCommentTagged) {
        if (relation) {
            throw new Error(
                `Cannot tag an @id() or @taggedId() field that is also a relation id: ${model.name}.${field.name}`,
            );
        } else if (field.isId && isCommentTagged) {
            throw new Error(
                `Cannot tag an @id() field with @taggedId(): ${model.name}.${field.name}`,
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
    }

    if (relation) {
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
