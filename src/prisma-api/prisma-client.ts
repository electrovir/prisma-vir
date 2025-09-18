import {runPrismaCommand} from './run-prisma-command.js';

export async function generatePrismaClient(params: {
    schemaPath: string;
    env?: Record<string, string> | undefined;
}) {
    await runPrismaCommand({
        ...params,
        command: 'generate',
    });
}
