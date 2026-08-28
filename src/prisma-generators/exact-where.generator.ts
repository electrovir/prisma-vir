#!/usr/bin/env node

/**
 * This generator makes unknown keys inside a Prisma `where` object a compile error.
 *
 * Prisma's generated `Subset` / `SelectSubset` / `SubsetIntersection` map unknown keys to `never`,
 * but only at the top level of the query args. Nested `where` keys rely on TypeScript's excess
 * property check, which silently stops firing at a generic inference site as soon as the literal
 * has one valid sibling property, so `where: {gibberish: null, email: 'a'}` type-checks and only
 * fails at runtime. Extending the same key-to-`never` mapping down into `where` restores the error.
 * Intersecting the argument with the real args type also works on TypeScript 5 but not on
 * TypeScript 6, which no longer runs excess property checks through intersections.
 */

import generatorHelper from '@prisma/generator-helper';
import {readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {resolveGeneratorOutput} from './generator-util/generator-output.js';
import {generatorVersion} from './generator-util/version.js';

const exactWhereHelpers = `/**
 * The union of every constituent's keys. Plain \`keyof\` on a union gives the intersection instead,
 * which would reject \`gte\` on a \`DateTimeFilter | Date | string | Skip\` field.
 */
type WhereKeys<U> = U extends unknown ? keyof U : never

type WhereValue<U, K extends PropertyKey> = U extends unknown ? (K extends keyof U ? U[K] : never) : never

type WhereElement<U> = Extract<NonNullable<U>, ReadonlyArray<unknown>>[number]

/** Branded ids are \`string & {...}\`, so they pass a bare \`extends object\` and must be excluded. */
type IsPlainObject<T> = [T] extends [object]
  ? [T] extends [string | number | boolean | bigint | symbol | ((...args: never) => unknown)]
    ? false
    : true
  : false

/**
 * Only descends into a nested value whose target is another set of \`where\` conditions: \`AND\`
 * identifies a nested \`WhereInput\` (a to-one relation filter) and \`some\` identifies a list
 * relation filter. Scalar filters like \`DateTimeFilter\` and generic field values are left alone,
 * because descending into a value whose type is still an unresolved type parameter leaves the
 * conditional deferred and the caller's own argument then fails to match it.
 */
type ExactWhereChild<T, U> = [Extract<WhereKeys<NonNullable<U>>, 'AND' | 'some'>] extends [never]
  ? T
  : ExactWhere<T, U>

/**
 * \`[T] extends [object]\` inside \`IsPlainObject\` blocks distribution so a \`where\` passed as a whole
 * \`Skip | XWhereInput\` value survives; \`Skip\`'s own keys stay allowed for the same reason, since
 * \`WhereKeys\` unions across the whole target union. A \`where\` built with a computed key has a
 * string index signature and no statically known keys to check, so it passes through untouched.
 */
type ExactWhere<T, U> = IsPlainObject<T> extends true
  ? string extends keyof T
    ? T
    : T extends ReadonlyArray<unknown>
      ? {[index in keyof T]: ExactWhereChild<T[index], WhereElement<U>>}
      : {[key in keyof T]: key extends WhereKeys<NonNullable<U>> ? ExactWhereChild<T[key], WhereValue<NonNullable<U>, key>> : never}
  : T

type ExactSubset<T, U> = {
  [key in keyof T]: key extends keyof U
    ? key extends 'where' ? ExactWhere<T[key], U[key]> : T[key]
    : never
}

`;

/**
 * Prisma's three generated argument mappers. Each is matched by its exact generated text so a
 * Prisma upgrade that changes any of them fails loudly instead of silently dropping the check.
 * `SubsetIntersection` is what `groupBy` uses and `Subset` is what `count` and `aggregate` use, so
 * rewriting only `SelectSubset` would leave those operations unchecked.
 */
const replacements: ReadonlyArray<Readonly<{original: string; replacement: string}>> = [
    {
        original: `export type Subset<T, U> = {
  [key in keyof T]: key extends keyof U ? T[key] : never;
};`,
        replacement: `${exactWhereHelpers}export type Subset<T, U> = ExactSubset<T, U>;`,
    },
    {
        original: `export type SelectSubset<T, U> = {
  [key in keyof T]: key extends keyof U ? T[key] : never
} &`,
        replacement: 'export type SelectSubset<T, U> = ExactSubset<T, U> &',
    },
    {
        original: `export type SubsetIntersection<T, U, K> = {
  [key in keyof T]: key extends keyof U ? T[key] : never
} &
  K`,
        replacement: `export type SubsetIntersection<T, U, K> = ExactSubset<T, U> &
  K`,
    },
];

generatorHelper.generatorHandler({
    onManifest() {
        return {
            version: generatorVersion,
            defaultOutput: '../src/generated',
            prettyName: 'Exact Where',
        };
    },
    async onGenerate(options) {
        const namespaceFilePath = join(
            resolveGeneratorOutput(options.generator.output),
            'internal',
            'prismaNamespace.ts',
        );
        const originalContents = String(await readFile(namespaceFilePath));

        const rewrittenContents = replacements.reduce((contents, {original, replacement}) => {
            if (!contents.includes(original)) {
                throw new Error(
                    `Failed to find Prisma's generated argument mapper in '${namespaceFilePath}':\n${original}\nPrisma likely changed its template: update the exact-where generator to match.`,
                );
            }

            return contents.replace(original, replacement);
        }, originalContents);

        await writeFile(namespaceFilePath, rewrittenContents);
    },
});
