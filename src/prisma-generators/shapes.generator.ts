#!/usr/bin/env node

/**
 * This generator generates `object-shape-tester` `Shape` instances for each model. This currently
 * does not generate shapes for relations between models.
 *
 * Every shape and enum gets its own file (`shapes/<ShapeName>.ts`, `enums/<EnumName>.ts`), so a
 * bundle that imports one shape does not also hold every other shape and enum. `shapes.gen.ts`
 * re-exports every shape.
 */

import {check} from '@augment-vir/assert';
import {getObjectTypedEntries, indent, log} from '@augment-vir/common';
import generatorHelper, {type DMMF, type EnvValue} from '@prisma/generator-helper';
import {mkdir, rm, writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
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
        const relations = extractRelations(options.dmmf);
        const idShapes: {
            [ShapeName in string]: {
                typeName: string;
                modelName: string;
            };
        } = {};

        const modelShapeFiles = options.dmmf.datamodel.models.map((model) => {
            const usedIdShapeNames = new Set<string>();
            const usedEnumNames = new Set<string>();

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
                            idShapes[idShapeName] = {
                                typeName: brandedField.brandedFieldName,
                                modelName: brandedField.originalModelName,
                            };
                            usedIdShapeNames.add(idShapeName);
                        }

                        const base = idShapeName || scalarPlaceholderCode(field);
                        let code = field.isList ? `[${base}]` : base;
                        if (!field.isRequired) {
                            code = `unionShape(null, ${code})`;
                        }
                        return indent(`${field.name}: ${code},`);
                    } else if (field.kind === 'enum') {
                        usedEnumNames.add(field.type);
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

            const shapeName = `${model.name}Shape`;

            return {
                exportName: shapeName,
                contents: createFileContents([
                    "import {defineShape, enumShape, unionShape, unknownShape} from 'object-shape-tester';",
                    "import {JsonValue} from '@prisma/client/runtime/client.js';",
                    "import {utcIsoStringShape} from 'date-vir';",
                    ...Array.from(usedEnumNames)
                        .sort()
                        .map((enumName) => `import {${enumName}} from '../enums/${enumName}.js';`),
                    ...Array.from(usedIdShapeNames)
                        .sort()
                        .map(
                            (idShapeName) => `import {${idShapeName}} from './${idShapeName}.js';`,
                        ),
                    '',
                    `export const ${shapeName} = defineShape({\n${lines.join('\n')}\n});`,
                ]),
            };
        });

        const idShapeFiles = getObjectTypedEntries(idShapes).map(
            ([
                shapeName,
                {typeName, modelName},
            ]) => {
                return {
                    exportName: shapeName,
                    contents: createFileContents([
                        "import {typedStringShape} from 'object-shape-tester';",
                        `import {type ${typeName}} from '../models/${modelName}.js';`,
                        '',
                        `export const ${shapeName} = typedStringShape<${typeName}>();`,
                    ]),
                };
            },
        );

        const enumFiles = options.dmmf.datamodel.enums.map((prismaEnum) => {
            return {
                exportName: prismaEnum.name,
                contents: createFileContents([
                    `export const ${prismaEnum.name} = {`,
                    ...prismaEnum.values.map((value) => indent(`${value.name}: '${value.name}',`)),
                    '} as const;',
                    '',
                    `export type ${prismaEnum.name} = (typeof ${prismaEnum.name})[keyof typeof ${prismaEnum.name}];`,
                ]),
            };
        });

        const shapeFiles = [
            ...idShapeFiles,
            ...modelShapeFiles,
        ];

        const outputDir = resolveOutput(options.generator.output);
        const shapesDir = join(outputDir, 'shapes');
        const enumsDir = join(outputDir, 'enums');
        const shapesFilePath = join(outputDir, 'shapes.gen.ts');

        await Promise.all(
            [
                shapesDir,
                enumsDir,
            ].map(async (dirPath) => {
                await rm(dirPath, {
                    recursive: true,
                    force: true,
                });
                await mkdir(dirPath, {
                    recursive: true,
                });
            }),
        );

        await Promise.all([
            ...shapeFiles.map(async (file) => {
                await writeFile(join(shapesDir, `${file.exportName}.ts`), file.contents);
            }),
            ...enumFiles.map(async (file) => {
                await writeFile(join(enumsDir, `${file.exportName}.ts`), file.contents);
            }),
            writeFile(
                shapesFilePath,
                createFileContents(
                    shapeFiles.map((file) => `export * from './shapes/${file.exportName}.js';`),
                ),
            ),
        ]);

        log.faint(`Shapes written to ${relative(process.cwd(), shapesFilePath)}`);
    },
});

function createFileContents(lines: ReadonlyArray<string>): string {
    return [
        '/** AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. */',
        '// @ts-nocheck',
        ...lines,
        '',
    ].join('\n');
}

function resolveOutput(output: string | EnvValue | undefined | null): string {
    if (!output) {
        return '.';
    } else if (check.isString(output)) {
        return output;
    } else {
        return output.value || '.';
    }
}
