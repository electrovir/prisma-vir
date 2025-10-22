import {describe} from '@augment-vir/test';
import {testPrismaSchemaMultiRelation} from '../file-paths.mock.js';
import {createGeneratorTest} from './test-generator.mock.js';

describe('string-dates generator', () => {
    createGeneratorTest(import.meta, testPrismaSchemaMultiRelation, {
        prefix: 'yolo',
    });
});
