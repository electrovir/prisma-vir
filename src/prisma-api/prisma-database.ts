import {runPrismaCommand} from './run-prisma-command.js';

export async function getPrismaDiff({
    schemaPath,
    env,
}: {
    schemaPath: string;
    env?: Record<string, string> | undefined;
}): Promise<string> {
    const command = [
        'migrate',
        'diff',
        `--from-schema-datamodel='${schemaPath}'`,
        `--to-schema-datasource='${schemaPath}'`,
    ].join(' ');

    const results = await runPrismaCommand({command, env, schemaPath: undefined});

    if (results.stdout.trim() === 'No difference detected.') {
        return '';
    } else {
        return results.stdout.trim();
    }
}

export async function doesPrismaDiffExist(params: {
    schemaPath: string;
    env?: Record<string, string> | undefined;
}): Promise<boolean> {
    return !!(await getPrismaDiff(params));
}

export async function resetDevPrismaDatabase({
    schemaPath,
    withMigrations,
    env = {},
}: {
    schemaPath: string;
    /**
     * If you already have migrations created, set this to `true`. If you don't, set it to `false`.
     * If you don't know which one to use, try both, see which one creates a valid database for you
     * (try querying it with PrismaClient after running this; if it errors, this didn't create a
     * valid database).
     */
    withMigrations: boolean;
    env?: Record<string, string> | undefined;
}) {
    if (withMigrations) {
        await runPrismaCommand({
            schemaPath,
            command: 'migrate reset --force --skip-generate --skip-seed',
            env,
        });
    } else {
        await runPrismaCommand({
            schemaPath,
            command: 'db push --accept-data-loss --skip-generate',
            env,
        });
    }
}
