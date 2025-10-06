#!/usr/bin/env node

import {assert, check, waitUntil} from '@augment-vir/assert';
import {
    awaitedForEach,
    escapeStringForRegExp,
    filterMap,
    removeSuffix,
    safeMatch,
    typedObjectFromEntries,
} from '@augment-vir/common';
import {readFileIfExists} from '@augment-vir/node';
import generatorHelper, {type DMMF} from '@prisma/generator-helper';
import {runFsm} from 'fsm-vir';
import {existsSync} from 'node:fs';
import {readdir, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {generatorVersion, resolveGeneratorOutput} from './generator-util.js';

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

        const modelsWithIds = filterMap(
            options.dmmf.datamodel.models,
            (model) => {
                const idField = model.fields.find(({name, isId}) => name === 'id' && isId);

                return {
                    idField,
                    modelName: model.name,
                };
            },

            (fieldInfo): fieldInfo is {modelName: string; idField: DMMF.Field} =>
                !!fieldInfo.idField,
        );

        await awaitedForEach(modelsWithIds, async ({idField: {name: idFieldName}, modelName}) => {
            const modelFilePath = modelFiles[modelName]?.path;

            assert.isDefined(modelFilePath, `No model file found for model: '${modelName}'`);

            const modelFileContents = (await readFileIfExists(modelFilePath)) || '';
            const modelFileLines = modelFileContents.trim().split('\n');
            assert.isLengthAtLeast(modelFileLines, 1, `No model file found at: '${modelFilePath}'`);

            const newIdTypeName = [
                modelName,
                'Id',
            ].join('');

            const modelIdRegExp = new RegExp(
                `^(\\s*['"]?${escapeStringForRegExp(idFieldName)}['"]?:)([^|]+ | )?string(.*)$`,
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
                            const matches = safeMatch(input, modelIdRegExp);

                            if (check.isLengthExactly(matches, 4)) {
                                const values: string[] = [
                                    matches[1],
                                    matches[2],
                                    newIdTypeName,
                                    matches[3],
                                ];

                                modelFileLines[index] = values.join('');
                            }
                        }
                    },
                },
            });

            const fileHeader = [
                "import {type Tagged} from 'type-fest';",
                `export type ${newIdTypeName} = Tagged<string, 'model-${modelName}-id-field-${idFieldName}', {model: '${modelName}', field: '${idFieldName}'}>;`,
            ].join('\n\n');

            const newFileContents = [
                fileHeader,
                ...modelFileLines,
                '',
            ].join('\n');

            await writeFile(modelFilePath, newFileContents);
        });
    },
});
