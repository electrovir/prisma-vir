import {getSchemaPathFromConfig} from '../prisma-schema/prisma-config.js';
import {runPrismaCommand} from './run-prisma-command.js';

export async function getPrismaDiff({
    configPath,
    env,
}: {
    configPath: string;
    env?: Record<string, string> | undefined;
}): Promise<string> {
    /**
     * `migrate diff` has no flag to pull its `--from` datamodel out of the config, so the schema
     * path is read from the config and passed explicitly. The `--to` side uses the config's
     * datasource (the live database).
     */
    const schemaPath = await getSchemaPathFromConfig({
        configPath,
        env,
    });

    const command = [
        'migrate',
        'diff',
        `--from-schema='${schemaPath}'`,
        '--to-config-datasource',
    ].join(' ');

    const results = await runPrismaCommand({
        command,
        env,
        configPath,
    });

    if (results.stdout.trim() === 'No difference detected.') {
        return '';
    } else {
        return results.stdout.trim();
    }
}

export async function doesPrismaDiffExist(params: {
    configPath: string;
    env?: Record<string, string> | undefined;
}): Promise<boolean> {
    return !!(await getPrismaDiff(params));
}

export async function resetDevPrismaDatabase({
    configPath,
    withMigrations,
    env = {},
}: {
    configPath: string;
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
            configPath,
            command: 'migrate reset --force',
            env,
        });
    } else {
        await runPrismaCommand({
            configPath,
            command: 'db push --accept-data-loss',
            env,
        });
    }
}
