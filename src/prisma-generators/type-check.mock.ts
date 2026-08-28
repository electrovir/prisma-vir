import {removeDuplicates} from '@augment-vir/common';
import ts from 'typescript';

/**
 * Type checks a single file and returns the 1-indexed line numbers that produced at least one
 * diagnostic. Only diagnostics from the file itself are reported: the generated Prisma client it
 * imports is not the subject under test.
 */
export function findTypeErrorLines(filePath: string): number[] {
    const program = ts.createProgram([filePath], {
        exactOptionalPropertyTypes: true,
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        noEmit: true,
        skipLibCheck: true,
        strict: true,
        target: ts.ScriptTarget.ESNext,
    });

    const errorLines = ts
        .getPreEmitDiagnostics(program)
        .filter((diagnostic) => {
            return diagnostic.file?.fileName === filePath.replaceAll('\\', '/');
        })
        .map((diagnostic) => {
            if (!diagnostic.file || diagnostic.start == undefined) {
                return undefined;
            }

            return diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start).line + 1;
        })
        .filter((line) => {
            return line != undefined;
        });

    return removeDuplicates(errorLines).toSorted((a, b) => {
        return a - b;
    });
}
