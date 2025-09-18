import {assert} from '@augment-vir/assert';
import {awaitedForEach, retry} from '@augment-vir/common';
import {interpolationSafeWindowsPath, runShellCommand} from '@augment-vir/node';
import {existsSync} from 'node:fs';
import {notCommittedDirPath} from '../file-paths.js';
import {generatedPrismaClientDirPath, testPrismaMigrationsDirPath} from '../file-paths.mock.js';

const pathsToDelete = [
    generatedPrismaClientDirPath,
    notCommittedDirPath,
    testPrismaMigrationsDirPath,
];

export async function clearTestDatabaseOutputs() {
    await retry(
        10,
        async () => {
            await awaitedForEach(pathsToDelete, async (pathToDelete) => {
                /**
                 * This way of deleting files is required for Windows tests running on GitHub
                 * Actions. Otherwise, we get the following error:
                 *
                 *     EPERM: operation not permitted, unlink 'D:\a\augment-vir\augment-vir\packages\node\node_modules\.prisma\query_engine-windows.dll.node'
                 */
                await runShellCommand(`rm -rf ${interpolationSafeWindowsPath(pathToDelete)}`, {
                    rejectOnError: true,
                });
            });

            await awaitedForEach(pathsToDelete, (pathToDelete) => {
                assert.isFalse(existsSync(pathToDelete));
            });
        },
        {
            interval: {
                seconds: 1,
            },
        },
    );
}
