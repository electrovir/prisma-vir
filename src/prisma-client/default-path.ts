import {findAncestor} from '@augment-vir/node';
import {existsSync} from 'node:fs';
import {join} from 'node:path';

/**
 * Generate a default db directory for storing dev and test pglite databases and sqlite database.
 *
 * @category Internal
 */
export function getDefaultDatabaseDirPath(dirName: string = 'db') {
    const packageLockJsonPath = findAncestor(process.cwd(), (currentPath) => {
        return existsSync(join(currentPath, 'package-lock.json'));
    });
    /* node:coverage ignore next 1: can't test this branch because this repo has a package-lock.json file. */
    const basePath = join(packageLockJsonPath || process.cwd());
    return join(basePath, '.not-committed', dirName);
}
