import {describe} from '@augment-vir/test';
import {createGeneratorTest} from './test-generator.mock.js';

describe('shapes generator', () => {
    createGeneratorTest(import.meta);
});
