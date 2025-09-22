import {describe} from '@augment-vir/test';
import {createGeneratorTest} from './test-generator.mock.js';

describe('internal-enums generator', () => {
    createGeneratorTest(import.meta);
});
