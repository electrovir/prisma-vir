import {getObjectTypedEntries} from '@augment-vir/common';
import {loadConfigFromFile} from '@prisma/config';
import {dirname, isAbsolute, resolve} from 'node:path';
import {PrismaSchemaError} from '../prisma-api/prisma-errors.js';

/**
 * Temporarily applies the given environment variables to `process.env`, returning a function that
 * restores the previous values. Used so that loading a consumer's Prisma config (which may read its
 * datasource URL from `process.env`) sees the same `env` that is passed to the Prisma CLI
 * commands.
 */
function applyEnv(env: Readonly<Record<string, string>>): () => void {
    const previousValues = getObjectTypedEntries(env).map(([key]) => {
        return [
            key,
            process.env[key],
        ] as const;
    });

    Object.assign(process.env, env);

    return () => {
        previousValues.forEach(
            ([
                key,
                value,
            ]) => {
                if (value === undefined) {
                    delete process.env[key];
                } else {
                    process.env[key] = value;
                }
            },
        );
    };
}

/**
 * Loads a consumer's Prisma config file and returns the absolute path to the schema it points at.
 * Prisma v7 stores the schema location in the config file, but `prisma migrate diff` still requires
 * an explicit schema path for its `--from-schema` input, so this reads it back out of the config.
 *
 * @category Internal
 */
export async function getSchemaPathFromConfig({
    configPath,
    env = {},
}: Readonly<{
    configPath: string;
    /** Optionally set (override) env variables. */
    env?: Record<string, string> | undefined;
}>): Promise<string> {
    const restoreEnv = applyEnv(env);

    try {
        const {config, error} = await loadConfigFromFile({
            configFile: configPath,
        });

        if (error || !config.schema) {
            throw new PrismaSchemaError(
                `Failed to read a schema path from Prisma config at '${configPath}'.`,
            );
        }

        return isAbsolute(config.schema)
            ? config.schema
            : resolve(dirname(configPath), config.schema);
    } finally {
        restoreEnv();
    }
}
