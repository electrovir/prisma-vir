import {join, resolve} from 'node:path';

export const repoDirPath = resolve(import.meta.dirname, '..');
export const notCommittedDirPath = join(repoDirPath, '.not-committed');
