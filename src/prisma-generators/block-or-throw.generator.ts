#!/usr/bin/env node

/**
 * This generator removes the types for every `*OrThrow` Prisma client method (`findUniqueOrThrow`
 * and `findFirstOrThrow`) so calling one is a compile error. The methods still exist at runtime.
 *
 * Each method is declared twice: on the model's delegate interface (used by a plain `PrismaClient`)
 * and in the `TypeMap` operations (used by every `$extends` client), so both are removed.
 */

import generatorHelper from '@prisma/generator-helper';
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {resolveGeneratorOutput} from './generator-util/generator-output.js';
import {generatorVersion} from './generator-util/version.js';

const orThrowMethods = [
    'findUniqueOrThrow',
    'findFirstOrThrow',
] as const;

/**
 * A delegate method declaration plus its JSDoc block. Prisma wraps a signature across several lines
 * when its generics carry `take`/`skip` validators (as `findFirstOrThrow` on a view does), so the
 * match runs through the line holding the method's return type.
 */
const delegateMethodRegExp = new RegExp(
    String.raw`\n  /\*\*(?:(?!\*/)[\s\S])*\*/\n  (?:${orThrowMethods.join('|')})<(?:[^\n]*\n)*?[^\n]*\): Prisma\.Prisma__\w+Client<[^\n]*\n`,
    'g',
);

/** A `TypeMap` operation entry, which is always a fixed `args` line and a fixed `result` line. */
const typeMapOperationRegExp = new RegExp(
    String.raw`\n {8}(?:${orThrowMethods.join('|')}): \{\n[^\n]*\n[^\n]*\n {8}\}`,
    'g',
);

/**
 * Removes every match of `regExp` and throws when the match count is off, so a Prisma upgrade that
 * changes its generated template fails loudly instead of silently leaving the methods typed.
 */
async function removeMatches({
    filePath,
    regExp,
    expectedCount,
}: Readonly<{
    filePath: string;
    regExp: RegExp;
    expectedCount: number;
}>) {
    const originalContents = String(await readFile(filePath));
    const matchCount = originalContents.match(regExp)?.length ?? 0;

    if (matchCount !== expectedCount) {
        throw new Error(
            `Expected ${expectedCount} OrThrow declarations in '${filePath}' but found ${matchCount}. Prisma likely changed its template: update the block-or-throw generator to match.`,
        );
    }

    await writeFile(filePath, originalContents.replaceAll(regExp, ''));
}

generatorHelper.generatorHandler({
    onManifest() {
        return {
            version: generatorVersion,
            defaultOutput: '../src/generated',
            prettyName: 'Block OrThrow',
        };
    },
    async onGenerate(options) {
        const outputDir = resolveGeneratorOutput(options.generator.output);
        /**
         * Not every model has every OrThrow method: a view without a unique field has no
         * `findUniqueOrThrow`. The DMMF mappings list the operations Prisma actually generated.
         */
        const modelOrThrowCounts = options.dmmf.mappings.modelOperations.map((mapping) => {
            return {
                modelName: mapping.model,
                count: orThrowMethods.filter((method) => mapping[method]).length,
            };
        });

        await Promise.all([
            removeMatches({
                filePath: join(outputDir, 'internal', 'prismaNamespace.ts'),
                regExp: typeMapOperationRegExp,
                expectedCount: modelOrThrowCounts.reduce((sum, {count}) => sum + count, 0),
            }),
            ...modelOrThrowCounts.map(async ({modelName, count}) => {
                await removeMatches({
                    filePath: join(outputDir, 'models', `${modelName}.ts`),
                    regExp: delegateMethodRegExp,
                    expectedCount: count,
                });
            }),
        ]);
    },
});
