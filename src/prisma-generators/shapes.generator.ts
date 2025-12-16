#!/usr/bin/env node

/**
 * This generator generates `object-shape-tester` `Shape` instances for each model. This currently
 * does not generate shapes for relations between models.
 */

import {check} from '@augment-vir/assert';
import {getObjectTypedEntries, indent, log} from '@augment-vir/common';
import generatorHelper, {type DMMF, type EnvValue} from '@prisma/generator-helper';
import {mkdir, writeFile} from 'node:fs/promises';
import {dirname, join, relative} from 'node:path';
import {createBrandedTypeNameFromField} from './generator-util/branded-field.js';
import {extractRelations} from './generator-util/relation.js';
import {generatorVersion} from './generator-util/version.js';

function scalarPlaceholderCode(field: DMMF.Field): string {
    if (field.type === 'String') {
        return "''";
    } else if (field.type === 'Boolean') {
        return 'false';
    } else if (
        field.type === 'Int' ||
        field.type === 'BigInt' ||
        field.type === 'Float' ||
        field.type === 'Decimal'
    ) {
        return '0';
    } else if (field.type === 'DateTime') {
        return 'utcIsoStringShape()';
    } else if (field.type === 'Json') {
        return 'unknownShape<JsonValue>()';
    } else {
        throw new Error(`Unhandled field type '${field.type}'`);
    }
}

generatorHelper.generatorHandler({
    onManifest() {
        return {
            version: generatorVersion,
            defaultOutput: '../src/generated',
            prettyName: 'Prisma Model Shapes',
        };
    },
    async onGenerate(options) {
        const allEnums = new Set<string>();
        const relations = extractRelations(options.dmmf);
        const usedIdShapes: {
            [ShapeName in string]: {
                typeName: string;
                modelName: string;
            };
        } = {};

        const modelBlocks: string[] = options.dmmf.datamodel.models.map((model) => {
            const lines: string[] = model.fields
                .map((field) => {
                    if (field.kind === 'scalar') {
                        const brandedField = createBrandedTypeNameFromField(
                            relations,
                            model,
                            field,
                        );

                        const idShapeName = brandedField
                            ? `${brandedField.brandedFieldName}Shape`
                            : undefined;

                        if (brandedField && idShapeName) {
                            usedIdShapes[idShapeName] = {
                                typeName: brandedField.brandedFieldName,
                                modelName: brandedField.originalModelName,
                            };
                        }

                        const base = idShapeName || scalarPlaceholderCode(field);
                        let code = field.isList ? `[${base}]` : base;
                        if (!field.isRequired) {
                            code = `unionShape(null, ${code})`;
                        }
                        return indent(`${field.name}: ${code},`);
                    } else if (field.kind === 'enum') {
                        allEnums.add(field.type);
                        let enumCode = field.isList
                            ? `[enumShape(${field.type})]`
                            : `enumShape(${field.type})`;
                        if (!field.isRequired) {
                            enumCode = `unionShape(null, ${enumCode})`;
                        }
                        return indent(`${field.name}: ${enumCode},`);
                    } else if (field.kind === 'object') {
                        /** Ignore relations (for now at least). */
                        return undefined;
                    } else {
                        log.warning(`Unhandled Prisma field kind: ${field.kind}`);
                        return undefined;
                    }
                })
                .filter(check.isTruthy);

            return `export const ${model.name}Shape = defineShape({\n${lines.join('\n')}\n});`;
        });

        const idImports: string[] = getObjectTypedEntries(usedIdShapes).map(([
            ,
            {typeName, modelName},
        ]) => {
            return `import {type ${typeName}} from './models/${modelName}.js';`;
        });
        const idShapes: string[] = getObjectTypedEntries(usedIdShapes).map(([
            shapeName,
            {typeName},
        ]) => {
            return `export const ${shapeName} = typedStringShape<${typeName}>();`;
        });

        const importParts: string[] = [
            '/** AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. */',
            '// @ts-nocheck',
            "import {defineShape, enumShape, unionShape, unknownShape, typedStringShape} from 'object-shape-tester';",
            "import {JsonValue} from '@prisma/client/runtime/client.js';",
            "import {utcIsoStringShape} from 'date-vir';",
            allEnums.size
                ? `import {${Array.from(allEnums).sort().join(', ')}} from './enums.js';`
                : undefined,
            ...idImports,
        ].filter(check.isTruthy);

        const contents = [
            ...importParts,
            '',
            ...idShapes,
            '',
            ...modelBlocks,
            '',
        ].join('\n');

        const outputDir = resolveOutput(options.generator.output);
        const shapesFilePath = join(outputDir, 'shapes.gen.ts');
        await mkdir(dirname(shapesFilePath), {recursive: true});
        await writeFile(shapesFilePath, contents);

        log.faint(`Shapes written to ${relative(process.cwd(), shapesFilePath)}`);
    },
});

function resolveOutput(output: string | EnvValue | undefined | null): string {
    if (!output) {
        return '.';
    } else if (check.isString(output)) {
        return output;
    } else {
        return output.value || '.';
    }
}
