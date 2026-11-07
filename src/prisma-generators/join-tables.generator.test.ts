import {describe} from '@augment-vir/test';
import {testPrismaConfigJoinTables} from '../file-paths.mock.js';
import {createGeneratorTest} from './test-generator.mock.js';

describe('join-tables generator', () => {
    createGeneratorTest(import.meta, testPrismaConfigJoinTables);
});
