#!/usr/bin/env node

/**
 * This generator pulls all internal Prisma enums into the `enums.ts` file so they can be used by
 * browsers.
 */

import {indent, log} from '@augment-vir/common';
import generatorHelper, {type DMMF} from '@prisma/generator-helper';
import {appendFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {generatorVersion, resolveGeneratorOutput} from './generator-util.js';

type InternalEnumDefinition = Readonly<{
    name: string;
    values: ReadonlyArray<string>;
}>;

function extractInternalPrismaEnums(dmmf: DMMF.Document): InternalEnumDefinition[] {
    return [
        /** The `ModelName` enum is not present in the internal enum list. */
        {
            name: 'ModelName',
            values: dmmf.datamodel.models.map((model) => model.name).sort(),
        },
        ...dmmf.schema.enumTypes.prisma.map((prismaEnum) => {
            return {
                name: prismaEnum.name,
                values: prismaEnum.values,
            };
        }),
    ];
}

function renderEnum(def: InternalEnumDefinition): string {
    return [
        `export const ${def.name} = {`,
        ...def.values.map((value) => indent(`${value}: '${value}',`)),
        `} as const;`,
        '',
        `export type ${def.name} = (typeof ${def.name})[keyof typeof ${def.name}];`,
    ].join('\n');
}

generatorHelper.generatorHandler({
    onManifest() {
        return {
            version: generatorVersion,
            defaultOutput: '../src/generated',
            prettyName: 'Internal Prisma Enums',
        };
    },
    async onGenerate(options) {
        try {
            const enumBlocks = extractInternalPrismaEnums(options.dmmf).map(renderEnum);

            const enumsFilePath = join(
                resolveGeneratorOutput(options.generator.output),
                'enums.ts',
            );

            await appendFile(
                enumsFilePath,
                [
                    '',
                    '// Internal Enums',
                    '',
                    ...enumBlocks,
                ].join('\n'),
            );
            log.faint(`Internal enums added to ${relative(process.cwd(), enumsFilePath)}`);
        } catch (error) {
            log.error('Failed to generate internal enums:', error);
            throw error;
        }
    },
});
