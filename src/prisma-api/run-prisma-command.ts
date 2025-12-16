import {extractErrorMessage, log, type PartialWithUndefined, wrapString} from '@augment-vir/common';
import {interpolationSafeWindowsPath, runShellCommand, type ShellOutput} from '@augment-vir/node';
import {dirname} from 'node:path';
import {PrismaSchemaError} from './prisma-errors.js';

/**
 * All commands in the Prisma CLI that support the `--no-hints` flag, used to turn off ads.
 *
 * @category Internal
 */
export const prismaCommandsThatSupportNoHints = ['generate'];

/**
 * Directly run a Prisma command.
 *
 * @category Internal
 */
export async function runPrismaCommand({
    command,
    ignoreExitCode = false,
    hideLogs = false,
    schemaPath,
    env = {},
}: {
    command: string;
    /** Set to `undefined` to omit the `--schema` flag. */
    schemaPath: string | undefined;
} & PartialWithUndefined<{
    /** If `true`, prevents errors from being thrown if this command exits with a non-0 status. */
    env: Record<string, string> | undefined;
    ignoreExitCode: boolean;
    hideLogs: boolean;
}>) {
    const schemaFileArgs = schemaPath
        ? [
              '--schema',
              wrapString({value: schemaPath, wrapper: "'"}),
          ]
        : [];

    /** Disable Prisma's in-CLI ads. */
    const noHintsArg = prismaCommandsThatSupportNoHints.some((commandName) =>
        command.startsWith(commandName))
        ? '--no-hints'
        : '';

    const fullCommand = [
        'prisma',
        command,
        ...schemaFileArgs,
        noHintsArg,
    ].join(' ');

    log.faint(`> ${fullCommand}`);

    const result = await runShellCommand(interpolationSafeWindowsPath(fullCommand), {
        env: {
            ...process.env,
            ...env,
        },
        hookUpToConsole: !hideLogs,
        cwd: schemaPath ? dirname(schemaPath) : process.cwd(),
    });

    return verifyOutput(schemaPath || '', result, ignoreExitCode);
}

/**
 * Verify Prisma command outputs.
 *
 * @category Internal
 */
export function verifyOutput(
    schemaFilePath: string,
    shellOutput: Readonly<ShellOutput>,
    ignoreExitCode: boolean,
) {
    if (shellOutput.stderr.includes('Validation Error Count')) {
        throw new PrismaSchemaError(
            `Invalid schema file at '${schemaFilePath}':\n\n${shellOutput.stderr}`,
        );
    } else if (shellOutput.stderr.includes('does not exist')) {
        throw new PrismaSchemaError(`Database does not exist: ${shellOutput.stderr}`);
    } else if (shellOutput.exitCode === 0 || ignoreExitCode) {
        return shellOutput;
    } else {
        throw new Error(
            /* node:coverage ignore next 1: edge case to make sure errors are logged. */
            shellOutput.stdout + shellOutput.stderr || extractErrorMessage(shellOutput.error),
        );
    }
}
