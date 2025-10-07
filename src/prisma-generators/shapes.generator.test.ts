import {describe} from '@augment-vir/test';
import {testPrismaSchemaMultiRelation} from '../file-paths.mock.js';
import {createGeneratorTest} from './test-generator.mock.js';

describe('shapes generator', () => {
    createGeneratorTest(import.meta, testPrismaSchemaMultiRelation);
});
