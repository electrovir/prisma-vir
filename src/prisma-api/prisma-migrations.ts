import {check} from '@augment-vir/assert';
import {log, safeMatch, toEnsuredNumber} from '@augment-vir/common';
import {runShellCommand} from '@augment-vir/node';
import terminate from 'terminate';
import {PrismaMigrationNeededError, PrismaResetNeededError} from './prisma-errors.js';
import {runPrismaCommand, verifyOutput} from './run-prisma-command.js';

/**
 * Output of `prisma.migration.status`.
 *
 * @category Internal
 */
export type PrismaMigrationStatus = {
    totalMigrations: number;
    unappliedMigrations: string[];
};

export async function applyPrismaMigrationsToProd(params: {
    schemaPath: string;
    env?: Record<string, string> | undefined;
}) {
    await runPrismaCommand({
        ...params,
        command: 'migrate deploy',
    });
}

enum DbChangeRequired {
    MigrationNeeded = 'migration-needed',
    ResetNeeded = 'reset-needed',
}

export async function applyPrismaMigrationsToDev({
    schemaPath,
    env,
}: {
    schemaPath: string;
    env?: Record<string, string> | undefined;
}) {
    const command = [
        'prisma',
        'migrate',
        'dev',
        `--schema='${schemaPath}'`,
    ].join(' ');

    log.faint(`> ${command}`);

    let dbRequirement = undefined as DbChangeRequired | undefined;

    const result = await runShellCommand(command, {
        env: {
            ...process.env,
            ...env,
        },
        stdoutCallback(stdout, childProcess) {
            if (stdout.includes('Enter a name for the new migration')) {
                if (childProcess.pid) {
                    terminate(childProcess.pid);
                }
                dbRequirement = DbChangeRequired.MigrationNeeded;
            } else if (stdout.includes('We need to reset the SQLite database')) {
                if (childProcess.pid) {
                    terminate(childProcess.pid);
                }
                dbRequirement = DbChangeRequired.ResetNeeded;
            }
        },
    });

    if (dbRequirement === DbChangeRequired.MigrationNeeded) {
        throw new PrismaMigrationNeededError(schemaPath);
    } else if (dbRequirement === DbChangeRequired.ResetNeeded) {
        throw new PrismaResetNeededError(schemaPath);
    }
    verifyOutput(schemaPath, result, false);
}

export async function getMigrationStatus(params: {
    schemaPath: string;
    env?: Record<string, string> | undefined;
}): Promise<PrismaMigrationStatus> {
    const output = await runPrismaCommand({
        ...params,
        command: 'migrate status',
        ignoreExitCode: true,
    });

    const listedMigrations: PrismaMigrationStatus = {
        totalMigrations: 0,
        unappliedMigrations: [],
    };

    let foundNotAppliedMigrations = false;

    output.stdout.split('\n').some((rawLine) => {
        const line = rawLine.trim();
        if (foundNotAppliedMigrations) {
            if (line) {
                listedMigrations.unappliedMigrations.push(line);
            } else {
                /** We're done parsing. */
                return true;
            }
        } else if (line.endsWith('not yet been applied:')) {
            foundNotAppliedMigrations = true;
        } else {
            const [
                ,
                countMatch,
            ] = safeMatch(line, /^([\d,]+) migrations? found in/);

            if (countMatch) {
                listedMigrations.totalMigrations = toEnsuredNumber(countMatch);
            }
        }

        /** Still need to keep parsing. */
        return false;
    });

    return listedMigrations;
}

export async function createPrismaMigration({
    migrationName,
    createOnly = false,
    schemaPath,
    env = {},
}: {
    migrationName: string;
    schemaPath: string;
    /**
     * Set this to `true` to create a new migration without applying it to the database.
     *
     * @default false
     */
    createOnly?: boolean | undefined;
    env?: Record<string, string> | undefined;
}) {
    const command = [
        'migrate',
        'dev',
        `--name='${migrationName}'`,
        createOnly ? '--create-only' : '',
    ]
        .filter(check.isTruthy)
        .join(' ');

    await runPrismaCommand({command, schemaPath, env});
}
