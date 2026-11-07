#!/usr/bin/env node
/**
 * This generator writes `join-tables.ts`, which lists every implicit many-to-many join table Prisma
 * creates (`_<relationName>`) along with the two models it joins. These tables have no model of
 * their own, so they appear in neither `ModelName` nor the runtime data model, and code that must
 * act on every table (such as database grants) has no other way to find them at runtime.
 */
import {getObjectTypedEntries, log} from '@augment-vir/common';
import generatorHelper, {type DMMF} from '@prisma/generator-helper';
import {mkdir, writeFile} from 'node:fs/promises';
import {join, relative} from 'node:path';
import {resolveGeneratorOutput} from './generator-util/generator-output.js';
import {generatorVersion} from './generator-util/version.js';

type JoinTable = {
    tableName: string;
    modelA: string;
    modelB: string;
};

/**
 * A relation is implicit many-to-many when every field naming it is a list. A one-to-many relation
 * always has a non-list side holding the foreign key.
 */
function extractJoinTables(datamodel: Readonly<DMMF.Datamodel>): JoinTable[] {
    const relationModels: Record<string, {models: string[]; areAllLists: boolean}> = {};

    datamodel.models.forEach((model) => {
        model.fields.forEach((field) => {
            if (field.kind !== 'object' || !field.relationName) {
                return;
            }
            const relation = (relationModels[field.relationName] ??= {
                models: [],
                areAllLists: true,
            });
            relation.models.push(model.name);
            relation.areAllLists = relation.areAllLists && field.isList;
        });
    });

    return getObjectTypedEntries(relationModels)
        .filter(
            ([
                ,
                relation,
            ]) => relation.areAllLists,
        )
        .map(
            ([
                relationName,
                relation,
            ]) => {
                /**
                 * Prisma points the join table's `A` column at the model whose name sorts first and
                 * `B` at the other one. A self-relation lists the same model twice.
                 */
                const [
                    modelA,
                    modelB,
                ] = relation.models.toSorted();
                if (!modelA || !modelB) {
                    throw new Error(
                        `Implicit many-to-many relation '${relationName}' should have two sides but has ${relation.models.length}.`,
                    );
                }

                return {
                    tableName: `_${relationName}`,
                    modelA,
                    modelB,
                };
            },
        )
        .toSorted((first, second) => first.tableName.localeCompare(second.tableName));
}

function createJoinTablesFileContents(joinTables: ReadonlyArray<JoinTable>): string {
    return [
        '/** AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. */',
        '',
        '/**',
        ' * Every implicit many-to-many join table, keyed by its database table name. `modelA` and',
        " * `modelB` are the models referenced by the table's `A` and `B` columns.",
        ' */',
        'export const joinTables = {',
        ...joinTables.map((joinTable) => {
            return [
                `    ${JSON.stringify(joinTable.tableName)}: {`,
                `        modelA: ${JSON.stringify(joinTable.modelA)},`,
                `        modelB: ${JSON.stringify(joinTable.modelB)},`,
                '    },',
            ].join('\n');
        }),
        '} as const;',
        '',
    ].join('\n');
}

generatorHelper.generatorHandler({
    onManifest() {
        return {
            version: generatorVersion,
            defaultOutput: '../src/generated',
            prettyName: 'Join Tables',
        };
    },
    async onGenerate(options) {
        const outputDir = resolveGeneratorOutput(options.generator.output);
        const joinTablesFilePath = join(outputDir, 'join-tables.ts');

        await mkdir(outputDir, {
            recursive: true,
        });
        await writeFile(
            joinTablesFilePath,
            createJoinTablesFileContents(extractJoinTables(options.dmmf.datamodel)),
        );

        log.faint(`Join tables written to ${relative(process.cwd(), joinTablesFilePath)}`);
    },
});
