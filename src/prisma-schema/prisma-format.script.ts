#!/usr/bin/env node

import {log} from '@augment-vir/common';
import {parseArgs} from 'cli-vir';
import {relative, resolve} from 'node:path';
import {formatPrismaSchema, PrismaFormatMode} from './format-prisma-schema.js';

const successMessagePrefixes: Record<PrismaFormatMode, string> = {
    [PrismaFormatMode.Check]: 'Confirmed',
    [PrismaFormatMode.Write]: 'Formatted',
};

const {mode, schemaPath} = parseArgs(
    process.argv,
    {
        mode: {
            description: 'Check that the schema is formatted or write the formatted schema.',
            position: 0,
            type: PrismaFormatMode,
            required: true,
        },
        schemaPath: {
            description: 'Path to the Prisma schema to format.',
            position: 1,
            required: true,
        },
    },
    {
        binName: 'prisma-format',
        commandDescription: 'Format a Prisma schema with four-space indentation.',
        importMeta: import.meta,
    },
);

try {
    await formatPrismaSchema({
        mode,
        schemaPath,
    });

    log.success(
        `${successMessagePrefixes[mode]} ${relative(process.cwd(), resolve(schemaPath))} with 4-space indentation.`,
    );
    process.exit(0);
} catch (error) {
    log.error(error);
    process.exit(1);
}
