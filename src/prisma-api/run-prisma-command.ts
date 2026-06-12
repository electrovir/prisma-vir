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
 * Directly run a Prisma command. Prisma v7 takes the schema location and datasource connection from
 * a Prisma config file, so the caller's `configPath` is passed through via `--config`.
 *
 * @category Internal
 */
export async function runPrismaCommand({
    command,
    ignoreExitCode = false,
    showLogs,
    configPath,
    env = {},
}: {
    command: string;
    configPath: string;
} & PartialWithUndefined<{
    /** If `true`, prevents errors from being thrown if this command exits with a non-0 status. */
    env: Record<string, string> | undefined;
    ignoreExitCode: boolean;
    showLogs: boolean;
}>) {
    const configArgs = [
        '--config',
        wrapString({
            value: configPath,
            wrapper: "'",
        }),
    ];

    /** Disable Prisma's in-CLI ads. */
    const noHintsArg = prismaCommandsThatSupportNoHints.some((commandName) =>
        command.startsWith(commandName),
    )
        ? '--no-hints'
        : '';

    const fullCommand = [
        'prisma',
        command,
        ...configArgs,
        noHintsArg,
    ].join(' ');

    /* node:coverage ignore next 3 */
    if (showLogs) {
        log.faint(`> ${fullCommand}`);
    }

    const result = await runShellCommand(interpolationSafeWindowsPath(fullCommand), {
        env: {
            ...process.env,
            ...env,
        },
        hookUpToConsole: !!showLogs,
        cwd: dirname(configPath),
    });

    return verifyOutput(configPath, result, ignoreExitCode);
}

/**
 * Verify Prisma command outputs.
 *
 * @category Internal
 */
export function verifyOutput(
    configFilePath: string,
    shellOutput: Readonly<ShellOutput>,
    ignoreExitCode: boolean,
) {
    if (shellOutput.stderr.includes('Validation Error Count')) {
        throw new PrismaSchemaError(
            `Invalid schema file referenced by config '${configFilePath}':\n\n${shellOutput.stderr}`,
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
