#!/usr/bin/env node

import {assert, check, waitUntil} from '@augment-vir/assert';
import {
    type ArrayElement,
    arrayToObject,
    awaitedForEach,
    escapeStringForRegExp,
    filterMap,
    getObjectTypedEntries,
    removePrefix,
    removeSuffix,
    safeMatch,
    typedObjectFromEntries,
} from '@augment-vir/common';
import {readFileIfExists} from '@augment-vir/node';
import generatorHelper from '@prisma/generator-helper';
import {runFsm} from 'fsm-vir';
import {existsSync} from 'node:fs';
import {readdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {resolveGeneratorOutput} from './generator-util/generator-output.js';
import {
    createIdTypeName,
    createTaggedIdParams,
    type TaggedIdField,
} from './generator-util/id-name.js';
import {extractRelations} from './generator-util/relation.js';
import {generatorVersion} from './generator-util/version.js';

/** This is removed from the model files and placed into `commonInputTypes.ts` */
const stringFieldUpdateOperationsInputString =
    'export type StringFieldUpdateOperationsInput = {\n  set?: string | runtime.Types.Skip\n}';

generatorHelper.generatorHandler({
    onManifest() {
        return {
            version: generatorVersion,
            defaultOutput: '../src/generated',
            prettyName: 'Tagged IDs',
            requiresGenerators: [
                'prisma-client',
            ],
        };
    },
    async onGenerate(options) {
        const outputDir = resolveGeneratorOutput(options.generator.output);
        const modelsDir = join(outputDir, 'models');

        const modelFiles: {
            [ModelName in string]: {
                path: string;
            };
        } = typedObjectFromEntries(
            await waitUntil.isLengthAtLeast(1, async () => {
                assert.isTrue(existsSync(outputDir));
                const modelFileNames = await readdir(modelsDir);

                return modelFileNames.map((modelFileName) => {
                    const modelName = removeSuffix({value: modelFileName, suffix: '.ts'});

                    return [
                        modelName,
                        {
                            path: join(modelsDir, modelFileName),
                        },
                    ];
                });
            }),
        );

        await fixCommonInputTypes(outputDir);

        const relationFields = extractRelations(options.dmmf);

        const idFieldsByModel: {
            [FileModelName in string]: {[FieldName in string]: TaggedIdField};
        } = arrayToObject(
            options.dmmf.datamodel.models,
            (model) => {
                const fieldEntries = filterMap(
                    model.fields,
                    (field) => {
                        return createTaggedIdParams(relationFields, model, field);
                    },
                    check.isTruthy,
                );

                return {
                    key: model.name,
                    value: typedObjectFromEntries(fieldEntries),
                };
            },
            {
                useRequired: true,
            },
        );

        await awaitedForEach(
            getObjectTypedEntries(idFieldsByModel),
            async ([
                modelName,
                fields,
            ]) => {
                const modelFilePath = modelFiles[modelName]?.path;

                assert.isDefined(modelFilePath, `No model file found for model: '${modelName}'`);

                const modelFileContents = (await readFileIfExists(modelFilePath)) || '';
                const modelFileLines = modelFileContents.trim().split('\n');
                assert.isLengthAtLeast(
                    modelFileLines,
                    1,
                    `No model file found at: '${modelFilePath}'`,
                );

                const tsIdTypeStrings = new Set<string>();

                getObjectTypedEntries(fields).forEach(
                    ([
                        fieldName,
                        fieldInfo,
                    ]) => {
                        const {
                            taggedIdName: newIdTypeName,
                            originalFieldName: idFieldName,
                            originalModelName: modelNameForId,
                        } = createIdTypeName(fieldInfo);

                        const modelIdRegExp = new RegExp(
                            `^(\\s*['"]?${escapeStringForRegExp(fieldName)}['"]?\\??:)(.+)\\bstring\\b(.*)$`,
                        );

                        runFsm<number, string>({
                            /** Type object depth. */
                            initState: 0,
                            inputs: modelFileLines,
                            nextState({input, state}) {
                                if (state === 0 && input.trim().startsWith('export type')) {
                                    return {
                                        nextState: 1,
                                    };
                                } else if (state > 0) {
                                    if (input.includes('}')) {
                                        return {
                                            nextState: state - 1,
                                        };
                                    } else if (input.includes('{')) {
                                        return {
                                            nextState: state + 1,
                                        };
                                    }
                                }

                                return undefined;
                            },
                            actions: {
                                preNextState({input, state, index}) {
                                    if (state > 0) {
                                        const modelIdMatches = safeMatch(input, modelIdRegExp);

                                        if (check.isLengthExactly(modelIdMatches, 4)) {
                                            const values: string[] = [
                                                modelIdMatches[1],
                                                modelIdMatches[2],
                                                newIdTypeName,
                                                modelIdMatches[3],
                                            ];

                                            const latestLine = values.join('');

                                            modelFileLines[index] = latestLine;

                                            const inputTypeMatches = inputTypesToFix.map(
                                                ({usageRegExp}) => {
                                                    return safeMatch(latestLine, usageRegExp);
                                                },
                                            );

                                            const commonTypeMatches = inputTypeMatches.find(
                                                (matches) => {
                                                    return check.isLengthExactly(matches, 3);
                                                },
                                            );

                                            if (commonTypeMatches) {
                                                const insertion = commonTypeMatches[2].startsWith(
                                                    '<',
                                                )
                                                    ? commonTypeMatches[2].replace(
                                                          '> ',
                                                          `, ${newIdTypeName}> `,
                                                      )
                                                    : [
                                                          `<${newIdTypeName}>`,
                                                          commonTypeMatches[2],
                                                      ].join('');

                                                const values: string[] = [
                                                    commonTypeMatches[1],
                                                    insertion,
                                                ];

                                                modelFileLines[index] = values.join('');
                                            }
                                        }
                                    }
                                },
                            },
                        });

                        tsIdTypeStrings.add(
                            `export type ${newIdTypeName} = Tagged<string, 'model-${modelNameForId}-field-${idFieldName}', {model: '${modelNameForId}', field: '${idFieldName}'}>;`,
                        );
                    },
                );

                const newFileContents = [
                    "import {type Tagged} from 'type-fest';",
                    '',
                    ...Array.from(tsIdTypeStrings),
                    '',
                    ...modelFileLines,
                    '',
                ]
                    .join('\n')
                    .replaceAll(stringFieldUpdateOperationsInputString, '');

                await writeFile(modelFilePath, newFileContents);
            },
        );
    },
});

const inputTypesToFix = [
    'StringFilter',
    'StringWithAggregatesFilter',
    'StringFieldUpdateOperationsInput',
].map((typeName) => {
    return {
        typeName,
        definitionRegExp: new RegExp(`^export type ${typeName}\\b`),
        usageRegExp: new RegExp(`^(.+:.+\\bPrisma.${typeName}\\b)(.*)$`),
    };
});

// eslint-disable-next-line sonarjs/slow-regex
const fieldTypeRegExp = /^(.+:)(.+)\bstring\b(.*)$/;
const fieldTypeName = 'FieldType';

async function fixCommonInputTypes(outputDirPath: string) {
    const commonInputTypesFilePath = join(outputDirPath, 'commonInputTypes.ts');
    const fileContents = await waitUntil.isTruthy(
        async () => {
            return (await readFileIfExists(commonInputTypesFilePath)) || '';
        },
        undefined,
        `Failed to find: '${commonInputTypesFilePath}'`,
    );

    const fileLines = [
        fileContents,
        stringFieldUpdateOperationsInputString,
    ]
        .join('\n\n')
        .split('\n');

    runFsm<
        {
            depth: number;
            match?: ArrayElement<typeof inputTypesToFix> | undefined;
            linesAtDepth: number;
        },
        string
    >({
        /** Type object depth. */
        initState: {
            depth: 0,
            linesAtDepth: 0,
        },
        inputs: fileLines,
        nextState({input, state}) {
            if (state.depth === 0) {
                const matchedName = inputTypesToFix.find(({definitionRegExp: regExp}) => {
                    return input.match(regExp);
                });

                if (matchedName) {
                    return {
                        nextState: {
                            depth: 1,
                            linesAtDepth: 0,
                            match: matchedName,
                        },
                    };
                }
            } else if (state.depth > 0) {
                if (input.includes('}')) {
                    const newDepth = state.depth - 1;

                    return {
                        nextState: {
                            match: newDepth === 0 ? undefined : state.match,
                            linesAtDepth: 0,
                            depth: newDepth,
                        },
                    };
                } else if (input.includes('{')) {
                    return {
                        nextState: {
                            ...state,
                            linesAtDepth: 0,
                            depth: state.depth + 1,
                        },
                    };
                } else {
                    return {
                        nextState: {
                            ...state,
                            linesAtDepth: state.linesAtDepth + 1,
                        },
                    };
                }
            }

            return undefined;
        },
        actions: {
            postNextState({input, state, index}) {
                if (state.depth === 1 && state.match && state.linesAtDepth === 0) {
                    const [matchString] = safeMatch(input, state.match.definitionRegExp);

                    assert.isTruthy(
                        matchString,
                        `Failed to extract match for '${state.match.definitionRegExp}' from '${input}'`,
                    );

                    const afterMatch = removePrefix({value: input, prefix: matchString});

                    if (afterMatch.startsWith('<')) {
                        fileLines[index] = input.replace(
                            '> = {',
                            `, ${fieldTypeName} = string> = {`,
                        );
                    } else {
                        fileLines[index] = [
                            matchString,
                            `<${fieldTypeName} = string>`,
                            afterMatch,
                        ].join('');
                    }
                }
            },
            preNextState({input, state, index}) {
                if (state.depth > 0 && state.match) {
                    const matches = safeMatch(input, fieldTypeRegExp);

                    if (check.isLengthExactly(matches, 4)) {
                        const values: string[] = [
                            matches[1],
                            matches[2],
                            fieldTypeName,
                            matches[3],
                        ];

                        fileLines[index] = values.join('');
                    }
                }
            },
        },
    });

    await writeFile(commonInputTypesFilePath, fileLines.join('\n'));
}
