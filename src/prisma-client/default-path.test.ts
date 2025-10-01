import {describe, itCases} from '@augment-vir/test';
import {join} from 'node:path';
import {notCommittedDirPath} from '../file-paths.js';
import {getDefaultTopLevelDatabaseDirPath} from './default-path.js';

describe(getDefaultTopLevelDatabaseDirPath.name, () => {
    itCases(getDefaultTopLevelDatabaseDirPath, [
        {
            it: 'defaults to db',
            input: undefined,
            expect: join(notCommittedDirPath, 'db'),
        },
        {
            it: 'overrides default',
            input: 'different',
            expect: join(notCommittedDirPath, 'different'),
        },
    ]);
});
